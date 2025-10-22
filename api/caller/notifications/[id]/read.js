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

		// Update notification status to read
		const result = await pool.query("UPDATE call_notifications SET status = 'read', read_at = NOW() WHERE id = $1 AND caller_id = $2 RETURNING *", [
			id,
			userId,
		]);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: "Notification not found" });
		}

		return res.status(200).json({
			message: "Notification marked as read",
			notification: result.rows[0],
		});
	} catch (error) {
		console.error("Mark notification read API error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
}
