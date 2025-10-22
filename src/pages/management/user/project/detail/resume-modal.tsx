import { GLOBAL_CONFIG } from "@/global-config";
// import { useUserPermission } from "@/store/userStore";
import { useUpdateSavedResume } from "@/store/savedResumeStore";
import { useUserInfo } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { type ResumeJSONData, downloadJsonFile, downloadPdfFile, generateResumeJson, generateTimestampedFilename } from "@/utils/resume-utils";
import { pdf } from "@react-pdf/renderer";
import { Download, FileJson, FileText, Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import ResumeBuilder from "../../resume";
import ResumePDF from "../../resume/ResumePDF";

export interface ResumeFormData {
	job_description: string;
	resume: string;
	company?: string;
	job_link?: string;
}

export type ResumeModalProps = {
	formValue: ResumeFormData;
	title: string;
	show: boolean;
	onOk: (values: ResumeFormData) => void;
	onCancel: VoidFunction;
	originalResume?: string; // Original resume content before modification
	profileId?: string; // Profile ID for saving the resume
};

export default function ResumeModal({ title, show, formValue, onOk, onCancel, originalResume, profileId }: ResumeModalProps) {
	const { updateSavedResume, isLoading: isSaving } = useUpdateSavedResume();
	const userInfo = useUserInfo();
	const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
	const [saveFormData, setSaveFormData] = useState({
		company: formValue.company || "",
		job_link: formValue.job_link || "",
	});
	const [resumeJsonData, setResumeJsonData] = useState<ResumeJSONData | null>(null);
	const [isGeneratingJson, setIsGeneratingJson] = useState(false);
	const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

	const form = useForm<ResumeFormData>({
		defaultValues: formValue,
	});

	useEffect(() => {
		form.reset(formValue);
		setSaveFormData({
			company: formValue.company || "",
			job_link: formValue.job_link || "",
		});
	}, [formValue, form]);

	const onSubmit = async (values: ResumeFormData) => {
		onOk(values);
	};

	// Function to convert JSON to PDF
	const convertJsonToPdf = async (jsonData: ResumeJSONData): Promise<Blob> => {
		try {
			const blob = await pdf(<ResumePDF resume={jsonData} />).toBlob();
			return blob;
		} catch (error) {
			console.error("Error generating PDF:", error);
			throw new Error("Failed to generate PDF");
		}
	};

	const handleSaveResume = async () => {
		try {
			const currentValues = form.getValues();

			// Validate required fields
			if (!userInfo.id) {
				throw new Error("User ID not available");
			}

			// Validate profile ID
			if (!profileId) {
				throw new Error("Profile ID is required. Please ensure you have selected a profile before saving the resume.");
			}

			if (!currentValues.resume || currentValues.resume.trim() === "") {
				throw new Error("Resume content is required");
			}

			if (!currentValues.job_description || currentValues.job_description.trim() === "") {
				throw new Error("Job description is required");
			}

			// Ensure originalResume is not empty
			const finalOriginalResume = originalResume || currentValues.resume;
			if (!finalOriginalResume || finalOriginalResume.trim() === "") {
				throw new Error("Original resume content is required");
			}

			// Generate JSON data if not already available
			let jsonData = resumeJsonData;
			if (!jsonData) {
				setIsGeneratingJson(true);
				try {
					jsonData = await generateResumeJson(currentValues.resume, currentValues.job_description);
					setResumeJsonData(jsonData);
				} finally {
					setIsGeneratingJson(false);
				}
			}

			// Prepare the data object with all required fields
			const resumeData = {
				user: userInfo.id,
				profile: profileId, // This is now validated above
				original_resume: finalOriginalResume,
				modified_resume: currentValues.resume,
				job_description: currentValues.job_description,
				company: saveFormData.company || undefined,
				job_link: saveFormData.job_link || undefined,
				resume_json: jsonData ? JSON.stringify(jsonData) : undefined,
			};

			console.log("Saving resume with data:", resumeData);
			console.log("Original resume value:", originalResume);
			console.log("Current resume value:", currentValues.resume);
			console.log("User ID:", userInfo.id);
			console.log("Profile ID:", profileId);

			// Save both text and JSON data
			await updateSavedResume(resumeData);

			toast.success("Resume saved successfully with structured data!", {
				closeButton: true,
			});
			setIsSaveModalOpen(false);
		} catch (error) {
			console.error("Error saving resume:", error);
			toast.error(`Error saving resume: ${error instanceof Error ? error.message : "Unknown error"}`, {
				position: "top-center",
			});
		}
	};

	const handleGenerateAndDownloadJson = async () => {
		try {
			const currentValues = form.getValues();
			setIsGeneratingJson(true);

			const jsonData = await generateResumeJson(currentValues.resume, currentValues.job_description);
			setResumeJsonData(jsonData);

			const filename = generateTimestampedFilename("resume", "json");
			downloadJsonFile(jsonData, filename);

			toast.success("JSON file downloaded successfully!", {
				closeButton: true,
			});
		} catch (error) {
			console.error("Error generating JSON:", error);
			toast.error(`Error generating JSON: ${error instanceof Error ? error.message : "Unknown error"}`, {
				position: "top-center",
			});
		} finally {
			setIsGeneratingJson(false);
		}
	};

	const handleGenerateAndDownloadPdf = async () => {
		try {
			const currentValues = form.getValues();
			setIsGeneratingPdf(true);

			// Generate JSON data if not already available
			let jsonData = resumeJsonData;
			if (!jsonData) {
				jsonData = await generateResumeJson(currentValues.resume, currentValues.job_description);
				setResumeJsonData(jsonData);
			}

			if (!jsonData) {
				throw new Error("Failed to generate resume JSON data");
			}

			// Convert to PDF
			const pdfBlob = await convertJsonToPdf(jsonData);

			// Download PDF
			const filename = generateTimestampedFilename("resume", "pdf");
			downloadPdfFile(pdfBlob, filename);

			toast.success("PDF file downloaded successfully!", {
				closeButton: true,
			});
		} catch (error) {
			console.error("Error generating PDF:", error);
			toast.error(`Error generating PDF: ${error instanceof Error ? error.message : "Unknown error"}`, {
				position: "top-center",
			});
		} finally {
			setIsGeneratingPdf(false);
		}
	};

	const onSaveClick = () => {
		setIsSaveModalOpen(true);
	};

	return (
		<>
			<Dialog open={show} onOpenChange={(open) => !open && onCancel()}>
				<DialogContent className="!w-[98vw] !h-[98vh] !max-w-none !max-h-none overflow-hidden flex flex-col">
					<DialogHeader className="flex-shrink-0">
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
					<div className="flex-1 overflow-y-auto">
						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
								<FormField
									control={form.control}
									name="resume"
									render={({ field }) => (
										<FormItem>
											<FormControl>
												<ResumeBuilder
													{...field}
													resume={field.value}
													job_description={formValue.job_description}
													onResumeChange={field.onChange}
													onJobDescriptionChange={(value) => form.setValue("job_description", value)}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<DialogFooter className="flex-shrink-0">
									<Button type="button" variant="outline" onClick={onCancel}>
										Cancel
									</Button>
									<Button type="button" variant="secondary" onClick={handleGenerateAndDownloadJson} disabled={isGeneratingJson}>
										{isGeneratingJson && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
										<FileJson className="mr-2 h-4 w-4" />
										Download JSON
									</Button>
									<Button type="button" variant="secondary" onClick={handleGenerateAndDownloadPdf} disabled={isGeneratingPdf}>
										{isGeneratingPdf && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
										<Download className="mr-2 h-4 w-4" />
										Download PDF
									</Button>
									<Button type="button" variant="secondary" onClick={onSaveClick} disabled={isSaving}>
										{isSaving && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
										<Save className="mr-2 h-4 w-4" />
										Save Resume
									</Button>
									<Button type="submit" variant="default">
										Confirm
									</Button>
								</DialogFooter>
							</form>
						</Form>
					</div>
				</DialogContent>
			</Dialog>

			{/* Save Resume Modal */}
			<Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Save Modified Resume</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<label htmlFor="company" className="text-sm font-medium">
								Company (Optional)
							</label>
							<Input
								id="company"
								value={saveFormData.company}
								onChange={(e) => setSaveFormData((prev) => ({ ...prev, company: e.target.value }))}
								placeholder="Enter company name"
							/>
						</div>
						<div className="grid gap-2">
							<label htmlFor="job_link" className="text-sm font-medium">
								Job Link (Optional)
							</label>
							<Input
								id="job_link"
								value={saveFormData.job_link}
								onChange={(e) => setSaveFormData((prev) => ({ ...prev, job_link: e.target.value }))}
								placeholder="Enter job posting URL"
							/>
						</div>
						<div className="text-sm text-gray-500">
							This will save your modified resume as both text and structured JSON data, so you can link it to specific job applications when scheduling calls
							and convert to PDF whenever needed.
						</div>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setIsSaveModalOpen(false)}>
							Cancel
						</Button>
						<Button type="button" onClick={handleSaveResume} disabled={isSaving || isGeneratingJson}>
							{(isSaving || isGeneratingJson) && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
							Save Resume
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
