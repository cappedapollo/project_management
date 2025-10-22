import type { SavedResume } from "@/api/services/resumeService";
import { useGetSavedResumeList } from "@/store/savedResumeStore";
import { useUpdateSavedResume } from "@/store/savedResumeStore";
import { useUserInfo } from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Textarea } from "@/ui/textarea";
import { Copy, ExternalLink, FileText, Search, Upload, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface ResumeUploadModalProps {
	show: boolean;
	onClose: () => void;
	onResumeSelected: (resumeId: string, resumeData?: SavedResume) => void;
}

interface UploadFormData {
	company: string;
	jobDescription: string;
	originalResume: string;
	modifiedResume: string;
	jobLink: string;
}

interface ResumeListResponse {
	savedResumes: SavedResume[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export default function ResumeUploadModal({ show, onClose, onResumeSelected }: ResumeUploadModalProps) {
	const [activeTab, setActiveTab] = useState<"upload" | "select">("upload");
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
	const [uploadFormData, setUploadFormData] = useState<UploadFormData>({
		company: "",
		jobDescription: "",
		originalResume: "",
		modifiedResume: "",
		jobLink: "",
	});
	const [isUploading, setIsUploading] = useState(false);
	const [showAllResumes, setShowAllResumes] = useState(false);

	const user = useUserInfo();

	// First, try to get resumes linked to applications
	const {
		getSavedResumeList: getLinkedResumes,
		data: linkedResumeData,
		isLoading: isLoadingLinked,
		error: linkedError,
	} = useGetSavedResumeList({
		userId: user?.id || "",
		profileId: "", // We'll get all resumes for the user
		jobDescription: "",
		limit: 50, // Get more resumes
		linkedToApplications: true, // Show only resumes linked to applied jobs for interview scheduling
	});

	// Fallback to get all resumes if user chooses to see them
	const {
		getSavedResumeList: getAllResumes,
		data: allResumeData,
		isLoading: isLoadingAll,
		error: allError,
	} = useGetSavedResumeList({
		userId: user?.id || "",
		profileId: "", // We'll get all resumes for the user
		jobDescription: "",
		limit: 50, // Get more resumes
		linkedToApplications: false, // Show ALL resumes
	});

	// Determine which data to use
	const resumeData = showAllResumes ? allResumeData : linkedResumeData;
	const isLoading = showAllResumes ? isLoadingAll : isLoadingLinked;
	const error = showAllResumes ? allError : linkedError;
	const getSavedResumeList = showAllResumes ? getAllResumes : getLinkedResumes;

	const { updateSavedResume } = useUpdateSavedResume();

	// Debug logging
	useEffect(() => {
		console.log("Resume Modal Debug:");
		console.log("User ID:", user?.id);
		console.log("Show modal:", show);
		console.log("Show all resumes:", showAllResumes);
		console.log("Linked resume data:", linkedResumeData);
		console.log("All resume data:", allResumeData);
		console.log("Resume data (current):", resumeData);
		console.log("Is loading:", isLoading);
		console.log("Error:", error);
	}, [user?.id, show, showAllResumes, linkedResumeData, allResumeData, resumeData, isLoading, error]);

	// Fetch saved resumes when modal opens
	useEffect(() => {
		if (show && user?.id) {
			console.log("Manually triggering getSavedResumeList for user:", user.id);
			// Call the function with proper parameters
			getSavedResumeList();
			// Pre-fetch all resumes as well for quick switching
			getAllResumes();
		}
	}, [show, user?.id, getSavedResumeList, getAllResumes]);

	// Also fetch when user changes
	useEffect(() => {
		if (user?.id) {
			console.log("User changed, fetching resumes for user:", user.id);
			getSavedResumeList();
			getAllResumes();
		}
	}, [user?.id, getSavedResumeList, getAllResumes]);

	// Fetch data when switching between linked and all resumes
	useEffect(() => {
		if (user?.id && show) {
			console.log("Resume view mode changed, fetching:", showAllResumes ? "all resumes" : "linked resumes");
			getSavedResumeList();
		}
	}, [showAllResumes, user?.id, show, getSavedResumeList]);

	const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		// Check file type
		if (file.type !== "text/plain" && file.type !== "application/pdf") {
			toast.error("Please upload a .txt or .pdf file");
			return;
		}

		// Check file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			toast.error("File size must be less than 5MB");
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			const content = e.target?.result as string;
			setUploadFormData((prev) => ({
				...prev,
				originalResume: content,
				modifiedResume: content, // Initially same as original
			}));
			toast.success("Resume uploaded successfully!");
		};
		reader.readAsText(file);
	}, []);

	const handleUploadResume = async () => {
		if (!user?.id) {
			toast.error("User not found");
			return;
		}

		if (!uploadFormData.company || !uploadFormData.jobDescription || !uploadFormData.originalResume) {
			toast.error("Please fill in all required fields");
			return;
		}

		setIsUploading(true);
		try {
			const result = await updateSavedResume({
				user: user.id,
				profile: "", // Will be set by backend
				company: uploadFormData.company,
				job_description: uploadFormData.jobDescription,
				original_resume: uploadFormData.originalResume,
				modified_resume: uploadFormData.modifiedResume,
				job_link: uploadFormData.jobLink,
			});

			toast.success("Resume uploaded successfully!");

			// Refresh the resume list
			await getSavedResumeList();

			// Switch to select tab and select the newly uploaded resume
			setActiveTab("select");
			if (result?.id) {
				setSelectedResumeId(result.id);
			}
		} catch (error) {
			console.error("Upload error:", error);
			toast.error("Failed to upload resume");
		} finally {
			setIsUploading(false);
		}
	};

	const handleSelectResume = (resumeId: string) => {
		setSelectedResumeId(resumeId);
		toast.success("Resume selected!");
	};

	const handleConfirmSelection = () => {
		if (selectedResumeId) {
			// Find the selected resume data
			const selectedResume = filteredResumes.find((resume) => resume.id === selectedResumeId);
			onResumeSelected(selectedResumeId, selectedResume);
			onClose();
		} else {
			toast.error("Please select a resume");
		}
	};

	const handleCopyResume = async (resumeContent: string) => {
		try {
			await navigator.clipboard.writeText(resumeContent);
			toast.success("Resume copied to clipboard!");
		} catch (error) {
			console.error("Copy error:", error);
			toast.error("Failed to copy resume");
		}
	};

	const highlightSearchTerm = (text: string, searchTerm: string) => {
		if (!searchTerm) return text;
		const regex = new RegExp(`(${searchTerm})`, "gi");
		return text.replace(regex, "<mark class='bg-yellow-200 dark:bg-yellow-800'>$1</mark>");
	};

	// Handle different possible data structures
	let resumes: SavedResume[] = [];
	if (Array.isArray(resumeData)) {
		resumes = resumeData;
	} else if (resumeData && typeof resumeData === "object" && "savedResumes" in resumeData) {
		resumes = (resumeData as ResumeListResponse).savedResumes || [];
	} else if (resumeData && typeof resumeData === "object" && "data" in resumeData) {
		resumes = (resumeData as any).data || [];
	}

	const filteredResumes = resumes.filter((resume: SavedResume) => {
		const searchLower = searchTerm.toLowerCase();
		return (
			(resume.company?.toLowerCase().includes(searchLower) ?? false) ||
			resume.job_description.toLowerCase().includes(searchLower) ||
			resume.modified_resume.toLowerCase().includes(searchLower)
		);
	});

	return (
		<Dialog open={show} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="!w-[95vw] !max-w-5xl !h-[90vh] !max-h-[900px] p-0 gap-0 overflow-hidden flex flex-col">
				<DialogHeader className="flex-shrink-0 px-6 py-4 border-b">
					<DialogTitle className="flex items-center gap-2 text-xl font-semibold">
						<FileText className="h-5 w-5" />
						Resume Selection
					</DialogTitle>
				</DialogHeader>

				<div className="flex-1 flex flex-col min-h-0">
					<Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "upload" | "select")} className="flex-1 flex flex-col min-h-0">
						<div className="flex-shrink-0 px-6 py-4 border-b">
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="upload" className="flex items-center gap-2">
									<Upload className="h-4 w-4" />
									Upload New Resume
								</TabsTrigger>
								<TabsTrigger value="select" className="flex items-center gap-2">
									<FileText className="h-4 w-4" />
									Select Available Resume
								</TabsTrigger>
							</TabsList>
						</div>

						<TabsContent value="upload" className="flex-1 overflow-y-auto p-6 mt-0">
							<div className="max-w-5xl mx-auto space-y-4">
								<div className="space-y-2">
									<Label htmlFor="resume-file" className="text-sm font-medium">
										Upload Resume File (.txt or .pdf)
									</Label>
									<Input id="resume-file" type="file" accept=".txt,.pdf" onChange={handleFileUpload} className="cursor-pointer" />
									<p className="text-xs text-muted-foreground">Max file size: 5MB. Supported formats: .txt, .pdf</p>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="company" className="text-sm font-medium">
											Company Name *
										</Label>
										<Input
											id="company"
											value={uploadFormData.company}
											onChange={(e) => setUploadFormData((prev) => ({ ...prev, company: e.target.value }))}
											placeholder="Enter company name"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="job-link" className="text-sm font-medium">
											Job Link (Optional)
										</Label>
										<Input
											id="job-link"
											value={uploadFormData.jobLink}
											onChange={(e) => setUploadFormData((prev) => ({ ...prev, jobLink: e.target.value }))}
											placeholder="https://..."
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="job-description" className="text-sm font-medium">
										Job Description *
									</Label>
									<Textarea
										id="job-description"
										value={uploadFormData.jobDescription}
										onChange={(e) => setUploadFormData((prev) => ({ ...prev, jobDescription: e.target.value }))}
										placeholder="Paste the job description here..."
										rows={4}
										className="resize-none min-h-[100px] max-h-[200px] overflow-y-auto break-words whitespace-pre-wrap"
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="modified-resume" className="text-sm font-medium">
										Modified Resume
									</Label>
									<Textarea
										id="modified-resume"
										value={uploadFormData.modifiedResume}
										onChange={(e) => setUploadFormData((prev) => ({ ...prev, modifiedResume: e.target.value }))}
										placeholder="Edit the resume content as needed..."
										rows={6}
										className="resize-none min-h-[120px] max-h-[300px] overflow-y-auto break-words whitespace-pre-wrap"
									/>
									<p className="text-xs text-muted-foreground">You can modify the resume content to better match the job requirements</p>
								</div>

								<Button onClick={handleUploadResume} disabled={isUploading} className="w-full">
									{isUploading ? "Uploading..." : "Upload Resume"}
								</Button>
							</div>
						</TabsContent>

						<TabsContent value="select" className="flex-1 flex flex-col min-h-0 p-6 mt-0">
							<div className="space-y-4 flex-1 flex flex-col min-h-0">
								{/* Resume source toggle */}
								<div className="flex items-center justify-center pb-2 border-b">
									<div className="flex items-center gap-2 bg-muted rounded-lg p-1">
										<Button variant={!showAllResumes ? "default" : "ghost"} size="sm" onClick={() => setShowAllResumes(false)} className="text-xs h-7">
											Applied Jobs Only
										</Button>
										<Button variant={showAllResumes ? "default" : "ghost"} size="sm" onClick={() => setShowAllResumes(true)} className="text-xs h-7">
											All My Resumes
										</Button>
									</div>
								</div>

								<div className="flex items-center justify-between">
									<div className="relative flex-1">
										<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										<Input
											placeholder="Search resumes by company, job description, or keywords..."
											value={searchTerm}
											onChange={(e) => setSearchTerm(e.target.value)}
											className="pl-10"
										/>
									</div>
									{!isLoading && !error && (
										<div className="ml-4 text-sm text-muted-foreground">
											{filteredResumes.length} resume{filteredResumes.length !== 1 ? "s" : ""} found
											{!showAllResumes && <div className="text-xs text-blue-600">From applied jobs</div>}
										</div>
									)}
								</div>

								<div className="flex-1 overflow-y-auto min-h-0">
									{isLoading ? (
										<div className="flex items-center justify-center h-32">
											<p className="text-muted-foreground">Loading resumes...</p>
										</div>
									) : error ? (
										<div className="flex flex-col items-center justify-center h-32 space-y-2">
											<p className="text-red-500">Error loading resumes</p>
											<p className="text-sm text-muted-foreground">{error?.message || "Unknown error"}</p>
											<Button variant="outline" size="sm" onClick={() => getSavedResumeList()}>
												Retry
											</Button>
										</div>
									) : filteredResumes.length === 0 ? (
										<div className="flex flex-col items-center justify-center h-32 space-y-3">
											<p className="text-muted-foreground">{showAllResumes ? "No resumes found" : "No resumes linked to applied jobs found"}</p>
											{searchTerm ? (
												<p className="text-sm text-muted-foreground">Try adjusting your search terms</p>
											) : !showAllResumes ? (
												<div className="text-center space-y-2">
													<p className="text-sm text-muted-foreground">Resumes are automatically linked when you apply for jobs using the Resume Workshop.</p>
													<Button variant="outline" size="sm" onClick={() => setShowAllResumes(true)} className="text-xs">
														Show All My Resumes Instead
													</Button>
												</div>
											) : (
												<p className="text-sm text-muted-foreground">No saved resumes found. Use the "Upload New Resume" tab to create your first resume.</p>
											)}
										</div>
									) : (
										<div className="space-y-3">
											{filteredResumes.map((resume: SavedResume) => {
												const isSelected = selectedResumeId === resume.id;
												return (
													<Card
														key={resume.id}
														className={`border transition-all cursor-pointer hover:shadow-md ${
															isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
														}`}
														onClick={() => handleSelectResume(resume.id)}
													>
														<CardContent className="p-4">
															<div className="flex items-start justify-between gap-4">
																<div className="flex-1 min-w-0">
																	<div className="flex items-center gap-2 mb-2">
																		<span className="font-medium text-sm truncate">{resume.company || "Unknown Company"}</span>
																		<Badge variant="secondary" className="text-xs">
																			{new Date(resume.created_at).toLocaleDateString()}
																		</Badge>
																		{resume.applicationStatus && (
																			<Badge
																				variant={
																					resume.applicationStatus === "applied"
																						? "default"
																						: resume.applicationStatus === "interviewing"
																							? "secondary"
																							: resume.applicationStatus === "offered"
																								? "success"
																								: "destructive"
																				}
																				className="text-xs"
																			>
																				{resume.applicationStatus}
																			</Badge>
																		)}
																		{isSelected && <Badge className="text-xs">Selected</Badge>}
																	</div>
																	<div className="text-sm text-muted-foreground mb-2 line-clamp-2">{resume.job_description.substring(0, 120)}...</div>
																	{resume.proposalId && (
																		<div className="text-xs text-blue-600 mb-1">Job Application ID: {resume.proposalId.substring(0, 8)}...</div>
																	)}
																	{resume.job_link && (
																		<a
																			href={resume.job_link}
																			target="_blank"
																			rel="noopener noreferrer"
																			className="text-xs text-primary hover:underline flex items-center gap-1"
																			onClick={(e) => e.stopPropagation()}
																		>
																			<ExternalLink className="h-3 w-3" />
																			View Job Posting
																		</a>
																	)}
																</div>
																<div className="flex gap-2 flex-shrink-0">
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={(e) => {
																			e.stopPropagation();
																			handleCopyResume(resume.modified_resume);
																		}}
																	>
																		<Copy className="h-4 w-4 mr-1" />
																		Copy
																	</Button>
																	{isSelected ? (
																		<Button size="sm" disabled>
																			Selected
																		</Button>
																	) : (
																		<Button
																			size="sm"
																			onClick={(e) => {
																				e.stopPropagation();
																				handleSelectResume(resume.id);
																			}}
																		>
																			Select
																		</Button>
																	)}
																</div>
															</div>
														</CardContent>
													</Card>
												);
											})}
										</div>
									)}
								</div>
							</div>
						</TabsContent>
					</Tabs>
				</div>

				<div className="flex-shrink-0 flex justify-end gap-3 p-6 border-t bg-background">
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={handleConfirmSelection} disabled={!selectedResumeId}>
						Confirm Selection
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
