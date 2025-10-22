// Caller Activity Logger - Helper functions for logging caller activities
import { query } from "../../backend/db-postgres.js";

/**
 * Log caller activity to the caller_activity_logs table
 * @param {number} callerId - ID of the caller
 * @param {string} activityType - Type of activity (call_scheduled, call_started, etc.)
 * @param {number|null} callId - ID of the call (if applicable)
 * @param {number|null} targetUserId - ID of the user being called
 * @param {object|null} details - Additional details about the activity
 * @param {number|null} durationMinutes - Duration of the call in minutes
 * @param {string|null} outcome - Outcome of the activity
 * @param {object|null} req - Request object for IP and user agent
 */
export async function logCallerActivity(
	callerId,
	activityType,
	callId = null,
	targetUserId = null,
	details = null,
	durationMinutes = null,
	outcome = null,
	req = null,
) {
	try {
		// Check if caller_activity_logs table exists, if not create it
		await ensureCallerActivityTable();

		const result = await query(
			`INSERT INTO caller_activity_logs (
				caller_id, activity_type, call_id, target_user_id, details, 
				duration_minutes, outcome, ip_address, user_agent
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			RETURNING *`,
			[
				callerId,
				activityType,
				callId,
				targetUserId,
				details ? JSON.stringify(details) : null,
				durationMinutes,
				outcome,
				req?.headers["x-forwarded-for"] || req?.connection?.remoteAddress || "system",
				req?.headers["user-agent"] || "system",
			],
		);

		console.log(`✅ Caller activity logged: ${activityType} by caller ${callerId}`);
		return result[0];
	} catch (error) {
		console.error("Failed to log caller activity:", error);
		// Don't throw error - activity logging should not break main functionality
		return null;
	}
}

/**
 * Ensure the caller_activity_logs table exists
 */
async function ensureCallerActivityTable() {
	try {
		await query(`
			CREATE TABLE IF NOT EXISTS caller_activity_logs (
				id SERIAL PRIMARY KEY,
				caller_id INTEGER,
				activity_type VARCHAR(50) NOT NULL,
				call_id INTEGER DEFAULT NULL,
				target_user_id INTEGER DEFAULT NULL,
				details JSONB DEFAULT NULL,
				duration_minutes INTEGER DEFAULT NULL,
				outcome VARCHAR(100) DEFAULT NULL,
				ip_address INET,
				user_agent TEXT,
				created_at TIMESTAMP DEFAULT NOW(),
				FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE SET NULL,
				FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
			)
		`);

		// Create indexes if they don't exist
		await query(`
			CREATE INDEX IF NOT EXISTS idx_caller_activity_caller_id ON caller_activity_logs(caller_id)
		`);
		await query(`
			CREATE INDEX IF NOT EXISTS idx_caller_activity_type ON caller_activity_logs(activity_type)
		`);
		await query(`
			CREATE INDEX IF NOT EXISTS idx_caller_activity_created_at ON caller_activity_logs(created_at)
		`);
		await query(`
			CREATE INDEX IF NOT EXISTS idx_caller_activity_target_user ON caller_activity_logs(target_user_id)
		`);
	} catch (error) {
		console.error("Error ensuring caller activity table:", error);
	}
}

/**
 * Get caller activity statistics
 * @param {number} callerId - ID of the caller
 * @param {number} days - Number of days to look back (default: 30)
 */
export async function getCallerActivityStats(callerId, days = 30) {
	try {
		const stats = await query(
			`SELECT 
				activity_type,
				COUNT(*) as count,
				AVG(duration_minutes) as avg_duration,
				COUNT(CASE WHEN outcome = 'success' THEN 1 END) as successful_count
			FROM caller_activity_logs 
			WHERE caller_id = $1 
			AND created_at >= NOW() - INTERVAL '${days} days'
			GROUP BY activity_type
			ORDER BY count DESC`,
			[callerId],
		);

		return stats.reduce((acc, stat) => {
			acc[stat.activity_type] = {
				count: Number.parseInt(stat.count),
				avg_duration: Number.parseFloat(stat.avg_duration) || 0,
				successful_count: Number.parseInt(stat.successful_count),
				success_rate: stat.count > 0 ? ((stat.successful_count / stat.count) * 100).toFixed(1) : "0.0",
			};
			return acc;
		}, {});
	} catch (error) {
		console.error("Error getting caller activity stats:", error);
		return {};
	}
}

/**
 * Update caller performance metrics
 * @param {number} callerId - ID of the caller
 * @param {Date} date - Date for the performance metrics (default: today)
 */
export async function updateCallerPerformance(callerId, date = new Date()) {
	try {
		const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD format

		// Get daily statistics
		const dailyStats = await query(
			`SELECT 
				COUNT(*) as total_calls,
				COUNT(CASE WHEN activity_type = 'call_completed' THEN 1 END) as completed_calls,
				COUNT(CASE WHEN activity_type = 'call_failed' THEN 1 END) as failed_calls,
				SUM(CASE WHEN activity_type = 'call_completed' THEN duration_minutes ELSE 0 END) as total_duration
			FROM caller_activity_logs 
			WHERE caller_id = $1 
			AND DATE(created_at) = $2`,
			[callerId, dateStr],
		);

		const stats = dailyStats[0];
		const totalCalls = Number.parseInt(stats.total_calls) || 0;
		const completedCalls = Number.parseInt(stats.completed_calls) || 0;
		const failedCalls = Number.parseInt(stats.failed_calls) || 0;
		const totalDuration = Number.parseInt(stats.total_duration) || 0;

		const successRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;
		const avgDuration = completedCalls > 0 ? totalDuration / completedCalls : 0;
		const performanceScore = calculatePerformanceScore(successRate, avgDuration, totalCalls);

		// Ensure caller_performance table exists
		await query(`
			CREATE TABLE IF NOT EXISTS caller_performance (
				id SERIAL PRIMARY KEY,
				caller_id INTEGER,
				date DATE DEFAULT CURRENT_DATE,
				calls_scheduled INTEGER DEFAULT 0,
				calls_completed INTEGER DEFAULT 0,
				calls_failed INTEGER DEFAULT 0,
				total_call_duration_minutes INTEGER DEFAULT 0,
				success_rate DECIMAL(5,2) DEFAULT 0.00,
				average_call_duration DECIMAL(5,2) DEFAULT 0.00,
				follow_ups_generated INTEGER DEFAULT 0,
				performance_score DECIMAL(5,2) DEFAULT 0.00,
				created_at TIMESTAMP DEFAULT NOW(),
				updated_at TIMESTAMP DEFAULT NOW(),
				UNIQUE(caller_id, date),
				FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE
			)
		`);

		// Upsert performance record
		await query(
			`INSERT INTO caller_performance (
				caller_id, date, calls_scheduled, calls_completed, calls_failed,
				total_call_duration_minutes, success_rate, average_call_duration, performance_score
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			ON CONFLICT (caller_id, date) 
			DO UPDATE SET 
				calls_scheduled = EXCLUDED.calls_scheduled,
				calls_completed = EXCLUDED.calls_completed,
				calls_failed = EXCLUDED.calls_failed,
				total_call_duration_minutes = EXCLUDED.total_call_duration_minutes,
				success_rate = EXCLUDED.success_rate,
				average_call_duration = EXCLUDED.average_call_duration,
				performance_score = EXCLUDED.performance_score,
				updated_at = NOW()`,
			[callerId, dateStr, totalCalls, completedCalls, failedCalls, totalDuration, successRate, avgDuration, performanceScore],
		);

		console.log(`✅ Updated performance metrics for caller ${callerId} on ${dateStr}`);
		return {
			totalCalls,
			completedCalls,
			failedCalls,
			successRate,
			avgDuration,
			performanceScore,
		};
	} catch (error) {
		console.error("Error updating caller performance:", error);
		return null;
	}
}

/**
 * Calculate performance score based on various metrics
 * @param {number} successRate - Success rate percentage
 * @param {number} avgDuration - Average call duration in minutes
 * @param {number} totalCalls - Total number of calls
 */
function calculatePerformanceScore(successRate, avgDuration, totalCalls) {
	let score = 0;

	// Success rate component (0-40 points)
	score += (successRate / 100) * 40;

	// Call volume component (0-30 points)
	const volumeScore = Math.min(totalCalls / 10, 1) * 30; // Max score at 10+ calls per day
	score += volumeScore;

	// Duration efficiency component (0-30 points)
	// Optimal duration is around 15-30 minutes
	let durationScore = 0;
	if (avgDuration >= 15 && avgDuration <= 30) {
		durationScore = 30;
	} else if (avgDuration > 0) {
		// Penalty for too short or too long calls
		const deviation = Math.abs(avgDuration - 22.5) / 22.5; // 22.5 is the middle of optimal range
		durationScore = Math.max(0, 30 - deviation * 30);
	}
	score += durationScore;

	return Math.round(score * 100) / 100; // Round to 2 decimal places
}
