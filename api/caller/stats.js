import { pool } from "../../backend/db-postgres.js";
import jwt from "jsonwebtoken";

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
		// Verify JWT token
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({ error: "No token provided" });
		}

		const token = authHeader.substring(7);
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const userId = decoded.userId;

		// Verify user has caller role (role = 2)
		const userResult = await pool.query("SELECT role FROM users WHERE id = $1", [userId]);
		if (userResult.rows.length === 0 || userResult.rows[0].role !== 2) {
			return res.status(403).json({ error: "Access denied. Caller role required." });
		}

		// Get today's date
		const today = new Date();
		const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

		// Get call statistics
		const statsQueries = await Promise.all([
			// Today's calls
			pool.query(
				`
				SELECT COUNT(*) as count 
				FROM call_schedules 
				WHERE assigned_caller_id = $1 
				AND scheduled_time >= $2 
				AND scheduled_time < $3
			`,
				[userId, todayStart.toISOString(), todayEnd.toISOString()],
			),

			// Pending calls
			pool.query(
				`
				SELECT COUNT(*) as count 
				FROM call_schedules 
				WHERE assigned_caller_id = $1 
				AND status = 'scheduled'
				AND scheduled_time >= NOW()
			`,
				[userId],
			),

			// Completed calls today
			pool.query(
				`
				SELECT COUNT(*) as count 
				FROM call_schedules 
				WHERE assigned_caller_id = $1 
				AND status = 'completed'
				AND completed_at >= $2 
				AND completed_at < $3
			`,
				[userId, todayStart.toISOString(), todayEnd.toISOString()],
			),

			// Failed calls today
			pool.query(
				`
				SELECT COUNT(*) as count 
				FROM call_schedules 
				WHERE assigned_caller_id = $1 
				AND status = 'failed'
				AND updated_at >= $2 
				AND updated_at < $3
			`,
				[userId, todayStart.toISOString(), todayEnd.toISOString()],
			),

			// Total call time today (in minutes)
			pool.query(
				`
				SELECT COALESCE(SUM(duration_minutes), 0) as total_time 
				FROM call_schedules 
				WHERE assigned_caller_id = $1 
				AND status = 'completed'
				AND completed_at >= $2 
				AND completed_at < $3
			`,
				[userId, todayStart.toISOString(), todayEnd.toISOString()],
			),

			// Success rate (last 30 days)
			pool.query(
				`
				SELECT 
					COUNT(*) as total_calls,
					COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls
				FROM call_schedules 
				WHERE assigned_caller_id = $1 
				AND scheduled_time >= NOW() - INTERVAL '30 days'
				AND status IN ('completed', 'failed')
			`,
				[userId],
			),

			// Average call duration (last 30 days)
			pool.query(
				`
				SELECT AVG(duration_minutes) as avg_duration 
				FROM call_schedules 
				WHERE assigned_caller_id = $1 
				AND status = 'completed'
				AND completed_at >= NOW() - INTERVAL '30 days'
			`,
				[userId],
			),

			// Upcoming reminders
			pool.query(
				`
				SELECT COUNT(*) as count 
				FROM call_notifications 
				WHERE caller_id = $1 
				AND status = 'pending'
				AND scheduled_for >= NOW()
				AND scheduled_for <= NOW() + INTERVAL '24 hours'
			`,
				[userId],
			),
		]);

		const todayCalls = Number.parseInt(statsQueries[0].rows[0].count) || 0;
		const pendingCalls = Number.parseInt(statsQueries[1].rows[0].count) || 0;
		const completedCalls = Number.parseInt(statsQueries[2].rows[0].count) || 0;
		const failedCalls = Number.parseInt(statsQueries[3].rows[0].count) || 0;
		const totalCallTime = Number.parseInt(statsQueries[4].rows[0].total_time) || 0;

		const successRateData = statsQueries[5].rows[0];
		const totalCalls = Number.parseInt(successRateData.total_calls) || 0;
		const completedCallsTotal = Number.parseInt(successRateData.completed_calls) || 0;
		const successRate = totalCalls > 0 ? Math.round((completedCallsTotal / totalCalls) * 100) : 0;

		const avgDuration = Number.parseFloat(statsQueries[6].rows[0].avg_duration) || 0;
		const averageCallDuration = Math.round(avgDuration);

		const upcomingReminders = Number.parseInt(statsQueries[7].rows[0].count) || 0;

		const stats = {
			todayCalls,
			pendingCalls,
			completedCalls,
			failedCalls,
			totalCallTime,
			successRate,
			averageCallDuration,
			upcomingReminders,
		};

		return res.status(200).json({ stats });
	} catch (error) {
		console.error("Caller stats API error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
}
