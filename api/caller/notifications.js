import { pool } from "../../backend/db-postgres.js";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
	// Set CORS headers
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

	if (req.method === "OPTIONS") {
		return res.status(200).end();
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

		if (req.method === "GET") {
			// Get notifications for this caller
			const query = `
				SELECT cn.*, cs.contact_name, cs.company, cs.scheduled_time, cs.call_type
				FROM call_notifications cn
				LEFT JOIN call_schedules cs ON cn.call_id = cs.id
				WHERE cn.caller_id = $1
				ORDER BY cn.scheduled_for DESC, cn.priority DESC
				LIMIT 50
			`;

			const result = await pool.query(query, [userId]);

			// Format notifications with call details
			const notifications = result.rows.map((row) => ({
				id: row.id,
				call_id: row.call_id,
				caller_id: row.caller_id,
				notification_type: row.notification_type,
				title: row.title,
				message: row.message,
				scheduled_for: row.scheduled_for,
				status: row.status,
				priority: row.priority,
				delivery_method: row.delivery_method,
				created_at: row.created_at,
				sent_at: row.sent_at,
				read_at: row.read_at,
				call_details: row.contact_name
					? {
							contact_name: row.contact_name,
							company: row.company,
							scheduled_time: row.scheduled_time,
							call_type: row.call_type,
						}
					: null,
			}));

			return res.status(200).json({
				notifications,
			});
		}

		if (req.method === "POST") {
			// Create new notification
			const { call_id, notification_type = "reminder", title, message, scheduled_for, priority = "medium", delivery_method = "in_app" } = req.body;

			if (!title || !message || !scheduled_for) {
				return res.status(400).json({ error: "Title, message, and scheduled_for are required" });
			}

			const query = `
				INSERT INTO call_notifications (
					call_id, caller_id, notification_type, title, message, 
					scheduled_for, priority, delivery_method
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
				RETURNING *
			`;

			const values = [call_id, userId, notification_type, title, message, scheduled_for, priority, delivery_method];

			const result = await pool.query(query, values);

			return res.status(201).json({
				message: "Notification created successfully",
				notification: result.rows[0],
			});
		}

		return res.status(405).json({ error: "Method not allowed" });
	} catch (error) {
		console.error("Caller notifications API error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
}
