// Admin Top Users API
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

		const { limit = 10, sort_by = "activity" } = req.query;

		// Get top users based on different criteria
		const users = await getTopUsers({
			limit: Number.parseInt(limit),
			sortBy: sort_by,
		});

		return res.json({
			success: true,
			users,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Admin Top Users API error:", error);
		if (error.name === "JsonWebTokenError") {
			return res.status(401).json({ error: "Invalid token" });
		}
		return res.status(500).json({ error: "Internal server error" });
	}
}

async function getTopUsers({ limit, sortBy }) {
	try {
		let orderClause = "";
		let selectClause = "";

		switch (sortBy) {
			case "projects":
				selectClause = `
					u.id,
					u.username,
					u.full_name,
					u.role,
					u.last_login,
					u.created_at,
					COUNT(DISTINCT p.id) as total_projects,
					COUNT(DISTINCT t.id) as total_tasks,
					COUNT(DISTINCT ja.id) as total_applications,
					COUNT(DISTINCT al.id) as total_activities
				`;
				orderClause = "ORDER BY total_projects DESC, total_tasks DESC";
				break;

			case "applications":
				selectClause = `
					u.id,
					u.username,
					u.full_name,
					u.role,
					u.last_login,
					u.created_at,
					COUNT(DISTINCT p.id) as total_projects,
					COUNT(DISTINCT t.id) as total_tasks,
					COUNT(DISTINCT ja.id) as total_applications,
					COUNT(DISTINCT al.id) as total_activities
				`;
				orderClause = "ORDER BY total_applications DESC, total_activities DESC";
				break;

			case "recent":
				selectClause = `
					u.id,
					u.username,
					u.full_name,
					u.role,
					u.last_login,
					u.created_at,
					COUNT(DISTINCT p.id) as total_projects,
					COUNT(DISTINCT t.id) as total_tasks,
					COUNT(DISTINCT ja.id) as total_applications,
					COUNT(DISTINCT al.id) as total_activities
				`;
				orderClause = "ORDER BY u.last_login DESC NULLS LAST, u.created_at DESC";
				break;

			case "activity":
			default:
				selectClause = `
					u.id,
					u.username,
					u.full_name,
					u.role,
					u.last_login,
					u.created_at,
					COUNT(DISTINCT p.id) as total_projects,
					COUNT(DISTINCT t.id) as total_tasks,
					COUNT(DISTINCT ja.id) as total_applications,
					COUNT(DISTINCT al.id) as total_activities
				`;
				orderClause = "ORDER BY total_activities DESC, u.last_login DESC NULLS LAST";
				break;
		}

		const topUsersQuery = `
			SELECT ${selectClause}
			FROM users u
			LEFT JOIN projects p ON u.id = p.created_by
			LEFT JOIN tasks t ON u.id = t.created_by OR u.id = t.assigned_to
			LEFT JOIN job_applications ja ON u.id = ja.user_id
			LEFT JOIN activity_logs al ON u.id = al.user_id 
				AND al.created_at >= NOW() - INTERVAL '30 days'
			WHERE u.is_active = true
			GROUP BY u.id, u.username, u.full_name, u.role, u.last_login, u.created_at
			${orderClause}
			LIMIT $1
		`;

		const users = await query(topUsersQuery, [limit]);

		// Get additional caller-specific stats for caller users
		const callerIds = users.filter((u) => u.role === 2).map((u) => u.id);
		let callerStats = {};

		if (callerIds.length > 0) {
			try {
				const callerStatsQuery = `
					SELECT 
						caller_id,
						COUNT(*) as total_calls,
						COUNT(CASE WHEN activity_type = 'call_completed' THEN 1 END) as completed_calls,
						AVG(duration_minutes) as avg_call_duration
					FROM caller_activity_logs
					WHERE caller_id = ANY($1)
					AND created_at >= NOW() - INTERVAL '30 days'
					GROUP BY caller_id
				`;

				const callerStatsResult = await query(callerStatsQuery, [callerIds]);
				callerStats = callerStatsResult.reduce((acc, stat) => {
					acc[stat.caller_id] = {
						total_calls: Number.parseInt(stat.total_calls) || 0,
						completed_calls: Number.parseInt(stat.completed_calls) || 0,
						avg_call_duration: Number.parseFloat(stat.avg_call_duration) || 0,
						success_rate: stat.total_calls > 0 ? ((stat.completed_calls / stat.total_calls) * 100).toFixed(1) : "0.0",
					};
					return acc;
				}, {});
			} catch (error) {
				console.log("Caller stats not available:", error.message);
			}
		}

		// Format users for frontend consumption
		return users.map((user) => ({
			id: user.id,
			username: user.username,
			full_name: user.full_name,
			role: user.role,
			role_name: getRoleName(user.role),
			last_login: user.last_login,
			created_at: user.created_at,
			total_projects: Number.parseInt(user.total_projects) || 0,
			total_tasks: Number.parseInt(user.total_tasks) || 0,
			total_applications: Number.parseInt(user.total_applications) || 0,
			total_activities: Number.parseInt(user.total_activities) || 0,
			// Add caller-specific stats if available
			...(callerStats[user.id] && {
				caller_stats: callerStats[user.id],
			}),
			// Calculate activity score
			activity_score: calculateActivityScore({
				projects: Number.parseInt(user.total_projects) || 0,
				tasks: Number.parseInt(user.total_tasks) || 0,
				applications: Number.parseInt(user.total_applications) || 0,
				activities: Number.parseInt(user.total_activities) || 0,
				callerStats: callerStats[user.id],
			}),
		}));
	} catch (error) {
		console.error("Error fetching top users:", error);
		throw error;
	}
}

function getRoleName(role) {
	switch (role) {
		case 0:
			return "Admin";
		case 1:
			return "User";
		case 2:
			return "Caller";
		default:
			return "Unknown";
	}
}

function calculateActivityScore({ projects, tasks, applications, activities, callerStats }) {
	let score = 0;

	// Base scoring
	score += projects * 10; // Projects are worth more
	score += tasks * 5; // Tasks are moderately valuable
	score += applications * 8; // Job applications are important
	score += activities * 1; // General activities

	// Caller-specific scoring
	if (callerStats) {
		score += callerStats.completed_calls * 15; // Completed calls are very valuable
		score += Number.parseFloat(callerStats.success_rate) * 2; // Success rate bonus
	}

	return Math.round(score);
}
