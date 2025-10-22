// Vercel Serverless Function - Proposals CRUD
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
		console.error("Proposals API error:", error);
		if (error.name === "JsonWebTokenError") {
			return res.status(401).json({ error: "Invalid token" });
		}
		return res.status(500).json({ error: "Internal server error" });
	}
}

// GET - List proposals or get specific proposal
async function handleGet(req, res, decoded) {
	const { id, user_id, status } = req.query;

	if (id) {
		// Get specific proposal
		const proposals = await query(
			`SELECT p.*, 
					u.username, u.full_name,
					sr.title as resume_title
			 FROM proposals p
			 LEFT JOIN users u ON p.user_id = u.id
			 LEFT JOIN saved_resumes sr ON p.saved_resume_id = sr.id
			 WHERE p.id = $1`,
			[id],
		);

		if (proposals.length === 0) {
			return res.status(404).json({ error: "Proposal not found" });
		}

		// Check permission
		if (decoded.role !== 0 && proposals[0].user_id !== decoded.userId) {
			return res.status(403).json({ error: "Permission denied" });
		}

		return res.json({
			success: true,
			proposal: proposals[0],
		});
	}
	// Build dynamic query based on filters
	let queryStr = `
			SELECT p.*, 
				   u.username, u.full_name,
				   sr.title as resume_title
			FROM proposals p
			LEFT JOIN users u ON p.user_id = u.id
			LEFT JOIN saved_resumes sr ON p.saved_resume_id = sr.id
			WHERE 1=1
		`;

	const params = [];
	let paramCount = 0;

	// If not admin, only show user's own proposals
	if (decoded.role !== 0) {
		paramCount++;
		queryStr += ` AND p.user_id = $${paramCount}`;
		params.push(decoded.userId);
	} else if (user_id) {
		// Admin can filter by specific user
		paramCount++;
		queryStr += ` AND p.user_id = $${paramCount}`;
		params.push(user_id);
	}

	if (status) {
		paramCount++;
		queryStr += ` AND p.status = $${paramCount}`;
		params.push(status);
	}

	queryStr += " ORDER BY p.created_at DESC";

	const proposals = await query(queryStr, params);

	return res.json({
		success: true,
		proposals,
	});
}

// POST - Create new proposal
async function handlePost(req, res, decoded) {
	const { saved_resume_id, title, client_name, project_description, proposal_content, budget_amount, timeline, status = "draft" } = req.body;

	if (!title || !client_name) {
		return res.status(400).json({ error: "Title and client name are required" });
	}

	// Verify resume exists and belongs to user (if provided)
	if (saved_resume_id) {
		const resume = await query("SELECT * FROM saved_resumes WHERE id = $1", [saved_resume_id]);
		if (resume.length === 0) {
			return res.status(404).json({ error: "Resume not found" });
		}
		if (decoded.role !== 0 && resume[0].user_id !== decoded.userId) {
			return res.status(403).json({ error: "Resume access denied" });
		}
	}

	const result = await query(
		`INSERT INTO proposals (user_id, saved_resume_id, title, client_name, project_description, proposal_content, budget_amount, timeline, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING *`,
		[decoded.userId, saved_resume_id, title, client_name, project_description, proposal_content, budget_amount, timeline, status],
	);

	return res.status(201).json({
		success: true,
		message: "Proposal created successfully",
		proposal: result[0],
	});
}

// PUT - Update proposal
async function handlePut(req, res, decoded) {
	const { id } = req.query;
	const { saved_resume_id, title, client_name, project_description, proposal_content, budget_amount, timeline, status } = req.body;

	if (!id) {
		return res.status(400).json({ error: "Proposal ID is required" });
	}

	// Check if proposal exists and user has permission
	const existingProposal = await query("SELECT * FROM proposals WHERE id = $1", [id]);
	if (existingProposal.length === 0) {
		return res.status(404).json({ error: "Proposal not found" });
	}

	if (decoded.role !== 0 && existingProposal[0].user_id !== decoded.userId) {
		return res.status(403).json({ error: "Permission denied" });
	}

	// Verify resume exists and belongs to user (if provided)
	if (saved_resume_id && saved_resume_id !== existingProposal[0].saved_resume_id) {
		const resume = await query("SELECT * FROM saved_resumes WHERE id = $1", [saved_resume_id]);
		if (resume.length === 0) {
			return res.status(404).json({ error: "Resume not found" });
		}
		if (decoded.role !== 0 && resume[0].user_id !== decoded.userId) {
			return res.status(403).json({ error: "Resume access denied" });
		}
	}

	const result = await query(
		`UPDATE proposals 
		 SET saved_resume_id = COALESCE($1, saved_resume_id),
			 title = COALESCE($2, title),
			 client_name = COALESCE($3, client_name),
			 project_description = COALESCE($4, project_description),
			 proposal_content = COALESCE($5, proposal_content),
			 budget_amount = COALESCE($6, budget_amount),
			 timeline = COALESCE($7, timeline),
			 status = COALESCE($8, status)
		 WHERE id = $9
		 RETURNING *`,
		[saved_resume_id, title, client_name, project_description, proposal_content, budget_amount, timeline, status, id],
	);

	return res.json({
		success: true,
		message: "Proposal updated successfully",
		proposal: result[0],
	});
}

// DELETE - Delete proposal
async function handleDelete(req, res, decoded) {
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({ error: "Proposal ID is required" });
	}

	// Check if proposal exists and user has permission
	const proposal = await query("SELECT * FROM proposals WHERE id = $1", [id]);
	if (proposal.length === 0) {
		return res.status(404).json({ error: "Proposal not found" });
	}

	if (decoded.role !== 0 && proposal[0].user_id !== decoded.userId) {
		return res.status(403).json({ error: "Permission denied" });
	}

	await query("DELETE FROM proposals WHERE id = $1", [id]);

	return res.json({
		success: true,
		message: "Proposal deleted successfully",
	});
}
