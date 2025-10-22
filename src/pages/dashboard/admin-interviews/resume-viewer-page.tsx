import type { InterviewInfo } from "@/types/entity";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Text } from "@/ui/typography";
import { ArrowLeft, FileText, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function ResumeViewerPage() {
	// Get data from URL parameters using native browser API
	const urlParams = new URLSearchParams(window.location.search);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	// Get data from URL parameters
	const accessToken = urlParams.get("token") || "";
	const interviewId = urlParams.get("interviewId") || "";
	const resumeLink = urlParams.get("resumeLink") || "";
	const meetingTitle = urlParams.get("meetingTitle") || "";
	const user = urlParams.get("user") || "";
	const interviewer = urlParams.get("interviewer") || "";
	const meetingDate = urlParams.get("meetingDate") || "";

	// Create interview object from URL parameters
	const interview: InterviewInfo = {
		id: interviewId,
		resume_link: resumeLink,
		meeting_title: meetingTitle,
		user: user,
		interviewer: interviewer,
		meeting_date: meetingDate,
		// Add other required fields with default values
		progress: 0,
		proposal: "",
		profile: "",
		selected_resume_id: "",
		job_description: "",
		notes: "",
		feedback: "",
		meeting_link: "",
		created_at: "",
	};

	useEffect(() => {
		// Set page title
		document.title = `Resume Viewer - ${interview.meeting_title || "Interview"}`;

		// Debug logging
		console.log("Resume Viewer Page Loaded:");
		console.log("Access Token:", accessToken ? "Present" : "Missing");
		console.log("Resume Link:", resumeLink);
		console.log("Interview ID:", interviewId);
		console.log("Meeting Title:", meetingTitle);

		// Set a timeout to handle if iframe doesn't load
		const timeout = setTimeout(() => {
			if (loading) {
				console.log("Iframe loading timeout - setting error state");
				setLoading(false);
				setError(true);
			}
		}, 10000); // 10 second timeout

		return () => clearTimeout(timeout);
	}, [interview.meeting_title, accessToken, resumeLink, interviewId, meetingTitle, loading]);

	const getAuthenticatedUrl = () => {
		if (!interview.resume_link) return "";
		const url = new URL(interview.resume_link, window.location.origin);
		url.searchParams.set("token", accessToken);
		// Add parameters to try to force inline viewing
		url.searchParams.set("inline", "true");
		url.searchParams.set("download", "false");
		url.searchParams.set("view", "inline");
		url.searchParams.set("disposition", "inline");
		console.log("PDF URL:", url.toString());
		return url.toString();
	};

	const handleClose = () => {
		window.close();
	};

	const handleBack = () => {
		window.history.back();
	};

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			{/* Header */}
			<header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						<div className="flex items-center gap-4">
							<Button variant="ghost" size="sm" onClick={handleBack} className="h-8 w-8 p-0">
								<ArrowLeft className="h-4 w-4" />
							</Button>
							<div className="flex items-center gap-2">
								<FileText className="h-5 w-5 text-blue-600" />
								<Text className="text-lg font-semibold">Resume Viewer</Text>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Text className="text-sm text-gray-600 dark:text-gray-400">{interview.meeting_title || "Untitled Interview"}</Text>
							<Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
								<X className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
					{/* PDF Viewer */}
					<div className="lg:col-span-3">
						<Card className="h-[calc(100vh-12rem)]">
							<CardHeader className="pb-3">
								<CardTitle className="text-lg">Resume Document</CardTitle>
							</CardHeader>
							<CardContent className="p-0 h-full">
								<div className="relative h-full">
									{loading && (
										<div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
											<div className="text-center">
												<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
												<Text className="text-sm text-gray-600 dark:text-gray-400">Loading resume...</Text>
											</div>
										</div>
									)}
									{error && (
										<div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
											<div className="text-center">
												<Text className="text-red-600 mb-2">Failed to load resume in viewer</Text>
												<div className="space-y-2">
													<Button variant="outline" size="sm" onClick={() => window.location.reload()}>
														Retry
													</Button>
													<Button
														variant="default"
														size="sm"
														onClick={() => {
															const url = getAuthenticatedUrl();
															if (url) {
																window.open(url, "_blank", "noopener,noreferrer");
															}
														}}
														className="ml-2"
													>
														Open in New Tab
													</Button>
												</div>
											</div>
										</div>
									)}
									<iframe
										src={getAuthenticatedUrl()}
										className="w-full h-full border-0 rounded-b-lg"
										onLoad={() => {
											console.log("Iframe loaded successfully");
											setLoading(false);
										}}
										onError={() => {
											console.log("Iframe failed to load");
											setLoading(false);
											setError(true);
										}}
										title="Resume Viewer"
									/>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Sidebar */}
					<div className="lg:col-span-1">
						<div className="space-y-6">
							{/* Interview Info */}
							<Card>
								<CardHeader>
									<CardTitle className="text-lg">Interview Details</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<Text className="text-sm font-medium text-gray-500">Candidate</Text>
										<Text className="text-sm">{typeof interview.user === "string" ? interview.user : interview.user?.email || "Unknown User"}</Text>
									</div>
									<div>
										<Text className="text-sm font-medium text-gray-500">Interviewer</Text>
										<Text className="text-sm">{interview.interviewer || "Not assigned"}</Text>
									</div>
									<div>
										<Text className="text-sm font-medium text-gray-500">Date</Text>
										<Text className="text-sm">
											{interview.meeting_date
												? new Date(interview.meeting_date).toLocaleDateString("en-US", {
														year: "numeric",
														month: "long",
														day: "numeric",
													})
												: "Not specified"}
										</Text>
									</div>
									<div>
										<Text className="text-sm font-medium text-gray-500">Time</Text>
										<Text className="text-sm">
											{interview.meeting_date
												? new Date(interview.meeting_date).toLocaleTimeString("en-US", {
														hour: "2-digit",
														minute: "2-digit",
													})
												: "Not specified"}
										</Text>
									</div>
								</CardContent>
							</Card>

							{/* Actions */}
							<Card>
								<CardHeader>
									<CardTitle className="text-lg">Actions</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<Button variant="outline" className="w-full" onClick={handleBack}>
										<ArrowLeft className="h-4 w-4 mr-2" />
										Back to Interview
									</Button>
									<Button variant="outline" className="w-full" onClick={handleClose}>
										<X className="h-4 w-4 mr-2" />
										Close Window
									</Button>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
