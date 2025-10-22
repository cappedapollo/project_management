import type { ProposalInfo } from "@/types/entity";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Separator } from "@/ui/separator";
import { Text, Title } from "@/ui/typography";
import { Building, Calendar, ExternalLink, FileText, Globe, Mail, User } from "lucide-react";

interface ApplicationDetailsDialogProps {
	application: ProposalInfo | null;
	show: boolean;
	onClose: () => void;
}

export default function ApplicationDetailsDialog({ application, show, onClose }: ApplicationDetailsDialogProps) {
	if (!application) return null;

	const formatDate = (dateString: string | undefined) => {
		if (!dateString) return "Not specified";
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const getStatusBadgeVariant = (status: string) => {
		switch (status?.toLowerCase()) {
			case "applied":
				return "default";
			case "interviewing":
				return "secondary";
			case "offered":
				return "default";
			case "rejected":
				return "destructive";
			default:
				return "outline";
		}
	};

	return (
		<Dialog open={show} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-[1200px] w-[95vw] max-h-[95vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						Application Details
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-6">
					{/* Header Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Building className="h-5 w-5 text-blue-600" />
								{application.company || "Unknown Company"}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="flex items-center gap-2">
									<User className="h-4 w-4 text-gray-500" />
									<div>
										<Text className="text-sm font-medium">Applicant</Text>
										<Text className="text-sm text-gray-600">{application.user || "Unknown User"}</Text>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Calendar className="h-4 w-4 text-gray-500" />
									<div>
										<Text className="text-sm font-medium">Applied Date</Text>
										<Text className="text-sm text-gray-600">{formatDate(application.applied_date)}</Text>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Badge variant={getStatusBadgeVariant(application.status || "")}>{application.status || "Unknown"}</Badge>
								</div>
								{application.job_link && (
									<div className="flex items-center gap-2">
										<Globe className="h-4 w-4 text-gray-500" />
										<div>
											<Text className="text-sm font-medium">Job Link</Text>
											<a
												href={application.job_link}
												target="_blank"
												rel="noopener noreferrer"
												className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
											>
												View Job Posting
												<ExternalLink className="h-3 w-3" />
											</a>
										</div>
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Job Description */}
					{application.job_description && (
						<Card>
							<CardHeader>
								<CardTitle>Job Description</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
									<Text className="text-sm leading-relaxed whitespace-pre-wrap font-normal">{application.job_description}</Text>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Cover Letter */}
					{application.cover_letter && (
						<Card>
							<CardHeader>
								<CardTitle>Cover Letter</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
									<Text className="text-sm leading-relaxed whitespace-pre-wrap font-normal">{application.cover_letter}</Text>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Resume Information */}
					<Card>
						<CardHeader>
							<CardTitle>Resume Information</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{application.resume_pdf_path && (
								<div className="flex items-center gap-2">
									<FileText className="h-4 w-4 text-gray-500" />
									<div>
										<Text className="text-sm font-medium">Resume PDF</Text>
										<a
											href={application.resume_pdf_path}
											target="_blank"
											rel="noopener noreferrer"
											className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
										>
											View Resume PDF
											<ExternalLink className="h-3 w-3" />
										</a>
									</div>
								</div>
							)}
							{application.resume && (
								<div>
									<Text className="text-sm font-medium mb-2">Resume Content</Text>
									<div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg max-h-96 overflow-y-auto">
										<Text className="text-sm leading-relaxed whitespace-pre-wrap font-normal">{application.resume}</Text>
									</div>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Additional Information */}
					<Card>
						<CardHeader>
							<CardTitle>Additional Information</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
								<div>
									<Text className="font-medium">Application ID</Text>
									<Text className="text-gray-600 font-mono">{application.id}</Text>
								</div>
								<div>
									<Text className="font-medium">Profile ID</Text>
									<Text className="text-gray-600">{application.profile || "Not specified"}</Text>
								</div>
								<div>
									<Text className="font-medium">Created</Text>
									<Text className="text-gray-600">{formatDate(application.created_at)}</Text>
								</div>
								<div>
									<Text className="font-medium">Last Updated</Text>
									<Text className="text-gray-600">{formatDate(application.created_at)}</Text>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="flex justify-end gap-2 pt-4 border-t">
					<Button variant="outline" onClick={onClose}>
						Close
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
