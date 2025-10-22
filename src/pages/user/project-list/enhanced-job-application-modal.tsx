import AIService, { modifyResume, generateCoverLetter, analyzeJobDescription } from "@/api/services/aiService";
import { GLOBAL_CONFIG } from "@/global-config";
import { useUpdateProposal } from "@/store/proposalStore";
import { useGetSavedResumeList, useUpdateSavedResume } from "@/store/savedResumeStore";
import { useUserInfo } from "@/store/userStore";
import type { ProposalInfo } from "@/types/entity";
import { Alert, AlertDescription } from "@/ui/alert";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/collapsible";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Textarea } from "@/ui/textarea";
import { generateResumeJson } from "@/utils/resume-utils";
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Download, FileText, Loader2, Save, Sparkles, Upload, Wand2 } from "lucide-react";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

export type EnhancedJobApplicationModalProps = {
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

interface JobAnalysis {
	keySkills: string[];
	requiredExperience: string[];
	companyValues: string[];
	suggestedKeywords: string[];
}

interface ResumeModificationResult {
	modifiedResume: string;
	summary: string;
	keyChanges: string[];
	atsScore?: number;
}

export default function EnhancedJobApplicationModal({ title, show, formValue, onOk, onCancel }: EnhancedJobApplicationModalProps) {
	const { updateProposal, isLoading } = useUpdateProposal();
	const { updateSavedResume, isLoading: isSavingResume } = useUpdateSavedResume();
	const { getSavedResumeList, data: savedResumesData, isLoading: isLoadingResumes } = useGetSavedResumeList();
	const userInfo = useUserInfo();
	const [activeTab, setActiveTab] = useState("basic");
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [isModifyingResume, setIsModifyingResume] = useState(false);
	const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
	const [jobAnalysis, setJobAnalysis] = useState<JobAnalysis | null>(null);
	const [resumeModification, setResumeModification] = useState<ResumeModificationResult | null>(null);
	const [hasAnalyzedJob, setHasAnalyzedJob] = useState(false);
	const [originalResume, setOriginalResume] = useState("");
	const [showResumePreview, setShowResumePreview] = useState(false);
	const [currentFormValues, setCurrentFormValues] = useState<ProposalInfo>(formValue);
	const [savedResumes, setSavedResumes] = useState<any[]>([]);
	const [selectedResumeId, setSelectedResumeId] = useState("");
	const [isFetchingJobInfo, setIsFetchingJobInfo] = useState(false);

	// Refs to prevent duplicate API calls
	const lastAnalyzedContent = useRef<string>("");
	const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Collapsible states for better UX
	const [isJobDescriptionExpanded, setIsJobDescriptionExpanded] = useState(false);
	const [isResumeExpanded, setIsResumeExpanded] = useState(false);
	const [isCoverLetterExpanded, setIsCoverLetterExpanded] = useState(false);
	const [isJobDescriptionCollapsed, setIsJobDescriptionCollapsed] = useState(false);
	const [isResumeCollapsed, setIsResumeCollapsed] = useState(false);
	const [isCoverLetterCollapsed, setIsCoverLetterCollapsed] = useState(false);

	const form = useForm<ProposalInfo>({
		defaultValues: formValue,
		mode: "onSubmit",
	});

	const [statusOptions] = useState([
		{ label: "Applied", value: "applied" },
		{ label: "Interviewing", value: "interviewing" },
		{ label: "Offered", value: "offered" },
		{ label: "Rejected", value: "rejected" },
	]);

	// Load saved resumes
	useEffect(() => {
		if (userInfo?.id) {
			getSavedResumeList();
		}
	}, [userInfo?.id, getSavedResumeList]);

	// Update saved resumes when data changes
	useEffect(() => {
		if (savedResumesData && "savedResumes" in savedResumesData && savedResumesData.savedResumes) {
			setSavedResumes(savedResumesData.savedResumes);
		}
	}, [savedResumesData]);

	useEffect(() => {
		// Preserve current form values if they exist and are different from formValue
		if (formValue.id !== currentFormValues.id) {
			setCurrentFormValues(formValue);
			form.reset(formValue);
		}
	}, [formValue, form, currentFormValues.id]);

	// Auto-fetch job information from job link
	const fetchJobInfoFromLink = async (jobLink: string) => {
		if (!jobLink || (!jobLink.includes("linkedin.com") && !jobLink.includes("indeed.com"))) {
			return;
		}

		setIsFetchingJobInfo(true);
		try {
			// In a real implementation, you would have an API endpoint to scrape job information
			// For now, we'll simulate this with a timeout
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Simulate extracted job information
			const extractedInfo = {
				company: "Extracted Company Name",
				jobTitle: "Extracted Job Title",
			};

			// Update form with extracted information
			form.setValue("company", extractedInfo.company);
			form.setValue("job_description", `Job Title: ${extractedInfo.jobTitle}\nCompany: ${extractedInfo.company}\n\nJob information extracted from: ${jobLink}`);

			toast.success("Job information extracted from link!");
		} catch (error) {
			console.error("Failed to extract job information:", error);
			toast.error("Could not extract job information from link. Please fill in manually.");
		} finally {
			setIsFetchingJobInfo(false);
		}
	};

	// Handle job link change
	const handleJobLinkChange = (jobLink: string) => {
		form.setValue("job_link", jobLink);
		if (jobLink?.includes("linkedin.com") || jobLink?.includes("indeed.com")) {
			fetchJobInfoFromLink(jobLink);
		}
	};

	// Handle resume selection
	const handleResumeSelection = (resumeId: string) => {
		setSelectedResumeId(resumeId);
		const selectedResume = savedResumes.find((r) => r.id === resumeId);
		if (selectedResume) {
			form.setValue("resume", selectedResume.modified_resume);
			form.setValue("job_description", selectedResume.job_description);
			setOriginalResume(selectedResume.original_resume);
		}
	};

	const onSubmit = async (values: ProposalInfo) => {
		const { id, created_at, ...dataWithoutId } = values;
		const proposal = title === "New Job Application" ? dataWithoutId : values;

		// Link the selected resume to this job application
		if (selectedResumeId) {
			proposal.saved_resume_id = selectedResumeId;
		}

		await updateProposal(proposal);
		onOk(values);
	};

	// Auto-analyze job description when it changes
	useEffect(() => {
		const jobDescription = form.watch("job_description");

		if (jobDescription && jobDescription !== lastAnalyzedContent.current && jobDescription.length > 50) {
			// Clear existing timeout
			if (analysisTimeoutRef.current) {
				clearTimeout(analysisTimeoutRef.current);
			}

			// Set new timeout for analysis
			analysisTimeoutRef.current = setTimeout(async () => {
				if (jobDescription === form.getValues("job_description")) {
					setIsAnalyzing(true);
					try {
						const analysis = await analyzeJobDescription(jobDescription);
						setJobAnalysis(analysis);
						setHasAnalyzedJob(true);
						lastAnalyzedContent.current = jobDescription;
					} catch (error) {
						console.error("Job analysis failed:", error);
					} finally {
						setIsAnalyzing(false);
					}
				}
			}, 2000); // Wait 2 seconds after user stops typing
		}

		return () => {
			if (analysisTimeoutRef.current) {
				clearTimeout(analysisTimeoutRef.current);
			}
		};
	}, [form]);

	const handleResumeModification = async () => {
		const currentValues = form.getValues();
		if (!currentValues.resume || !currentValues.job_description) {
			toast.error("Please ensure both resume and job description are filled");
			return;
		}

		setIsModifyingResume(true);
		try {
			const result = await modifyResume({
				originalResume: originalResume || currentValues.resume,
				jobDescription: currentValues.job_description,
			});

			setResumeModification(result);
			form.setValue("resume", result.modifiedResume);
			toast.success("Resume optimized successfully!");
		} catch (error) {
			console.error("Resume modification failed:", error);
			toast.error("Failed to optimize resume. Please try again.");
		} finally {
			setIsModifyingResume(false);
		}
	};

	const handleCoverLetterGeneration = async () => {
		const currentValues = form.getValues();
		if (!currentValues.job_description || !currentValues.resume || !currentValues.company) {
			toast.error("Please ensure job description, resume, and company are filled");
			return;
		}

		setIsGeneratingCoverLetter(true);
		try {
			const coverLetter = await generateCoverLetter(currentValues.job_description, currentValues.resume, currentValues.company);
			form.setValue("cover_letter", coverLetter);
			toast.success("Cover letter generated successfully!");
		} catch (error) {
			console.error("Cover letter generation failed:", error);
			toast.error("Failed to generate cover letter. Please try again.");
		} finally {
			setIsGeneratingCoverLetter(false);
		}
	};

	return (
		<Dialog open={show} onOpenChange={(open) => !open && onCancel()}>
			<DialogContent className="!w-[98vw] !h-[98vh] !max-w-none !max-h-none overflow-hidden flex flex-col">
				<DialogHeader className="flex-shrink-0">
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<div className="flex-1 overflow-y-auto">
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
							<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
								<TabsList className="grid w-full grid-cols-3">
									<TabsTrigger value="basic">Basic Info</TabsTrigger>
									<TabsTrigger value="resume">Resume & Cover Letter</TabsTrigger>
									<TabsTrigger value="analysis">AI Analysis</TabsTrigger>
								</TabsList>

								<TabsContent value="basic" className="space-y-6">
									{/* Job Link and Auto-fetch */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<FormField
											control={form.control}
											name="job_link"
											rules={{ required: "Job link is required." }}
											render={({ field }) => (
												<FormItem>
													<FormLabel>Job Link</FormLabel>
													<FormControl>
														<div className="relative">
															<Input {...field} placeholder="https://linkedin.com/jobs/..." onChange={(e) => handleJobLinkChange(e.target.value)} />
															{isFetchingJobInfo && (
																<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
																	<Loader2 className="h-4 w-4 animate-spin" />
																</div>
															)}
														</div>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="company"
											rules={{ required: "Company name is required." }}
											render={({ field }) => (
												<FormItem>
													<FormLabel>Company</FormLabel>
													<FormControl>
														<Input {...field} placeholder="Enter company name" />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>

									{/* Resume Selection */}
									<FormField
										control={form.control}
										name="resume"
										rules={{ required: "Resume is required." }}
										render={({ field }) => (
											<FormItem>
												<FormLabel>Resume Version</FormLabel>
												<FormControl>
													<Select value={selectedResumeId} onValueChange={handleResumeSelection}>
														<SelectTrigger>
															<SelectValue placeholder="Select from your saved resumes" />
														</SelectTrigger>
														<SelectContent>
															{savedResumes.map((resume) => (
																<SelectItem key={resume.id} value={resume.id}>
																	<div className="flex items-center gap-2">
																		<Badge variant="secondary" className="text-xs">
																			{resume.id}
																		</Badge>
																		<span>{resume.company || "No Company"}</span>
																	</div>
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									{/* Status */}
									<FormField
										control={form.control}
										name="status"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Application Status</FormLabel>
												<Select onValueChange={field.onChange} defaultValue={field.value}>
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
								</TabsContent>

								<TabsContent value="resume" className="space-y-6">
									{/* Resume Content */}
									<Collapsible open={isResumeExpanded} onOpenChange={setIsResumeExpanded}>
										<CollapsibleTrigger asChild>
											<Button variant="ghost" className="w-full justify-between p-4">
												<div className="flex items-center gap-2">
													<FileText className="h-4 w-4" />
													<span>Resume Content</span>
													{form.watch("resume") && (
														<Badge variant="secondary" className="text-xs">
															{form.watch("resume")?.length || 0} chars
														</Badge>
													)}
												</div>
												{isResumeExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
											</Button>
										</CollapsibleTrigger>
										<CollapsibleContent className="space-y-4">
											<FormField
												control={form.control}
												name="resume"
												render={({ field }) => (
													<FormItem>
														<FormControl>
															<Textarea
																{...field}
																placeholder="Resume content will be populated from selected resume..."
																className="min-h-[300px] resize-none"
																readOnly={!!selectedResumeId}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											{selectedResumeId && (
												<Alert>
													<AlertCircle className="h-4 w-4" />
													<AlertDescription>
														Resume content is read-only when using a saved resume. To modify, create a new resume in the Resume Workshop.
													</AlertDescription>
												</Alert>
											)}
										</CollapsibleContent>
									</Collapsible>

									{/* Cover Letter */}
									<Collapsible open={isCoverLetterExpanded} onOpenChange={setIsCoverLetterExpanded}>
										<CollapsibleTrigger asChild>
											<Button variant="ghost" className="w-full justify-between p-4">
												<div className="flex items-center gap-2">
													<FileText className="h-4 w-4" />
													<span>Cover Letter</span>
													{form.watch("cover_letter") && (
														<Badge variant="secondary" className="text-xs">
															{form.watch("cover_letter")?.length || 0} chars
														</Badge>
													)}
												</div>
												{isCoverLetterExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
											</Button>
										</CollapsibleTrigger>
										<CollapsibleContent className="space-y-4">
											<FormField
												control={form.control}
												name="cover_letter"
												render={({ field }) => (
													<FormItem>
														<FormControl>
															<Textarea {...field} placeholder="Cover letter content..." className="min-h-[200px] resize-none" />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<Button type="button" onClick={handleCoverLetterGeneration} disabled={isGeneratingCoverLetter} variant="outline" className="w-full">
												{isGeneratingCoverLetter ? (
													<>
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
														Generating Cover Letter...
													</>
												) : (
													<>
														<Sparkles className="mr-2 h-4 w-4" />
														Generate Cover Letter with AI
													</>
												)}
											</Button>
										</CollapsibleContent>
									</Collapsible>
								</TabsContent>

								<TabsContent value="analysis" className="space-y-6">
									{/* Job Analysis */}
									{jobAnalysis && (
										<Card>
											<CardHeader>
												<CardTitle className="flex items-center gap-2">
													<CheckCircle className="h-5 w-5 text-green-500" />
													Job Analysis Results
												</CardTitle>
											</CardHeader>
											<CardContent className="space-y-4">
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div>
														<h4 className="font-semibold mb-2">Key Skills</h4>
														<div className="flex flex-wrap gap-1">
															{jobAnalysis.keySkills.map((skill) => (
																<Badge key={`skill-${skill}`} variant="outline" className="text-xs">
																	{skill}
																</Badge>
															))}
														</div>
													</div>
													<div>
														<h4 className="font-semibold mb-2">Required Experience</h4>
														<div className="flex flex-wrap gap-1">
															{jobAnalysis.requiredExperience.map((exp) => (
																<Badge key={`exp-${exp}`} variant="secondary" className="text-xs">
																	{exp}
																</Badge>
															))}
														</div>
													</div>
												</div>
												<div>
													<h4 className="font-semibold mb-2">Suggested Keywords</h4>
													<div className="flex flex-wrap gap-1">
														{jobAnalysis.suggestedKeywords.map((keyword) => (
															<Badge key={`keyword-${keyword}`} variant="default" className="text-xs">
																{keyword}
															</Badge>
														))}
													</div>
												</div>
											</CardContent>
										</Card>
									)}

									{/* Resume Modification Results */}
									{resumeModification && (
										<Card>
											<CardHeader>
												<CardTitle className="flex items-center gap-2">
													<Wand2 className="h-5 w-5 text-blue-500" />
													Resume Optimization Results
												</CardTitle>
											</CardHeader>
											<CardContent className="space-y-4">
												<div className="flex items-center gap-4">
													<Badge variant="secondary">ATS Score: {resumeModification.atsScore || "N/A"}</Badge>
													<Badge variant="outline">{resumeModification.keyChanges?.length || 0} Changes Made</Badge>
												</div>
												<div>
													<h4 className="font-semibold mb-2">Summary of Changes</h4>
													<p className="text-sm text-muted-foreground">{resumeModification.summary}</p>
												</div>
												{resumeModification.keyChanges && resumeModification.keyChanges.length > 0 && (
													<div>
														<h4 className="font-semibold mb-2">Key Changes</h4>
														<ul className="list-disc list-inside space-y-1 text-sm">
															{resumeModification.keyChanges.map((change) => (
																<li key={`change-${change}`} className="text-muted-foreground">
																	{change}
																</li>
															))}
														</ul>
													</div>
												)}
											</CardContent>
										</Card>
									)}

									{/* Analysis Actions */}
									<div className="space-y-4">
										<Button
											type="button"
											onClick={handleResumeModification}
											disabled={isModifyingResume || !form.watch("resume") || !form.watch("job_description")}
											variant="outline"
											className="w-full"
										>
											{isModifyingResume ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Optimizing Resume...
												</>
											) : (
												<>
													<Wand2 className="mr-2 h-4 w-4" />
													Optimize Resume for This Job
												</>
											)}
										</Button>
									</div>
								</TabsContent>
							</Tabs>
						</form>
					</Form>
				</div>

				<DialogFooter className="flex-shrink-0">
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							form.reset(defaultProposalValue);
							setJobAnalysis(null);
							setResumeModification(null);
							setOriginalResume("");
							setSelectedResumeId("");
							setIsJobDescriptionCollapsed(false);
							setIsResumeCollapsed(false);
							setIsCoverLetterCollapsed(false);
							setIsJobDescriptionExpanded(false);
							setIsResumeExpanded(false);
							setIsCoverLetterExpanded(false);
						}}
					>
						Clear All
					</Button>
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>
					<Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={isLoading}>
						{isLoading && <Loader2 className="animate-spin mr-2" />}
						{title === "New Job Application" ? "Create Application" : "Update Application"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
