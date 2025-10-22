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
			// Get calls assigned to this caller
			const query = `
				SELECT cs.*, u.full_name as created_by_name
				FROM call_schedules cs
				LEFT JOIN users u ON cs.created_by = u.id
				WHERE cs.assigned_caller_id = $1
				ORDER BY cs.scheduled_time ASC
			`;

			const result = await pool.query(query, [userId]);

			return res.status(200).json({
				calls: result.rows,
			});
		}

		if (req.method === "POST") {
			// Create new call schedule (if caller has permission to create)
			const {
				contact_name,
				company,
				phone_number,
				email,
				call_type = "follow_up",
				scheduled_time,
				duration_minutes = 30,
				priority = "medium",
				notes,
				preparation_notes,
				auto_dial_enabled = false,
				recording_enabled = false,
				follow_up_required = false,
				reminder_minutes = [15, 5],
				related_entity_type,
				related_entity_id,
			} = req.body;

			if (!contact_name || !scheduled_time) {
				return res.status(400).json({ error: "Contact name and scheduled time are required" });
			}

			const query = `
				INSERT INTO call_schedules (
					contact_name, company, phone_number, email, call_type, scheduled_time,
					duration_minutes, priority, notes, preparation_notes, assigned_caller_id,
					created_by, auto_dial_enabled, recording_enabled, follow_up_required,
					reminder_minutes, related_entity_type, related_entity_id
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
				RETURNING *
			`;

			const values = [
				contact_name,
				company,
				phone_number,
				email,
				call_type,
				scheduled_time,
				duration_minutes,
				priority,
				notes,
				preparation_notes,
				userId,
				userId,
				auto_dial_enabled,
				recording_enabled,
				follow_up_required,
				reminder_minutes,
				related_entity_type,
				related_entity_id,
			];

			const result = await pool.query(query, values);

			// Create notification for the new call
			const notificationQuery = `
				INSERT INTO call_notifications (
					call_id, caller_id, notification_type, title, message, scheduled_for, priority
				) VALUES ($1, $2, $3, $4, $5, $6, $7)
			`;

			const scheduledTime = new Date(scheduled_time);
			const reminderTime = new Date(scheduledTime.getTime() - (reminder_minutes[0] || 15) * 60000);

			await pool.query(notificationQuery, [
				result.rows[0].id,
				userId,
				"assignment",
				"New Call Assigned",
				`You have been assigned a new call with ${contact_name} at ${company || "N/A"}`,
				reminderTime.toISOString(),
				priority,
			]);

			return res.status(201).json({
				message: "Call scheduled successfully",
				call: result.rows[0],
			});
		}

		return res.status(405).json({ error: "Method not allowed" });
	} catch (error) {
		console.error("Caller calls API error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
}
