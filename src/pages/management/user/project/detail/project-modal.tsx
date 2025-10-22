import type { SavedResume } from "@/api/services/resumeService";
import { useUpdateProposal } from "@/store/proposalStore";
import type { ProposalInfo } from "@/types/entity";
// import { useUserPermission } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import ResumeModal, { type ResumeFormData, type ResumeModalProps } from "./resume-modal";
import SavedResumesModal, { type SavedResumesModalProps } from "./saved-resumes-modal";

export type ProjectModalProps = {
	formValue: ProposalInfo;
	title: string;
	show: boolean;
	onOk: (values: ProposalInfo) => void;
	onCancel: VoidFunction;
};

const defaultResumeValue: ResumeFormData = {
	job_description: "",
	resume: "",
};

export default function ProjectModal({ title, show, formValue, onOk, onCancel }: ProjectModalProps) {
	const { updateProposal, isLoading } = useUpdateProposal();

	const [resumeModalProps, setResumeModalProps] = useState<ResumeModalProps>({
		formValue: { ...defaultResumeValue },
		title: "New Resume",
		show: false,
		originalResume: "",
		profileId: "",
		onOk: (resumeFormData) => {
			form.setValue("resume", resumeFormData.resume);
			form.setValue("job_description", resumeFormData.job_description);
			setResumeModalProps((prev) => ({ ...prev, show: false }));
		},
		onCancel: () => {
			setResumeModalProps((prev) => ({ ...prev, show: false }));
		},
	});

	const [savedResumesModalProps, setSavedResumesModalProps] = useState<SavedResumesModalProps>({
		show: false,
		onClose: () => setSavedResumesModalProps((prev) => ({ ...prev, show: false })),
		onSelectResume: (resume: SavedResume) => {
			form.setValue("resume", resume.modified_resume);
			form.setValue("job_description", resume.job_description);
			if (resume.company) form.setValue("company", resume.company);
			if (resume.job_link) form.setValue("job_link", resume.job_link);
			setSavedResumesModalProps((prev) => ({ ...prev, show: false }));
		},
		profileId: formValue.profile || "",
	});

	const form = useForm<ProposalInfo>({
		defaultValues: formValue,
	});

	// TODO: fix
	// const permissions = useUserPermission();

	useEffect(() => {
		form.reset(formValue);
	}, [formValue, form]);

	const onResumeCreate = () => {
		const jobDescription = form.watch("job_description");
		const currentResume = form.watch("resume");
		const company = form.watch("company");
		const jobLink = form.watch("job_link");

		// Ensure we have a valid profile ID
		const profileId = formValue.profile || "";

		if (!profileId) {
			toast.error("Profile ID is required to save resume. Please select a profile first.");
			return;
		}

		setResumeModalProps((prev) => ({
			...prev,
			formValue: {
				...defaultResumeValue,
				job_description: jobDescription || "",
				resume: currentResume || "",
				company: company || "",
				job_link: jobLink || "",
			},
			originalResume: currentResume || "",
			profileId: profileId,
			title: "New resume",
			show: true,
		}));
	};

	const onSubmit = async (values: ProposalInfo) => {
		const { id, created_at, ...dataWithoutId } = values;
		const profile = title === "New Proposal" ? dataWithoutId : values;
		await updateProposal(profile);
		onOk(values);
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
							<FormField
								control={form.control}
								name="job_link"
								rules={{ required: "Please specify the field." }}
								render={({ field }) => (
									<FormItem>
										<FormLabel>Job Link</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="company"
								rules={{ required: "Please specify the field." }}
								render={({ field }) => (
									<FormItem>
										<FormLabel>Company</FormLabel>
										<FormControl>
											<Input {...field} />
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
											<Textarea className="max-h-64" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="resume"
								rules={{ required: "Please specify the field." }}
								render={({ field }) => (
									<FormItem>
										<FormLabel>Resume</FormLabel>
										<FormControl>
											<div className="flex gap-2">
												<Input {...field} readOnly />
												<Button type="button" variant="default" onClick={onResumeCreate}>
													Edit
												</Button>
												<Button type="button" variant="outline" onClick={() => setSavedResumesModalProps((prev) => ({ ...prev, show: true }))}>
													Saved Resumes
												</Button>
											</div>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="cover_letter"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Cover Letter</FormLabel>
										<FormControl>
											<Input {...field} />
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
				<ResumeModal {...resumeModalProps} />
				<SavedResumesModal {...savedResumesModalProps} />
			</DialogContent>
		</Dialog>
	);
}
