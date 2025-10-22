import { useUpdateInterview } from "@/store/interviewStore";
import { useUserInfo } from "@/store/userStore";
import type { InterviewInfo } from "@/types/entity";
import { InterviewProgress } from "@/types/enum";
import { Badge } from "@/ui/badge";
// import { useUserPermission } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Textarea } from "@/ui/textarea";
import dayjs from "dayjs";
import { Copy, ExternalLink, FileText, Loader2, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import ResumeUploadModal from "./resume-upload-modal";

export type InterviewModalProps = {
	formValue: InterviewInfo;
	title: string;
	show: boolean;
	onOk: (values: InterviewInfo) => void;
	onCancel: VoidFunction;
};

export const Interview_Progress_Default = [
	{
		label: "Pending",
		value: InterviewProgress.PENDING,
	},
	{
		label: "Success",
		value: InterviewProgress.SUCCESS,
	},
	{
		label: "Fail",
		value: InterviewProgress.FAIL,
	},
];

export default function InterviewModal({ title, show, formValue, onOk, onCancel }: InterviewModalProps) {
	const { updateInterview, isLoading } = useUpdateInterview();
	const userInfo = useUserInfo();

	const form = useForm<InterviewInfo>({
		defaultValues: formValue,
		mode: "onSubmit",
		reValidateMode: "onSubmit",
	});

	// TODO: fix
	// const permissions = useUserPermission();
	const [progress, setProgress] = useState<{ label: string; value: InterviewProgress }[]>([]);

	// Selected resume state
	const [selectedResumeId, setSelectedResumeId] = useState<string | null>(formValue.selected_resume_id || null);
	const [selectedResumeData, setSelectedResumeData] = useState<any>(null);

	// Resume upload modal
	const [showResumeUploadModal, setShowResumeUploadModal] = useState(false);

	const handleCopyResume = async (resumeContent: string) => {
		try {
			await navigator.clipboard.writeText(resumeContent);
			toast.success("Resume content copied to clipboard");
		} catch (error) {
			toast.error("Failed to copy resume content");
		}
	};

	const handleDeselectResume = () => {
		setSelectedResumeId(null);
		setSelectedResumeData(null);

		// Clear the job description field when resume is deselected
		form.setValue("job_description", "", { shouldValidate: false });

		toast.info("Resume deselected and job description cleared");
	};

	const handleResumeSelectedFromModal = (resumeId: string, resumeData?: any) => {
		setSelectedResumeId(resumeId);
		setSelectedResumeData(resumeData);
		setShowResumeUploadModal(false);

		// Auto-populate fields if resume data is provided
		if (resumeData) {
			const populatedFields = [];

			if (resumeData.job_description) {
				// Use setValue with shouldValidate: false to prevent validation
				form.setValue("job_description", resumeData.job_description, { shouldValidate: false });
				populatedFields.push("job description");
			}

			// Note: We could also auto-populate other fields like company or job link
			// if they were available in the interview form, but currently the interview
			// form doesn't have these fields

			if (populatedFields.length > 0) {
				toast.success(`Resume selected and ${populatedFields.join(", ")} auto-populated`);
			} else {
				toast.success("Resume selected for this interview");
			}
		} else {
			toast.success("Resume selected for this interview");
		}
	};

	const updateCompOptions = useCallback(async () => {
		setProgress(Interview_Progress_Default);
	}, []);

	useEffect(() => {
		form.reset(formValue);
		updateCompOptions();
	}, [formValue, form, updateCompOptions]);

	const onSubmit = async (values: InterviewInfo) => {
		// const normalizedUser = typeof values.proposal === 'string' ? values.proposal : values.proposal.id;
		// const { id, ...dataWithoutId } = values;
		// const interview = title === "New Interview" ? {...dataWithoutId, proposal: normalizedUser} : {...values, proposal: normalizedUser};

		const { id, ...dataWithoutId } = values;

		// For existing interviews, generate resume link if a resume is selected
		const resumeLink = selectedResumeId && id ? `/api/interviews/${id}/scheduled-resume` : undefined;

		const interviewData = {
			...dataWithoutId,
			selected_resume_id: selectedResumeId || undefined,
			resume_link: resumeLink,
		};

		await updateInterview(
			title === "New Interview" ? interviewData : { ...values, selected_resume_id: selectedResumeId || undefined, resume_link: resumeLink },
		);
		onOk({ ...values, selected_resume_id: selectedResumeId || undefined, resume_link: resumeLink });
	};

	return (
		<>
			<Dialog open={show} onOpenChange={(open) => !open && onCancel()}>
				<DialogContent className="w-[95vw] max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
					<DialogHeader className="flex-shrink-0">
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
					<div className="flex-1 overflow-y-auto">
						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-1">
								<FormField
									control={form.control}
									name="meeting_title"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Meeting Title</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="meeting_link"
									rules={{ required: "Please specify the field." }}
									render={({ field }) => (
										<FormItem>
											<FormLabel>Meeting Link</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="meeting_date"
									rules={{ required: "Please specify the field." }}
									render={({ field }) => (
										<FormItem>
											<FormLabel>Meeting Date</FormLabel>
											<FormControl>
												<Input
													type="datetime-local"
													value={field.value ? dayjs(field.value).format("YYYY-MM-DDTHH:mm") : ""}
													onChange={(e) => field.onChange(e.target.value ? dayjs(e.target.value).toISOString() : null)}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="job_description"
									rules={{ required: "Please specify the field." }}
									render={({ field }) => (
										<FormItem>
											<FormLabel>Job Description</FormLabel>
											<FormControl>
												<Textarea className="max-h-20 resize-none" placeholder="Enter job description..." {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="interviewer"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Interviewer</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="progress"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Progress</FormLabel>
											<FormControl>
												<Select {...field} value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
													<SelectTrigger className="w-full">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{progress.map((progress) => (
															<SelectItem key={String(progress.value)} value={String(progress.value)}>
																{progress.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								{/* Resume Selection Section */}
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<FileText className="h-4 w-4 text-blue-600" />
											<h3 className="text-base font-semibold">Resume for Interview</h3>
										</div>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => setShowResumeUploadModal(true)}
											className="flex items-center gap-2 h-7 text-xs"
										>
											<Upload className="h-3 w-3" />
											{selectedResumeId ? "Change Resume" : "Select Resume"}
										</Button>
									</div>

									{selectedResumeId ? (
										<div className="p-2 border border-green-200 bg-green-50 rounded-lg">
											<div className="flex items-center justify-between mb-1">
												<div className="flex items-center gap-2">
													<Badge variant="default" className="bg-green-600 text-xs">
														Resume Selected
													</Badge>
													<span className="text-xs text-green-800">ID: {selectedResumeId.substring(0, 8)}...</span>
												</div>
												<Button variant="destructive" size="sm" onClick={handleDeselectResume} className="h-6 px-2 text-xs">
													Remove
												</Button>
											</div>
											{selectedResumeData && (
												<div className="text-xs text-green-800">
													{selectedResumeData.company && (
														<div className="mb-1">
															<strong>Company:</strong> {selectedResumeData.company}
														</div>
													)}
													{selectedResumeData.job_description && (
														<div>
															<strong>Job Description:</strong>
															<div className="text-xs mt-1 line-clamp-1 text-green-700">
																{selectedResumeData.job_description.substring(0, 100)}
																{selectedResumeData.job_description.length > 100 ? "..." : ""}
															</div>
														</div>
													)}
												</div>
											)}
										</div>
									) : (
										<div className="p-3 border-2 border-dashed border-gray-300 rounded-lg text-center">
											<FileText className="h-6 w-6 text-gray-400 mx-auto mb-1" />
											<p className="text-gray-500 text-xs mb-2">No resume selected for this interview</p>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => setShowResumeUploadModal(true)}
												className="flex items-center gap-2 mx-auto h-7 text-xs"
											>
												<Upload className="h-3 w-3" />
												Select Resume
											</Button>
										</div>
									)}
								</div>

								<FormField
									control={form.control}
									name="notes"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Notes</FormLabel>
											<FormControl>
												<Textarea className="max-h-16 resize-none" placeholder="Add any notes about the interview..." {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="feedback"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Feedback</FormLabel>
											<FormControl>
												<Textarea className="max-h-16 resize-none" placeholder="Add feedback after the interview..." {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<DialogFooter className="flex-shrink-0">
									<Button type="button" variant="outline" onClick={onCancel}>
										Cancel
									</Button>
									<Button type="submit" variant="default">
										{isLoading && <Loader2 className="animate-spin mr-2" />}
										Confirm
									</Button>
								</DialogFooter>
							</form>
						</Form>
					</div>
				</DialogContent>
			</Dialog>

			{/* Resume Upload Modal */}
			<ResumeUploadModal show={showResumeUploadModal} onClose={() => setShowResumeUploadModal(false)} onResumeSelected={handleResumeSelectedFromModal} />
		</>
	);
}
