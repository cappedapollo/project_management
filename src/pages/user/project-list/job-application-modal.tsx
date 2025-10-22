import { useUpdateProposal } from "@/store/proposalStore";
import type { ProposalInfo } from "@/types/entity";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Textarea } from "@/ui/textarea";
import { ChevronDown, ChevronUp, Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

export type JobApplicationModalProps = {
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
};

export default function JobApplicationModal({ title, show, formValue, onOk, onCancel }: JobApplicationModalProps) {
	const { updateProposal, isLoading } = useUpdateProposal();

	const form = useForm<ProposalInfo>({
		defaultValues: formValue,
	});

	const [statusOptions] = useState([
		{ label: "Applied", value: "applied" },
		{ label: "Interviewing", value: "interviewing" },
		{ label: "Offered", value: "offered" },
		{ label: "Rejected", value: "rejected" },
	]);

	const [showJobDescription, setShowJobDescription] = useState(false);
	const [showResume, setShowResume] = useState(false);

	useEffect(() => {
		form.reset(formValue);
	}, [formValue, form]);

	const onSubmit = async (values: ProposalInfo) => {
		const { id, created_at, ...dataWithoutId } = values;
		const proposal = title === "New Job Application" ? dataWithoutId : values;
		await updateProposal(proposal);
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
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

								<FormField
									control={form.control}
									name="job_link"
									rules={{ required: "Job link is required." }}
									render={({ field }) => (
										<FormItem>
											<FormLabel>Job Link</FormLabel>
											<FormControl>
												<Input {...field} placeholder="https://example.com/job" />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="job_description"
								rules={{ required: "Job description is required." }}
								render={({ field }) => (
									<FormItem>
										<FormLabel className="flex items-center justify-between">
											Job Description
											<Button type="button" variant="ghost" size="sm" onClick={() => setShowJobDescription(!showJobDescription)} className="h-6 px-2 text-xs">
												{showJobDescription ? (
													<>
														<EyeOff className="h-3 w-3 mr-1" />
														Hide
													</>
												) : (
													<>
														<Eye className="h-3 w-3 mr-1" />
														Show
													</>
												)}
											</Button>
										</FormLabel>
										<FormControl>
											{showJobDescription ? (
												<Textarea {...field} placeholder="Enter job description..." className="min-h-[200px] max-h-[400px] resize-y" />
											) : (
												<div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
													<span className="text-sm text-muted-foreground">
														{field.value ? `${field.value.substring(0, 100)}${field.value.length > 100 ? "..." : ""}` : "No job description entered"}
													</span>
													<Button type="button" variant="ghost" size="sm" onClick={() => setShowJobDescription(true)} className="h-6 px-2 text-xs">
														Edit
													</Button>
												</div>
											)}
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="resume"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="flex items-center justify-between">
											Resume
											<Button type="button" variant="ghost" size="sm" onClick={() => setShowResume(!showResume)} className="h-6 px-2 text-xs">
												{showResume ? (
													<>
														<EyeOff className="h-3 w-3 mr-1" />
														Hide
													</>
												) : (
													<>
														<Eye className="h-3 w-3 mr-1" />
														Show
													</>
												)}
											</Button>
										</FormLabel>
										<FormControl>
											{showResume ? (
												<Textarea {...field} placeholder="Enter resume content or link..." className="min-h-[200px] max-h-[400px] resize-y" />
											) : (
												<div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
													<span className="text-sm text-muted-foreground">
														{field.value ? `${field.value.substring(0, 100)}${field.value.length > 100 ? "..." : ""}` : "No resume content entered"}
													</span>
													<Button type="button" variant="ghost" size="sm" onClick={() => setShowResume(true)} className="h-6 px-2 text-xs">
														Edit
													</Button>
												</div>
											)}
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
											<Textarea className="min-h-[120px] max-h-64" placeholder="Write your cover letter here..." {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="status"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Application Status</FormLabel>
										<FormControl>
											<Select {...field} value={field.value || "applied"} onValueChange={field.onChange}>
												<SelectTrigger className="w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{statusOptions.map((status) => (
														<SelectItem key={status.value} value={status.value}>
															{status.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
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
									{title === "New Job Application" ? "Create Application" : "Update Application"}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
