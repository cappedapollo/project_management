import interviewService from "@/api/services/interviewService";
import { useAuth } from "@/components/auth/use-auth";
import Icon from "@/components/icon/icon";
import userStore from "@/store/userStore";
import { InterviewProgress } from "@/types/enum";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { ModernButton } from "@/ui/modern-button";
import { Text, Title } from "@/ui/typography";
import { m } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

interface Interview {
	id: string;
	meeting_title?: string;
	meeting_link: string;
	meeting_date: string;
	job_description: string;
	interviewer?: string;
	progress: InterviewProgress;
	created_at: string;
	notes?: string;
	feedback?: string;
	resume_link?: string;
}

export default function InterviewDetailsPage() {
	const { user } = useAuth();
	const { interviewId } = useParams();
	const navigate = useNavigate();
	const [interview, setInterview] = useState<Interview | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchInterviewDetails = async () => {
			if (!interviewId || !user?.id) {
				toast.error("Interview not found");
				navigate("/user/interview-list");
				return;
			}

			try {
				setLoading(true);
				const userState = userStore.getState();
				const token = userState.userToken?.access_token;

				if (!token) {
					toast.error("Authentication required");
					navigate("/user/interview-list");
					return;
				}

				// Fetch interview details
				const data = await interviewService.getInterviewList(token, { user: user.id }, user.role);
				const foundInterview = data?.interviews?.find((item: any) => item.id === interviewId);

				if (!foundInterview) {
					toast.error("Interview not found");
					navigate("/user/interview-list");
					return;
				}

				// Transform data to match our interface
				const transformedInterview: Interview = {
					id: foundInterview.id,
					meeting_title: foundInterview.meeting_title,
					meeting_link: foundInterview.meeting_link,
					meeting_date: foundInterview.meeting_date,
					job_description: foundInterview.job_description,
					interviewer: foundInterview.interviewer,
					progress: foundInterview.progress,
					created_at: foundInterview.created_at,
					notes: foundInterview.notes,
					feedback: foundInterview.feedback,
					resume_link: foundInterview.resume_link,
				};

				setInterview(transformedInterview);
			} catch (error) {
				console.error("Error fetching interview details:", error);
				toast.error("Failed to load interview details");
				navigate("/user/interview-list");
			} finally {
				setLoading(false);
			}
		};

		fetchInterviewDetails();
	}, [interviewId, user?.id, navigate]);

	const getProgressText = (progress: InterviewProgress) => {
		switch (progress) {
			case InterviewProgress.PENDING:
				return "Scheduled";
			case InterviewProgress.SUCCESS:
				return "Completed";
			case InterviewProgress.FAIL:
				return "Cancelled";
			default:
				return "Unknown";
		}
	};

	const getProgressColor = (progress: InterviewProgress) => {
		switch (progress) {
			case InterviewProgress.PENDING:
				return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
			case InterviewProgress.SUCCESS:
				return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
			case InterviewProgress.FAIL:
				return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
			default:
				return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
		}
	};

	const handleViewResume = (resumeLink: string | undefined) => {
		if (!resumeLink) {
			console.error("No resume link provided");
			return;
		}

		// Get the auth token from the store
		const userState = userStore.getState();
		const token = userState.userToken?.access_token;

		if (!token) {
			toast.error("Authentication required to view resume");
			return;
		}

		// Extract the path from the resume link (remove /api prefix if present)
		let resumePath = resumeLink;
		if (resumePath.startsWith("/api/")) {
			resumePath = resumePath.substring(4); // Remove '/api/' prefix
		}

		// Construct the full URL to the resume PDF with auth token as query parameter
		const baseUrl = window.location.origin;
		const fullUrl = `${baseUrl}/api/${resumePath}?token=${encodeURIComponent(token)}`;

		console.log("🔗 Opening PDF URL:", fullUrl);

		// Open in new tab (same as job applications)
		window.open(fullUrl, "_blank");
	};

	const handleJoinMeeting = (meetingLink: string) => {
		window.open(meetingLink, "_blank");
	};

	const isUpcoming = (meetingDate: string) => {
		return new Date(meetingDate) > new Date();
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<m.div
					animate={{ rotate: 360 }}
					transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
					className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full"
				/>
			</div>
		);
	}

	if (!interview) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<Title as="h1" className="text-2xl mb-4">
						Interview not found
					</Title>
					<ModernButton onClick={() => navigate("/user/interview-list")}>Back to Interview List</ModernButton>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
			{/* Header */}
			<div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-700 to-blue-800 text-white shadow-lg">
				{/* Background Pattern */}
				<div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />

				<div className="relative max-w-7xl mx-auto p-8">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-8">
							<Button
								variant="ghost"
								size="lg"
								onClick={() => navigate("/user/interview-list")}
								className="text-white hover:bg-white/10 backdrop-blur-sm border border-white/20 transition-all duration-300"
							>
								<Icon icon="mdi:arrow-left" className="h-5 w-5 mr-2" />
								Back to Interviews
							</Button>

							<div className="flex items-center gap-6">
								<div className="relative">
									<div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white to-blue-100 flex items-center justify-center text-blue-700 text-3xl font-bold shadow-2xl border-2 border-white/50">
										{(interview.meeting_title || "I")[0].toUpperCase()}
									</div>
									<div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-lg" />
								</div>

								<div>
									<Title as="h1" className="text-5xl font-bold text-white mb-3">
										{interview.meeting_title || "Interview Meeting"}
									</Title>
									<div className="flex items-center gap-4 text-white/90">
										<Icon icon="mdi:calendar" className="h-5 w-5" />
										<Text className="text-lg">
											Created{" "}
											{new Date(interview.created_at).toLocaleDateString("en-US", {
												weekday: "long",
												year: "numeric",
												month: "long",
												day: "numeric",
											})}
										</Text>
									</div>
								</div>
							</div>
						</div>

						<div className="flex items-center gap-4">
							<Badge className="text-lg font-semibold px-6 py-3 rounded-full shadow-lg backdrop-blur-sm border-2 border-white/20 bg-white/10 text-white">
								{getProgressText(interview.progress)}
							</Badge>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="max-w-7xl mx-auto p-8">
				<m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
					{/* Key Information Row - Top Priority */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
						{/* Interviewer Information */}
						<Card className="overflow-hidden border-0 shadow-lg bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-300">
							<CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white pb-6">
								<CardTitle className="flex items-center gap-3 text-xl">
									<div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
										<Icon icon="mdi:account" className="h-6 w-6 text-white" />
									</div>
									Interviewer
								</CardTitle>
							</CardHeader>
							<CardContent className="p-6">
								<div className="text-center">
									<div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center text-green-700 text-2xl font-bold mx-auto mb-4">
										{(interview.interviewer || "I")[0].toUpperCase()}
									</div>
									<Text className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">{interview.interviewer || "Not specified"}</Text>
									<Text className="text-sm text-gray-600 dark:text-gray-400">Your Interviewer</Text>
								</div>
							</CardContent>
						</Card>

						{/* Meeting Date & Time */}
						<Card className="overflow-hidden border-0 shadow-lg bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-300">
							<CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white pb-6">
								<CardTitle className="flex items-center gap-3 text-xl">
									<div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
										<Icon icon="mdi:calendar-clock" className="h-6 w-6 text-white" />
									</div>
									Meeting Time
								</CardTitle>
							</CardHeader>
							<CardContent className="p-6">
								<div className="text-center">
									<Text className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
										{new Date(interview.meeting_date).toLocaleTimeString("en-US", {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</Text>
									<Text className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
										{new Date(interview.meeting_date).toLocaleDateString("en-US", {
											weekday: "long",
											month: "long",
											day: "numeric",
											year: "numeric",
										})}
									</Text>
									<Text className="text-sm text-gray-600 dark:text-gray-400">{isUpcoming(interview.meeting_date) ? "Upcoming" : "Past"}</Text>
								</div>
							</CardContent>
						</Card>

						{/* Resume Section */}
						{interview.resume_link && (
							<Card className="overflow-hidden border-0 shadow-lg bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-300">
								<CardHeader className="bg-gradient-to-r from-purple-500 to-violet-600 text-white pb-6">
									<CardTitle className="flex items-center gap-3 text-xl">
										<div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
											<Icon icon="mdi:file-pdf" className="h-6 w-6 text-white" />
										</div>
										Your Resume
									</CardTitle>
								</CardHeader>
								<CardContent className="p-6">
									<div className="text-center">
										<div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-violet-200 flex items-center justify-center text-purple-700 text-2xl font-bold mx-auto mb-4">
											<Icon icon="mdi:file-document" className="h-8 w-8" />
										</div>
										<ModernButton
											onClick={() => handleViewResume(interview.resume_link)}
											className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20 text-sm px-6 py-3 w-full rounded-xl border-2 border-purple-200 dark:border-purple-700 transition-all duration-300"
										>
											<Icon icon="mdi:file-document" size={16} className="mr-2" />
											View Resume
										</ModernButton>
									</div>
								</CardContent>
							</Card>
						)}
					</div>

					{/* Action Cards Row */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
						{/* Meeting Actions */}
						<Card className="overflow-hidden border-0 shadow-lg bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-300">
							<CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white pb-6">
								<CardTitle className="flex items-center gap-3 text-xl">
									<div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
										<Icon icon="mdi:video" className="h-6 w-6 text-white" />
									</div>
									Meeting Actions
								</CardTitle>
							</CardHeader>
							<CardContent className="p-6">
								<div className="flex flex-col gap-4">
									{isUpcoming(interview.meeting_date) && interview.progress === InterviewProgress.PENDING && (
										<ModernButton
											onClick={() => handleJoinMeeting(interview.meeting_link)}
											className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
										>
											<Icon icon="mdi:video" size={16} className="mr-2" />
											Join Meeting Now
										</ModernButton>
									)}

									{interview.meeting_link && (
										<>
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleJoinMeeting(interview.meeting_link)}
												className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 text-sm px-4 py-3 rounded-lg border-2 border-blue-200 dark:border-blue-700 transition-all duration-300"
											>
												<Icon icon="mdi:video" size={16} className="mr-2" />
												Join Meeting
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => {
													navigator.clipboard.writeText(interview.meeting_link);
													toast.success("Meeting link copied to clipboard!");
												}}
												className="text-gray-700 dark:text-gray-300 text-sm px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
											>
												<Icon icon="mdi:content-copy" size={16} className="mr-2" />
												Copy Meeting Link
											</Button>
										</>
									)}
								</div>
							</CardContent>
						</Card>

						{/* Quick Actions */}
						<Card className="overflow-hidden border-0 shadow-lg bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-300">
							<CardHeader className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white pb-6">
								<CardTitle className="flex items-center gap-3 text-xl">
									<div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
										<Icon icon="mdi:lightning-bolt" className="h-6 w-6 text-white" />
									</div>
									Quick Actions
								</CardTitle>
							</CardHeader>
							<CardContent className="p-6">
								<div className="flex flex-col gap-4">
									{interview.meeting_link && (
										<ModernButton
											onClick={() => {
												navigator.clipboard.writeText(interview.meeting_link);
												toast.success("Meeting link copied to clipboard!");
											}}
											variant="outline"
											className="text-gray-700 dark:text-gray-300 text-sm px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300"
										>
											<Icon icon="mdi:content-copy" size={16} className="mr-2" />
											Copy Meeting Link
										</ModernButton>
									)}

									<ModernButton
										onClick={() => {
											navigator.clipboard.writeText(interview.meeting_title || "Interview Meeting");
											toast.success("Interview title copied to clipboard!");
										}}
										variant="outline"
										className="text-gray-700 dark:text-gray-300 text-sm px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300"
									>
										<Icon icon="mdi:content-copy" size={16} className="mr-2" />
										Copy Interview Title
									</ModernButton>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Additional Information Row */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
						{/* Notes */}
						{interview.notes && (
							<Card className="overflow-hidden border-0 shadow-lg bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-300">
								<CardHeader className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white pb-6">
									<CardTitle className="flex items-center gap-3 text-xl">
										<div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
											<Icon icon="mdi:note-text" className="h-6 w-6 text-white" />
										</div>
										Notes
									</CardTitle>
								</CardHeader>
								<CardContent className="p-6">
									<div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6 border-2 border-yellow-200 dark:border-yellow-800">
										<Text className="whitespace-pre-wrap leading-relaxed text-sm text-yellow-900 dark:text-yellow-100 font-medium">{interview.notes}</Text>
									</div>
								</CardContent>
							</Card>
						)}

						{/* Feedback */}
						{interview.feedback && (
							<Card className="overflow-hidden border-0 shadow-lg bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-300">
								<CardHeader className="bg-gradient-to-r from-purple-500 to-violet-600 text-white pb-6">
									<CardTitle className="flex items-center gap-3 text-xl">
										<div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
											<Icon icon="mdi:message-text" className="h-6 w-6 text-white" />
										</div>
										Feedback
									</CardTitle>
								</CardHeader>
								<CardContent className="p-6">
									<div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-800">
										<Text className="whitespace-pre-wrap leading-relaxed text-sm text-purple-900 dark:text-purple-100 font-medium">{interview.feedback}</Text>
									</div>
								</CardContent>
							</Card>
						)}
					</div>

					{/* Job Description - Bottom Section */}
					<Card className="overflow-hidden border-0 shadow-xl bg-white dark:bg-gray-800">
						<CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white pb-6">
							<CardTitle className="flex items-center gap-4 text-2xl">
								<div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
									<Icon icon="mdi:briefcase" className="h-8 w-8 text-white" />
								</div>
								Job Description
							</CardTitle>
						</CardHeader>
						<CardContent className="p-8">
							<div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
								<Text className="whitespace-pre-wrap leading-relaxed text-lg text-gray-800 dark:text-gray-100 font-medium">
									{interview.job_description || "No job description available"}
								</Text>
							</div>
						</CardContent>
					</Card>
				</m.div>
			</div>
		</div>
	);
}
