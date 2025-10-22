// Vercel Serverless Function - Job Applications CRUD
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
		console.error("Job Applications API error:", error);
		if (error.name === "JsonWebTokenError") {
			return res.status(401).json({ error: "Invalid token" });
		}
		return res.status(500).json({ error: "Internal server error" });
	}
}

// GET - List job applications or get specific application
async function handleGet(req, res, decoded) {
	const { id, user_id, status } = req.query;

	if (id) {
		// Get specific job application
		const applications = await query(
			`SELECT ja.*, u.username, u.full_name,
					COUNT(i.id) as interview_count
			 FROM job_applications ja
			 LEFT JOIN users u ON ja.user_id = u.id
			 LEFT JOIN interviews i ON ja.id = i.job_application_id
			 WHERE ja.id = $1
			 GROUP BY ja.id, u.username, u.full_name`,
			[id],
		);

		if (applications.length === 0) {
			return res.status(404).json({ error: "Job application not found" });
		}

		// Get related interviews
		const interviews = await query("SELECT * FROM interviews WHERE job_application_id = $1 ORDER BY scheduled_date DESC", [id]);

		return res.json({
			success: true,
			application: { ...applications[0], interviews },
		});
	}
	// Build dynamic query based on filters
	let queryStr = `
			SELECT ja.*, u.username, u.full_name,
				   COUNT(i.id) as interview_count
			FROM job_applications ja
			LEFT JOIN users u ON ja.user_id = u.id
			LEFT JOIN interviews i ON ja.id = i.job_application_id
			WHERE 1=1
		`;

	const params = [];
	let paramCount = 0;

	// If not admin, only show user's own applications
	if (decoded.role !== 0) {
		paramCount++;
		queryStr += ` AND ja.user_id = $${paramCount}`;
		params.push(decoded.userId);
	} else if (user_id) {
		// Admin can filter by specific user
		paramCount++;
		queryStr += ` AND ja.user_id = $${paramCount}`;
		params.push(user_id);
	}

	if (status) {
		paramCount++;
		queryStr += ` AND ja.status = $${paramCount}`;
		params.push(status);
	}

	queryStr += " GROUP BY ja.id, u.username, u.full_name ORDER BY ja.created_at DESC";

	const applications = await query(queryStr, params);

	return res.json({
		success: true,
		applications,
	});
}

// POST - Create new job application
async function handlePost(req, res, decoded) {
	const {
		company_name,
		position_title,
		application_date,
		status = "applied",
		job_description,
		salary_range,
		location,
		application_url,
		notes,
		follow_up_date,
	} = req.body;

	if (!company_name || !position_title) {
		return res.status(400).json({ error: "Company name and position title are required" });
	}

	const result = await query(
		`INSERT INTO job_applications (user_id, company_name, position_title, application_date, status, job_description, salary_range, location, application_url, notes, follow_up_date)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		 RETURNING *`,
		[decoded.userId, company_name, position_title, application_date, status, job_description, salary_range, location, application_url, notes, follow_up_date],
	);

	// Log the activity
	await logActivity(
		decoded.userId,
		"applied",
		"job_application",
		result[0].id,
		`${position_title} at ${company_name}`,
		{
			company_name,
			position_title,
			status,
			application_date,
			salary_range,
			location,
		},
		req,
	);

	return res.status(201).json({
		success: true,
		message: "Job application created successfully",
		application: result[0],
	});
}

// PUT - Update job application
async function handlePut(req, res, decoded) {
	const { id } = req.query;
	const { company_name, position_title, application_date, status, job_description, salary_range, location, application_url, notes, follow_up_date } = req.body;

	if (!id) {
		return res.status(400).json({ error: "Application ID is required" });
	}

	// Check if application exists and user has permission
	const existingApp = await query("SELECT * FROM job_applications WHERE id = $1", [id]);
	if (existingApp.length === 0) {
		return res.status(404).json({ error: "Job application not found" });
	}

	if (decoded.role !== 0 && existingApp[0].user_id !== decoded.userId) {
		return res.status(403).json({ error: "Permission denied" });
	}

	const result = await query(
		`UPDATE job_applications 
		 SET company_name = COALESCE($1, company_name),
			 position_title = COALESCE($2, position_title),
			 application_date = COALESCE($3, application_date),
			 status = COALESCE($4, status),
			 job_description = COALESCE($5, job_description),
			 salary_range = COALESCE($6, salary_range),
			 location = COALESCE($7, location),
			 application_url = COALESCE($8, application_url),
			 notes = COALESCE($9, notes),
			 follow_up_date = COALESCE($10, follow_up_date)
		 WHERE id = $11
		 RETURNING *`,
		[company_name, position_title, application_date, status, job_description, salary_range, location, application_url, notes, follow_up_date, id],
	);

	// Log the activity if status changed
	if (status && status !== existingApp[0].status) {
		await logActivity(
			decoded.userId,
			"status_changed",
			"job_application",
			Number.parseInt(id),
			`${result[0].position_title} at ${result[0].company_name}`,
			{
				old_status: existingApp[0].status,
				new_status: status,
				company_name: result[0].company_name,
				position_title: result[0].position_title,
			},
			req,
		);
	} else if (company_name || position_title || application_date || job_description || salary_range || location || application_url || notes || follow_up_date) {
		// Log general update activity
		await logActivity(
			decoded.userId,
			"updated",
			"job_application",
			Number.parseInt(id),
			`${result[0].position_title} at ${result[0].company_name}`,
			{
				updated_fields: Object.keys(req.body).filter((key) => req.body[key] !== undefined),
			},
			req,
		);
	}

	return res.json({
		success: true,
		message: "Job application updated successfully",
		application: result[0],
	});
}

// DELETE - Delete job application
async function handleDelete(req, res, decoded) {
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({ error: "Application ID is required" });
	}

	// Check if application exists and user has permission
	const application = await query("SELECT * FROM job_applications WHERE id = $1", [id]);
	if (application.length === 0) {
		return res.status(404).json({ error: "Job application not found" });
	}

	if (decoded.role !== 0 && application[0].user_id !== decoded.userId) {
		return res.status(403).json({ error: "Permission denied" });
	}

	await query("DELETE FROM job_applications WHERE id = $1", [id]);

	return res.json({
		success: true,
		message: "Job application deleted successfully",
	});
}
