import interviewService from "@/api/services/interviewService";
import { useAuth } from "@/components/auth/use-auth";
import { Chart } from "@/components/chart/chart";
import { useChart } from "@/components/chart/useChart";
import Icon from "@/components/icon/icon";
import type { InterviewInfo } from "@/types/entity";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Calendar } from "@/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Text, Title } from "@/ui/typography";
import { cn } from "@/utils";
import { useEffect, useState } from "react";

interface InterviewsManagementProps {
	timeFilter: string;
}

export default function InterviewsManagement({ timeFilter }: InterviewsManagementProps) {
	const { user, access_token } = useAuth();
	const [interviews, setInterviews] = useState<InterviewInfo[]>([]);
	const [filteredInterviews, setFilteredInterviews] = useState<InterviewInfo[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [progressFilter, setProgressFilter] = useState("all");
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
	const itemsPerPage = 10;

	// Fetch interviews data
	useEffect(() => {
		const fetchInterviews = async () => {
			if (!user || !access_token) return;

			setLoading(true);
			try {
				const response = await interviewService.getInterviewList(access_token, {
					limit: 1000, // Get all for admin overview
				});
				setInterviews(response.interviews);
				setFilteredInterviews(response.interviews);
			} catch (error) {
				console.error("Failed to fetch interviews:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchInterviews();
	}, [user, access_token]);

	// Filter interviews based on search, progress, and time
	useEffect(() => {
		let filtered = interviews;

		// Apply search filter
		if (searchTerm) {
			filtered = filtered.filter(
				(interview) =>
					interview.meeting_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					interview.interviewer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					(interview as any).userInfo?.email?.toLowerCase().includes(searchTerm.toLowerCase()),
			);
		}

		// Apply progress filter
		if (progressFilter !== "all") {
			filtered = filtered.filter((interview) => interview.progress === (progressFilter as any));
		}

		// Apply time filter
		if (timeFilter !== "all") {
			const now = new Date();
			const filterDate = new Date();

			switch (timeFilter) {
				case "today":
					filterDate.setHours(0, 0, 0, 0);
					break;
				case "week":
					filterDate.setDate(now.getDate() - 7);
					break;
				case "month":
					filterDate.setMonth(now.getMonth() - 1);
					break;
			}

			if (timeFilter !== "all") {
				filtered = filtered.filter((interview) => new Date(interview.meeting_date || "") >= filterDate);
			}
		}

		setFilteredInterviews(filtered);
		setCurrentPage(1);
	}, [interviews, searchTerm, progressFilter, timeFilter]);

	// Calculate statistics
	const stats = {
		total: filteredInterviews.length,
		scheduled: filteredInterviews.filter((interview) => interview.progress === ("scheduled" as any)).length,
		completed: filteredInterviews.filter((interview) => interview.progress === ("completed" as any)).length,
		cancelled: filteredInterviews.filter((interview) => interview.progress === ("cancelled" as any)).length,
		today: filteredInterviews.filter((interview) => {
			const today = new Date();
			const interviewDate = new Date(interview.meeting_date || "");
			return interviewDate.toDateString() === today.toDateString();
		}).length,
	};

	// Chart data for progress distribution
	const progressChart = useChart({
		series: [stats.scheduled, stats.completed, stats.cancelled],
		labels: ["Scheduled", "Completed", "Cancelled"],
		colors: ["#3b82f6", "#10b981", "#ef4444"],
	});

	// Upcoming interviews in the next 7 days
	const upcomingInterviews = filteredInterviews
		.filter((interview) => {
			const interviewDate = new Date(interview.meeting_date || "");
			const nextWeek = new Date();
			nextWeek.setDate(nextWeek.getDate() + 7);
			return interviewDate >= new Date() && interviewDate <= nextWeek;
		})
		.sort((a, b) => new Date(a.meeting_date || "").getTime() - new Date(b.meeting_date || "").getTime());

	// Interviews for selected date
	const selectedDateInterviews = filteredInterviews.filter((interview) => {
		if (!selectedDate || !interview.meeting_date) return false;
		const interviewDate = new Date(interview.meeting_date);
		return interviewDate.toDateString() === selectedDate.toDateString();
	});

	// Pagination
	const totalPages = Math.ceil(filteredInterviews.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedInterviews = filteredInterviews.slice(startIndex, startIndex + itemsPerPage);

	const getProgressBadgeVariant = (progress: string) => {
		switch (progress) {
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

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Statistics Cards */}
			<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.total}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Scheduled</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Completed</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">{stats.completed}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Cancelled</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Today</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-amber-600">{stats.today}</div>
					</CardContent>
				</Card>
			</div>

			{/* Charts and Calendar */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Interview Progress</CardTitle>
					</CardHeader>
					<CardContent>
						<Chart type="donut" series={progressChart.series || []} height={250} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Interview Calendar</CardTitle>
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
							{upcomingInterviews.slice(0, 5).map((interview) => {
								const { date, time } = formatDateTime(interview.meeting_date || "");
								return (
									<div key={interview.id} className="flex items-center justify-between p-3 border rounded-lg">
										<div className="space-y-1">
											<div className="font-medium text-sm">{interview.meeting_title}</div>
											<div className="text-xs text-muted-foreground">{(interview as any).userInfo?.email}</div>
											<div className="text-xs font-medium">
												{date} at {time}
											</div>
										</div>
										<Badge variant={getProgressBadgeVariant(String(interview.progress || ""))}>{interview.progress}</Badge>
									</div>
								);
							})}
							{upcomingInterviews.length === 0 && <Text className="text-center text-muted-foreground py-4 text-sm">No upcoming interviews this week</Text>}
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
						<div className="space-y-3">
							{selectedDateInterviews.map((interview) => {
								const { time } = formatDateTime(interview.meeting_date || "");
								return (
									<div key={interview.id} className="flex items-center justify-between p-4 border rounded-lg">
										<div className="space-y-1">
											<div className="font-medium">{interview.meeting_title}</div>
											<div className="text-sm text-muted-foreground">
												{(interview as any).userInfo?.email} • {interview.interviewer}
											</div>
											<div className="text-sm font-medium">{time}</div>
										</div>
										<div className="flex items-center gap-3">
											<Badge variant={getProgressBadgeVariant(interview.progress || ("" as any))}>{interview.progress}</Badge>
											{interview.meeting_link && (
												<Button variant="outline" size="sm" asChild>
													<a href={interview.meeting_link} target="_blank" rel="noopener noreferrer">
														<Icon icon="mdi:video" className="mr-2 h-4 w-4" />
														Join
													</a>
												</Button>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			)}

			{/* All Interviews Table */}
			<Card>
				<CardHeader>
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
						<CardTitle>All Interviews</CardTitle>
						<div className="flex items-center gap-3">
							<Input
								placeholder="Search by title, user, or interviewer..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-64"
							/>
							<Select value={progressFilter} onValueChange={setProgressFilter}>
								<SelectTrigger className="w-40">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Progress</SelectItem>
									<SelectItem value="scheduled">Scheduled</SelectItem>
									<SelectItem value="completed">Completed</SelectItem>
									<SelectItem value="cancelled">Cancelled</SelectItem>
								</SelectContent>
							</Select>
							<Button variant="outline" size="sm">
								<Icon icon="mdi:download" className="mr-2" />
								Export
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Title</TableHead>
									<TableHead>User</TableHead>
									<TableHead>Interviewer</TableHead>
									<TableHead>Date & Time</TableHead>
									<TableHead>Progress</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{paginatedInterviews.map((interview) => {
									const { date, time } = formatDateTime(interview.meeting_date || "");
									return (
										<TableRow key={interview.id}>
											<TableCell>
												<div className="font-medium">{interview.meeting_title}</div>
											</TableCell>
											<TableCell>
												<div className="font-medium">{(interview as any).userInfo?.email || "Unknown User"}</div>
											</TableCell>
											<TableCell>
												<div className="font-medium">{interview.interviewer}</div>
											</TableCell>
											<TableCell>
												<div className="space-y-1">
													<div className="font-medium">{date}</div>
													<div className="text-sm text-muted-foreground">{time}</div>
												</div>
											</TableCell>
											<TableCell>
												<Badge variant={getProgressBadgeVariant(interview.progress || ("" as any))}>{interview.progress}</Badge>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<Button variant="ghost" size="sm">
														<Icon icon="mdi:eye" className="h-4 w-4" />
													</Button>
													<Button variant="ghost" size="sm">
														<Icon icon="mdi:edit" className="h-4 w-4" />
													</Button>
													{interview.meeting_link && (
														<Button variant="ghost" size="sm" asChild>
															<a href={interview.meeting_link} target="_blank" rel="noopener noreferrer">
																<Icon icon="mdi:video" className="h-4 w-4" />
															</a>
														</Button>
													)}
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between pt-4">
							<Text className="text-sm text-muted-foreground">
								Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredInterviews.length)} of {filteredInterviews.length} results
							</Text>
							<div className="flex items-center gap-2">
								<Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
									Previous
								</Button>
								<span className="text-sm">
									Page {currentPage} of {totalPages}
								</span>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
									disabled={currentPage === totalPages}
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
