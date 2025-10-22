const { query } = require("../db");
const fs = require("node:fs");
const path = require("node:path");
const multer = require("multer");

// Configure multer for file uploads
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB limit
	},
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads/resumes");
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

// Get all proposals (admin sees all, user sees only their own)
async function getAllProposals(req, res) {
	try {
		console.log("getAllProposals called");
		console.log("User:", req.user);

		// Simple query for now
		let proposals;
		if (req.user.role === 0) {
			// Admin sees all
			proposals = await query(`
				SELECT p.*, u.username, u.email
				FROM proposals p
				JOIN users u ON p.user = u.id
				ORDER BY p.created_at DESC
				LIMIT 10
			`);
		} else {
			// User sees only their own
			proposals = await query(
				`
				SELECT p.*, u.username, u.email
				FROM proposals p
				JOIN users u ON p.user = u.id
				WHERE p.user = ?
				ORDER BY p.created_at DESC
				LIMIT 10
			`,
				[req.user.id],
			);
		}

		console.log("Proposals found:", proposals.length);

		res.json({
			success: true,
			proposals: proposals.map((proposal) => ({
				id: proposal.id,
				user: proposal.user,
				profile: proposal.profile,
				jobDescription: proposal.job_description,
				company: proposal.company,
				jobLink: proposal.job_link,
				coverLetter: proposal.cover_letter,
				resume: proposal.resume,
				resume_pdf_path: proposal.resume_pdf_path,
				status: proposal.status,
				appliedDate: proposal.applied_date,
				createdAt: proposal.created_at,
				updatedAt: proposal.updated_at,
				userInfo: {
					username: proposal.username,
					email: proposal.email,
				},
			})),
			pagination: {
				page: 1,
				limit: 10,
				total: proposals.length,
				pages: 1,
			},
		});
	} catch (error) {
		console.error("Get all proposals error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Get proposal by ID
async function getProposalById(req, res) {
	try {
		const { id } = req.params;

		const proposals = await query(
			`
			SELECT p.*, u.username, u.email,
				   pr.first_name, pr.last_name
			FROM proposals p
			JOIN users u ON p.user = u.id
			LEFT JOIN profiles pr ON p.user = pr.user
			WHERE p.id = ?
		`,
			[id],
		);

		if (proposals.length === 0) {
			return res.status(404).json({ error: "Proposal not found" });
		}

		const proposal = proposals[0];

		// Check if user can access this proposal (admin or owner)
		if (req.user.role !== 0 && req.user.id !== proposal.user) {
			return res.status(403).json({ error: "Access denied" });
		}

		res.json({
			success: true,
			proposal: {
				id: proposal.id,
				user: proposal.user,
				profile: proposal.profile,
				jobDescription: proposal.job_description,
				company: proposal.company,
				jobLink: proposal.job_link,
				coverLetter: proposal.cover_letter,
				resume: proposal.resume,
				resume_pdf_path: proposal.resume_pdf_path,
				status: proposal.status,
				appliedDate: proposal.applied_date,
				createdAt: proposal.created_at,
				updatedAt: proposal.updated_at,
				userInfo: {
					username: proposal.username,
					email: proposal.email,
					firstName: proposal.first_name,
					lastName: proposal.last_name,
				},
			},
		});
	} catch (error) {
		console.error("Get proposal by ID error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Create new proposal
async function createProposal(req, res) {
	try {
		const { profile, jobDescription, company, jobLink, coverLetter, resume, status = "applied", appliedDate } = req.body;

		if (!jobDescription || !company) {
			return res.status(400).json({ error: "Job description and company are required" });
		}

		// Convert empty strings to NULL for foreign key fields
		const formattedProfile = profile === "" ? null : profile;

		// Generate UUID for the proposal
		const proposalId = require("node:crypto").randomUUID();

		// Format the applied date properly for PostgreSQL
		let formattedAppliedDate = null;
		if (appliedDate) {
			try {
				formattedAppliedDate = new Date(appliedDate).toISOString().slice(0, 19).replace("T", " ");
			} catch (error) {
				console.log("Invalid applied date, using current date");
				formattedAppliedDate = new Date().toISOString().slice(0, 19).replace("T", " ");
			}
		}

		await query(
			`
			INSERT INTO proposals (
				id, user, profile, job_description, company, job_link, 
				cover_letter, resume, resume_pdf_path, status, applied_date, saved_resume_id, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
		`,
			[
				proposalId,
				req.user.id,
				formattedProfile,
				jobDescription,
				company,
				jobLink,
				coverLetter,
				req.body.resume || "PDF Resume Uploaded",
				req.body.resume_pdf_path || null,
				status,
				formattedAppliedDate,
				req.body.saved_resume_id || null,
			],
		);

		// Get created proposal
		const createdProposal = await query(
			`
			SELECT p.*, u.username, u.email,
				   pr.first_name, pr.last_name
			FROM proposals p
			JOIN users u ON p.user = u.id
			LEFT JOIN profiles pr ON p.user = pr.user
			WHERE p.id = ?
		`,
			[proposalId],
		);

		const proposal = createdProposal[0];

		res.status(201).json({
			success: true,
			proposal: {
				id: proposal.id,
				user: proposal.user,
				profile: proposal.profile,
				jobDescription: proposal.job_description,
				company: proposal.company,
				jobLink: proposal.job_link,
				coverLetter: proposal.cover_letter,
				resume: proposal.resume,
				resume_pdf_path: proposal.resume_pdf_path,
				status: proposal.status,
				appliedDate: proposal.applied_date,
				createdAt: proposal.created_at,
				updatedAt: proposal.updated_at,
				userInfo: {
					username: proposal.username,
					email: proposal.email,
					firstName: proposal.first_name,
					lastName: proposal.last_name,
				},
			},
		});
	} catch (error) {
		console.error("Create proposal error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Update proposal
async function updateProposal(req, res) {
	try {
		const { id } = req.params;
		const { profile, jobDescription, company, jobLink, coverLetter, resume, status, appliedDate } = req.body;

		console.log("Update proposal request:", { id, body: req.body });

		// Check if proposal exists and user can update it
		const existingProposals = await query("SELECT user FROM proposals WHERE id = ?", [id]);

		if (existingProposals.length === 0) {
			return res.status(404).json({ error: "Proposal not found" });
		}

		// Check if user can update this proposal (admin or owner)
		if (req.user.role !== 0 && req.user.id !== existingProposals[0].user) {
			return res.status(403).json({ error: "Access denied" });
		}

		// Build update query
		const updateFields = [];
		const values = [];

		// Convert empty strings to NULL for foreign key fields
		const formattedProfile = profile === "" ? null : profile;

		// Format the applied date properly for PostgreSQL
		let formattedAppliedDate = null;
		if (appliedDate) {
			try {
				formattedAppliedDate = new Date(appliedDate).toISOString().slice(0, 19).replace("T", " ");
			} catch (error) {
				console.log("Invalid applied date, using current date");
				formattedAppliedDate = new Date().toISOString().slice(0, 19).replace("T", " ");
			}
		}

		const fieldsMap = {
			profile: formattedProfile,
			job_description: jobDescription,
			company,
			job_link: jobLink,
			cover_letter: coverLetter,
			resume,
			resume_pdf_path: req.body.resume_pdf_path || null,
			status,
			applied_date: formattedAppliedDate,
		};

		for (const key of Object.keys(fieldsMap)) {
			if (fieldsMap[key] !== undefined) {
				updateFields.push(`${key} = ?`);
				values.push(fieldsMap[key]);
			}
		}

		if (updateFields.length === 0) {
			return res.status(400).json({ error: "No valid fields to update" });
		}

		updateFields.push("updated_at = NOW()");
		values.push(id);

		console.log("Update query:", `UPDATE proposals SET ${updateFields.join(", ")} WHERE id = ?`);
		console.log("Update values:", values);

		try {
			await query(`UPDATE proposals SET ${updateFields.join(", ")} WHERE id = ?`, values);
		} catch (dbError) {
			console.error("Database update error:", dbError);
			return res.status(500).json({ error: "Database update failed", details: dbError.message });
		}

		// Get updated proposal
		const updatedProposal = await query(
			`
			SELECT p.*, u.username, u.email,
				   pr.first_name, pr.last_name
			FROM proposals p
			JOIN users u ON p.user = u.id
			LEFT JOIN profiles pr ON p.user = pr.user
			WHERE p.id = ?
		`,
			[id],
		);

		const proposal = updatedProposal[0];

		res.json({
			success: true,
			proposal: {
				id: proposal.id,
				user: proposal.user,
				profile: proposal.profile,
				jobDescription: proposal.job_description,
				company: proposal.company,
				jobLink: proposal.job_link,
				coverLetter: proposal.cover_letter,
				resume: proposal.resume,
				resume_pdf_path: proposal.resume_pdf_path,
				status: proposal.status,
				appliedDate: proposal.applied_date,
				createdAt: proposal.created_at,
				updatedAt: proposal.updated_at,
				userInfo: {
					username: proposal.username,
					email: proposal.email,
					firstName: proposal.first_name,
					lastName: proposal.last_name,
				},
			},
		});
	} catch (error) {
		console.error("Update proposal error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Delete proposal
async function deleteProposal(req, res) {
	try {
		const { id } = req.params;

		// Check if proposal exists and user can delete it
		const existingProposals = await query("SELECT user FROM proposals WHERE id = ?", [id]);

		if (existingProposals.length === 0) {
			return res.status(404).json({ error: "Proposal not found" });
		}

		// Check if user can delete this proposal (admin or owner)
		if (req.user.role !== 0 && req.user.id !== existingProposals[0].user) {
			return res.status(403).json({ error: "Access denied" });
		}

		await query("DELETE FROM proposals WHERE id = ?", [id]);

		res.json({
			success: true,
			message: "Proposal deleted successfully",
		});
	} catch (error) {
		console.error("Delete proposal error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Save uploaded PDF file to uploads/resumes folder
async function saveResumePDF(req, res) {
	try {
		console.log("🔍 saveResumePDF called");
		console.log("📁 File:", req.file ? "Present" : "Missing");
		console.log("👤 User:", req.user);
		console.log("📋 Body:", req.body);
		console.log("📋 Headers:", req.headers);
		console.log("📋 Content-Type:", req.headers["content-type"]);

		if (!req.file) {
			console.log("❌ No file in req.file");
			console.log("📋 Files:", req.files);
			console.log("📋 Raw body length:", req.body ? Object.keys(req.body).length : 0);
			return res.status(400).json({ error: "No file uploaded" });
		}

		const { company, jobDescription, timestamp } = req.body;

		// Create descriptive filename
		const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
		const companyName = company ? company.replace(/[^a-zA-Z0-9.-]/g, "_").substring(0, 20) : "Unknown";

		// Extract job title from job description
		let jobTitle = "Unknown";
		if (jobDescription) {
			const lines = jobDescription.split("\n");
			for (const line of lines) {
				if (
					line.toLowerCase().includes("developer") ||
					line.toLowerCase().includes("engineer") ||
					line.toLowerCase().includes("manager") ||
					line.toLowerCase().includes("specialist") ||
					line.toLowerCase().includes("analyst") ||
					line.toLowerCase().includes("coordinator")
				) {
					jobTitle = line.replace(/[^a-zA-Z0-9.-]/g, "_").substring(0, 30);
					break;
				}
			}
		}

		const fileName = `${date}_${companyName}_${jobTitle}_${timestamp}.pdf`;
		const filePath = path.join(uploadsDir, fileName);

		// Write the uploaded file to disk
		fs.writeFileSync(filePath, req.file.buffer);

		// Return the relative path for database storage
		const relativePath = path.relative(path.join(__dirname, "../"), filePath);

		res.json({
			success: true,
			filePath: relativePath,
			fileName: fileName,
		});
	} catch (error) {
		console.error("Error saving PDF file:", error);
		res.status(500).json({ error: "Failed to save PDF file" });
	}
}

module.exports = {
	getAllProposals,
	getProposalById,
	createProposal,
	updateProposal,
	deleteProposal,
	saveResumePDF,
};
