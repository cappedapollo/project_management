import { pool } from "../../../../backend/db-postgres.js";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
	// Set CORS headers
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "PUT, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

	if (req.method === "OPTIONS") {
		return res.status(200).end();
	}

	if (req.method !== "PUT") {
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

		const { id } = req.query;

		// Verify the call belongs to this caller and is scheduled
		const callCheck = await pool.query("SELECT id, contact_name, company, status FROM call_schedules WHERE id = $1 AND assigned_caller_id = $2", [id, userId]);

		if (callCheck.rows.length === 0) {
			return res.status(404).json({ error: "Call not found or not assigned to you" });
		}

		const call = callCheck.rows[0];

		if (call.status !== "scheduled") {
			return res.status(400).json({ error: "Call must be in scheduled status to start" });
		}

		// Update call status to in_progress
		const result = await pool.query("UPDATE call_schedules SET status = 'in_progress', updated_at = NOW() WHERE id = $1 RETURNING *", [id]);

		// Create notification for call start
		await pool.query(
			`
			INSERT INTO call_notifications (
				call_id, caller_id, notification_type, title, message, 
				scheduled_for, status, priority
			) VALUES ($1, $2, $3, $4, $5, NOW(), 'sent', 'medium')
		`,
			[id, userId, "status_change", "Call Started", `Call with ${call.contact_name} at ${call.company || "N/A"} has been started`],
		);

		return res.status(200).json({
			message: "Call started successfully",
			call: result.rows[0],
		});
	} catch (error) {
		console.error("Call start API error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
}
