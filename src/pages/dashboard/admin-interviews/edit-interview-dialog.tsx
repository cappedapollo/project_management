import { useAuth } from "@/components/auth/use-auth";
import type { InterviewInfo } from "@/types/entity";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Textarea } from "@/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Clock, Save, X } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// Import interview service
import interviewService from "@/api/services/interviewService";

interface EditInterviewDialogProps {
	interview: InterviewInfo | null;
	show: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

// Form validation schema
const editInterviewSchema = z.object({
	meeting_title: z.string().min(1, "Meeting title is required"),
	meeting_date: z.string().min(1, "Meeting date is required"),
	meeting_time: z.string().min(1, "Meeting time is required"),
	meeting_link: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
	interviewer: z.string().min(1, "Interviewer is required"),
	progress: z.string().min(1, "Status is required"),
	notes: z.string().optional(),
});

type EditInterviewFormData = z.infer<typeof editInterviewSchema>;

export default function EditInterviewDialog({ interview, show, onClose, onSuccess }: EditInterviewDialogProps) {
	const { access_token } = useAuth();

	const form = useForm<EditInterviewFormData>({
		resolver: zodResolver(editInterviewSchema),
		defaultValues: {
			meeting_title: "",
			meeting_date: "",
			meeting_time: "",
			meeting_link: "",
			interviewer: "",
			progress: "0",
			notes: "",
		},
	});

	// Update form when interview changes
	React.useEffect(() => {
		if (interview && show) {
			const meetingDate = interview.meeting_date ? new Date(interview.meeting_date) : new Date();
			const dateStr = meetingDate.toISOString().split("T")[0];
			const timeStr = meetingDate.toTimeString().slice(0, 5);

			form.reset({
				meeting_title: interview.meeting_title || "",
				meeting_date: dateStr,
				meeting_time: timeStr,
				meeting_link: interview.meeting_link || "",
				interviewer: interview.interviewer || "",
				progress: String(interview.progress || 0),
				notes: interview.notes || "",
			});
		}
	}, [interview, show, form]);

	const onSubmit = async (data: EditInterviewFormData) => {
		if (!interview || !access_token) {
			toast.error("Missing interview data or authentication");
			return;
		}

		try {
			// Combine date and time
			const meetingDateTime = new Date(`${data.meeting_date}T${data.meeting_time}`);

			const updateData: Partial<InterviewInfo> = {
				meeting_title: data.meeting_title,
				meeting_date: meetingDateTime.toISOString(),
				meeting_link: data.meeting_link || undefined,
				interviewer: data.interviewer,
				progress: Number.parseInt(data.progress),
				notes: data.notes || undefined,
			};

			await interviewService.updateInterview(interview.id, updateData, access_token);

			toast.success("Interview updated successfully!");
			onSuccess();
			onClose();
		} catch (error) {
			console.error("Error updating interview:", error);
			toast.error("Failed to update interview. Please try again.");
		}
	};

	const getProgressOptions = () => [
		{ value: "0", label: "Scheduled" },
		{ value: "1", label: "Completed" },
		{ value: "2", label: "Cancelled" },
	];

	if (!interview) return null;

	return (
		<Dialog open={show} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader className="pb-6 border-b border-gray-200">
					<DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
						<div className="p-2 bg-blue-100 rounded-lg">
							<CalendarIcon className="h-5 w-5 text-blue-600" />
						</div>
						Edit Interview
					</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
						{/* Meeting Title */}
						<FormField
							control={form.control}
							name="meeting_title"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-sm font-medium text-gray-700">Meeting Title</FormLabel>
									<FormControl>
										<Input {...field} placeholder="Enter meeting title" className="w-full" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Date and Time */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="meeting_date"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="text-sm font-medium text-gray-700">Date</FormLabel>
										<FormControl>
											<Input {...field} type="date" className="w-full" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="meeting_time"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="text-sm font-medium text-gray-700">Time</FormLabel>
										<FormControl>
											<Input {...field} type="time" className="w-full" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{/* Interviewer and Status */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="interviewer"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="text-sm font-medium text-gray-700">Interviewer</FormLabel>
										<FormControl>
											<Input {...field} placeholder="Enter interviewer name" className="w-full" />
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
										<FormLabel className="text-sm font-medium text-gray-700">Status</FormLabel>
										<Select onValueChange={field.onChange} value={field.value}>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select status" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{getProgressOptions().map((option) => (
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
						</div>

						{/* Meeting Link */}
						<FormField
							control={form.control}
							name="meeting_link"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-sm font-medium text-gray-700">Meeting Link (Optional)</FormLabel>
									<FormControl>
										<Input {...field} placeholder="https://meet.google.com/..." className="w-full" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Notes */}
						<FormField
							control={form.control}
							name="notes"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-sm font-medium text-gray-700">Notes (Optional)</FormLabel>
									<FormControl>
										<Textarea {...field} placeholder="Add any additional notes..." className="w-full min-h-[100px]" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter className="flex gap-3 pt-6 border-t border-gray-200">
							<Button type="button" variant="outline" onClick={onClose} className="flex items-center gap-2">
								<X className="h-4 w-4" />
								Cancel
							</Button>
							<Button type="submit" className="flex items-center gap-2" disabled={form.formState.isSubmitting}>
								<Save className="h-4 w-4" />
								{form.formState.isSubmitting ? "Saving..." : "Save Changes"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
