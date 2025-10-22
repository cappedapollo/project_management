// Admin Recent Activity API - Shows comprehensive activity from all users and callers
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

		const { limit = 50, offset = 0, entity_type, user_role, days = 7 } = req.query;

		// Get comprehensive recent activities
		const activities = await getRecentActivities({
			limit: Number.parseInt(limit),
			offset: Number.parseInt(offset),
			entity_type,
			user_role: user_role ? Number.parseInt(user_role) : null,
			days: Number.parseInt(days),
		});

		return res.json({
			success: true,
			activities,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Admin Recent Activity API error:", error);
		if (error.name === "JsonWebTokenError") {
			return res.status(401).json({ error: "Invalid token" });
		}
		return res.status(500).json({ error: "Internal server error" });
	}
}

async function getRecentActivities({ limit, offset, entity_type, user_role, days }) {
	try {
		let whereClause = "WHERE al.created_at >= NOW() - INTERVAL $1 DAY";
		const params = [days];
		let paramCount = 1;

		if (entity_type) {
			paramCount++;
			whereClause += ` AND al.entity_type = $${paramCount}`;
			params.push(entity_type);
		}

		if (user_role !== null) {
			paramCount++;
			whereClause += ` AND u.role = $${paramCount}`;
			params.push(user_role);
		}

		// Main activity query combining regular activities and caller activities
		const activityQuery = `
			WITH regular_activities AS (
				SELECT 
					'user_activity' as source_type,
					al.id,
					al.user_id,
					u.username,
					u.full_name as user_name,
					CASE 
						WHEN u.role = 0 THEN 'Admin'
						WHEN u.role = 1 THEN 'User' 
						WHEN u.role = 2 THEN 'Caller'
						ELSE 'Unknown'
					END as user_role_name,
					u.role as user_role,
					al.action,
					al.entity_type,
					al.entity_id,
					COALESCE(al.entity_name, 
						CASE 
							WHEN al.entity_type = 'job_application' THEN 
								(SELECT CONCAT(position_title, ' at ', company_name) FROM job_applications WHERE id = al.entity_id)
							WHEN al.entity_type = 'interview' THEN 
								(SELECT CONCAT('Interview for ', ja.position_title, ' at ', ja.company_name) 
								 FROM interviews i 
								 JOIN job_applications ja ON i.job_application_id = ja.id 
								 WHERE i.id = al.entity_id)
							WHEN al.entity_type = 'project' THEN 
								(SELECT name FROM projects WHERE id = al.entity_id)
							WHEN al.entity_type = 'task' THEN 
								(SELECT title FROM tasks WHERE id = al.entity_id)
							ELSE CONCAT(al.entity_type, ' #', al.entity_id)
						END
					) as entity_name,
					al.details,
					al.ip_address,
					al.created_at,
					NULL as target_user_name,
					NULL as duration_minutes,
					NULL as outcome
				FROM activity_logs al
				LEFT JOIN users u ON al.user_id = u.id
				${whereClause}
			),
			caller_activities AS (
				SELECT 
					'caller_activity' as source_type,
					cal.id,
					cal.caller_id as user_id,
					cu.username,
					cu.full_name as user_name,
					'Caller' as user_role_name,
					cu.role as user_role,
					cal.activity_type as action,
					'call' as entity_type,
					cal.call_id as entity_id,
					CASE 
						WHEN cal.target_user_id IS NOT NULL THEN 
							CONCAT('Call to ', tu.full_name, ' (', tu.username, ')')
						ELSE 'System Call'
					END as entity_name,
					cal.details,
					cal.ip_address,
					cal.created_at,
					tu.full_name as target_user_name,
					cal.duration_minutes,
					cal.outcome
				FROM caller_activity_logs cal
				LEFT JOIN users cu ON cal.caller_id = cu.id
				LEFT JOIN users tu ON cal.target_user_id = tu.id
				WHERE cal.created_at >= NOW() - INTERVAL $1 DAY
			)
			SELECT * FROM regular_activities
			UNION ALL
			SELECT * FROM caller_activities
			ORDER BY created_at DESC
			LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
		`;

		params.push(limit, offset);

		let activities = [];
		try {
			activities = await query(activityQuery, params);
		} catch (error) {
			// If caller_activity_logs table doesn't exist, fall back to regular activities only
			console.log("Caller activity table not found, using regular activities only");
			const fallbackQuery = `
				SELECT 
					'user_activity' as source_type,
					al.id,
					al.user_id,
					u.username,
					u.full_name as user_name,
					CASE 
						WHEN u.role = 0 THEN 'Admin'
						WHEN u.role = 1 THEN 'User' 
						WHEN u.role = 2 THEN 'Caller'
						ELSE 'Unknown'
					END as user_role_name,
					u.role as user_role,
					al.action,
					al.entity_type,
					al.entity_id,
					COALESCE(al.entity_name, 
						CASE 
							WHEN al.entity_type = 'job_application' THEN 
								(SELECT CONCAT(position_title, ' at ', company_name) FROM job_applications WHERE id = al.entity_id)
							WHEN al.entity_type = 'interview' THEN 
								(SELECT CONCAT('Interview for ', ja.position_title, ' at ', ja.company_name) 
								 FROM interviews i 
								 JOIN job_applications ja ON i.job_application_id = ja.id 
								 WHERE i.id = al.entity_id)
							WHEN al.entity_type = 'project' THEN 
								(SELECT name FROM projects WHERE id = al.entity_id)
							WHEN al.entity_type = 'task' THEN 
								(SELECT title FROM tasks WHERE id = al.entity_id)
							ELSE CONCAT(al.entity_type, ' #', al.entity_id)
						END
					) as entity_name,
					al.details,
					al.ip_address,
					al.created_at,
					NULL as target_user_name,
					NULL as duration_minutes,
					NULL as outcome
				FROM activity_logs al
				LEFT JOIN users u ON al.user_id = u.id
				${whereClause}
				ORDER BY al.created_at DESC
				LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
			`;
			activities = await query(fallbackQuery, params);
		}

		// Format activities for frontend consumption
		return activities.map((activity) => ({
			id: activity.id,
			source_type: activity.source_type,
			user_id: activity.user_id,
			user_name: activity.user_name || activity.username || "Unknown User",
			user_role_name: activity.user_role_name,
			user_role: activity.user_role,
			action: activity.action,
			entity_type: activity.entity_type,
			entity_id: activity.entity_id,
			entity_name: activity.entity_name || `${activity.entity_type} #${activity.entity_id}`,
			details: activity.details,
			ip_address: activity.ip_address,
			created_at: activity.created_at,
			target_user_name: activity.target_user_name,
			duration_minutes: activity.duration_minutes,
			outcome: activity.outcome,
			// Add formatted description for display
			description: formatActivityDescription(activity),
		}));
	} catch (error) {
		console.error("Error fetching recent activities:", error);
		throw error;
	}
}

function formatActivityDescription(activity) {
	const userName = activity.user_name || activity.username || "Unknown User";
	const entityName = activity.entity_name || `${activity.entity_type} #${activity.entity_id}`;

	switch (activity.source_type) {
		case "caller_activity":
			switch (activity.action) {
				case "call_scheduled":
					return `${userName} scheduled a call with ${activity.target_user_name}`;
				case "call_started":
					return `${userName} started a call with ${activity.target_user_name}`;
				case "call_completed":
					return `${userName} completed a ${activity.duration_minutes}min call with ${activity.target_user_name}`;
				case "call_failed":
					return `${userName}'s call to ${activity.target_user_name} failed`;
				case "call_rescheduled":
					return `${userName} rescheduled a call with ${activity.target_user_name}`;
				case "call_cancelled":
					return `${userName} cancelled a call with ${activity.target_user_name}`;
				default:
					return `${userName} performed ${activity.action} on ${entityName}`;
			}
		default:
			switch (activity.action) {
				case "created":
					return `${userName} created ${entityName}`;
				case "updated":
					return `${userName} updated ${entityName}`;
				case "deleted":
					return `${userName} deleted ${entityName}`;
				case "applied":
					return `${userName} applied for ${entityName}`;
				case "scheduled":
					return `${userName} scheduled ${entityName}`;
				case "status_changed":
					return `${userName} changed status of ${entityName}`;
				case "login":
					return `${userName} logged in`;
				case "logout":
					return `${userName} logged out`;
				default:
					return `${userName} performed ${activity.action} on ${entityName}`;
			}
	}
}
