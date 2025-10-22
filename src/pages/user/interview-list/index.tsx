import interviewService from "@/api/services/interviewService";
import FormattedTextPDF from "@/components/FormattedTextPDF";
import { useAuth } from "@/components/auth/use-auth";
import Icon from "@/components/icon/icon";
import InterviewModal, { type InterviewModalProps } from "@/pages/management/user/interview/detail/interview-modal";
import userStore, { useUserToken } from "@/store/userStore";
import type { InterviewInfo } from "@/types/entity";
import { InterviewProgress } from "@/types/enum";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { ModernButton } from "@/ui/modern-button";
import { ModernCard } from "@/ui/modern-card";
import { ModernStatsCard } from "@/ui/modern-stats-card";
import { ModernTable, ModernTableBody, ModernTableCell, ModernTableHead, ModernTableHeader, ModernTableRow } from "@/ui/modern-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Text, Title } from "@/ui/typography";
import { pdf } from "@react-pdf/renderer";
import { m } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
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
	selected_resume_id?: string;
}

const defaultInterviewValue: InterviewInfo = {
	id: "",
	user: "",
	profile: "",
	meeting_title: "",
	meeting_date: "",
	meeting_link: "",
	job_description: "",
	interviewer: "",
	progress: InterviewProgress.PENDING,
};

export default function InterviewList() {
	const { user } = useAuth();
	const { access_token } = useUserToken();
	const navigate = useNavigate();
	const [interviews, setInterviews] = useState<Interview[]>([]);
	const [filteredInterviews, setFilteredInterviews] = useState<Interview[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [sortBy, setSortBy] = useState<"date" | "progress" | "title">("date");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [interviewModalProps, setInterviewModalProps] = useState<InterviewModalProps>({
		formValue: { ...defaultInterviewValue },
		title: "New Interview",
		show: false,
		onOk: (values) => {
			setInterviewModalProps((prev) => ({ ...prev, show: false }));
			// Refresh the interviews list
			fetchInterviews();
			// Note: Dashboard will auto-refresh when user navigates back due to useEffect dependency
		},
		onCancel: () => {
			setInterviewModalProps((prev) => ({ ...prev, show: false }));
		},
	});

	const fetchInterviews = useCallback(async () => {
		if (!user?.id) return;

		try {
			setLoading(true);
			// Get the token from userStore or auth context
			const userState = userStore.getState();
			const token = userState.userToken?.access_token;

			if (!token) {
				console.error("No access token available");
				return;
			}

			const data = await interviewService.getInterviewList(token, { user: user.id }, user.role);

			console.log("Raw interview data from API:", data);

			// Transform data to match our interface
			const transformedData: Interview[] = (data?.interviews || []).map((item: any) => ({
				id: item.id,
				meeting_title: item.meeting_title,
				meeting_link: item.meeting_link,
				meeting_date: item.meeting_date,
				job_description: item.job_description,
				interviewer: item.interviewer,
				progress: item.progress,
				created_at: item.created_at,
				notes: item.notes,
				feedback: item.feedback,
				resume_link: item.resume_link,
				selected_resume_id: item.selected_resume_id,
			}));

			setInterviews(transformedData);
			setFilteredInterviews(transformedData);
		} catch (error) {
			console.error("Failed to fetch interviews:", error);
		} finally {
			setLoading(false);
		}
	}, [user?.id]);

	useEffect(() => {
		fetchInterviews();
	}, [fetchInterviews]);

	// Add message listener for PDF download
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data.type === "downloadResumePDF") {
				generateAndDownloadPDF(event.data.resumeText, event.data.company, event.data.meetingDate);
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	// Filter and sort interviews
	useEffect(() => {
		let filtered = interviews;

		// Apply search filter
		if (searchTerm) {
			filtered = filtered.filter(
				(interview) =>
					interview.meeting_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					interview.job_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					interview.interviewer?.toLowerCase().includes(searchTerm.toLowerCase()),
			);
		}

		// Apply status filter
		if (statusFilter !== "all") {
			filtered = filtered.filter((interview) => interview.progress.toString() === statusFilter);
		}

		// Apply sorting
		filtered.sort((a, b) => {
			let aValue: any;
			let bValue: any;

			switch (sortBy) {
				case "title":
					aValue = a.meeting_title || "";
					bValue = b.meeting_title || "";
					break;
				case "date":
					aValue = new Date(a.meeting_date);
					bValue = new Date(b.meeting_date);
					break;
				case "progress":
					aValue = a.progress;
					bValue = b.progress;
					break;
				default:
					return 0;
			}

			if (sortOrder === "asc") {
				return aValue > bValue ? 1 : -1;
			}
			return aValue < bValue ? 1 : -1;
		});

		setFilteredInterviews(filtered);
	}, [interviews, searchTerm, statusFilter, sortBy, sortOrder]);

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

	const handleNewInterview = () => {
		setInterviewModalProps((prev) => ({
			...prev,
			formValue: {
				...defaultInterviewValue,
				user: user?.id || "",
				profile: "", // Set to empty string, will be converted to NULL by backend
			},
			title: "New Interview",
			show: true,
		}));
	};

	const handleJoinMeeting = (meetingLink: string) => {
		window.open(meetingLink, "_blank");
	};

	// Function to generate and download PDF
	const generateAndDownloadPDF = async (resumeText: string, company: string, meetingDate: string) => {
		try {
			// Generate PDF using FormattedTextPDF component
			const blob = await pdf(<FormattedTextPDF text={resumeText} />).toBlob();
			const url = URL.createObjectURL(blob);

			// Create download link
			const a = document.createElement("a");
			a.href = url;
			a.download = `interview_resume_${company || "unknown"}_${new Date(meetingDate).toISOString().split("T")[0]}.pdf`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			toast.success("PDF downloaded successfully!");
		} catch (error) {
			console.error("Error generating PDF:", error);
			toast.error("Failed to generate PDF. Please try again.");
		}
	};

	const handleViewResume = (resumeLink: string | undefined) => {
		if (!resumeLink) {
			console.error("No resume link provided");
			toast.error("No resume link available");
			return;
		}

		// Get the auth token from the hook (same as working job application)
		const token = access_token;

		console.log("🔐 Auth token check:", {
			hasToken: !!token,
			tokenLength: token?.length,
			fullToken: token ? `${token.substring(0, 20)}...` : "No token",
		});

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
		console.log("🔗 Original resume link was:", resumeLink);

		// Open in new tab (same as working job application)
		window.open(fullUrl, "_blank");
	};

	const handleViewDetails = (interview: Interview) => {
		// Navigate using React Router to keep the layout
		navigate(`/user/interview-list/${interview.id}`);
	};

	const isUpcoming = (meetingDate: string) => {
		return new Date(meetingDate) > new Date();
	};

	const handleSort = (column: "date" | "progress" | "title") => {
		if (sortBy === column) {
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			setSortBy(column);
			setSortOrder("desc");
		}
	};

	const handleEditInterview = (interview: Interview) => {
		// Transform the interview data to match InterviewInfo format
		const interviewInfo: InterviewInfo = {
			id: interview.id,
			user: user?.id || "",
			profile: "",
			meeting_title: interview.meeting_title || "",
			meeting_date: interview.meeting_date,
			meeting_link: interview.meeting_link,
			job_description: interview.job_description,
			interviewer: interview.interviewer || "",
			progress: interview.progress,
			notes: interview.notes || "",
			feedback: interview.feedback || "",
		};

		setInterviewModalProps((prev) => ({
			...prev,
			formValue: interviewInfo,
			title: "Edit Interview",
			show: true,
		}));
	};

	// Calculate statistics with trends
	const calculateTrend = (currentCount: number, previousCount: number) => {
		if (previousCount === 0) return currentCount > 0 ? 100 : 0;
		return Math.round(((currentCount - previousCount) / previousCount) * 100);
	};

	// Get current period data (last 7 days for more meaningful trends)
	const now = new Date();
	const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

	// Current period interviews (last 7 days)
	const currentPeriodInterviews = interviews.filter((int) => {
		const createdDate = new Date(int.created_at);
		return createdDate && !Number.isNaN(createdDate.getTime()) && createdDate >= sevenDaysAgo;
	});
	const currentStats = {
		total: currentPeriodInterviews.length,
		scheduled: currentPeriodInterviews.filter((int) => int.progress === InterviewProgress.PENDING).length,
		completed: currentPeriodInterviews.filter((int) => int.progress === InterviewProgress.SUCCESS).length,
		cancelled: currentPeriodInterviews.filter((int) => int.progress === InterviewProgress.FAIL).length,
	};

	// Previous period interviews (7-14 days ago)
	const previousPeriodInterviews = interviews.filter((int) => {
		const createdDate = new Date(int.created_at);
		return createdDate && !Number.isNaN(createdDate.getTime()) && createdDate >= fourteenDaysAgo && createdDate < sevenDaysAgo;
	});
	const previousStats = {
		total: previousPeriodInterviews.length,
		scheduled: previousPeriodInterviews.filter((int) => int.progress === InterviewProgress.PENDING).length,
		completed: previousPeriodInterviews.filter((int) => int.progress === InterviewProgress.SUCCESS).length,
		cancelled: previousPeriodInterviews.filter((int) => int.progress === InterviewProgress.FAIL).length,
	};

	// Calculate trends
	const trends = {
		total: calculateTrend(currentStats.total, previousStats.total),
		scheduled: calculateTrend(currentStats.scheduled, previousStats.scheduled),
		completed: calculateTrend(currentStats.completed, previousStats.completed),
		cancelled: calculateTrend(currentStats.cancelled, previousStats.cancelled),
	};

	// Use current period stats for display, but fallback to all interviews if no recent data
	const stats =
		currentStats.total > 0
			? currentStats
			: {
					total: interviews.length,
					scheduled: interviews.filter((int) => int.progress === InterviewProgress.PENDING).length,
					completed: interviews.filter((int) => int.progress === InterviewProgress.SUCCESS).length,
					cancelled: interviews.filter((int) => int.progress === InterviewProgress.FAIL).length,
				};

	if (loading) {
		return (
			<m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-64">
				<ModernCard className="text-center space-y-6 p-8">
					<m.div
						animate={{ rotate: 360 }}
						transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
						className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full mx-auto"
					/>
					<div>
						<Title as="h3" className="mb-2">
							Loading Interviews
						</Title>
						<Text className="text-muted-foreground">Fetching your interview data...</Text>
					</div>
				</ModernCard>
			</m.div>
		);
	}

	return (
		<m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-8">
			{/* Header */}
			<m.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
				className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
			>
				<div className="space-y-2">
					<div className="flex items-center gap-3">
						<m.div
							initial={{ scale: 0, rotate: -180 }}
							animate={{ scale: 1, rotate: 0 }}
							transition={{ type: "spring", stiffness: 300, damping: 20 }}
							className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 text-purple-600 dark:text-purple-400"
						>
							<Icon icon="mdi:video" className="h-6 w-6" />
						</m.div>
						<div>
							<Title
								as="h1"
								className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent"
							>
								My Interviews
							</Title>
							<Text className="text-muted-foreground mt-1">Track all your scheduled interviews and their status</Text>
						</div>
					</div>
				</div>
				<m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
					<ModernButton onClick={handleNewInterview} className="gap-2" glow>
						<Icon icon="mdi:plus" className="h-4 w-4" />
						New Interview
					</ModernButton>
				</m.div>
			</m.div>

			{/* Statistics Cards */}
			<m.div
				initial={{ opacity: 0, y: 30 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.3, duration: 0.5 }}
				className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
			>
				<ModernStatsCard
					title="Total Interviews"
					value={stats.total}
					icon={<Icon icon="mdi:video" className="h-6 w-6" />}
					colorScheme="gray"
					change={{
						value: trends.total,
						type: trends.total >= 0 ? "increase" : "decrease",
					}}
				/>
				<ModernStatsCard
					title="Scheduled"
					value={stats.scheduled}
					icon={<Icon icon="mdi:calendar-clock" className="h-6 w-6" />}
					colorScheme="blue"
					change={{
						value: trends.scheduled,
						type: trends.scheduled >= 0 ? "increase" : "decrease",
					}}
				/>
				<ModernStatsCard
					title="Completed"
					value={stats.completed}
					icon={<Icon icon="mdi:check-circle" className="h-6 w-6" />}
					colorScheme="green"
					change={{
						value: trends.completed,
						type: trends.completed >= 0 ? "increase" : "decrease",
					}}
				/>
				<ModernStatsCard
					title="Cancelled"
					value={stats.cancelled}
					icon={<Icon icon="mdi:close-circle" className="h-6 w-6" />}
					colorScheme="red"
					change={{
						value: trends.cancelled,
						type: trends.cancelled >= 0 ? "increase" : "decrease",
					}}
				/>
			</m.div>

			{/* Filters and Search */}
			<m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
				<ModernCard>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Icon icon="mdi:filter" className="h-5 w-5" />
							Search & Filters
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col md:flex-row gap-4">
							<div className="flex-1">
								<Input
									placeholder="Search by title, job description, or interviewer..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="border-2 hover:border-primary/20 transition-colors"
								/>
							</div>
							<div className="flex gap-2">
								<Select value={statusFilter} onValueChange={setStatusFilter}>
									<SelectTrigger className="w-[180px] border-2 hover:border-primary/20 transition-colors">
										<SelectValue placeholder="Filter by status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Status</SelectItem>
										<SelectItem value="0">Scheduled</SelectItem>
										<SelectItem value="1">Completed</SelectItem>
										<SelectItem value="2">Cancelled</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</CardContent>
				</ModernCard>
			</m.div>

			{/* Interviews Table */}
			<m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
				<ModernCard className="overflow-hidden">
					<div className="p-6 border-b border-gray-100 dark:border-gray-800">
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
							<div>
								<Title as="h3" className="text-xl font-semibold">
									Interview List
								</Title>
								<Text className="text-muted-foreground text-sm mt-1">{filteredInterviews.length} total interviews</Text>
							</div>
						</div>
					</div>
					<div className="overflow-x-auto">
						{filteredInterviews.length === 0 ? (
							<div className="flex flex-col items-center justify-center text-center py-16">
								<m.div
									initial={{ scale: 0, rotate: -180 }}
									animate={{ scale: 1, rotate: 0 }}
									transition={{ type: "spring", stiffness: 300, damping: 20 }}
									className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4"
								>
									<Icon icon="mdi:video-outline" size={32} className="text-gray-400" />
								</m.div>
								<Title as="h3" className="text-lg font-semibold mb-2">
									{interviews.length === 0 ? "No interviews yet" : "No interviews match your filters"}
								</Title>
								<Text variant="body2" className="text-muted-foreground mb-6 max-w-md">
									{interviews.length === 0
										? "Start scheduling your interviews. Track your interview progress and manage all your scheduled meetings in one place."
										: "Try adjusting your search or filters to find what you're looking for."}
								</Text>
								{interviews.length === 0 && (
									<ModernButton onClick={handleNewInterview} className="gap-2" glow>
										<Icon icon="mdi:plus" className="h-4 w-4" />
										Schedule Your First Interview
									</ModernButton>
								)}
							</div>
						) : (
							<ModernTable>
								<ModernTableHeader>
									<ModernTableRow>
										<ModernTableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" onClick={() => handleSort("title")}>
											<div className="flex items-center gap-2">
												Meeting Title
												{sortBy === "title" && <Icon icon={sortOrder === "asc" ? "mdi:arrow-up" : "mdi:arrow-down"} size={16} />}
											</div>
										</ModernTableHead>
										<ModernTableHead>Job & Interviewer</ModernTableHead>
										<ModernTableHead>Resume</ModernTableHead>
										<ModernTableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" onClick={() => handleSort("date")}>
											<div className="flex items-center gap-2">
												Meeting Date
												{sortBy === "date" && <Icon icon={sortOrder === "asc" ? "mdi:arrow-up" : "mdi:arrow-down"} size={16} />}
											</div>
										</ModernTableHead>
										<ModernTableHead
											className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
											onClick={() => handleSort("progress")}
										>
											<div className="flex items-center gap-2">
												Status
												{sortBy === "progress" && <Icon icon={sortOrder === "asc" ? "mdi:arrow-up" : "mdi:arrow-down"} size={16} />}
											</div>
										</ModernTableHead>
										<ModernTableHead>Details</ModernTableHead>
										<ModernTableHead className="text-center">Actions</ModernTableHead>
									</ModernTableRow>
								</ModernTableHeader>
								<ModernTableBody>
									{filteredInterviews.map((interview, index) => (
										<m.tr
											key={interview.id}
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: index * 0.05 }}
											className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
										>
											<ModernTableCell>
												<div className="flex items-center gap-3">
													<div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-medium">
														{(interview.meeting_title || "I")[0].toUpperCase()}
													</div>
													<div className="flex flex-col">
														<span className="font-semibold text-gray-900 dark:text-gray-100">{interview.meeting_title || "Interview Meeting"}</span>
														<span className="text-sm text-gray-500 dark:text-gray-400">
															Created{" "}
															{new Date(interview.created_at).toLocaleDateString("en-US", {
																month: "short",
																day: "numeric",
																year: "numeric",
															})}
														</span>
													</div>
												</div>
											</ModernTableCell>
											<ModernTableCell>
												<div className="flex flex-col max-w-[300px]">
													<span className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2 text-sm">
														{interview.job_description
															? interview.job_description.substring(0, 150) + (interview.job_description.length > 150 ? "..." : "")
															: "No description"}
													</span>
													{interview.interviewer && <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">Interviewer: {interview.interviewer}</span>}
												</div>
											</ModernTableCell>
											<ModernTableCell>
												{interview.resume_link || interview.selected_resume_id ? (
													<ModernButton
														size="sm"
														variant="ghost"
														onClick={() => handleViewResume(interview.resume_link || `/api/interviews/${interview.id}/scheduled-resume-pdf`)}
														className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
													>
														<Icon icon="mdi:eye" size={16} className="mr-1" />
														View Resume
													</ModernButton>
												) : (
													<span className="text-gray-400 dark:text-gray-500 text-sm">No resume</span>
												)}
											</ModernTableCell>
											<ModernTableCell>
												<div className="flex flex-col">
													<span className="font-medium text-gray-900 dark:text-gray-100">
														{new Date(interview.meeting_date).toLocaleDateString("en-US", {
															weekday: "short",
															month: "short",
															day: "numeric",
															year: "numeric",
														})}
													</span>
													<span className="text-sm text-gray-500 dark:text-gray-400">
														{new Date(interview.meeting_date).toLocaleTimeString("en-US", {
															hour: "2-digit",
															minute: "2-digit",
														})}
													</span>
												</div>
											</ModernTableCell>
											<ModernTableCell>
												<Badge
													variant={
														interview.progress === InterviewProgress.PENDING
															? "default"
															: interview.progress === InterviewProgress.SUCCESS
																? "default"
																: "destructive"
													}
													className={`
														${interview.progress === InterviewProgress.PENDING && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"}
														${interview.progress === InterviewProgress.SUCCESS && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"}
														${interview.progress === InterviewProgress.FAIL && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"}
													`}
												>
													{getProgressText(interview.progress)}
												</Badge>
											</ModernTableCell>
											<ModernTableCell>
												<ModernButton
													size="sm"
													variant="ghost"
													onClick={() => handleViewDetails(interview)}
													className="text-green-600 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-900/20"
												>
													<Icon icon="mdi:file-document" size={16} className="mr-1" />
													View Details
												</ModernButton>
											</ModernTableCell>
											<ModernTableCell>
												<div className="flex items-center justify-center gap-1">
													{isUpcoming(interview.meeting_date) && interview.progress === InterviewProgress.PENDING && (
														<ModernButton
															size="sm"
															variant="ghost"
															onClick={() => handleJoinMeeting(interview.meeting_link)}
															className="h-8 w-8 p-0 text-green-600 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-900/20"
														>
															<Icon icon="mdi:video" size={16} />
														</ModernButton>
													)}
													<ModernButton size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEditInterview(interview)}>
														<Icon icon="mdi:pencil" size={16} />
													</ModernButton>
												</div>
											</ModernTableCell>
										</m.tr>
									))}
								</ModernTableBody>
							</ModernTable>
						)}
					</div>

					{/* Stats Footer */}
					{filteredInterviews.length > 0 && (
						<m.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.8 }}
							className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50"
						>
							<div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
								<span>
									Showing {filteredInterviews.length} of {interviews.length} interviews
								</span>
								<div className="flex items-center gap-4">
									<span>Scheduled: {stats.scheduled}</span>
									<span>Completed: {stats.completed}</span>
									<span>Cancelled: {stats.cancelled}</span>
								</div>
							</div>
						</m.div>
					)}
				</ModernCard>
			</m.div>

			{/* Interview Modal */}
			<InterviewModal {...interviewModalProps} />
		</m.div>
	);
}
