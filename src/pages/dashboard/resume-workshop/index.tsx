import { useAuth } from "@/components/auth/use-auth";
import Icon from "@/components/icon/icon";
import { useRouter } from "@/routes/hooks";
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { ModernButton } from "@/ui/modern-button";
import { ModernCard } from "@/ui/modern-card";
import { Textarea } from "@/ui/textarea";
import { Text, Title } from "@/ui/typography";
import { cn } from "@/utils";
import { pdf } from "@react-pdf/renderer";
import mammoth from "mammoth";
import { m } from "motion/react";
import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Extend Window interface for global timeout
declare global {
	interface Window {
		jobAnalysisTimeout?: NodeJS.Timeout;
	}
}

// Import services
import AIService from "@/api/services/aiService";
import FormattedTextPDF from "@/components/FormattedTextPDF";
import { validateResumeFile } from "@/utils/resume-utils";

// Helper function to log workshop activities
const logWorkshopActivity = async (action: string, details: any = {}) => {
	try {
		const token = localStorage.getItem("access_token");
		if (!token) return;

		await fetch("/api/workshop/log-activity", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ action, details }),
		});
	} catch (error) {
		console.error("Failed to log workshop activity:", error);
	}
};

// Set up PDF.js worker
try {
	pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
} catch (error) {
	console.error("Error setting up PDF.js worker:", error);
}

/**
 * Resume Workshop Component
 *
 * Features:
 * - Upload and extract text from resume files (PDF, DOCX, TXT)
 * - Smart job description analysis with auto-trigger
 * - AI-powered resume content optimization (preserves original formatting)
 * - PDF generation and download
 */
export default function ResumeWorkshop() {
	const { user } = useAuth();
	const router = useRouter();

	// ===== REFS =====
	const fileInputRef = useRef<HTMLInputElement>(null);

	// ===== STATE MANAGEMENT =====

	// File upload states
	const [uploadedFile, setUploadedFile] = useState<File | null>(null);
	const [extractedText, setExtractedText] = useState("");

	// Job description and analysis states
	const [jobDescription, setJobDescription] = useState("");
	const [jobAnalysis, setJobAnalysis] = useState<any>(null);
	const [isAnalyzingJob, setIsAnalyzingJob] = useState(false);
	const [isAnalyzingPending, setIsAnalyzingPending] = useState(false);

	// Resume optimization states
	const [isOptimizing, setIsOptimizing] = useState(false);
	const [optimizedResume, setOptimizedResume] = useState("");
	const [optimizationResult, setOptimizationResult] = useState<any>(null);

	// PDF generation states
	const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
	const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);

	// Cover letter states
	const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
	const [generatedCoverLetter, setGeneratedCoverLetter] = useState("");
	const [companyName, setCompanyName] = useState("");

	// ===== EFFECTS =====

	// Cleanup timeout on component unmount
	useEffect(() => {
		return () => {
			if (window.jobAnalysisTimeout) {
				clearTimeout(window.jobAnalysisTimeout);
			}
		};
	}, []);

	// ===== FILE PROCESSING FUNCTIONS =====

	/**
	 * Extract text content from uploaded file (PDF, DOCX, TXT)
	 */
	const extractTextFromFile = async (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			if (file.type === "application/pdf") {
				const reader = new FileReader();
				reader.onload = async (e) => {
					try {
						const arrayBuffer = e.target?.result as ArrayBuffer;
						const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
						let fullText = "";

						for (let i = 1; i <= pdf.numPages; i++) {
							const page = await pdf.getPage(i);
							const textContent = await page.getTextContent();
							const pageText = textContent.items.map((item: any) => item.str).join(" ");
							fullText += `${pageText}\n`;
						}

						resolve(fullText.trim());
					} catch (error) {
						reject(new Error("Failed to extract text from PDF"));
					}
				};
				reader.readAsArrayBuffer(file);
			} else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
				// Handle .docx files
				const reader = new FileReader();
				reader.onload = async (e) => {
					try {
						const arrayBuffer = e.target?.result as ArrayBuffer;
						const result = await mammoth.extractRawText({ arrayBuffer });
						resolve(result.value);
					} catch (error) {
						reject(new Error("Failed to extract text from Word document"));
					}
				};
				reader.readAsArrayBuffer(file);
			} else if (file.type === "text/plain") {
				// Handle .txt files
				const reader = new FileReader();
				reader.onload = (e) => {
					const text = e.target?.result as string;
					resolve(text);
				};
				reader.readAsText(file);
			} else {
				reject(new Error("Unsupported file type"));
			}
		});
	};

	// ===== JOB ANALYSIS FUNCTIONS =====

	/**
	 * Analyze job description to extract key skills, ATS keywords, and requirements
	 */
	const analyzeJobDescription = async (description: string) => {
		if (!description.trim()) {
			setJobAnalysis(null);
			return;
		}

		// Prevent multiple simultaneous analyses
		if (isAnalyzingJob) {
			console.log("Analysis already in progress, skipping...");
			return;
		}

		setIsAnalyzingJob(true);
		try {
			console.log("Starting job analysis for description length:", description.length);
			const result = await AIService.analyzeJobDescription(description);
			console.log("Job analysis result:", result);

			// Validate the result has the expected structure
			if (result && typeof result === "object") {
				setJobAnalysis(result);
				toast.success("Job description analyzed successfully!");
			} else {
				throw new Error("Invalid analysis result format");
			}
		} catch (error) {
			console.error("Job analysis error:", error);
			toast.error("Failed to analyze job description. Please try again.");
			// Set a default analysis result to show something
			setJobAnalysis({
				keySkills: ["Analysis failed - please try again"],
				requiredExperience: [],
				companyValues: [],
				suggestedKeywords: [],
			});
		} finally {
			setIsAnalyzingJob(false);
		}
	};

	/**
	 * Handle job description input changes with smart auto-analysis
	 * Detects pasted content and triggers analysis with appropriate delays
	 */
	const handleJobDescriptionChange = (value: string) => {
		const previousLength = jobDescription.length;
		const newLength = value.length;
		const isPasted = newLength - previousLength > 20; // Detect if content was pasted

		setJobDescription(value);

		// Clear any existing timeout first to prevent multiple analyses
		if (window.jobAnalysisTimeout) {
			clearTimeout(window.jobAnalysisTimeout);
			window.jobAnalysisTimeout = undefined;
		}

		// Auto-analyze when job description is pasted (immediate for substantial content)
		if (value.trim().length > 50) {
			// Show pending state immediately
			setIsAnalyzingPending(true);

			// Use shorter timeout for pasted content, longer for typed content
			const timeout = isPasted ? 500 : 800;

			// Set timeout for analysis with additional safety check
			window.jobAnalysisTimeout = setTimeout(() => {
				// Double-check that we're not already analyzing to prevent infinite cycles
				if (!isAnalyzingJob && !isAnalyzingPending) {
					setIsAnalyzingPending(false);
					analyzeJobDescription(value);
				} else {
					setIsAnalyzingPending(false);
				}
				window.jobAnalysisTimeout = undefined;
			}, timeout);
		} else if (value.trim().length === 0) {
			setJobAnalysis(null);
			setIsAnalyzingPending(false);
		} else {
			setIsAnalyzingPending(false);
		}
	};

	/**
	 * Manual analysis trigger for job description
	 */
	const handleManualAnalysis = () => {
		if (isAnalyzingJob || isAnalyzingPending) {
			console.log("Analysis already in progress, skipping manual trigger...");
			return;
		}

		if (jobDescription.trim().length > 10) {
			// Clear any pending timeout
			if (window.jobAnalysisTimeout) {
				clearTimeout(window.jobAnalysisTimeout);
				window.jobAnalysisTimeout = undefined;
			}
			setIsAnalyzingPending(false);
			analyzeJobDescription(jobDescription);
		} else {
			toast.error("Please enter a job description first");
		}
	};

	// ===== FILE UPLOAD HANDLERS =====

	/**
	 * Handle file upload and text extraction
	 */
	const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		// Validate file
		const validation = validateResumeFile(file);
		if (!validation.isValid) {
			toast.error(validation.error);
			return;
		}

		setUploadedFile(file);
		setExtractedText("");
		setOptimizedResume("");
		setOptimizationResult(null);
		setGeneratedPdfUrl(null);

		try {
			toast.info("Extracting text from file...");
			const text = await extractTextFromFile(file);
			setExtractedText(text);
			toast.success("Text extracted successfully!");
		} catch (error) {
			console.error("Text extraction error:", error);
			toast.error("Failed to extract text from file. Please try again.");
		}
	};

	// ===== RESUME OPTIMIZATION FUNCTIONS =====

	/**
	 * Optimize resume based on job description and analysis
	 */
	const handleOptimizeResume = async () => {
		if (!extractedText || !jobDescription.trim()) {
			toast.error("Please upload a resume file and enter a job description");
			return;
		}

		setIsOptimizing(true);

		// Show progress toast
		const progressToast = toast.loading("Optimizing your resume...", {
			description: "This may take 15-30 seconds",
		});

		try {
			// Create enhanced job description with analysis insights
			let enhancedJobDescription = jobDescription;

			// Add job analysis insights to the job description for better optimization
			if (jobAnalysis) {
				const analysisInsights = [
					`Key Skills Required: ${jobAnalysis.keySkills?.join(", ") || ""}`,
					`Required Experience: ${jobAnalysis.requiredExperience?.join(", ") || ""}`,
					`ATS Keywords: ${jobAnalysis.suggestedKeywords?.join(", ") || ""}`,
					`Company Values: ${jobAnalysis.companyValues?.join(", ") || ""}`,
				].filter((insight) => insight.length > 20); // Only include non-empty insights

				if (analysisInsights.length > 0) {
					enhancedJobDescription += `\n\nJOB ANALYSIS INSIGHTS:\n${analysisInsights.join("\n")}`;
				}
			}

			console.log("Optimizing resume with enhanced job description:", `${enhancedJobDescription.substring(0, 200)}...`);

			const result = await AIService.modifyResume({
				originalResume: extractedText,
				jobDescription: enhancedJobDescription,
			});

			setOptimizedResume(result.modifiedResume);
			setOptimizationResult(result);

			// Log the resume optimization activity
			await logWorkshopActivity("resume_optimized", {
				jobDescription: jobDescription.substring(0, 100) + "...", // Truncate for storage
				hasJobAnalysis: !!jobAnalysis,
				optimizationScore: result.atsScore || 0,
			});

			toast.dismiss(progressToast);
			toast.success("Resume optimized successfully!");
		} catch (error) {
			console.error("Resume optimization error:", error);
			toast.dismiss(progressToast);
			toast.error("Failed to optimize resume. Please try again.");
		} finally {
			setIsOptimizing(false);
		}
	};

	/**
	 * Generate PDF from optimized resume content
	 */
	const generatePDF = async () => {
		if (!optimizedResume) {
			toast.error("Please optimize a resume first");
			return;
		}

		setIsGeneratingPdf(true);
		try {
			// Clean and format the resume text for better PDF generation
			const cleanedResume = cleanResumeTextForPDF(optimizedResume);

			// Generate PDF that preserves original text formatting
			const blob = await pdf(<FormattedTextPDF text={cleanedResume} />).toBlob();
			const blobUrl = URL.createObjectURL(blob);
			setGeneratedPdfUrl(blobUrl);
			toast.success("PDF generated successfully!");
		} catch (error) {
			console.error("PDF generation error:", error);
			toast.error("Failed to generate PDF. Please try again.");
		} finally {
			setIsGeneratingPdf(false);
		}
	};

	/**
	 * Clean and format resume text for better PDF generation
	 */
	const cleanResumeTextForPDF = (text: string): string => {
		return (
			text
				// Remove any extra whitespace and normalize line breaks
				.replace(/\r\n/g, "\n")
				.replace(/\r/g, "\n")
				// Clean up multiple consecutive line breaks
				.replace(/\n{3,}/g, "\n\n")
				// Ensure proper spacing around section headers
				.replace(/\n([A-Z][A-Z\s]+[A-Z])\n/g, "\n\n$1\n")
				// Clean up bullet points formatting
				.replace(/\n\s*[•▪▫‣⁃◦\-\*]\s+/g, "\n• ")
				// Ensure proper spacing before and after job titles
				.replace(
					/\n([A-Z][a-z\s]+(?:Engineer|Developer|Manager|Analyst|Specialist|Coordinator|Director|Lead|Senior|Junior|Full Stack|Frontend|Backend|Software|Data|Machine Learning|AI|ML|DevOps|Cloud|Security|Database|System|Network|UI|UX|Web|Mobile|Project|Product|Program|Engineering))\n/g,
					"\n\n$1\n",
				)
				// Clean up company info lines
				.replace(/\n([A-Za-z0-9&().,\-\/\s]+(\s*[•·]\s*|\s+-\s+)[A-Za-z]{3}\s+\d{4}[^•\n]*)\n/g, "\n$1\n")
				// Remove any trailing whitespace
				.trim()
		);
	};

	/**
	 * Download generated PDF
	 */
	const downloadPDF = async () => {
		if (!generatedPdfUrl) {
			toast.error("Please generate a PDF first");
			return;
		}

		const a = document.createElement("a");
		a.href = generatedPdfUrl;
		a.download = "optimized_resume.pdf";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);

		// Log the resume download activity
		await logWorkshopActivity("resume_downloaded", {
			format: "pdf",
			filename: "optimized_resume.pdf",
		});

		toast.success("PDF downloaded successfully!");
	};

	/**
	 * Generate cover letter using AI
	 */
	const handleGenerateCoverLetter = async () => {
		if (!extractedText || !jobDescription.trim()) {
			toast.error("Please upload a resume and enter a job description first");
			return;
		}

		if (!companyName.trim()) {
			toast.error("Please enter a company name");
			return;
		}

		setIsGeneratingCoverLetter(true);
		try {
			console.log("Generating cover letter...");
			const coverLetter = await AIService.generateCoverLetter(jobDescription, optimizedResume || extractedText, companyName);

			setGeneratedCoverLetter(coverLetter);

			// Log the cover letter generation activity
			await logWorkshopActivity("cover_letter_generated", {
				companyName,
				jobDescription: jobDescription.substring(0, 100) + "...", // Truncate for storage
				basedOnOptimizedResume: !!optimizedResume,
			});

			toast.success("Cover letter generated successfully!");
		} catch (error) {
			console.error("Cover letter generation error:", error);
			toast.error("Failed to generate cover letter. Please try again.");
		} finally {
			setIsGeneratingCoverLetter(false);
		}
	};

	return (
		<m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full space-y-8">
			{/* Header */}
			<m.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
				className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
			>
				<div className="space-y-2">
					<div className="flex items-center gap-3">
						<m.div
							initial={{ scale: 0, rotate: -180 }}
							animate={{ scale: 1, rotate: 0 }}
							transition={{ type: "spring", stiffness: 300, damping: 20 }}
							className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400"
						>
							<Icon icon="mdi:file-document-edit" className="h-6 w-6" />
						</m.div>
						<div>
							<Title
								as="h1"
								className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent"
							>
								Resume Workshop
							</Title>
							<Text className="text-muted-foreground mt-1">
								Upload your resume and optimize it for specific job opportunities with AI-powered customization
							</Text>
						</div>
					</div>
				</div>
			</m.div>

			{/* Main Content */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Left Column - Resume Upload & Optimization */}
				<m.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
					{/* Resume Upload */}
					<ModernCard>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Icon icon="mdi:upload" className="h-5 w-5" />
								Upload Your Resume
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
								<input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
								<div className="space-y-3">
									<Icon icon="mdi:cloud-upload" className="h-12 w-12 text-gray-400 mx-auto" />
									<div>
										<Text className="font-medium">Drop your resume here or click to browse</Text>
										<Text className="text-sm text-muted-foreground">Supports PDF, Word (.docx), and text files (max 10MB)</Text>
									</div>
									<ModernButton variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
										<Icon icon="mdi:folder-open" className="h-4 w-4" />
										Choose File
									</ModernButton>
								</div>
							</div>

							{uploadedFile && (
								<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
									<div className="flex items-center gap-2 mb-2">
										<Icon icon="mdi:check-circle" className="h-4 w-4 text-green-600" />
										<Text className="font-medium text-green-800 dark:text-green-200">File Uploaded</Text>
									</div>
									<Text className="text-sm text-green-700 dark:text-green-300">{uploadedFile.name}</Text>
									{extractedText && <Text className="text-xs text-green-600 dark:text-green-400 mt-1">{extractedText.length} characters extracted</Text>}
								</div>
							)}
						</CardContent>
					</ModernCard>

					{/* Job Description Input */}
					<ModernCard>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Icon icon="mdi:briefcase" className="h-5 w-5" />
								Job Description
								{(isAnalyzingJob || isAnalyzingPending) && (
									<m.div
										animate={{ rotate: 360 }}
										transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
										className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full ml-2"
									/>
								)}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<div className="relative">
									<Textarea
										placeholder="Paste the job description here to optimize your resume..."
										value={jobDescription}
										onChange={(e) => handleJobDescriptionChange(e.target.value)}
										className={cn("min-h-[120px] max-h-[200px] resize-none", isAnalyzingPending && "border-primary/50 bg-primary/5")}
									/>
									{isAnalyzingPending && (
										<div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-primary">
											<m.div
												animate={{ rotate: 360 }}
												transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
												className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full"
											/>
											<span>Analyzing soon...</span>
										</div>
									)}
									{jobDescription.length > 0 && jobDescription.length < 50 && (
										<div className="absolute bottom-2 right-2 text-xs text-muted-foreground">Paste more content for automatic analysis</div>
									)}
								</div>
								<div className="flex justify-between items-center">
									<Text className="text-xs text-muted-foreground">{jobDescription.length} characters</Text>
									<ModernButton
										onClick={handleManualAnalysis}
										disabled={isAnalyzingJob || isAnalyzingPending || jobDescription.trim().length < 10}
										variant="outline"
										size="sm"
										className="gap-2"
									>
										{isAnalyzingJob ? (
											<>
												<m.div
													animate={{ rotate: 360 }}
													transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
													className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full"
												/>
												Analyzing...
											</>
										) : isAnalyzingPending ? (
											<>
												<m.div
													animate={{ rotate: 360 }}
													transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
													className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full"
												/>
												Preparing...
											</>
										) : (
											<>
												<Icon icon="mdi:magnify" className="h-3 w-3" />
												Analyze Job
											</>
										)}
									</ModernButton>
								</div>
							</div>

							{/* Job Analysis Results */}
							{jobAnalysis && (
								<div className="space-y-3 border-t pt-4">
									<div className="flex items-center gap-2">
										<Icon icon="mdi:check-circle" className="h-4 w-4 text-green-600" />
										<Text className="font-medium text-green-800 dark:text-green-200">Job Analysis Complete</Text>
									</div>

									{/* Key Skills */}
									{jobAnalysis.keySkills && jobAnalysis.keySkills.length > 0 && (
										<div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
											<Text className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Key Skills Required</Text>
											<div className="flex flex-wrap gap-1">
												{jobAnalysis.keySkills.slice(0, 6).map((skill: string, index: number) => (
													<Badge key={`skill-${skill}`} variant="secondary" className="text-xs">
														{skill}
													</Badge>
												))}
											</div>
										</div>
									)}

									{/* Suggested Keywords */}
									{jobAnalysis.suggestedKeywords && jobAnalysis.suggestedKeywords.length > 0 && (
										<div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
											<Text className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">ATS Keywords</Text>
											<div className="flex flex-wrap gap-1">
												{jobAnalysis.suggestedKeywords.slice(0, 4).map((keyword: string, index: number) => (
													<Badge key={`keyword-${keyword}`} variant="outline" className="text-xs border-green-300 text-green-700">
														{keyword}
													</Badge>
												))}
											</div>
										</div>
									)}

									{/* Required Experience */}
									{jobAnalysis.requiredExperience && jobAnalysis.requiredExperience.length > 0 && (
										<div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
											<Text className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2">Required Experience</Text>
											<div className="flex flex-wrap gap-1">
												{jobAnalysis.requiredExperience.slice(0, 3).map((exp: string, index: number) => (
													<Badge key={`exp-${exp}`} variant="outline" className="text-xs border-orange-300 text-orange-700">
														{exp}
													</Badge>
												))}
											</div>
										</div>
									)}

									{/* Company Values */}
									{jobAnalysis.companyValues && jobAnalysis.companyValues.length > 0 && (
										<div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
											<Text className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Company Values</Text>
											<div className="flex flex-wrap gap-1">
												{jobAnalysis.companyValues.slice(0, 3).map((value: string, index: number) => (
													<Badge key={`value-${value}`} variant="outline" className="text-xs border-purple-300 text-purple-700">
														{value}
													</Badge>
												))}
											</div>
										</div>
									)}

									{/* Fallback if no data */}
									{(!jobAnalysis.keySkills || jobAnalysis.keySkills.length === 0) &&
										(!jobAnalysis.suggestedKeywords || jobAnalysis.suggestedKeywords.length === 0) &&
										(!jobAnalysis.requiredExperience || jobAnalysis.requiredExperience.length === 0) &&
										(!jobAnalysis.companyValues || jobAnalysis.companyValues.length === 0) && (
											<div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
												<Text className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">Analysis Complete</Text>
												<Text className="text-sm text-yellow-600 dark:text-yellow-400">
													Job description has been analyzed. Ready to optimize your resume with the extracted insights.
												</Text>
											</div>
										)}
								</div>
							)}
						</CardContent>
					</ModernCard>

					{/* Company Name Input */}
					<ModernCard>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Icon icon="mdi:office-building" className="h-5 w-5" />
								Company Name
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								<Input
									type="text"
									placeholder="Enter company name for cover letter generation..."
									value={companyName}
									onChange={(e) => setCompanyName(e.target.value)}
								/>
								<Text className="text-xs text-muted-foreground">This will be used to personalize your cover letter</Text>
							</div>
						</CardContent>
					</ModernCard>

					{/* Optimize Button */}
					<ModernButton onClick={handleOptimizeResume} disabled={!extractedText || !jobDescription.trim() || isOptimizing} className="w-full" glow>
						{isOptimizing ? (
							<>
								<m.div
									animate={{ rotate: 360 }}
									transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
									className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full mr-2"
								/>
								Optimizing Resume...
							</>
						) : (
							<>
								<Icon icon="mdi:magic-staff" className="mr-2" />
								Optimize Resume
							</>
						)}
					</ModernButton>
				</m.div>

				{/* Right Column - Results and Resume Library */}
				<m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="space-y-6">
					{/* Optimization Results */}
					{optimizedResume && (
						<ModernCard>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Icon icon="mdi:check-circle" className="h-5 w-5 text-green-500" />
									Optimized Resume
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{optimizationResult && (
									<div className="space-y-3">
										<div className="flex items-center gap-2">
											<Badge variant="secondary" className="text-xs">
												ATS Score: {optimizationResult.atsScore || "N/A"}
											</Badge>
											<Badge variant="outline" className="text-xs">
												{optimizationResult.keyChanges?.length || 0} Changes
											</Badge>
										</div>
										{optimizationResult.summary && (
											<div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
												<Text className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Optimization Summary</Text>
												<Text className="text-sm text-blue-600 dark:text-blue-400">{optimizationResult.summary}</Text>
											</div>
										)}
									</div>
								)}

								<div className="max-h-[300px] overflow-y-auto">
									<Text className="text-sm whitespace-pre-wrap font-mono">{optimizedResume}</Text>
								</div>

								{/* Show differences if available */}
								{optimizationResult?.keyChanges && optimizationResult.keyChanges.length > 0 && (
									<div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
										<Text className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">Key Changes Made:</Text>
										<ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
											{optimizationResult.keyChanges.map((change: string, index: number) => (
												<li key={`change-${index}-${change.substring(0, 20)}`} className="flex items-start gap-2">
													<span className="text-green-500 mt-1">•</span>
													<span>{change}</span>
												</li>
											))}
										</ul>
									</div>
								)}

								<div className="flex gap-2">
									<ModernButton
										onClick={async () => {
											const blob = new Blob([optimizedResume], { type: "text/plain" });
											const url = URL.createObjectURL(blob);
											const a = document.createElement("a");
											a.href = url;
											a.download = "optimized_resume.txt";
											document.body.appendChild(a);
											a.click();
											document.body.removeChild(a);
											URL.revokeObjectURL(url);

											// Log the resume download activity
											await logWorkshopActivity("resume_downloaded", {
												format: "txt",
												filename: "optimized_resume.txt",
											});
										}}
										variant="outline"
										className="w-full"
									>
										<Icon icon="mdi:download" className="mr-2" />
										Download TXT
									</ModernButton>
								</div>

								{/* PDF Generation Section */}
								<div className="border-t pt-4">
									<ModernButton onClick={generatePDF} disabled={isGeneratingPdf} variant="outline" className="w-full">
										{isGeneratingPdf ? (
											<>
												<m.div
													animate={{ rotate: 360 }}
													transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
													className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full mr-2"
												/>
												Generating PDF...
											</>
										) : (
											<>
												<Icon icon="mdi:file-pdf-box" className="mr-2" />
												Generate PDF
											</>
										)}
									</ModernButton>
									{generatedPdfUrl && (
										<ModernButton onClick={downloadPDF} className="w-full mt-2">
											<Icon icon="mdi:download" className="mr-2" />
											Download PDF
										</ModernButton>
									)}
								</div>

								{/* Cover Letter Generation Section */}
								<div className="border-t pt-4">
									<div className="flex items-center gap-2 mb-3">
										<Icon icon="mdi:email" className="h-4 w-4" />
										<Text className="font-medium">Cover Letter</Text>
									</div>
									<ModernButton
										onClick={handleGenerateCoverLetter}
										disabled={isGeneratingCoverLetter || !extractedText || !jobDescription.trim() || !companyName.trim()}
										variant="outline"
										className="w-full"
									>
										{isGeneratingCoverLetter ? (
											<>
												<m.div
													animate={{ rotate: 360 }}
													transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
													className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full mr-2"
												/>
												Generating Cover Letter...
											</>
										) : (
											<>
												<Icon icon="mdi:email-edit" className="mr-2" />
												Generate Cover Letter
											</>
										)}
									</ModernButton>
								</div>
							</CardContent>
						</ModernCard>
					)}

					{/* Generated Cover Letter Display */}
					{generatedCoverLetter && (
						<ModernCard>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Icon icon="mdi:email" className="h-5 w-5" />
									Generated Cover Letter
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div className="p-4 bg-muted/50 rounded-lg">
										<pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">{generatedCoverLetter}</pre>
									</div>
									<div className="flex gap-2">
										<ModernButton
											onClick={async () => {
												const blob = new Blob([generatedCoverLetter], { type: "text/plain" });
												const url = URL.createObjectURL(blob);
												const a = document.createElement("a");
												a.href = url;
												const filename = `cover_letter_${companyName.replace(/\s+/g, "_")}.txt`;
												a.download = filename;
												document.body.appendChild(a);
												a.click();
												document.body.removeChild(a);
												URL.revokeObjectURL(url);

												// Log the cover letter download activity
												await logWorkshopActivity("cover_letter_downloaded", {
													companyName,
													format: "txt",
													filename,
												});

												toast.success("Cover letter downloaded successfully!");
											}}
											variant="outline"
											className="w-full"
										>
											<Icon icon="mdi:download" className="mr-2" />
											Download Cover Letter
										</ModernButton>
										<ModernButton
											onClick={() => {
												navigator.clipboard.writeText(generatedCoverLetter);
												toast.success("Cover letter copied to clipboard!");
											}}
											variant="outline"
											className="w-full"
										>
											<Icon icon="mdi:content-copy" className="mr-2" />
											Copy to Clipboard
										</ModernButton>
									</div>
								</div>
							</CardContent>
						</ModernCard>
					)}
				</m.div>
			</div>
		</m.div>
	);
}
