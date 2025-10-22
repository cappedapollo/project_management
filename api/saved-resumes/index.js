// Vercel Serverless Function - Saved Resumes CRUD
import jwt from "jsonwebtoken";
import { query } from "../../backend/db-postgres.js";

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

		switch (req.method) {
			case "GET":
				return await handleGet(req, res, decoded);
			case "POST":
				return await handlePost(req, res, decoded);
			case "PUT":
				return await handlePut(req, res, decoded);
			case "DELETE":
				return await handleDelete(req, res, decoded);
			default:
				return res.status(405).json({ error: "Method not allowed" });
		}
	} catch (error) {
		console.error("Saved Resumes API error:", error);
		if (error.name === "JsonWebTokenError") {
			return res.status(401).json({ error: "Invalid token" });
		}
		return res.status(500).json({ error: "Internal server error" });
	}
}

// GET - List saved resumes or get specific resume
async function handleGet(req, res, decoded) {
	const { id, user_id } = req.query;

	if (id) {
		// Get specific resume
		const resumes = await query(
			`SELECT sr.*, u.username, u.full_name
			 FROM saved_resumes sr
			 LEFT JOIN users u ON sr.user_id = u.id
			 WHERE sr.id = $1`,
			[id],
		);

		if (resumes.length === 0) {
			return res.status(404).json({ error: "Resume not found" });
		}

		// Check permission
		if (decoded.role !== 0 && resumes[0].user_id !== decoded.userId) {
			return res.status(403).json({ error: "Permission denied" });
		}

		return res.json({
			success: true,
			resume: resumes[0],
		});
	}
	// Build dynamic query based on filters
	let queryStr = `
			SELECT sr.*, u.username, u.full_name,
				   COUNT(p.id) as proposal_count
			FROM saved_resumes sr
			LEFT JOIN users u ON sr.user_id = u.id
			LEFT JOIN proposals p ON sr.id = p.saved_resume_id
			WHERE 1=1
		`;

	const params = [];
	let paramCount = 0;

	// If not admin, only show user's own resumes
	if (decoded.role !== 0) {
		paramCount++;
		queryStr += ` AND sr.user_id = $${paramCount}`;
		params.push(decoded.userId);
	} else if (user_id) {
		// Admin can filter by specific user
		paramCount++;
		queryStr += ` AND sr.user_id = $${paramCount}`;
		params.push(user_id);
	}

	queryStr += " GROUP BY sr.id, u.username, u.full_name ORDER BY sr.is_default DESC, sr.created_at DESC";

	const resumes = await query(queryStr, params);

	return res.json({
		success: true,
		resumes,
	});
}

// POST - Create new saved resume
async function handlePost(req, res, decoded) {
	const { title, content, resume_json, file_path, file_type = "pdf", is_default = false } = req.body;

	if (!title) {
		return res.status(400).json({ error: "Resume title is required" });
	}

	// If setting as default, unset other defaults for this user
	if (is_default) {
		await query("UPDATE saved_resumes SET is_default = FALSE WHERE user_id = $1", [decoded.userId]);
	}

	const result = await query(
		`INSERT INTO saved_resumes (user_id, title, content, resume_json, file_path, file_type, is_default)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING *`,
		[decoded.userId, title, content, resume_json, file_path, file_type, is_default],
	);

	return res.status(201).json({
		success: true,
		message: "Resume saved successfully",
		resume: result[0],
	});
}

// PUT - Update saved resume
async function handlePut(req, res, decoded) {
	const { id } = req.query;
	const { title, content, resume_json, file_path, file_type, is_default } = req.body;

	if (!id) {
		return res.status(400).json({ error: "Resume ID is required" });
	}

	// Check if resume exists and user has permission
	const existingResume = await query("SELECT * FROM saved_resumes WHERE id = $1", [id]);
	if (existingResume.length === 0) {
		return res.status(404).json({ error: "Resume not found" });
	}

	if (decoded.role !== 0 && existingResume[0].user_id !== decoded.userId) {
		return res.status(403).json({ error: "Permission denied" });
	}

	// If setting as default, unset other defaults for this user
	if (is_default && !existingResume[0].is_default) {
		await query("UPDATE saved_resumes SET is_default = FALSE WHERE user_id = $1 AND id != $2", [existingResume[0].user_id, id]);
	}

	const result = await query(
		`UPDATE saved_resumes 
		 SET title = COALESCE($1, title),
			 content = COALESCE($2, content),
			 resume_json = COALESCE($3, resume_json),
			 file_path = COALESCE($4, file_path),
			 file_type = COALESCE($5, file_type),
			 is_default = COALESCE($6, is_default)
		 WHERE id = $7
		 RETURNING *`,
		[title, content, resume_json, file_path, file_type, is_default, id],
	);

	return res.json({
		success: true,
		message: "Resume updated successfully",
		resume: result[0],
	});
}

// DELETE - Delete saved resume
async function handleDelete(req, res, decoded) {
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({ error: "Resume ID is required" });
	}

	// Check if resume exists and user has permission
	const resume = await query("SELECT * FROM saved_resumes WHERE id = $1", [id]);
	if (resume.length === 0) {
		return res.status(404).json({ error: "Resume not found" });
	}

	if (decoded.role !== 0 && resume[0].user_id !== decoded.userId) {
		return res.status(403).json({ error: "Permission denied" });
	}

	await query("DELETE FROM saved_resumes WHERE id = $1", [id]);

	return res.json({
		success: true,
		message: "Resume deleted successfully",
	});
}
