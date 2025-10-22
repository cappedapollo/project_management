import type { InterviewInfo } from "@/types/entity";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Text, Title } from "@/ui/typography";
import { Calendar, Clock, ExternalLink, FileText, User, Video } from "lucide-react";

interface InterviewDetailsDialogProps {
	interview: InterviewInfo | null;
	show: boolean;
	onClose: () => void;
	accessToken?: string;
}

export default function InterviewDetailsDialog({ interview, show, onClose, accessToken }: InterviewDetailsDialogProps) {
	if (!interview) return null;

	const formatDate = (dateString: string | undefined) => {
		if (!dateString) return "Not specified";
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const formatTime = (dateString: string | undefined) => {
		if (!dateString) return "Not specified";
		return new Date(dateString).toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getProgressBadgeVariant = (progress: any) => {
		const progressValue = typeof progress === "number" ? (progress === 0 ? "scheduled" : progress === 1 ? "completed" : "cancelled") : progress;

		switch (progressValue) {
			case "completed":
				return "default";
			case "scheduled":
				return "secondary";
			case "cancelled":
				return "destructive";
			default:
				return "outline";
		}
	};

	const getProgressDisplay = (progress: any) => {
		if (typeof progress === "number") {
			switch (progress) {
				case 0:
					return "scheduled";
				case 1:
					return "completed";
				case 2:
					return "cancelled";
				default:
					return "unknown";
			}
		}
		return progress || "unknown";
	};

	return (
		<Dialog open={show} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className="dialog-wide max-h-[95vh] overflow-y-auto"
				style={{
					maxWidth: "1200px",
					width: "95vw",
					minWidth: "95vw",
				}}
			>
				<DialogHeader className="pb-6 border-b border-gray-200">
					<DialogTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900">
						<div className="p-2 bg-blue-100 rounded-lg">
							<Video className="h-6 w-6 text-blue-600" />
						</div>
						Interview Details - FIXED WIDTH
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-6 py-6">
					{/* Interview Title & Status */}
					<div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
						<div className="flex items-start justify-between mb-4">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-white rounded-lg shadow-sm">
									<FileText className="h-5 w-5 text-blue-600" />
								</div>
								<div>
									<h3 className="text-xl font-bold text-gray-900">{interview.meeting_title || "Untitled Interview"}</h3>
									<p className="text-sm text-gray-600 mt-1">Interview Session</p>
								</div>
							</div>
							<Badge variant={getProgressBadgeVariant(interview.progress)} className="text-sm px-3 py-1">
								{getProgressDisplay(interview.progress).toUpperCase()}
							</Badge>
						</div>
					</div>

					{/* Key Information Grid */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
						{/* Participant Information */}
						<Card className="border-l-4 border-l-blue-500">
							<CardHeader className="pb-3">
								<CardTitle className="text-lg flex items-center gap-2">
									<User className="h-5 w-5 text-blue-600" />
									Participants
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="bg-gray-50 rounded-lg p-4">
									<div className="flex items-center gap-3 mb-2">
										<div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
											<User className="h-4 w-4 text-blue-600" />
										</div>
										<div>
											<p className="text-sm font-medium text-gray-900">Candidate</p>
											<p className="text-sm text-gray-600">{typeof interview.user === "string" ? interview.user : interview.user?.email || "Unknown User"}</p>
										</div>
									</div>
								</div>
								<div className="bg-gray-50 rounded-lg p-4">
									<div className="flex items-center gap-3 mb-2">
										<div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
											<User className="h-4 w-4 text-green-600" />
										</div>
										<div>
											<p className="text-sm font-medium text-gray-900">Interviewer</p>
											<p className="text-sm text-gray-600">{interview.interviewer || "Not assigned"}</p>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Schedule Information */}
						<Card className="border-l-4 border-l-green-500">
							<CardHeader className="pb-3">
								<CardTitle className="text-lg flex items-center gap-2">
									<Calendar className="h-5 w-5 text-green-600" />
									Schedule
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="bg-gray-50 rounded-lg p-4">
									<div className="flex items-center gap-3 mb-2">
										<Calendar className="h-5 w-5 text-gray-500" />
										<div>
											<p className="text-sm font-medium text-gray-900">Date</p>
											<p className="text-sm text-gray-600">{formatDate(interview.meeting_date)}</p>
										</div>
									</div>
								</div>
								<div className="bg-gray-50 rounded-lg p-4">
									<div className="flex items-center gap-3 mb-2">
										<Clock className="h-5 w-5 text-gray-500" />
										<div>
											<p className="text-sm font-medium text-gray-900">Time</p>
											<p className="text-sm text-gray-600">{formatTime(interview.meeting_date)}</p>
										</div>
									</div>
								</div>
								{interview.meeting_link && (
									<div className="bg-gray-50 rounded-lg p-4">
										<div className="flex items-center gap-3 mb-2">
											<Video className="h-5 w-5 text-gray-500" />
											<div className="flex-1">
												<p className="text-sm font-medium text-gray-900">Meeting Link</p>
												<Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => window.open(interview.meeting_link, "_blank")}>
													<ExternalLink className="h-3 w-3 mr-1" />
													Join Meeting
												</Button>
											</div>
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Job Description */}
					{interview.job_description && (
						<Card>
							<CardHeader>
								<CardTitle className="text-lg flex items-center gap-2">
									<FileText className="h-5 w-5 text-purple-600" />
									Job Description
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="bg-gray-50 rounded-lg p-6 min-h-[300px] max-h-[600px] overflow-y-auto">
									<div className="prose prose-sm max-w-none">
										<div className="whitespace-pre-wrap text-base text-gray-700 leading-relaxed">{interview.job_description}</div>
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Notes & Feedback */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
						{interview.notes && (
							<Card>
								<CardHeader>
									<CardTitle className="text-lg flex items-center gap-2">
										<FileText className="h-5 w-5 text-orange-600" />
										Notes
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="bg-orange-50 rounded-lg p-4 border border-orange-100 min-h-[200px] max-h-[400px] overflow-y-auto">
										<p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed">{interview.notes}</p>
									</div>
								</CardContent>
							</Card>
						)}

						{interview.feedback && (
							<Card>
								<CardHeader>
									<CardTitle className="text-lg flex items-center gap-2">
										<FileText className="h-5 w-5 text-indigo-600" />
										Feedback
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100 min-h-[200px] max-h-[400px] overflow-y-auto">
										<p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed">{interview.feedback}</p>
									</div>
								</CardContent>
							</Card>
						)}
					</div>

					{/* Resume Link */}
					{interview.resume_link && (
						<Card>
							<CardHeader>
								<CardTitle className="text-lg flex items-center gap-2">
									<FileText className="h-5 w-5 text-red-600" />
									Resume
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex items-center justify-between bg-red-50 rounded-lg p-4 border border-red-100">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
											<FileText className="h-5 w-5 text-red-600" />
										</div>
										<div>
											<p className="text-sm font-medium text-gray-900">Candidate Resume</p>
											<p className="text-xs text-gray-600">Click to view the candidate's resume</p>
										</div>
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											if (!interview.resume_link) {
												console.error("No resume link provided");
												return;
											}

											if (!accessToken) {
												console.error("Authentication required to view resume");
												return;
											}

											// Fetch the PDF as blob and create object URL to force inline viewing
											const baseUrl = window.location.origin;
											const fullUrl = `${baseUrl}${interview.resume_link}?token=${encodeURIComponent(accessToken)}`;

											console.log("🔗 Fetching PDF URL:", fullUrl);
											console.log("Resume link:", interview.resume_link);

											// Fetch PDF as blob and open in new tab
											fetch(fullUrl, {
												method: "GET",
												headers: {
													Authorization: `Bearer ${accessToken}`,
												},
											})
												.then((response) => {
													if (!response.ok) {
														throw new Error("Failed to fetch PDF");
													}
													return response.blob();
												})
												.then((blob) => {
													// Create object URL from blob
													const blobUrl = URL.createObjectURL(blob);

													// Open in new tab - this will definitely show inline
													window.open(blobUrl, "_blank");

													// Clean up the object URL after a delay
													setTimeout(() => {
														URL.revokeObjectURL(blobUrl);
													}, 60000); // Clean up after 1 minute
												})
												.catch((error) => {
													console.error("Error fetching PDF:", error);
													alert("Failed to open PDF. Please try again.");
												});
										}}
									>
										<ExternalLink className="h-4 w-4 mr-2" />
										View Resume
									</Button>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Action Buttons */}
					<div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
						<Button variant="outline" onClick={onClose}>
							Close
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
