import { GLOBAL_CONFIG } from "@/global-config";
import { Button } from "@/ui/button";
import { Textarea } from "@/ui/textarea";
import { pdf } from "@react-pdf/renderer";
import { Input } from "antd";
import { Loader2 } from "lucide-react";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useMemo, useState } from "react";
import PDFPreview from "./PDFPreview";
import ResumePDF from "./ResumePDF";

// Set up PDF.js worker
try {
	pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
	console.log("PDF.js worker configured successfully");
} catch (error) {
	console.error("Error setting up PDF.js worker:", error);
}

interface ResumeBuilderProps {
	resume: string;
	job_description: string;
	onResumeChange: (value: string) => void;
	onJobDescriptionChange: (value: string) => void;
}

export default function ResumeBuilder({ resume, job_description, onResumeChange, onJobDescriptionChange }: ResumeBuilderProps) {
	const [resumeFile, setResumeFile] = useState<File | null>(null);
	const [jobDescription, setJobDescription] = useState(job_description);
	const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [extractedText, setExtractedText] = useState<string>("");
	const [isExtracting, setIsExtracting] = useState(false);

	const resumePreviewUrl = useMemo(() => {
		if (resumeFile?.type === "application/pdf") {
			return URL.createObjectURL(resumeFile);
		}
		return null;
	}, [resumeFile]);

	useEffect(() => {
		return () => {
			if (resumePreviewUrl) URL.revokeObjectURL(resumePreviewUrl);
		};
	}, [resumePreviewUrl]);

	useEffect(() => {
		if (generatedPdfUrl) {
		}
	}, [generatedPdfUrl]);

	useEffect(() => {
		onJobDescriptionChange(jobDescription);
	}, [jobDescription, onJobDescriptionChange]);

	const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		console.log("File input triggered, files:", e.target.files);

		if (file) {
			console.log("File uploaded:", file.name, "Type:", file.type, "Size:", file.size);
			setResumeFile(file);
			setGeneratedPdfUrl(null);
			setExtractedText("");

			// Extract text immediately when file is uploaded
			setIsExtracting(true);
			try {
				console.log("Starting text extraction for file:", file.name);
				const text = await extractText(file);
				console.log("Text extraction successful, length:", text.length);

				if (text && text.length > 10) {
					setExtractedText(text);
					// Also update the resume field with the extracted text
					onResumeChange(text);
					console.log("Resume field updated with extracted text");
				} else {
					throw new Error("Extracted text is too short or empty");
				}
			} catch (error) {
				console.error("Error extracting text:", error);
				const errorMessage = `Error extracting text from ${file.name}. Please try again or copy and paste the content manually.`;
				setExtractedText(errorMessage);
				// Also update the resume field with the error message so user knows what happened
				onResumeChange(errorMessage);
			} finally {
				setIsExtracting(false);
			}
		} else {
			console.log("No file selected");
		}
	};

	const handleGenerate = async () => {
		if (!resumeFile || !jobDescription) return;
		setIsLoading(true);

		const resume = await extractText(resumeFile);

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
					"responsibilities": [
						"",
					]
				},
			],
			"education": {
				"degree": "",
				"institution": "",
				"location": "",
				"year": ""
			}
		}
		`;

		const prompt = `
			Tailor the existing resume to perfectly match the job description provided. This task involves analyzing the job description in detail to understand the specific skills, experiences, and qualifications the employer is seeking. Then, meticulously revise the existing resume to highlight the most relevant aspects of the candidate's background. This includes rephrasing bullet points to emphasize transferable skills, prioritizing experiences that directly relate to the job requirements, and ensuring the resume format and design are professional and it should give non ai generated feeling. Incorporate keywords from the job description to ensure the resume passes through Applicant Tracking Systems (ATS) effectively.   use strong power action verbs but not repeated more than once. Make important verbs and words in bold. add metrics and match all the exact keywords from the job to my summary, experience, soft and hard skills and education. The summary should include my relevant professional experience like my job title and experience in the field and mention my areas of expertise, specializations and skill and one or two impressive achievements to show what I can do and how I can contribute to the company. The summary should be no more than 5 sentences. In the work experience, each experience must include more than 8 lists in details and the right key words that match the job description. It should not be too small. Skills must include more than 8 lists with bullet points that match the job description and others that is relevant. adjust the job titles to best fit the job. It should not be too small. Use words (Adaptability/flexibility, creativity, problem solving, Curiosity, Emotional intelligence, Persistence, Relationship-building, Resourcefulness, sophisticated knowledge, mastery, realized, transformed, augmented.) in the resume. These words (experience, expertise, achieved, influenced, increased) are not recommended in the resume. Update personal expereicne to follow the job description perfectly.
      Ensure the revised resume is:
      * Highly relevant: Maximize alignment with the job description for ATS optimization.
      * Detailed and professional: Provide specific examples and quantifiable achievements where applicable, maintaining a natural, human-written tone.
      * Concise: Remove any irrelevant information not pertinent to the job description.
      * Clearence: Don't include any clearence in the resume.

      Return only the complete, updated resume content in JSON format, with no additional explanations or conversational text. The output should be ready for immediate use without further editing.
      Resume:
      ${resume}
      Job Description:
      ${jobDescription}
			JSON Format:
			${resumeJsonFormat}
			`;

		try {
			// const response = await fetch(`${GLOBAL_CONFIG.geminiApiUrl}?key=${GLOBAL_CONFIG.geminiApiKey}`, {
			// 	method: "POST",
			// 	headers: { "Content-Type": "application/json" },
			// 	body: JSON.stringify({
			// 		contents: [{ parts: [{ text: prompt }] }],
			// 	}),
			// });

			// const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

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

			if (!response.ok) throw new Error("Failed to generate resume");

			const result = await response.json();
			const text = result?.choices?.[0]?.message?.content;
			if (!text) throw new Error("No content returned");

			// Convert Markdown to PDF using ResumePDF component
			const blob = await pdf(<ResumePDF resume={JSON.parse(text)} />).toBlob();
			const blobUrl = URL.createObjectURL(blob);
			setGeneratedPdfUrl(blobUrl);
		} catch (error) {
			console.error("Generation error:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleDownload = () => {
		if (!generatedPdfUrl) return;
		const a = document.createElement("a");
		a.href = generatedPdfUrl;
		const timeSalt = new Date().toLocaleString().replace(/[/:.,]/g, "-");
		const resumePDF = `resume-${timeSalt}.pdf`;
		onResumeChange(resumePDF);
		a.download = resumePDF;
		a.click();
	};

	const extractText = async (file: File): Promise<string> => {
		if (!file) return "";

		const fileExtension = file.name.toLowerCase().split(".").pop();
		console.log("Extracting text from file with extension:", fileExtension);

		if (fileExtension === "pdf") {
			try {
				console.log("Attempting to extract text from PDF using pdfjs-dist...");
				const arrayBuffer = await file.arrayBuffer();
				console.log("PDF file converted to ArrayBuffer, size:", arrayBuffer.byteLength);

				const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
				console.log("PDF document loaded, pages:", pdfDoc.numPages);

				const numPages = pdfDoc.numPages;
				let extractedText = "";

				for (let i = 1; i <= numPages; i++) {
					console.log(`Processing page ${i}/${numPages}`);
					const page = await pdfDoc.getPage(i);
					const content = await page.getTextContent();
					const items = content.items;
					console.log(`Page ${i} has ${items.length} text items`);

					for (const item of items) {
						if ("str" in item && item.str) {
							extractedText += `${item.str} `;
						}
					}
				}
				console.log("PDF text extraction successful, length:", extractedText.length);

				// Check if we got meaningful text
				if (extractedText && extractedText.length > 50) {
					return extractedText.trim();
				}

				console.log("PDF extraction returned insufficient text, trying fallback method...");
				return await extractPDFWithFallback(file);
			} catch (error) {
				console.error("Error with pdfjs-dist:", error);
				console.log("Trying fallback PDF extraction method...");
				return await extractPDFWithFallback(file);
			}
		}

		if (fileExtension === "docx" || fileExtension === "doc") {
			try {
				console.log("Attempting to extract text from Word document using mammoth...");
				const arrayBuffer = await file.arrayBuffer();
				const result = await mammoth.extractRawText({ arrayBuffer });
				console.log("Word document extraction successful, length:", result.value.length);
				return result.value;
			} catch (error) {
				console.error("Error extracting text from DOCX:", error);
				throw new Error("Failed to extract text from Word document");
			}
		}

		// For text files, read as text
		console.log("Reading text file directly...");
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (event) => {
				const content = event.target?.result as string;
				console.log("Text file read successfully, length:", content.length);
				resolve(content);
			};
			reader.onerror = (error) => {
				console.error("Error reading text file:", error);
				reject(error);
			};
			reader.readAsText(file);
		});
	};

	const extractPDFWithFallback = async (file: File): Promise<string> => {
		try {
			console.log("Using fallback PDF extraction method...");

			// Try to read as ArrayBuffer and look for text content
			const arrayBuffer = await file.arrayBuffer();
			const uint8Array = new Uint8Array(arrayBuffer);

			// Look for text content in PDF
			const textDecoder = new TextDecoder("utf-8");
			const content = textDecoder.decode(uint8Array);

			// Extract text between text markers (PDF text extraction)
			const textMatches = content.match(/\(([^)]+)\)/g);
			if (textMatches && textMatches.length > 10) {
				const extractedText = textMatches
					.map((match) => match.replace(/[()]/g, ""))
					.filter((text) => text.length > 2 && !text.includes("\\"))
					.join(" ");

				if (extractedText.length > 100) {
					console.log("Fallback PDF extraction successful, length:", extractedText.length);
					return extractedText;
				}
			}

			// Try alternative approach - look for readable text patterns
			const readableText = content.match(/[A-Za-z0-9\s.,!?;:()[\]{}"'\-_+=<>@#$%^&*\/\\|`~]+/g);
			if (readableText && readableText.length > 20) {
				const extractedText = readableText.filter((text) => text.length > 3 && text.trim().length > 0).join(" ");

				if (extractedText.length > 100) {
					console.log("Alternative PDF extraction successful, length:", extractedText.length);
					return extractedText;
				}
			}

			throw new Error("Could not extract readable text from PDF");
		} catch (error) {
			console.error("Fallback PDF extraction failed:", error);
			throw new Error("Failed to extract text from PDF. Please copy and paste the content manually.");
		}
	};

	useEffect(() => {
		// Test libraries on component mount
		console.log("Testing libraries...");
		console.log("PDF.js available:", typeof pdfjsLib !== "undefined");
		console.log("Mammoth available:", typeof mammoth !== "undefined");
		console.log("PDF.js worker configured:", pdfjsLib.GlobalWorkerOptions.workerSrc);
	}, []);

	return (
		<div className="flex p-4 gap-4">
			<div className="w-1/2 border rounded-xl shadow p-2 overflow-hidden max-h-[500px]">
				{generatedPdfUrl ? (
					<PDFPreview fileUrl={generatedPdfUrl} />
				) : resumePreviewUrl ? (
					<PDFPreview fileUrl={resumePreviewUrl} />
				) : extractedText ? (
					<div className="p-4 h-full overflow-y-auto">
						<div className="text-sm font-medium mb-2">Extracted Resume Content:</div>
						<div className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded border">{extractedText}</div>
						<div className="text-xs text-gray-500 mt-2">{extractedText.length} characters</div>
					</div>
				) : (
					<div className="text-gray-400 text-center mt-20">
						{isExtracting ? (
							<div className="flex items-center justify-center gap-2">
								<Loader2 className="animate-spin h-4 w-4" />
								Extracting text from file...
							</div>
						) : (
							"Upload a resume file to preview it here"
						)}
					</div>
				)}
			</div>

			<div className="w-1/2 flex flex-col gap-4">
				<div>
					<label htmlFor="resume-upload" className="text-sm font-medium">
						Upload Resume (PDF, DOCX, DOC, TXT) - All formats work automatically
					</label>
					<input
						id="resume-upload"
						type="file"
						accept=".pdf,.docx,.doc,.txt"
						onChange={handleUpload}
						className="w-full p-2 border border-gray-300 rounded-md"
					/>
					{isExtracting && (
						<div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
							<Loader2 className="animate-spin h-3 w-3" />
							Extracting text from file...
						</div>
					)}
					{resumeFile && (
						<div className="text-xs text-green-600 mt-1">
							File selected: {resumeFile.name} ({resumeFile.size} bytes)
						</div>
					)}
				</div>

				<div>
					<label htmlFor="manual-resume" className="text-sm font-medium">
						Or manually paste your resume content:
					</label>
					<Textarea
						id="manual-resume"
						placeholder="Paste your resume content here if file upload doesn't work..."
						className="min-h-32 max-h-64"
						value={resume}
						onChange={(e) => onResumeChange(e.target.value)}
					/>
					<div className="text-xs text-gray-500 mt-1">Current resume content: {resume.length} characters</div>
				</div>

				<div>
					<label htmlFor="job-description" className="text-sm font-medium">
						Job Description
					</label>
					<Textarea
						id="job-description"
						placeholder="Paste job description here..."
						className="min-h-128 max-h-128"
						value={jobDescription}
						onChange={(e) => setJobDescription(e.target.value)}
					/>
				</div>

				<div className="flex gap-4">
					<Button onClick={handleGenerate} disabled={!resumeFile || !jobDescription || isLoading}>
						{isLoading && <Loader2 className="animate-spin mr-2" />}
						Generate
					</Button>
					<Button variant="outline" onClick={handleDownload} disabled={!generatedPdfUrl}>
						Download
					</Button>
				</div>
			</div>
		</div>
	);
}
