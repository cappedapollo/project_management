// Admin System Statistics API
import jwt from "jsonwebtoken";
import { query } from "../../backend/db-postgres.js";

export default async function handler(req, res) {
	// Set CORS headers
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

	if (req.method === "OPTIONS") {
		return res.status(200).end();
	}

	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		// Verify JWT token and admin role
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({ error: "No token provided" });
		}

		const token = authHeader.substring(7);
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// Check if user is admin (role = 0)
		if (decoded.role !== 0) {
			return res.status(403).json({ error: "Admin access required" });
		}

		// Get comprehensive system statistics
		const stats = await getSystemStats();

		return res.json({
			success: true,
			stats,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Admin System Stats API error:", error);
		if (error.name === "JsonWebTokenError") {
			return res.status(401).json({ error: "Invalid token" });
		}
		return res.status(500).json({ error: "Internal server error" });
	}
}

async function getSystemStats() {
	try {
		// User statistics
		const userStatsQuery = `
			SELECT 
				COUNT(*) as total,
				COUNT(CASE WHEN is_active = true THEN 1 END) as active,
				COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as new_this_month,
				COUNT(CASE WHEN role = 0 THEN 1 END) as admin_count,
				COUNT(CASE WHEN role = 1 THEN 1 END) as user_count,
				COUNT(CASE WHEN role = 2 THEN 1 END) as caller_count
			FROM users
		`;
		const userStats = await query(userStatsQuery);

		// Content statistics
		const contentStatsQuery = `
			SELECT 
				(SELECT COUNT(*) FROM projects) as total_projects,
				(SELECT COUNT(*) FROM tasks) as total_tasks,
				(SELECT COUNT(*) FROM job_applications) as total_applications,
				(SELECT COUNT(*) FROM interviews) as total_interviews,
				(SELECT COUNT(*) FROM saved_resumes) as total_resumes,
				(SELECT COUNT(*) FROM proposals) as total_proposals
		`;
		const contentStats = await query(contentStatsQuery);

		// Activity statistics
		const activityStatsQuery = `
			SELECT 
				COUNT(DISTINCT user_id) as daily_active_users,
				COUNT(DISTINCT s.user_id) as total_sessions,
				COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(s.last_used, s.created_at) - s.created_at)) / 60), 0) as avg_session_duration,
				(SELECT COUNT(*) FROM activity_logs WHERE created_at >= CURRENT_DATE) as total_page_views
			FROM sessions s
			WHERE s.created_at >= CURRENT_DATE - INTERVAL '1 day'
			AND s.is_active = true
		`;
		const activityStats = await query(activityStatsQuery);

		// System health statistics
		const systemStatsQuery = `
			SELECT 
				EXTRACT(EPOCH FROM (NOW() - (SELECT created_at FROM sessions ORDER BY created_at LIMIT 1))) / 3600 as server_uptime_hours,
				(SELECT COUNT(*) FROM activity_logs WHERE created_at >= CURRENT_DATE) as api_requests_today,
				-- Mock values for storage and database size (would be real in production)
				1024 as database_size_mb,
				2048 as storage_used_mb,
				10240 as storage_limit_mb,
				0.5 as error_rate_percent
		`;
		const systemStats = await query(systemStatsQuery);

		// Caller-specific statistics
		const callerStatsQuery = `
			SELECT 
				COUNT(*) as total_calls_today,
				COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls_today,
				COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_calls_today,
				COALESCE(AVG(duration_minutes), 0) as avg_call_duration
			FROM call_schedules
			WHERE DATE(created_at) = CURRENT_DATE
		`;
		let callerStats = null;
		try {
			callerStats = await query(callerStatsQuery);
		} catch (error) {
			// If call_schedules table doesn't exist, use default values
			callerStats = [{ total_calls_today: 0, completed_calls_today: 0, failed_calls_today: 0, avg_call_duration: 0 }];
		}

		return {
			users: {
				total: Number.parseInt(userStats[0].total) || 0,
				active: Number.parseInt(userStats[0].active) || 0,
				newThisMonth: Number.parseInt(userStats[0].new_this_month) || 0,
				adminCount: Number.parseInt(userStats[0].admin_count) || 0,
				userCount: Number.parseInt(userStats[0].user_count) || 0,
				callerCount: Number.parseInt(userStats[0].caller_count) || 0,
			},
			content: {
				totalProjects: Number.parseInt(contentStats[0].total_projects) || 0,
				totalTasks: Number.parseInt(contentStats[0].total_tasks) || 0,
				totalApplications: Number.parseInt(contentStats[0].total_applications) || 0,
				totalInterviews: Number.parseInt(contentStats[0].total_interviews) || 0,
				totalResumes: Number.parseInt(contentStats[0].total_resumes) || 0,
				totalProposals: Number.parseInt(contentStats[0].total_proposals) || 0,
			},
			activity: {
				dailyActiveUsers: Number.parseInt(activityStats[0]?.daily_active_users) || 0,
				totalSessions: Number.parseInt(activityStats[0]?.total_sessions) || 0,
				averageSessionDuration: Number.parseFloat(activityStats[0]?.avg_session_duration) || 0,
				totalPageViews: Number.parseInt(activityStats[0]?.total_page_views) || 0,
			},
			system: {
				serverUptime: Number.parseFloat(systemStats[0]?.server_uptime_hours) || 0,
				databaseSize: Number.parseInt(systemStats[0]?.database_size_mb) || 0,
				storageUsed: Number.parseInt(systemStats[0]?.storage_used_mb) || 0,
				storageLimit: Number.parseInt(systemStats[0]?.storage_limit_mb) || 0,
				apiRequestsToday: Number.parseInt(systemStats[0]?.api_requests_today) || 0,
				errorRate: Number.parseFloat(systemStats[0]?.error_rate_percent) || 0,
			},
			caller: {
				totalCallsToday: Number.parseInt(callerStats[0]?.total_calls_today) || 0,
				completedCallsToday: Number.parseInt(callerStats[0]?.completed_calls_today) || 0,
				failedCallsToday: Number.parseInt(callerStats[0]?.failed_calls_today) || 0,
				avgCallDuration: Number.parseFloat(callerStats[0]?.avg_call_duration) || 0,
			},
		};
	} catch (error) {
		console.error("Error fetching system stats:", error);
		throw error;
	}
}
