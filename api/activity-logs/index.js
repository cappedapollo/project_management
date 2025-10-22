// Vercel Serverless Function - Activity Logs (Read-only for audit trail)
import jwt from "jsonwebtoken";
import { query } from "../../backend/db-postgres.js";

export default async function handler(req, res) {
	// Set CORS headers
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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
			case "POST":
				return await handlePost(req, res, decoded);
			default:
				return res.status(405).json({ error: "Method not allowed" });
		}
	} catch (error) {
		console.error("Activity Logs API error:", error);
		if (error.name === "JsonWebTokenError") {
			return res.status(401).json({ error: "Invalid token" });
		}
		return res.status(500).json({ error: "Internal server error" });
	}
}

// GET - List activity logs (admin only for full access, users see their own)
async function handleGet(req, res, decoded) {
	const { user_id, entity_type, action, limit = 100, offset = 0 } = req.query;

	// Build dynamic query based on filters
	let queryStr = `
		SELECT al.*, u.username, u.full_name
		FROM activity_logs al
		LEFT JOIN users u ON al.user_id = u.id
		WHERE 1=1
	`;

	const params = [];
	let paramCount = 0;

	// If not admin, only show user's own activity
	if (decoded.role !== 0) {
		paramCount++;
		queryStr += ` AND al.user_id = $${paramCount}`;
		params.push(decoded.userId);
	} else if (user_id) {
		// Admin can filter by specific user
		paramCount++;
		queryStr += ` AND al.user_id = $${paramCount}`;
		params.push(user_id);
	}

	if (entity_type) {
		paramCount++;
		queryStr += ` AND al.entity_type = $${paramCount}`;
		params.push(entity_type);
	}

	if (action) {
		paramCount++;
		queryStr += ` AND al.action ILIKE $${paramCount}`;
		params.push(`%${action}%`);
	}

	queryStr += " ORDER BY al.created_at DESC";

	// Add pagination
	paramCount++;
	queryStr += ` LIMIT $${paramCount}`;
	params.push(Number.parseInt(limit));

	paramCount++;
	queryStr += ` OFFSET $${paramCount}`;
	params.push(Number.parseInt(offset));

	const logs = await query(queryStr, params);

	// Get total count for pagination
	let countQuery = `
		SELECT COUNT(*) as total
		FROM activity_logs al
		WHERE 1=1
	`;

	const countParams = [];
	let countParamCount = 0;

	if (decoded.role !== 0) {
		countParamCount++;
		countQuery += ` AND al.user_id = $${countParamCount}`;
		countParams.push(decoded.userId);
	} else if (user_id) {
		countParamCount++;
		countQuery += ` AND al.user_id = $${countParamCount}`;
		countParams.push(user_id);
	}

	if (entity_type) {
		countParamCount++;
		countQuery += ` AND al.entity_type = $${countParamCount}`;
		countParams.push(entity_type);
	}

	if (action) {
		countParamCount++;
		countQuery += ` AND al.action ILIKE $${countParamCount}`;
		countParams.push(`%${action}%`);
	}

	const countResult = await query(countQuery, countParams);
	const total = Number.parseInt(countResult[0].total);

	return res.json({
		success: true,
		logs,
		pagination: {
			total,
			limit: Number.parseInt(limit),
			offset: Number.parseInt(offset),
			has_more: total > Number.parseInt(offset) + Number.parseInt(limit),
		},
	});
}

// POST - Create activity log entry (internal use)
async function handlePost(req, res, decoded) {
	const { action, entity_type, entity_id, details } = req.body;

	if (!action) {
		return res.status(400).json({ error: "Action is required" });
	}

	const result = await query(
		`INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING *`,
		[
			decoded.userId,
			action,
			entity_type,
			entity_id,
			details ? JSON.stringify(details) : null,
			req.headers["x-forwarded-for"] || req.connection?.remoteAddress || "unknown",
			req.headers["user-agent"] || "unknown",
		],
	);

	return res.status(201).json({
		success: true,
		message: "Activity logged successfully",
		log: result[0],
	});
}

// Helper function to log activity (can be imported by other API endpoints)
export async function logActivity(userId, action, entityType = null, entityId = null, details = null, req = null) {
	try {
		await query(
			`INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			[
				userId,
				action,
				entityType,
				entityId,
				details ? JSON.stringify(details) : null,
				req?.headers["x-forwarded-for"] || req?.connection?.remoteAddress || "system",
				req?.headers["user-agent"] || "system",
			],
		);
	} catch (error) {
		console.error("Failed to log activity:", error);
		// Don't throw error - activity logging should not break main functionality
	}
}
