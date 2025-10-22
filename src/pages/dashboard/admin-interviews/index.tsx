import { useAuth } from "@/components/auth/use-auth";
import { Chart } from "@/components/chart/chart";
import { useChart } from "@/components/chart/useChart";
import Icon from "@/components/icon/icon";
import { useRouter } from "@/routes/hooks";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Calendar } from "@/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { ModernButton } from "@/ui/modern-button";
import { ModernCard } from "@/ui/modern-card";
import { ModernStatsCard } from "@/ui/modern-stats-card";
import { ModernTable, ModernTableBody, ModernTableCell, ModernTableHead, ModernTableHeader, ModernTableRow } from "@/ui/modern-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Text, Title } from "@/ui/typography";
import { cn } from "@/utils";
import { m } from "motion/react";
import { useEffect, useState } from "react";

// Import services
import interviewService from "@/api/services/interviewService";
import type { InterviewInfo } from "@/types/entity";

import EditInterviewDialog from "./edit-interview-dialog";
// Import components
import InterviewDetailsDialog from "./interview-details-dialog";

// Extended interview type with userInfo
interface ExtendedInterviewInfo extends InterviewInfo {
	userInfo?: {
		email?: string;
		username?: string;
	};
}

// Time filter options
const timeOptions = [
	{ label: "Today", value: "today" },
	{ label: "This Week", value: "week" },
	{ label: "This Month", value: "month" },
	{ label: "All Time", value: "all" },
];

export default function AdminInterviews() {
	const { user, access_token } = useAuth();
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [progressFilter, setProgressFilter] = useState("all");
	const [interviewerFilter, setInterviewerFilter] = useState("all");
	const [timeFilter, setTimeFilter] = useState("today"); // Default to today
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
	const itemsPerPage = 15;

	// Data states
	const [interviews, setInterviews] = useState<ExtendedInterviewInfo[]>([]);
	const [filteredInterviews, setFilteredInterviews] = useState<ExtendedInterviewInfo[]>([]);
	const [error, setError] = useState<string | null>(null);

	// Dialog states
	const [selectedInterview, setSelectedInterview] = useState<InterviewInfo | null>(null);
	const [showDetailsDialog, setShowDetailsDialog] = useState(false);
	const [showEditDialog, setShowEditDialog] = useState(false);

	// Check if user is admin
	useEffect(() => {
		if (user && user.role !== 0) {
			router.replace("/job-dashboard");
			return;
		}
	}, [user, router]);

	// Fetch interviews data based on time filter
	useEffect(() => {
		const fetchInterviews = async () => {
			if (!user || user.role !== 0 || !access_token) return;

			// Fetching interviews for timeFilter: ${timeFilter}
			setLoading(true);
			setError(null);
			try {
				// Calculate date range based on time filter
				const now = new Date();
				const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

				// Get start of current week (Sunday)
				const startOfWeek = new Date(today);
				const dayOfWeek = today.getDay();
				startOfWeek.setDate(today.getDate() - dayOfWeek);

				// Get start of current month
				const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

				// Get end of current week (Saturday)
				const endOfWeek = new Date(startOfWeek);
				endOfWeek.setDate(startOfWeek.getDate() + 6);
				endOfWeek.setHours(23, 59, 59, 999);

				// Get end of current month
				const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
				endOfMonth.setHours(23, 59, 59, 999);

				let startDate: string | undefined;
				let endDate: string | undefined;

				switch (timeFilter) {
					case "today":
						startDate = today.toISOString();
						endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
						break;
					case "week":
						startDate = startOfWeek.toISOString();
						endDate = endOfWeek.toISOString();
						break;
					case "month":
						startDate = startOfMonth.toISOString();
						endDate = endOfMonth.toISOString();
						break;
					default:
						// No date filtering - get all data
						break;
				}

				// Date range: ${startDate} to ${endDate} for ${timeFilter}

				const response = await interviewService.getInterviewList(access_token, {
					limit: 1000,
					startDate,
					endDate,
				});

				// API Response received

				if (response?.interviews) {
					// Validate that interviews are proper objects with required fields
					const validInterviews = response.interviews.filter((interview: any) => {
						return interview && typeof interview === "object" && interview.id && interview.meeting_title;
					});

					// Valid interviews: ${validInterviews.length} out of ${response.interviews.length}

					// Interview details logged for debugging

					setInterviews(validInterviews);
					setFilteredInterviews(validInterviews);
				} else {
					console.warn("No interviews found in API response");
					setInterviews([]);
					setFilteredInterviews([]);
				}
			} catch (error) {
				console.error("Failed to fetch interviews:", error);
				setError(error instanceof Error ? error.message : "Failed to fetch interviews");
				// Set empty arrays on error to prevent undefined issues
				setInterviews([]);
				setFilteredInterviews([]);
			} finally {
				setLoading(false);
			}
		};

		fetchInterviews();
	}, [user, timeFilter, access_token]); // Added access_token as dependency

	// Filter interviews based on search and other filters (time filtering now done at database level)
	useEffect(() => {
		let filtered = interviews;

		// Apply search filter
		if (searchTerm) {
			filtered = filtered.filter(
				(interview) =>
					interview.meeting_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					interview.interviewer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					(typeof interview.user === "string" ? interview.user : interview.user?.email || "")?.toLowerCase().includes(searchTerm.toLowerCase()),
			);
		}

		// Apply progress filter
		if (progressFilter !== "all") {
			filtered = filtered.filter((interview) => getProgressDisplay(interview.progress) === progressFilter);
		}

		// Apply interviewer filter
		if (interviewerFilter !== "all") {
			filtered = filtered.filter((interview) => interview.interviewer === interviewerFilter);
		}

		setFilteredInterviews(filtered);
		setCurrentPage(1);
	}, [interviews, searchTerm, progressFilter, interviewerFilter]);

	// Map progress values to proper strings
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

	// Calculate statistics for the current time filter
	const stats = {
		total: filteredInterviews.length,
		scheduled: filteredInterviews.filter((interview) => getProgressDisplay(interview.progress) === "scheduled").length,
		completed: filteredInterviews.filter((interview) => getProgressDisplay(interview.progress) === "completed").length,
		cancelled: filteredInterviews.filter((interview) => getProgressDisplay(interview.progress) === "cancelled").length,
		today: filteredInterviews.filter((interview) => {
			const today = new Date();
			const interviewDate = new Date(interview.meeting_date || "");
			return interviewDate.toDateString() === today.toDateString();
		}).length,
	};

	// Calculate percentages safely
	const getPercentage = (value: number, total: number) => {
		return total > 0 ? (value / total) * 100 : 0;
	};

	// Chart data for progress distribution - ensure all values are valid numbers
	const chartSeries = [stats.scheduled || 0, stats.completed || 0, stats.cancelled || 0];

	// Chart data ready for display

	// Always create chart to maintain hook order consistency
	const progressChart = useChart({
		series: chartSeries,
		labels: ["Scheduled", "Completed", "Cancelled"],
		colors: ["#3b82f6", "#10b981", "#ef4444"],
		plotOptions: {
			pie: {
				donut: {
					size: "70%",
				},
			},
		},
		// Add fallback for empty data
		noData: {
			text: "No data available",
			align: "center",
			verticalAlign: "middle",
			offsetX: 0,
			offsetY: 0,
			style: {
				color: "#6b7280",
				fontSize: "14px",
				fontFamily: "inherit",
			},
		},
		// Add additional safety options
		chart: {
			animations: {
				enabled: false, // Disable animations to prevent potential issues
			},
		},
	});

	// Get unique interviewers for filter (based on filtered data)
	const interviewers = Array.from(new Set(filteredInterviews.map((interview) => interview.interviewer).filter(Boolean)));

	// Upcoming interviews in the next 7 days (based on filtered data)
	const upcomingInterviews = filteredInterviews
		.filter((interview) => {
			const interviewDate = new Date(interview.meeting_date || "");
			const nextWeek = new Date();
			nextWeek.setDate(nextWeek.getDate() + 7);
			return interviewDate >= new Date() && interviewDate <= nextWeek;
		})
		.sort((a, b) => new Date(a.meeting_date || "").getTime() - new Date(b.meeting_date || "").getTime())
		.slice(0, 5);

	// Interviews for selected date (based on filtered data)
	const selectedDateInterviews = filteredInterviews.filter((interview) => {
		if (!selectedDate || !interview.meeting_date) return false;
		const interviewDate = new Date(interview.meeting_date);
		return interviewDate.toDateString() === selectedDate.toDateString();
	});

	// Debug: Log selected date interviews
	// Selected date interviews calculated

	// Recent interviews (last 5 based on filtered data)
	const recentInterviews = filteredInterviews.sort((a, b) => new Date(b.meeting_date || "").getTime() - new Date(a.meeting_date || "").getTime()).slice(0, 5);

	// Pagination
	const totalPages = Math.ceil(filteredInterviews.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedInterviews = filteredInterviews.slice(startIndex, startIndex + itemsPerPage);

	const getProgressBadgeVariant = (progress: string) => {
		const progressValue = getProgressDisplay(progress);
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

	const formatDateTime = (dateString: string) => {
		const date = new Date(dateString);
		return {
			date: date.toLocaleDateString(),
			time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
		};
	};

	// Refresh data
	const handleRefresh = async () => {
		if (!user || user.role !== 0 || !access_token) return;

		setLoading(true);
		try {
			// Calculate date range based on current time filter
			const now = new Date();
			const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
			const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

			let startDate: string | undefined;
			let endDate: string | undefined;

			switch (timeFilter) {
				case "today":
					startDate = today.toISOString();
					endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
					break;
				case "week":
					startDate = weekAgo.toISOString();
					endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
					break;
				case "month":
					startDate = monthAgo.toISOString();
					endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
					break;
				default:
					// No date filtering - get all data
					break;
			}

			const response = await interviewService.getInterviewList(access_token, {
				limit: 1000,
				startDate,
				endDate,
			});
			setInterviews(response.interviews);
		} catch (error) {
			console.error("Failed to refresh interviews:", error);
		} finally {
			setLoading(false);
		}
	};

	// Export interviews to Excel based on current time filter
	const handleExportSchedule = () => {
		try {
			// Get the data to export (filtered interviews based on current time filter)
			const dataToExport = filteredInterviews.map((interview) => ({
				Title: interview.meeting_title || "Untitled",
				User: interview.user || "Unknown",
				Interviewer: interview.interviewer || "Not assigned",
				Date: interview.meeting_date ? new Date(interview.meeting_date).toLocaleDateString() : "Not specified",
				Time: interview.meeting_date ? new Date(interview.meeting_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not specified",
				Progress: getProgressDisplay(interview.progress),
				JobDescription: interview.job_description || "No description available",
				Company: interview.job_description ? interview.job_description.split(" at ")[1]?.split(" ")[0] || "N/A" : "N/A",
				Notes: interview.notes || "",
				Feedback: interview.feedback || "",
				Created: interview.created_at ? new Date(interview.created_at).toLocaleDateString() : "Not specified",
			}));

			// Create CSV content
			const headers = Object.keys(dataToExport[0] || {}).join(",");
			const rows = dataToExport.map((row) =>
				Object.values(row)
					.map((value) => `"${value}"`)
					.join(","),
			);
			const csvContent = [headers, ...rows].join("\n");

			// Create and download the file
			const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
			const link = document.createElement("a");
			const url = URL.createObjectURL(blob);
			link.setAttribute("href", url);

			// Generate filename based on time filter
			const timeFilterLabel = timeOptions.find((opt) => opt.value === timeFilter)?.label || timeFilter;
			const currentDate = new Date().toISOString().split("T")[0];
			link.setAttribute("download", `interview-schedule-${timeFilterLabel.toLowerCase().replace(/\s+/g, "-")}-${currentDate}.csv`);

			link.style.visibility = "hidden";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			console.log(`✅ Exported ${dataToExport.length} interviews for ${timeFilterLabel} period`);
		} catch (error) {
			console.error("❌ Failed to export schedule:", error);
			alert("Failed to export schedule. Please try again.");
		}
	};

	// Component state validated

	// Show loading state while user data is being fetched
	if (!user) {
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
							Loading User Data
						</Title>
						<Text className="text-muted-foreground">Please wait while we verify your credentials...</Text>
					</div>
				</ModernCard>
			</m.div>
		);
	}

	// Show access denied for non-admin users
	if (user.role !== 0) {
		return (
			<m.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center h-64">
				<ModernCard className="text-center space-y-6 p-8" gradient>
					<m.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
						<Icon icon="mdi:shield-alert" className="h-16 w-16 text-red-500 mx-auto" />
					</m.div>
					<div>
						<Title as="h3" className="mb-2">
							Access Denied
						</Title>
						<Text className="text-muted-foreground mb-4">You need admin privileges to access this page.</Text>
						<ModernButton onClick={() => router.push("/job-dashboard")} glow>
							Go to Dashboard
						</ModernButton>
					</div>
				</ModernCard>
			</m.div>
		);
	}

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
							Loading Interview Data
						</Title>
						<Text className="text-muted-foreground">Fetching the latest interview information...</Text>
					</div>
				</ModernCard>
			</m.div>
		);
	}

	// Show error state if there's an error
	if (error) {
		return (
			<m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center h-64">
				<ModernCard className="text-center space-y-6 p-8" gradient>
					<m.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
						<Icon icon="mdi:alert-circle" className="h-16 w-16 text-red-500 mx-auto" />
					</m.div>
					<div>
						<Title as="h3" className="mb-2">
							Error Loading Data
						</Title>
						<Text className="text-muted-foreground mb-4">{error}</Text>
						<ModernButton onClick={() => window.location.reload()} glow>
							<Icon icon="mdi:refresh" className="mr-2" />
							Retry
						</ModernButton>
					</div>
				</ModernCard>
			</m.div>
		);
	}

	console.log("AdminInterviews rendering main content");
	return (
		<m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full space-y-8">
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
							className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-blue-600 dark:text-blue-400"
						>
							<Icon icon="mdi:calendar-check" className="h-6 w-6" />
						</m.div>
						<div>
							<Title
								as="h1"
								className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent"
							>
								Interview Management
							</Title>
							<Text className="text-muted-foreground mt-1">Monitor, reschedule, and manage all interview sessions across the platform</Text>
						</div>
					</div>
				</div>
				<m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex items-center gap-3 flex-wrap">
					<Select value={timeFilter} onValueChange={setTimeFilter}>
						<SelectTrigger className="w-40 border-2 hover:border-primary/20 transition-colors">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{timeOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<ModernButton variant="outline" size="sm" onClick={handleExportSchedule} className="gap-2">
						<Icon icon="mdi:download" className="h-4 w-4" />
						Export Schedule
					</ModernButton>
					<ModernButton variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
						<Icon icon="mdi:refresh" className="h-4 w-4" />
						Refresh
					</ModernButton>
				</m.div>
			</m.div>

			{/* Statistics Cards */}
			<m.div
				initial={{ opacity: 0, y: 30 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.3, duration: 0.5 }}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
			>
				<ModernStatsCard
					title="Total Interviews"
					value={stats.total}
					icon={<Icon icon="mdi:calendar-multiple" className="h-6 w-6" />}
					colorScheme="gray"
					change={{
						value: 12,
						type: "increase",
					}}
				/>
				<ModernStatsCard
					title="Scheduled"
					value={stats.scheduled}
					icon={<Icon icon="mdi:calendar-clock" className="h-6 w-6" />}
					colorScheme="blue"
					change={{
						value: Math.round(getPercentage(stats.scheduled || 0, stats.total || 0)),
						type: "increase",
					}}
				/>
				<ModernStatsCard
					title="Completed"
					value={stats.completed}
					icon={<Icon icon="mdi:calendar-check" className="h-6 w-6" />}
					colorScheme="green"
					change={{
						value: Math.round(getPercentage(stats.completed || 0, stats.total || 0)),
						type: "increase",
					}}
				/>
				<ModernStatsCard
					title="Cancelled"
					value={stats.cancelled}
					icon={<Icon icon="mdi:calendar-remove" className="h-6 w-6" />}
					colorScheme="red"
					change={{
						value: Math.round(getPercentage(stats.cancelled || 0, stats.total || 0)),
						type: "decrease",
					}}
				/>
				<ModernStatsCard
					title="Today's Schedule"
					value={stats.today}
					icon={<Icon icon="mdi:calendar-today" className="h-6 w-6" />}
					colorScheme="orange"
					change={{
						value: 8,
						type: "increase",
					}}
				/>
			</m.div>

			{/* Charts and Calendar */}
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Interview Progress</CardTitle>
					</CardHeader>
					<CardContent>
						{loading ? (
							<div className="flex items-center justify-center h-48">
								<div className="text-center space-y-3">
									<Icon icon="mdi:loading" className="h-12 w-12 text-blue-500 mx-auto animate-spin" />
									<Text className="text-gray-500">Loading...</Text>
								</div>
							</div>
						) : (
							(() => {
								try {
									if (stats.total > 0 && chartSeries.some((val) => val > 0)) {
										return (
											<Chart
												type="donut"
												series={chartSeries}
												options={{
													labels: ["Scheduled", "Completed", "Cancelled"],
													colors: ["#3b82f6", "#10b981", "#ef4444"],
												}}
												height={200}
											/>
										);
									}
									return (
										<div className="flex items-center justify-center h-48">
											<div className="text-center space-y-3">
												<Icon icon="mdi:chart-donut" className="h-12 w-12 text-gray-300 mx-auto" />
												<Text className="text-gray-500">No data to display</Text>
											</div>
										</div>
									);
								} catch (error) {
									console.error("Chart rendering error:", error);
									return (
										<div className="flex items-center justify-center h-48">
											<div className="text-center space-y-3">
												<Icon icon="mdi:alert-circle" className="h-12 w-12 text-red-300 mx-auto" />
												<Text className="text-red-500">Error loading chart</Text>
											</div>
										</div>
									);
								}
							})()
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Calendar View</CardTitle>
					</CardHeader>
					<CardContent>
						<Calendar
							mode="single"
							selected={selectedDate}
							onSelect={setSelectedDate}
							className="rounded-md border"
							modifiers={{
								hasInterview: interviews.filter((interview) => interview.meeting_date).map((interview) => new Date(interview.meeting_date || "")),
							}}
							modifiersStyles={{
								hasInterview: {
									backgroundColor: "#3b82f6",
									color: "white",
									fontWeight: "bold",
								},
							}}
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Upcoming This Week</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{upcomingInterviews.map((interview) => {
								const { date, time } = formatDateTime(interview.meeting_date || "");
								return (
									<div key={interview.id} className="flex items-center justify-between p-2 border rounded">
										<div className="space-y-1">
											<div className="font-medium text-xs">{interview.meeting_title}</div>
											<div className="text-xs text-muted-foreground">{interview.userInfo?.email}</div>
											<div className="text-xs font-medium">
												{date} {time}
											</div>
										</div>
										<Badge variant={getProgressBadgeVariant(String(interview.progress || ""))} className="text-xs">
											{getProgressDisplay(interview.progress)}
										</Badge>
									</div>
								);
							})}
							{upcomingInterviews.length === 0 && <Text className="text-center text-muted-foreground py-4 text-sm">No upcoming interviews this week</Text>}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Top Interviewers</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{Object.entries(
								interviews.reduce(
									(acc, interview) => {
										const interviewer = interview.interviewer || "Unknown";
										acc[interviewer] = (acc[interviewer] || 0) + 1;
										return acc;
									},
									{} as Record<string, number>,
								),
							)
								.sort(([, a], [, b]) => b - a)
								.slice(0, 5)
								.map(([interviewer, count], index) => (
									<div key={interviewer} className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">{index + 1}</div>
											<span className="font-medium text-sm">{interviewer}</span>
										</div>
										<Badge variant="secondary" className="text-xs">
											{count}
										</Badge>
									</div>
								))}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Selected Date Interviews */}
			{selectedDate && selectedDateInterviews.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Interviews on {selectedDate.toLocaleDateString()}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{selectedDateInterviews.map((interview) => {
								const { time } = formatDateTime(interview.meeting_date || "");
								return (
									<div key={interview.id} className="p-4 border rounded-lg">
										<div className="space-y-2">
											<div className="font-medium">{interview.meeting_title}</div>
											<div className="text-sm text-muted-foreground">
												{interview.userInfo?.email} • {interview.interviewer}
											</div>
											<div className="text-sm font-medium">{time}</div>
											<div className="flex items-center justify-between">
												<Badge variant={getProgressBadgeVariant(String(interview.progress || ""))}>{getProgressDisplay(interview.progress)}</Badge>
												<div className="flex items-center gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() => {
															setSelectedInterview(interview);
															setShowDetailsDialog(true);
														}}
														title="View Details"
													>
														<Icon icon="mdi:eye" className="h-4 w-4" />
													</Button>
													{interview.meeting_link && (
														<Button
															variant="outline"
															size="sm"
															onClick={() => window.open(interview.meeting_link, "_blank", "noopener,noreferrer")}
															title="Join Meeting"
														>
															<Icon icon="mdi:video" className="h-4 w-4" />
														</Button>
													)}
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Interviews Table */}
			<m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}>
				<ModernCard className="overflow-hidden">
					<div className="p-6 border-b border-gray-100 dark:border-gray-800">
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
							<div>
								<Title as="h3" className="text-xl font-semibold">
									All Interviews
								</Title>
								<Text className="text-muted-foreground text-sm mt-1">{filteredInterviews.length} total interviews</Text>
							</div>
							<div className="flex items-center gap-3 flex-wrap">
								<Input
									placeholder="Search by title, user, or interviewer..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-64 border-2 hover:border-primary/20 transition-colors"
								/>
								<Select value={progressFilter} onValueChange={setProgressFilter}>
									<SelectTrigger className="w-40 border-2 hover:border-primary/20 transition-colors">
										<SelectValue placeholder="Progress" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Progress</SelectItem>
										<SelectItem value="scheduled">Scheduled</SelectItem>
										<SelectItem value="completed">Completed</SelectItem>
										<SelectItem value="cancelled">Cancelled</SelectItem>
									</SelectContent>
								</Select>
								<Select value={interviewerFilter} onValueChange={setInterviewerFilter}>
									<SelectTrigger className="w-40 border-2 hover:border-primary/20 transition-colors">
										<SelectValue placeholder="Interviewer" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Interviewers</SelectItem>
										{interviewers.slice(0, 10).map((interviewer) => (
											<SelectItem key={interviewer} value={interviewer || ""}>
												{interviewer}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
					<div className="overflow-x-auto">
						<ModernTable>
							<ModernTableHeader>
								<ModernTableRow>
									<ModernTableHead>Title</ModernTableHead>
									<ModernTableHead>User</ModernTableHead>
									<ModernTableHead>Interviewer</ModernTableHead>
									<ModernTableHead>Date & Time</ModernTableHead>
									<ModernTableHead>Progress</ModernTableHead>
									<ModernTableHead>Actions</ModernTableHead>
								</ModernTableRow>
							</ModernTableHeader>
							<ModernTableBody>
								{paginatedInterviews.length > 0 ? (
									paginatedInterviews.map((interview, index) => {
										const { date, time } = formatDateTime(interview.meeting_date || "");
										return (
											<m.tr
												key={interview.id}
												initial={{ opacity: 0, x: -20 }}
												animate={{ opacity: 1, x: 0 }}
												transition={{ delay: index * 0.05 }}
												className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
											>
												<ModernTableCell>
													<div className="font-semibold text-gray-900 dark:text-white">{interview.meeting_title}</div>
												</ModernTableCell>
												<ModernTableCell>
													<div className="flex items-center gap-2">
														<div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
															{(interview.userInfo?.email || "U")[0].toUpperCase()}
														</div>
														<div className="font-medium">{interview.userInfo?.email || "Unknown User"}</div>
													</div>
												</ModernTableCell>
												<ModernTableCell>
													<div className="flex items-center gap-2">
														<div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white text-sm font-medium">
															{(interview.interviewer || "I")[0].toUpperCase()}
														</div>
														<div className="font-medium">{interview.interviewer}</div>
													</div>
												</ModernTableCell>
												<ModernTableCell>
													<div className="space-y-1">
														<div className="font-semibold text-gray-900 dark:text-white">{date}</div>
														<div className="text-sm text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{time}</div>
													</div>
												</ModernTableCell>
												<ModernTableCell>
													<Badge variant={getProgressBadgeVariant(String(interview.progress || ""))} className="font-medium">
														{getProgressDisplay(interview.progress)}
													</Badge>
												</ModernTableCell>
												<ModernTableCell>
													<div className="flex items-center gap-1">
														<ModernButton
															variant="ghost"
															size="sm"
															className="h-8 w-8 p-0"
															title="View Details"
															onClick={() => {
																setSelectedInterview(interview);
																setShowDetailsDialog(true);
															}}
														>
															<Icon icon="mdi:eye" className="h-4 w-4" />
														</ModernButton>
														<ModernButton
															variant="ghost"
															size="sm"
															className="h-8 w-8 p-0"
															title="Edit Interview"
															onClick={() => {
																setSelectedInterview(interview);
																setShowEditDialog(true);
															}}
														>
															<Icon icon="mdi:pencil" className="h-4 w-4" />
														</ModernButton>
														{interview.meeting_link && (
															<ModernButton
																variant="ghost"
																size="sm"
																className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
																title="Join Meeting"
																onClick={() => window.open(interview.meeting_link, "_blank", "noopener,noreferrer")}
															>
																<Icon icon="mdi:video" className="h-4 w-4" />
															</ModernButton>
														)}
														<ModernButton
															variant="ghost"
															size="sm"
															className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
															title="Send Reminder"
														>
															<Icon icon="mdi:bell" className="h-4 w-4" />
														</ModernButton>
														<ModernButton
															variant="ghost"
															size="sm"
															className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
															title="Reschedule"
														>
															<Icon icon="mdi:calendar-edit" className="h-4 w-4" />
														</ModernButton>
														<ModernButton
															variant="ghost"
															size="sm"
															className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
															title="Cancel Interview"
														>
															<Icon icon="mdi:calendar-remove" className="h-4 w-4" />
														</ModernButton>
													</div>
												</ModernTableCell>
											</m.tr>
										);
									})
								) : (
									<ModernTableRow>
										<ModernTableCell colSpan={6} className="text-center py-12">
											<div className="space-y-3">
												<Icon icon="mdi:calendar-blank" className="h-12 w-12 text-gray-300 mx-auto" />
												<Text className="text-gray-500 font-medium">No interviews found</Text>
												<Text className="text-sm text-gray-400">Try adjusting your filters or time range</Text>
											</div>
										</ModernTableCell>
									</ModernTableRow>
								)}
							</ModernTableBody>
						</ModernTable>
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<m.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.8 }}
							className="flex items-center justify-between p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50"
						>
							<Text className="text-sm text-muted-foreground">
								Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredInterviews.length)} of {filteredInterviews.length} results
							</Text>
							<div className="flex items-center gap-2">
								<ModernButton
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
									disabled={currentPage === 1}
									className="gap-2"
								>
									<Icon icon="mdi:chevron-left" className="h-4 w-4" />
									Previous
								</ModernButton>
								<span className="text-sm font-medium px-3 py-1 rounded bg-primary/10 text-primary">
									Page {currentPage} of {totalPages}
								</span>
								<ModernButton
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
									disabled={currentPage === totalPages}
									className="gap-2"
								>
									Next
									<Icon icon="mdi:chevron-right" className="h-4 w-4" />
								</ModernButton>
							</div>
						</m.div>
					)}
				</ModernCard>
			</m.div>

			{/* Interview Details Dialog */}
			<InterviewDetailsDialog
				interview={selectedInterview}
				show={showDetailsDialog}
				onClose={() => {
					setShowDetailsDialog(false);
					setSelectedInterview(null);
				}}
				accessToken={access_token}
			/>

			{/* Edit Interview Dialog */}
			<EditInterviewDialog
				interview={selectedInterview}
				show={showEditDialog}
				onClose={() => {
					setShowEditDialog(false);
					setSelectedInterview(null);
				}}
				onSuccess={() => {
					// Refresh the interviews list
					const fetchInterviews = async () => {
						if (!user || user.role !== 0 || !access_token) return;

						setLoading(true);
						try {
							const now = new Date();
							const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

							let startDate: string | undefined;
							let endDate: string | undefined;

							if (timeFilter === "today") {
								startDate = today.toISOString();
								const endOfToday = new Date(today);
								endOfToday.setHours(23, 59, 59, 999);
								endDate = endOfToday.toISOString();
							}

							const result = await interviewService.getInterviewList(access_token, {
								startDate,
								endDate,
								page: 1,
								limit: 1000,
							});

							setInterviews(result.interviews);
						} catch (error) {
							console.error("Error fetching interviews:", error);
							setError("Failed to fetch interviews");
						} finally {
							setLoading(false);
						}
					};

					fetchInterviews();
				}}
			/>
		</m.div>
	);
}
