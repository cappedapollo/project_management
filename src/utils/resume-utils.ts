import { GLOBAL_CONFIG } from "@/global-config";
import type { ResumeJSONData } from "@/types/resume";

// Re-export for convenience
export type { ResumeJSONData };

/**
 * Generate structured JSON from resume text using AI
 */
export const generateResumeJson = async (resumeText: string, jobDescription: string): Promise<ResumeJSONData> => {
	const resumeJsonFormat = `
	{
		"name": "",
		"location": "",
		"email": "",
		"phone": "",
		"linkedin": "",
		"summary": "",
		"skills": {
			"programming_languages": [""],
			"frontend": [""],
			"backend": [""],
			"database": [""],
			"cloud": [""],
			"tools": [""]
		},
		"experience": [
			{
				"title": "",
				"company": "",
				"duration": "",
				"location": "",
				"responsibilities": [""]
			}
		],
		"education": {
			"degree": "",
			"institution": "",
			"location": "",
			"year": ""
		}
	}`;

	const prompt = `
		Convert the following resume text into a structured JSON format. Extract and organize the information into the specified JSON structure. Ensure all fields are properly populated based on the resume content.

		Resume Text:
		${resumeText}

		Job Description (for context):
		${jobDescription}

		Return only the complete JSON object in the following format:
		${resumeJsonFormat}
	`;

	try {
		const response = await fetch(GLOBAL_CONFIG.openAIUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${GLOBAL_CONFIG.openAIKey}`,
			},
			body: JSON.stringify({
				model: "gpt-3.5-turbo",
				messages: [{ role: "user", content: prompt }],
			}),
		});

		if (!response.ok) throw new Error("Failed to generate JSON");

		const result = await response.json();
		const text = result?.choices?.[0]?.message?.content;
		if (!text) throw new Error("No content returned");

		return JSON.parse(text);
	} catch (error) {
		console.error("Error generating JSON:", error);
		throw new Error("Failed to generate structured resume data");
	}
};

/**
 * Download JSON file
 */
export const downloadJsonFile = (jsonData: ResumeJSONData, filename: string) => {
	const jsonString = JSON.stringify(jsonData, null, 2);
	const blob = new Blob([jsonString], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};

/**
 * Download PDF file
 */
export const downloadPdfFile = (blob: Blob, filename: string) => {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};

/**
 * Generate timestamped filename
 */
export const generateTimestampedFilename = (baseName: string, extension: string) => {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	return `${baseName}_${timestamp}.${extension}`;
};

/**
 * Create folder path for resume downloads
 */
export const createFolderPath = (folderName: string, customFolder?: string): string => {
	if (folderName === "custom" && customFolder) {
		return customFolder.trim();
	}
	return folderName;
};

/**
 * Generate resume filename with folder structure
 */
export const generateResumeFilename = (folderName: string, customFolder?: string, format: "pdf" | "txt" = "pdf"): string => {
	const folder = createFolderPath(folderName, customFolder);
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	return `${folder}/optimized_resume_${timestamp}.${format}`;
};

/**
 * Convert text resume to structured JSON for PDF generation
 */
export const convertTextToResumeJson = (resumeText: string) => {
	// Basic parsing of resume text to structured format
	const lines = resumeText.split("\n").filter((line) => line.trim());

	// Extract basic information (this is a simplified parser)
	const name = lines.find((line) => /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(line)) || "Your Name";
	const email = lines.find((line) => /@/.test(line)) || "your.email@example.com";
	const phone = lines.find((line) => /[\d\-\(\)\s]{10,}/.test(line)) || "Your Phone";

	// Extract summary (first paragraph)
	const summary = `${lines.slice(0, 3).join(" ").substring(0, 200)}...`;

	// Extract skills (lines with bullet points or keywords)
	const skills = lines
		.filter((line) => line.includes("•") || line.includes("-") || /[A-Z][a-z]+/.test(line))
		.slice(0, 10)
		.map((line) => line.replace(/^[•\-\s]+/, "").trim())
		.filter((skill) => skill.length > 2);

	return {
		name,
		location: "Your Location",
		email,
		phone,
		linkedin: "Your LinkedIn",
		summary,
		skills: {
			"Technical Skills": skills.slice(0, 5),
			"Soft Skills": ["Communication", "Leadership", "Problem Solving"],
		},
		experience: [
			{
				title: "Professional Title",
				company: "Company Name",
				duration: "2020 - Present",
				location: "Location",
				responsibilities: lines
					.filter((line) => line.includes("•") || line.includes("-"))
					.slice(0, 8)
					.map((line) => line.replace(/^[•\-\s]+/, "").trim()),
			},
		],
		education: {
			degree: "Your Degree",
			institution: "Your Institution",
			location: "Institution Location",
			year: "2020",
		},
	};
};

/**
 * Validate file upload
 */
export const validateResumeFile = (file: File): { isValid: boolean; error?: string } => {
	const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];

	const maxSize = 10 * 1024 * 1024; // 10MB

	if (!allowedTypes.includes(file.type)) {
		return {
			isValid: false,
			error: "Please upload a PDF, Word document (.docx), or text file (.txt)",
		};
	}

	if (file.size > maxSize) {
		return {
			isValid: false,
			error: "File size must be less than 10MB",
		};
	}

	return { isValid: true };
};

/**
 * Parse resume JSON from string
 */
export const parseResumeJson = (jsonString: string): ResumeJSONData | null => {
	try {
		return JSON.parse(jsonString);
	} catch (error) {
		console.error("Error parsing resume JSON:", error);
		return null;
	}
};
