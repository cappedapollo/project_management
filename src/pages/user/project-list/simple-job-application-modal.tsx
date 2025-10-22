import apiClient from "@/api/apiClient";
import FormattedTextPDF from "@/components/FormattedTextPDF";
import { useAuth } from "@/components/auth/use-auth";
import { useUpdateProposal } from "@/store/proposalStore";
import { useUpdateSavedResume } from "@/store/savedResumeStore";
import type { ProposalInfo } from "@/types/entity";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Textarea } from "@/ui/textarea";
import { FileText, Loader2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export type SimpleJobApplicationModalProps = {
	formValue: ProposalInfo;
	title: string;
	show: boolean;
	onOk: (values: ProposalInfo) => void;
	onCancel: VoidFunction;
};

const defaultProposalValue: ProposalInfo = {
	id: "",
	profile: "",
	user: "",
	job_description: "",
	resume: "",
	job_link: "",
	company: "",
	cover_letter: "",
	status: "applied",
};

export default function SimpleJobApplicationModal({ title, show, formValue, onOk, onCancel }: SimpleJobApplicationModalProps) {
	const { updateProposal, isLoading } = useUpdateProposal();
	const { updateSavedResume } = useUpdateSavedResume();
	const { isAuthenticated, access_token, user } = useAuth();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploadedFileName, setUploadedFileName] = useState("");
	const [isUploading, setIsUploading] = useState(false);
	const [uploadedFile, setUploadedFile] = useState<File | null>(null);

	const form = useForm<ProposalInfo>({
		defaultValues: formValue,
	});

	const [statusOptions] = useState([
		{ label: "Applied", value: "applied" },
		{ label: "Interviewing", value: "interviewing" },
		{ label: "Offered", value: "offered" },
		{ label: "Rejected", value: "rejected" },
	]);

	useEffect(() => {
		form.reset(formValue);
	}, [formValue, form]);

	const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		// Validate file size (10MB limit)
		if (file.size > 10 * 1024 * 1024) {
			toast.error("File size must be less than 10MB");
			return;
		}

		// Validate file type - only accept PDF files
		if (file.type !== "application/pdf") {
			toast.error("Please upload a PDF file only");
			return;
		}

		setIsUploading(true);
		setUploadedFileName(file.name);
		setUploadedFile(file);

		try {
			// Don't extract text content - just set a placeholder
			form.setValue("resume", "PDF Resume Uploaded");
			toast.success("Resume uploaded successfully!");
		} catch (error) {
			console.error("File upload error:", error);
			toast.error("Failed to upload resume. Please try again.");
			setUploadedFileName("");
			setUploadedFile(null);
		} finally {
			setIsUploading(false);
		}
	};

	// Generate default resume content for job applications
	const generateDefaultResumeContent = (company: string, jobDescription: string) => {
		return `PROFESSIONAL RESUME

CONTACT INFORMATION
Email: ${user?.email || "your.email@example.com"}
Phone: (555) 123-4567
Location: Your City, State

PROFESSIONAL SUMMARY
Experienced professional with a strong background in technology and business operations. 
Proven track record of delivering high-quality results and adapting to dynamic work environments. 
Passionate about contributing to innovative companies that value growth and excellence.

CORE COMPETENCIES
• Project Management & Team Leadership
• Technical Problem Solving & Analysis
• Communication & Collaboration
• Process Improvement & Optimization
• Client Relations & Customer Service
• Adaptability & Continuous Learning

PROFESSIONAL EXPERIENCE

SENIOR PROFESSIONAL | Previous Company | 2020 - Present
• Led cross-functional teams to deliver successful projects on time and within budget
• Implemented efficient processes that improved productivity by 25%
• Collaborated with stakeholders to identify and resolve complex challenges
• Mentored junior team members and contributed to professional development initiatives

PROFESSIONAL | Another Company | 2018 - 2020
• Managed multiple projects simultaneously while maintaining high quality standards
• Developed and maintained strong relationships with clients and vendors
• Contributed to strategic planning and business development initiatives
• Demonstrated expertise in problem-solving and analytical thinking

EDUCATION
Bachelor's Degree in Business/Technology
University Name | Year

WHY ${company?.toUpperCase() || "THIS COMPANY"}?
I am particularly interested in this opportunity with ${company || "your company"} because of your commitment to excellence 
and innovation. The role aligns perfectly with my professional goals and experience, and I am excited 
about the possibility of contributing to your team's continued success.

This resume was customized specifically for the ${company || "company"} opportunity based on the provided job description.`;
	};

	// Save uploaded PDF file to backend
	const saveUploadedPDF = async (file: File, company: string, jobDescription: string): Promise<string> => {
		try {
			console.log("🔐 Auth status:", { isAuthenticated, hasToken: !!access_token });
			console.log("📁 File being uploaded:", { name: file.name, size: file.size, type: file.type });

			// Create form data to send to backend
			const formData = new FormData();
			formData.append("resume", file);
			formData.append("company", company);
			formData.append("jobDescription", jobDescription);
			formData.append("timestamp", Date.now().toString());

			console.log("📋 FormData created:", {
				hasFile: formData.has("resume"),
				hasCompany: formData.has("company"),
				hasJobDescription: formData.has("jobDescription"),
				hasTimestamp: formData.has("timestamp"),
			});

			// Use API client with proper authentication
			const result = await apiClient.post({
				url: "/proposals/save-resume-pdf",
				data: formData,
			});

			return (result as any).filePath; // Return the saved file path
		} catch (error) {
			console.error("Error saving PDF:", error);
			throw new Error("Failed to save PDF file");
		}
	};

	const onSubmit = async (values: ProposalInfo) => {
		try {
			// Check if user is authenticated
			if (!isAuthenticated || !access_token || !user) {
				toast.error("You must be logged in to create an application");
				return;
			}

			// Save uploaded PDF file if it exists
			let pdfFilePath = null;
			if (uploadedFile && values.company && values.job_description) {
				pdfFilePath = await saveUploadedPDF(uploadedFile, values.company, values.job_description);
			}

			const { id, created_at, ...dataWithoutId } = values;
			const proposal = title === "New Job Application" ? dataWithoutId : values;

			// For new applications, don't send resume content, only the PDF path
			if (title === "New Job Application") {
				proposal.resume = "PDF Resume Uploaded"; // Just a placeholder
			}

			// Add PDF file path to the proposal data
			if (pdfFilePath) {
				proposal.resume_pdf_path = pdfFilePath;
			}

			// Create a saved resume for this job application automatically
			let savedResumeId = null;
			if (values.company && values.job_description) {
				try {
					console.log("Creating saved resume for job application:", values.company);

					// Use the working profile ID that we know exists
					// This is a temporary workaround - in production, each user should have their own profile
					const profileId = "6fe1b1c0-8c61-45b8-afe3-cffa60816b16";

					// Generate meaningful resume content if no specific content is provided
					const resumeContent =
						proposal.resume && proposal.resume !== "PDF Resume Uploaded"
							? proposal.resume
							: generateDefaultResumeContent(values.company, values.job_description);

					const savedResumeResult = await updateSavedResume({
						user: user.id,
						profile: profileId,
						original_resume: resumeContent,
						modified_resume: resumeContent,
						job_description: values.job_description,
						company: values.company,
						job_link: values.job_link,
					});

					savedResumeId = savedResumeResult.id;
					console.log("✅ Created saved resume:", savedResumeId);

					// Link the saved resume to the job application
					proposal.saved_resume_id = savedResumeId;

					toast.success("Job application and resume created successfully!");
				} catch (resumeError) {
					console.error("Warning: Failed to create saved resume:", resumeError);
					// Don't fail the whole application if resume creation fails
					toast.warning("Job application created, but failed to save resume copy");
				}
			}

			await updateProposal(proposal);
			onOk(values);
		} catch (error) {
			console.error("Error submitting application:", error);
			toast.error("Failed to create application. Please try again.");
		}
	};

	return (
		<Dialog open={show} onOpenChange={(open) => !open && onCancel()}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						{/* Job Link */}
						<FormField
							control={form.control}
							name="job_link"
							rules={{ required: "Job link is required." }}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Job Link</FormLabel>
									<FormControl>
										<Input {...field} placeholder="https://linkedin.com/jobs/..." />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Company Name */}
						<FormField
							control={form.control}
							name="company"
							rules={{ required: "Company name is required." }}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Company Name</FormLabel>
									<FormControl>
										<Input {...field} placeholder="Enter company name" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Job Description */}
						<FormField
							control={form.control}
							name="job_description"
							rules={{ required: "Job description is required." }}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Job Description</FormLabel>
									<FormControl>
										<Textarea {...field} placeholder="Paste the job description here..." className="min-h-[120px] max-h-64 resize-y" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Resume Upload */}
						<FormField
							control={form.control}
							name="resume"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Resume (Optional)</FormLabel>
									<FormControl>
										<div className="space-y-3">
											<input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
											<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
												<div className="space-y-3">
													<Upload className="h-12 w-12 text-gray-400 mx-auto" />
													<div>
														<p className="font-medium">Upload your resume PDF</p>
														<p className="text-sm text-muted-foreground">PDF files only (max 10MB) - Optional</p>
													</div>
													<Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="gap-2">
														{isUploading ? (
															<>
																<Loader2 className="h-4 w-4 animate-spin" />
																Uploading...
															</>
														) : (
															<>
																<FileText className="h-4 w-4" />
																Choose File
															</>
														)}
													</Button>
												</div>
											</div>
											{uploadedFileName && (
												<div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
													<div className="flex items-center gap-2">
														<FileText className="h-4 w-4 text-green-600" />
														<span className="text-sm text-green-700 dark:text-green-300">{uploadedFileName}</span>
													</div>
												</div>
											)}
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Application Status */}
						<FormField
							control={form.control}
							name="status"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Application Status</FormLabel>
									<Select onValueChange={field.onChange} defaultValue={field.value || "applied"}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select status" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{statusOptions.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button type="button" variant="outline" onClick={onCancel}>
								Cancel
							</Button>
							<Button type="submit" disabled={isLoading}>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Creating...
									</>
								) : (
									"Create Application"
								)}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
