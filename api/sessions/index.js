// Vercel Serverless Function - Sessions Management
import jwt from "jsonwebtoken";
import { query } from "../../backend/db-postgres.js";

export default async function handler(req, res) {
	// Set CORS headers
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
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

		switch (req.method) {
			case "GET":
				return await handleGet(req, res, decoded);
			case "DELETE":
				return await handleDelete(req, res, decoded);
			default:
				return res.status(405).json({ error: "Method not allowed" });
		}
	} catch (error) {
		console.error("Sessions API error:", error);
		if (error.name === "JsonWebTokenError") {
			return res.status(401).json({ error: "Invalid token" });
		}
		return res.status(500).json({ error: "Internal server error" });
	}
}

// GET - List user sessions
async function handleGet(req, res, decoded) {
	const { user_id, active_only } = req.query;

	// Build dynamic query based on filters
	let queryStr = `
		SELECT s.*, u.username, u.full_name
		FROM sessions s
		LEFT JOIN users u ON s.user_id = u.id
		WHERE 1=1
	`;

	const params = [];
	let paramCount = 0;

	// If not admin, only show user's own sessions
	if (decoded.role !== 0) {
		paramCount++;
		queryStr += ` AND s.user_id = $${paramCount}`;
		params.push(decoded.userId);
	} else if (user_id) {
		// Admin can filter by specific user
		paramCount++;
		queryStr += ` AND s.user_id = $${paramCount}`;
		params.push(user_id);
	}

	if (active_only === "true") {
		queryStr += " AND s.is_active = TRUE AND s.expires_at > NOW()";
	}

	queryStr += " ORDER BY s.last_used DESC";

	const sessions = await query(queryStr, params);

	// Don't expose full token hashes for security
	const safeSessions = sessions.map((session) => ({
		...session,
		token_hash: `${session.token_hash.substring(0, 10)}...`,
		refresh_token_hash: session.refresh_token_hash ? `${session.refresh_token_hash.substring(0, 10)}...` : null,
	}));

	return res.json({
		success: true,
		sessions: safeSessions,
	});
}

// DELETE - Revoke session(s)
async function handleDelete(req, res, decoded) {
	const { id, revoke_all } = req.query;

	if (revoke_all === "true") {
		// Revoke all sessions for the user
		const targetUserId = decoded.role === 0 && req.query.user_id ? req.query.user_id : decoded.userId;

		await query("UPDATE sessions SET is_active = FALSE WHERE user_id = $1", [targetUserId]);

		return res.json({
			success: true,
			message: "All sessions revoked successfully",
		});
	}
	if (id) {
		// Revoke specific session
		const session = await query("SELECT * FROM sessions WHERE id = $1", [id]);
		if (session.length === 0) {
			return res.status(404).json({ error: "Session not found" });
		}

		// Check permission
		if (decoded.role !== 0 && session[0].user_id !== decoded.userId) {
			return res.status(403).json({ error: "Permission denied" });
		}

		await query("UPDATE sessions SET is_active = FALSE WHERE id = $1", [id]);

		return res.json({
			success: true,
			message: "Session revoked successfully",
		});
	}
	return res.status(400).json({ error: "Session ID or revoke_all parameter required" });
}
