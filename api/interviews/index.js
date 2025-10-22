// Vercel Serverless Function - Interviews CRUD
import jwt from "jsonwebtoken";
import { query } from "../../backend/db-postgres.js";
import { logActivity } from "../activity-logs/index.js";

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
		console.error("Interviews API error:", error);
		if (error.name === "JsonWebTokenError") {
			return res.status(401).json({ error: "Invalid token" });
		}
		return res.status(500).json({ error: "Internal server error" });
	}
}

// GET - List interviews or get specific interview
async function handleGet(req, res, decoded) {
	const { id, user_id, status, upcoming } = req.query;

	if (id) {
		// Get specific interview
		const interviews = await query(
			`SELECT i.*, 
					ja.company_name, ja.position_title,
					u.username, u.full_name
			 FROM interviews i
			 LEFT JOIN job_applications ja ON i.job_application_id = ja.id
			 LEFT JOIN users u ON i.user_id = u.id
			 WHERE i.id = $1`,
			[id],
		);

		if (interviews.length === 0) {
			return res.status(404).json({ error: "Interview not found" });
		}

		return res.json({
			success: true,
			interview: interviews[0],
		});
	}
	// Build dynamic query based on filters
	let queryStr = `
			SELECT i.*, 
				   ja.company_name, ja.position_title,
				   u.username, u.full_name
			FROM interviews i
			LEFT JOIN job_applications ja ON i.job_application_id = ja.id
			LEFT JOIN users u ON i.user_id = u.id
			WHERE 1=1
		`;

	const params = [];
	let paramCount = 0;

	// If not admin, only show user's own interviews
	if (decoded.role !== 0) {
		paramCount++;
		queryStr += ` AND i.user_id = $${paramCount}`;
		params.push(decoded.userId);
	} else if (user_id) {
		// Admin can filter by specific user
		paramCount++;
		queryStr += ` AND i.user_id = $${paramCount}`;
		params.push(user_id);
	}

	if (status) {
		paramCount++;
		queryStr += ` AND i.status = $${paramCount}`;
		params.push(status);
	}

	if (upcoming === "true") {
		queryStr += " AND i.scheduled_date > NOW()";
	}

	queryStr += " ORDER BY i.scheduled_date ASC";

	const interviews = await query(queryStr, params);

	return res.json({
		success: true,
		interviews,
	});
}

// POST - Create new interview
async function handlePost(req, res, decoded) {
	const {
		job_application_id,
		interview_type = "video",
		scheduled_date,
		duration_minutes = 60,
		interviewer_name,
		interviewer_email,
		location,
		meeting_link,
		status = "scheduled",
		notes,
	} = req.body;

	if (!job_application_id || !scheduled_date) {
		return res.status(400).json({ error: "Job application ID and scheduled date are required" });
	}

	// Verify job application exists and user has access
	const application = await query("SELECT * FROM job_applications WHERE id = $1", [job_application_id]);
	if (application.length === 0) {
		return res.status(404).json({ error: "Job application not found" });
	}

	if (decoded.role !== 0 && application[0].user_id !== decoded.userId) {
		return res.status(403).json({ error: "Permission denied" });
	}

	const result = await query(
		`INSERT INTO interviews (job_application_id, user_id, interview_type, scheduled_date, duration_minutes, interviewer_name, interviewer_email, location, meeting_link, status, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		 RETURNING *`,
		[
			job_application_id,
			decoded.userId,
			interview_type,
			scheduled_date,
			duration_minutes,
			interviewer_name,
			interviewer_email,
			location,
			meeting_link,
			status,
			notes,
		],
	);

	return res.status(201).json({
		success: true,
		message: "Interview created successfully",
		interview: result[0],
	});
}

// PUT - Update interview
async function handlePut(req, res, decoded) {
	const { id } = req.query;
	const { interview_type, scheduled_date, duration_minutes, interviewer_name, interviewer_email, location, meeting_link, status, notes, feedback, rating } =
		req.body;

	if (!id) {
		return res.status(400).json({ error: "Interview ID is required" });
	}

	// Check if interview exists and user has permission
	const existingInterview = await query("SELECT * FROM interviews WHERE id = $1", [id]);
	if (existingInterview.length === 0) {
		return res.status(404).json({ error: "Interview not found" });
	}

	if (decoded.role !== 0 && existingInterview[0].user_id !== decoded.userId) {
		return res.status(403).json({ error: "Permission denied" });
	}

	const result = await query(
		`UPDATE interviews 
		 SET interview_type = COALESCE($1, interview_type),
			 scheduled_date = COALESCE($2, scheduled_date),
			 duration_minutes = COALESCE($3, duration_minutes),
			 interviewer_name = COALESCE($4, interviewer_name),
			 interviewer_email = COALESCE($5, interviewer_email),
			 location = COALESCE($6, location),
			 meeting_link = COALESCE($7, meeting_link),
			 status = COALESCE($8, status),
			 notes = COALESCE($9, notes),
			 feedback = COALESCE($10, feedback),
			 rating = COALESCE($11, rating)
		 WHERE id = $12
		 RETURNING *`,
		[interview_type, scheduled_date, duration_minutes, interviewer_name, interviewer_email, location, meeting_link, status, notes, feedback, rating, id],
	);

	return res.json({
		success: true,
		message: "Interview updated successfully",
		interview: result[0],
	});
}

// DELETE - Delete interview
async function handleDelete(req, res, decoded) {
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({ error: "Interview ID is required" });
	}

	// Check if interview exists and user has permission
	const interview = await query("SELECT * FROM interviews WHERE id = $1", [id]);
	if (interview.length === 0) {
		return res.status(404).json({ error: "Interview not found" });
	}

	if (decoded.role !== 0 && interview[0].user_id !== decoded.userId) {
		return res.status(403).json({ error: "Permission denied" });
	}

	await query("DELETE FROM interviews WHERE id = $1", [id]);

	return res.json({
		success: true,
		message: "Interview deleted successfully",
	});
}
