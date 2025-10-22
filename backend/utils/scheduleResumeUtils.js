const fs = require("node:fs");
const path = require("node:path");
const { query } = require("../db");

// Import PDF generation utilities for Node.js
const PDFDocument = require("pdfkit");

// Ensure schedule/resumes directory exists
const scheduleResumesDir = path.join(__dirname, "../uploads/schedule/resumes");
if (!fs.existsSync(scheduleResumesDir)) {
	fs.mkdirSync(scheduleResumesDir, { recursive: true });
}

// PDF generation configuration
const PDF_CONFIG = {
	fontSize: 11,
	lineHeight: 14,
	margin: 50,
	sectionSpacing: 20,
	bulletIndent: 20,
};

/**
 * Generate PDF from resume text
 * @param {string} resumeText - The resume text content
 * @returns {Promise<Buffer>} - The PDF buffer
 */
async function generateResumePDF(resumeText) {
	return new Promise((resolve, reject) => {
		try {
			const doc = new PDFDocument({
				size: "A4",
				margins: {
					top: PDF_CONFIG.margin,
					bottom: PDF_CONFIG.margin,
					left: PDF_CONFIG.margin,
					right: PDF_CONFIG.margin,
				},
			});

			const chunks = [];
			doc.on("data", (chunk) => chunks.push(chunk));
			doc.on("end", () => resolve(Buffer.concat(chunks)));

			// Set default font
			doc.fontSize(PDF_CONFIG.fontSize);
			doc.lineGap(2);

			const lines = resumeText.split("\n");
			let yPosition = PDF_CONFIG.margin;

			for (const line of lines) {
				const trimmedLine = line.trim();

				// Skip empty lines
				if (!trimmedLine) {
					yPosition += PDF_CONFIG.lineHeight / 2;
					continue;
				}

				// Check if we need a new page
				if (yPosition > doc.page.height - PDF_CONFIG.margin - PDF_CONFIG.lineHeight) {
					doc.addPage();
					yPosition = PDF_CONFIG.margin;
				}

				// Section headers (SUMMARY, SKILLS, EXPERIENCE, etc.)
				if (/^(SUMMARY|SKILLS|EXPERIENCE|EDUCATION)$/i.test(trimmedLine)) {
					doc.fontSize(14).font("Helvetica-Bold");
					doc.text(trimmedLine.toUpperCase(), PDF_CONFIG.margin, yPosition);
					yPosition += PDF_CONFIG.lineHeight + 5;

					// Add underline
					doc
						.moveTo(PDF_CONFIG.margin, yPosition - 2)
						.lineTo(doc.page.width - PDF_CONFIG.margin, yPosition - 2)
						.stroke();

					doc.fontSize(PDF_CONFIG.fontSize).font("Helvetica");
					continue;
				}

				// Job titles (usually in caps or bold patterns)
				if (/^[A-Z][A-Z\s]+$/.test(trimmedLine) && trimmedLine.length > 3 && trimmedLine.length < 50) {
					doc.fontSize(12).font("Helvetica-Bold");
					doc.text(trimmedLine, PDF_CONFIG.margin, yPosition);
					yPosition += PDF_CONFIG.lineHeight + 3;
					doc.fontSize(PDF_CONFIG.fontSize).font("Helvetica");
					continue;
				}

				// Company/date lines (usually contain dates or locations)
				if (/\d{4}|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(trimmedLine)) {
					doc.fontSize(PDF_CONFIG.fontSize).font("Helvetica-Oblique");
					doc.text(trimmedLine, PDF_CONFIG.margin, yPosition);
					yPosition += PDF_CONFIG.lineHeight + 2;
					doc.fontSize(PDF_CONFIG.fontSize).font("Helvetica");
					continue;
				}

				// Bullet points
				if (/^[•▪▫‣⁃◦\-\*]\s+/.test(trimmedLine)) {
					const bulletChar = trimmedLine.charAt(0);
					const content = trimmedLine.slice(1).trim();

					doc.text(bulletChar, PDF_CONFIG.margin, yPosition);
					doc.text(content, PDF_CONFIG.margin + PDF_CONFIG.bulletIndent, yPosition, {
						width: doc.page.width - PDF_CONFIG.margin * 2 - PDF_CONFIG.bulletIndent,
					});
					yPosition += PDF_CONFIG.lineHeight + 2;
					continue;
				}

				// Default text
				doc.text(trimmedLine, PDF_CONFIG.margin, yPosition, {
					width: doc.page.width - PDF_CONFIG.margin * 2,
				});
				yPosition += PDF_CONFIG.lineHeight + 2;
			}

			doc.end();
		} catch (error) {
			reject(error);
		}
	});
}

/**
 * Copy selected resume to schedule/resumes folder for an interview
 * @param {string} interviewId - The interview ID
 * @param {string} selectedResumeId - The selected resume ID
 * @returns {Promise<string>} - The path to the copied resume file
 */
async function copyResumeToSchedule(interviewId, selectedResumeId) {
	try {
		// Get the selected resume data and find the original PDF file
		const resumes = await query(
			`
			SELECT sr.*, p.resume_pdf_path 
			FROM saved_resumes sr
			LEFT JOIN proposals p ON p.saved_resume_id = sr.id
			WHERE sr.id = ?
		`,
			[selectedResumeId],
		);

		if (resumes.length === 0) {
			throw new Error("Selected resume not found");
		}

		const resume = resumes[0];

		// Get interview data for filename
		const interviews = await query("SELECT meeting_title, meeting_date FROM interviews WHERE id = ?", [interviewId]);

		if (interviews.length === 0) {
			throw new Error("Interview not found");
		}

		const interview = interviews[0];

		// Create filename for the scheduled resume PDF
		const timestamp = Date.now();
		const date = new Date(interview.meeting_date).toISOString().split("T")[0];
		const meetingTitle = interview.meeting_title.replace(/[^a-zA-Z0-9.-]/g, "_").substring(0, 30);
		const companyName = resume.company ? resume.company.replace(/[^a-zA-Z0-9.-]/g, "_").substring(0, 20) : "Unknown";

		const filename = `schedule_${date}_${meetingTitle}_${companyName}_${timestamp}.pdf`;
		const filePath = path.join(scheduleResumesDir, filename);

		// Try to copy the original PDF file first
		if (resume.resume_pdf_path) {
			const originalPdfPath = path.join(__dirname, "..", resume.resume_pdf_path);
			console.log(`📁 Looking for original PDF: ${originalPdfPath}`);

			if (fs.existsSync(originalPdfPath)) {
				// Copy the original PDF file directly
				fs.copyFileSync(originalPdfPath, filePath);
				console.log(`✅ Copied original PDF file to schedule: ${filePath}`);
			} else {
				console.log("⚠️ Original PDF not found, generating from text content");
				// Fallback: Generate PDF from text content
				const pdfBuffer = await generateResumePDF(resume.modified_resume);
				fs.writeFileSync(filePath, pdfBuffer);
				console.log(`✅ Generated new PDF from text content: ${filePath}`);
			}
		} else {
			console.log("⚠️ No original PDF path found, generating from text content");
			// Generate PDF from the modified resume text
			const pdfBuffer = await generateResumePDF(resume.modified_resume);
			fs.writeFileSync(filePath, pdfBuffer);
			console.log(`✅ Generated new PDF from text content: ${filePath}`);
		}

		// Generate resume link for easy access
		const resumeLink = `/api/interviews/${interviewId}/scheduled-resume`;

		// Update the interview record with the file path and resume link
		await query("UPDATE interviews SET selected_resume_id = ?, resume_link = ? WHERE id = ?", [selectedResumeId, resumeLink, interviewId]);

		console.log(`✅ Resume link updated: ${resumeLink}`);

		return filePath;
	} catch (error) {
		console.error("Error copying resume to schedule:", error);
		throw error;
	}
}

/**
 * Get scheduled resume file path for an interview
 * @param {string} interviewId - The interview ID
 * @returns {Promise<string|null>} - The path to the scheduled resume file or null if not found
 */
async function getScheduledResumePath(interviewId) {
	try {
		// Get interview data
		const interviews = await query("SELECT meeting_title, meeting_date, selected_resume_id FROM interviews WHERE id = ?", [interviewId]);

		if (interviews.length === 0) {
			return null;
		}

		const interview = interviews[0];

		if (!interview.selected_resume_id) {
			return null;
		}

		// Get resume data
		const resumes = await query("SELECT company FROM saved_resumes WHERE id = ?", [interview.selected_resume_id]);

		if (resumes.length === 0) {
			return null;
		}

		const resume = resumes[0];

		// Construct the expected filename
		const date = new Date(interview.meeting_date).toISOString().split("T")[0];
		const meetingTitle = interview.meeting_title.replace(/[^a-zA-Z0-9.-]/g, "_").substring(0, 30);
		const companyName = resume.company ? resume.company.replace(/[^a-zA-Z0-9.-]/g, "_").substring(0, 20) : "Unknown";

		// Look for the PDF file in the schedule/resumes directory
		const files = fs.readdirSync(scheduleResumesDir);
		const expectedPattern = `schedule_${date}_${meetingTitle}_${companyName}_`;

		const matchingFile = files.find((file) => file.startsWith(expectedPattern) && file.endsWith(".pdf"));

		if (matchingFile) {
			return path.join(scheduleResumesDir, matchingFile);
		}

		return null;
	} catch (error) {
		console.error("Error getting scheduled resume path:", error);
		return null;
	}
}

/**
 * Read scheduled resume data from file
 * @param {string} interviewId - The interview ID
 * @returns {Promise<Object|null>} - The scheduled resume data or null if not found
 */
async function getScheduledResumeData(interviewId) {
	try {
		const filePath = await getScheduledResumePath(interviewId);

		if (!filePath || !fs.existsSync(filePath)) {
			return null;
		}

		// Get interview and resume data from database since we're now storing PDFs
		const interviews = await query("SELECT meeting_title, meeting_date, selected_resume_id FROM interviews WHERE id = ?", [interviewId]);

		if (interviews.length === 0) {
			return null;
		}

		const interview = interviews[0];

		if (!interview.selected_resume_id) {
			return null;
		}

		const resumes = await query("SELECT * FROM saved_resumes WHERE id = ?", [interview.selected_resume_id]);

		if (resumes.length === 0) {
			return null;
		}

		const resume = resumes[0];

		// Return the resume data structure (same as before, but without reading from JSON file)
		return {
			interviewId,
			selectedResumeId: interview.selected_resume_id,
			meetingTitle: interview.meeting_title,
			meetingDate: interview.meeting_date,
			resume: {
				id: resume.id,
				company: resume.company,
				jobDescription: resume.job_description,
				modifiedResume: resume.modified_resume,
				originalResume: resume.original_resume,
				jobLink: resume.job_link,
				createdAt: resume.created_at,
			},
			scheduledAt: new Date().toISOString(),
			pdfFilePath: filePath, // Add the PDF file path for reference
		};
	} catch (error) {
		console.error("Error reading scheduled resume data:", error);
		return null;
	}
}

/**
 * Get PDF file buffer for scheduled resume
 * @param {string} interviewId - The interview ID
 * @returns {Promise<Buffer|null>} - The PDF buffer or null if not found
 */
async function getScheduledResumePDF(interviewId) {
	try {
		const filePath = await getScheduledResumePath(interviewId);

		if (!filePath || !fs.existsSync(filePath)) {
			return null;
		}

		const pdfBuffer = fs.readFileSync(filePath);
		return pdfBuffer;
	} catch (error) {
		console.error("Error reading scheduled resume PDF:", error);
		return null;
	}
}

module.exports = {
	copyResumeToSchedule,
	getScheduledResumePath,
	getScheduledResumeData,
	getScheduledResumePDF,
	generateResumePDF,
};
