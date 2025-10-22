const { query } = require("../db");
const fs = require("node:fs");
const path = require("node:path");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads/resumes");
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper function to save JSON file and return path
const saveResumeJsonFile = (jsonData, company, jobDescription) => {
	try {
		const timestamp = Date.now();
		const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

		// Extract company name (first 20 chars, sanitized)
		const companyName = company ? company.replace(/[^a-zA-Z0-9.-]/g, "_").substring(0, 20) : "Unknown";

		// Extract job title from job description (first 30 chars, sanitized)
		let jobTitle = "Unknown";
		if (jobDescription) {
			// Try to extract job title from the beginning of job description
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

		// Create descriptive filename
		const fileName = `${date}_${companyName}_${jobTitle}_${timestamp}.json`;
		const filePath = path.join(uploadsDir, fileName);

		fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
		return path.relative(path.join(__dirname, "../"), filePath);
	} catch (error) {
		console.error("Error saving JSON file:", error);
		throw new Error("Failed to save JSON file");
	}
};

// Create or update a saved resume
const createAndUpdateSavedResume = async (req, res) => {
	try {
		console.log("=== SAVED RESUME CONTROLLER CALLED ===");
		console.log("Request method:", req.method);
		console.log("Request URL:", req.url);
		console.log("Request headers:", req.headers);
		console.log("Received request body:", JSON.stringify(req.body, null, 2));

		const { user, profile, originalResume, modifiedResume, jobDescription, company, jobLink, resumeJson } = req.body;

		// Validate required fields
		const missingFields = [];
		if (!user || user.trim() === "") missingFields.push("user");
		if (!profile || profile.trim() === "") missingFields.push("profile");
		if (!originalResume || originalResume.trim() === "") missingFields.push("originalResume");
		if (!modifiedResume || modifiedResume.trim() === "") missingFields.push("modifiedResume");
		if (!jobDescription || jobDescription.trim() === "") missingFields.push("jobDescription");

		console.log("Validating fields:");
		console.log("user:", user);
		console.log("profile:", profile);
		console.log("originalResume length:", originalResume?.length);
		console.log("modifiedResume length:", modifiedResume?.length);
		console.log("jobDescription length:", jobDescription?.length);

		if (missingFields.length > 0) {
			console.log("Missing required fields:", missingFields);
			return res.status(400).json({
				success: false,
				error: `Missing required fields: ${missingFields.join(", ")}`,
			});
		}

		const resumeId = req.params.id;

		if (resumeId) {
			// Update existing resume
			const updateQuery = `
				UPDATE saved_resumes 
				SET original_resume = ?, modified_resume = ?, job_description = ?, company = ?, job_link = ?, resume_json = ?, updated_at = NOW()
				WHERE id = ? AND user = ?
			`;

			const updateResult = await query(updateQuery, [
				originalResume,
				modifiedResume,
				jobDescription,
				company || null,
				jobLink || null,
				resumeJson || null,
				resumeId,
				user,
			]);

			if (updateResult.affectedRows === 0) {
				return res.status(404).json({
					success: false,
					error: "Saved resume not found or access denied",
				});
			}

			return res.json({
				success: true,
				savedResume: { id: resumeId },
			});
		}

		// Save JSON file if resumeJson is provided
		let jsonFilePath = null;
		if (resumeJson) {
			try {
				const jsonData = JSON.parse(resumeJson);
				jsonFilePath = saveResumeJsonFile(jsonData, company, jobDescription);
				console.log("✅ JSON file saved:", jsonFilePath);
			} catch (error) {
				console.error("Error parsing or saving JSON:", error);
				// Continue without JSON file if there's an error
			}
		}

		// Create new resume - store content in database and file path
		const insertQuery = `
			INSERT INTO saved_resumes (user, profile, original_resume, modified_resume, job_description, company, job_link, resume_json, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
		`;

		await query(insertQuery, [user, profile, originalResume, modifiedResume, jobDescription, company || null, jobLink || null, resumeJson || null]);

		// Get the inserted resume to return the correct ID
		const getInsertedQuery = `
			SELECT id FROM saved_resumes 
			WHERE user = ? AND profile = ? AND job_description = ?
			ORDER BY created_at DESC LIMIT 1
		`;

		const insertedResume = await query(getInsertedQuery, [user, profile, jobDescription]);

		return res.json({
			success: true,
			savedResume: {
				id: insertedResume[0].id,
				jsonFilePath: jsonFilePath,
			},
		});
	} catch (error) {
		console.error("Error in createAndUpdateSavedResume:", error);
		res.status(500).json({
			success: false,
			error: "Internal server error",
		});
	}
};

// Get saved resumes list with filters
const getSavedResumeList = async (req, res) => {
	try {
		const { userId, profileId, page = 1, limit = 10, company, jobDescription, linkedToApplications } = req.query;
		const offset = (page - 1) * limit;

		// Build WHERE clause
		const whereConditions = [];
		const queryParams = [];

		if (userId) {
			whereConditions.push("sr.user = ?");
			queryParams.push(userId);
		}

		if (profileId) {
			whereConditions.push("sr.profile = ?");
			queryParams.push(profileId);
		}

		if (company) {
			whereConditions.push("sr.company LIKE ?");
			queryParams.push(`%${company}%`);
		}

		if (jobDescription) {
			// Search in job description, company, and extracted job title
			whereConditions.push("(sr.job_description LIKE ? OR sr.company LIKE ? OR sr.modified_resume LIKE ?)");
			queryParams.push(`%${jobDescription}%`, `%${jobDescription}%`, `%${jobDescription}%`);
		}

		const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

		// Determine the join type based on linkedToApplications parameter
		const joinType = linkedToApplications === "true" ? "INNER JOIN" : "LEFT JOIN";

		// Get total count
		const countQuery = `
			SELECT COUNT(*) as total
			FROM saved_resumes sr
			${joinType} proposals p ON p.saved_resume_id = sr.id
			${whereClause}
		`;

		const countResult = await query(countQuery, queryParams);
		const total = countResult[0].total;

		// Get resumes with pagination and job application info
		const resumeQuery = `
			SELECT 
				sr.id,
				sr.user,
				sr.profile,
				sr.original_resume,
				sr.modified_resume,
				sr.job_description,
				sr.company,
				sr.job_link,
				sr.resume_json,
				sr.created_at,
				sr.updated_at,
				p.id as proposal_id,
				p.status as application_status,
				p.applied_date,
				p.company as proposal_company
			FROM saved_resumes sr
			${joinType} proposals p ON p.saved_resume_id = sr.id
			${whereClause}
			ORDER BY sr.updated_at DESC
			LIMIT ? OFFSET ?
		`;

		const resumes = await query(resumeQuery, [...queryParams, Number.parseInt(limit), offset]);

		// Transform data to match frontend format and add file info
		const transformedResumes = resumes.map((resume) => {
			// Generate the expected file path based on the resume data
			let expectedFilePath = null;
			if (resume.resume_json) {
				try {
					const date = new Date(resume.created_at).toISOString().split("T")[0];
					const companyName = resume.company ? resume.company.replace(/[^a-zA-Z0-9.-]/g, "_").substring(0, 20) : "Unknown";

					// Extract job title from job description
					let jobTitle = "Unknown";
					if (resume.job_description) {
						const lines = resume.job_description.split("\n");
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

					// Create the expected filename pattern
					expectedFilePath = `uploads/resumes/${date}_${companyName}_${jobTitle}_*.json`;
				} catch (error) {
					console.error("Error generating file path:", error);
				}
			}

			return {
				id: resume.id,
				user: resume.user,
				profile: resume.profile,
				originalResume: resume.original_resume,
				modifiedResume: resume.modified_resume,
				jobDescription: resume.job_description,
				company: resume.company,
				jobLink: resume.job_link,
				resumeJson: resume.resume_json,
				createdAt: resume.created_at,
				updatedAt: resume.updated_at,
				expectedFilePath: expectedFilePath,
				// Job application info
				proposalId: resume.proposal_id,
				applicationStatus: resume.application_status,
				appliedDate: resume.applied_date,
				proposalCompany: resume.proposal_company,
			};
		});

		res.json({
			success: true,
			savedResumes: transformedResumes,
			pagination: {
				page: Number.parseInt(page),
				limit: Number.parseInt(limit),
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("Error in getSavedResumeList:", error);
		res.status(500).json({
			success: false,
			error: "Internal server error",
		});
	}
};

// Get saved resume by ID
const getSavedResumeById = async (req, res) => {
	try {
		const { id } = req.params;
		const { userId } = req.query;

		const resumeQuery = `
			SELECT 
				id,
				user,
				profile,
				original_resume,
				modified_resume,
				job_description,
				company,
				job_link,
				resume_json,
				created_at,
				updated_at
			FROM saved_resumes
			WHERE id = ? ${userId ? "AND user = ?" : ""}
		`;

		const queryParams = userId ? [id, userId] : [id];
		const resumes = await query(resumeQuery, queryParams);

		if (resumes.length === 0) {
			return res.status(404).json({
				success: false,
				error: "Saved resume not found",
			});
		}

		const resume = resumes[0];
		const transformedResume = {
			id: resume.id,
			user: resume.user,
			profile: resume.profile,
			originalResume: resume.original_resume,
			modifiedResume: resume.modified_resume,
			jobDescription: resume.job_description,
			company: resume.company,
			jobLink: resume.job_link,
			resumeJson: resume.resume_json,
			createdAt: resume.created_at,
			updatedAt: resume.updated_at,
		};

		res.json({
			success: true,
			savedResume: transformedResume,
		});
	} catch (error) {
		console.error("Error in getSavedResumeById:", error);
		res.status(500).json({
			success: false,
			error: "Internal server error",
		});
	}
};

// Get resume file content
const getResumeFile = async (req, res) => {
	try {
		const { id } = req.params;
		const { userId, type = "modified" } = req.query;

		// Get resume content from database
		const resumeQuery = `
			SELECT original_resume, modified_resume, resume_json FROM saved_resumes
			WHERE id = ? ${userId ? "AND user = ?" : ""}
		`;
		const queryParams = userId ? [id, userId] : [id];
		const resumes = await query(resumeQuery, queryParams);

		if (resumes.length === 0) {
			return res.status(404).json({
				success: false,
				error: "Resume not found",
			});
		}

		const resume = resumes[0];

		if (type === "json" && resume.resume_json) {
			// Return JSON data
			res.json({
				success: true,
				content: resume.resume_json,
				type: "json",
			});
		} else {
			// Return text content
			const content = type === "original" ? resume.original_resume : resume.modified_resume;
			res.json({
				success: true,
				content: content,
				type: "text",
			});
		}
	} catch (error) {
		console.error("Error in getResumeFile:", error);
		res.status(500).json({
			success: false,
			error: "Internal server error",
		});
	}
};

// Delete saved resume
const deleteSavedResume = async (req, res) => {
	try {
		const { id } = req.params;
		const { userId } = req.query;

		// Delete the database record
		const deleteQuery = `
			DELETE FROM saved_resumes
			WHERE id = ? ${userId ? "AND user = ?" : ""}
		`;
		const queryParams = userId ? [id, userId] : [id];

		const result = await query(deleteQuery, queryParams);

		if (result.affectedRows === 0) {
			return res.status(404).json({
				success: false,
				error: "Saved resume not found or access denied",
			});
		}

		res.json({
			success: true,
			message: "Saved resume deleted successfully",
		});
	} catch (error) {
		console.error("Error in deleteSavedResume:", error);
		res.status(500).json({
			success: false,
			error: "Internal server error",
		});
	}
};

// List all JSON files in the uploads directory
const listJsonFiles = async (req, res) => {
	try {
		const files = fs.readdirSync(uploadsDir);
		const jsonFiles = files
			.filter((file) => file.endsWith(".json"))
			.map((file) => {
				const filePath = path.join(uploadsDir, file);
				const stats = fs.statSync(filePath);
				return {
					filename: file,
					filePath: path.relative(path.join(__dirname, "../"), filePath),
					size: stats.size,
					createdAt: stats.birthtime,
					modifiedAt: stats.mtime,
				};
			})
			.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

		res.json({
			success: true,
			files: jsonFiles,
			totalFiles: jsonFiles.length,
		});
	} catch (error) {
		console.error("Error listing JSON files:", error);
		res.status(500).json({
			success: false,
			error: "Internal server error",
		});
	}
};

module.exports = {
	createAndUpdateSavedResume,
	getSavedResumeList,
	getSavedResumeById,
	getResumeFile,
	deleteSavedResume,
	listJsonFiles,
};
