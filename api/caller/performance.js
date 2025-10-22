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

		// Get performance data for the last 30 days
		const query = `
			SELECT * FROM caller_performance 
			WHERE caller_id = $1 
			AND date >= CURRENT_DATE - INTERVAL '30 days'
			ORDER BY date DESC
		`;

		const result = await pool.query(query, [userId]);

		return res.status(200).json({
			performance: result.rows,
		});
	} catch (error) {
		console.error("Caller performance API error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
}
