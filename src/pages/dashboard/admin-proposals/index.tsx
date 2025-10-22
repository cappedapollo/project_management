import { useAuth } from "@/components/auth/use-auth";
import { Chart } from "@/components/chart/chart";
import { useChart } from "@/components/chart/useChart";
import Icon from "@/components/icon/icon";
import { useRouter } from "@/routes/hooks";
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
import { cn } from "@/utils";
import { m } from "motion/react";
import { useCallback, useEffect, useState } from "react";

// Import services
import proposalService from "@/api/services/proposalService";
import type { ProposalInfo } from "@/types/entity";
import ApplicationDetailsDialog from "./application-details-dialog";

// Time filter options
const timeOptions = [
	{ label: "Today", value: "today" },
	{ label: "This Week", value: "week" },
	{ label: "This Month", value: "month" },
	{ label: "All Time", value: "all" },
];

export default function AdminProposals() {
	const { user } = useAuth();
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [companyFilter, setCompanyFilter] = useState("all");
	const [timeFilter, setTimeFilter] = useState("today"); // Default to today
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 15;

	// Data states
	const [applications, setApplications] = useState<ProposalInfo[]>([]);
	const [filteredApplications, setFilteredApplications] = useState<ProposalInfo[]>([]);

	// Dialog states
	const [selectedApplication, setSelectedApplication] = useState<ProposalInfo | null>(null);
	const [showDetailsDialog, setShowDetailsDialog] = useState(false);

	// Action handlers
	const handleViewApplication = (application: ProposalInfo) => {
		// Open application details dialog
		console.log("View application:", application.id);
		setSelectedApplication(application);
		setShowDetailsDialog(true);
	};

	const handleEditApplication = (application: ProposalInfo) => {
		// Open edit modal or navigate to edit page
		console.log("Edit application:", application.id);
		// TODO: Implement edit functionality - could open a modal or navigate to edit page
		alert(`Editing application for ${application.company} by ${application.user}`);
	};

	const handleSendMessage = (application: ProposalInfo) => {
		// Open message modal or navigate to messaging page
		console.log("Send message for application:", application.id);
		// TODO: Implement messaging functionality
		alert(`Sending message to ${application.user} about ${application.company} application`);
	};

	const handleDeleteApplication = async (application: ProposalInfo) => {
		// Confirm deletion and delete the application
		if (confirm(`Are you sure you want to delete the application for ${application.company} by ${application.user}?`)) {
			try {
				console.log("Deleting application:", application.id);
				if (application.id) {
					await proposalService.deleteProposal({ proposalId: application.id });
					alert(`Application for ${application.company} deleted successfully`);
					// Refresh the applications list by refetching data
					fetchApplications();
				} else {
					alert("Cannot delete application: No ID found");
				}
			} catch (error) {
				console.error("Failed to delete application:", error);
				alert("Failed to delete application. Please try again.");
			}
		}
	};

	// Function to refetch applications data
	const fetchApplications = useCallback(async () => {
		if (!user || user.role !== 0) return;

		setLoading(true);
		try {
			// Calculate date range based on time filter
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

			const response = await proposalService.getProposalList({
				limit: 1000,
				startDate,
				endDate,
			});
			setApplications(response.proposals);
			setFilteredApplications(response.proposals);
		} catch (error) {
			console.error("Failed to fetch applications:", error);
		} finally {
			setLoading(false);
		}
	}, [user, timeFilter]);

	// Check if user is admin
	useEffect(() => {
		if (user && user.role !== 0) {
			router.replace("/job-dashboard");
			return;
		}
	}, [user, router]);

	// Fetch applications data based on time filter
	useEffect(() => {
		fetchApplications();
	}, [fetchApplications]);

	// Filter applications based on search and other filters
	useEffect(() => {
		let filtered = applications;

		// Apply search filter
		if (searchTerm) {
			filtered = filtered.filter(
				(application) =>
					application.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					application.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					application.job_description?.toLowerCase().includes(searchTerm.toLowerCase()),
			);
		}

		// Apply status filter
		if (statusFilter !== "all") {
			filtered = filtered.filter((application) => application.status === statusFilter);
		}

		// Apply company filter
		if (companyFilter !== "all") {
			filtered = filtered.filter((application) => application.company === companyFilter);
		}

		setFilteredApplications(filtered);
		setCurrentPage(1);
	}, [applications, searchTerm, statusFilter, companyFilter]);

	// Calculate statistics
	const stats = {
		total: filteredApplications.length,
		applied: filteredApplications.filter((app) => app.status === "applied").length,
		interviewing: filteredApplications.filter((app) => app.status === "interviewing").length,
		offered: filteredApplications.filter((app) => app.status === "offered").length,
		rejected: filteredApplications.filter((app) => app.status === "rejected").length,
	};

	// Calculate percentages safely
	const getPercentage = (value: number, total: number) => {
		return total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
	};

	// Chart data for status distribution
	const statusChart = useChart({
		series: [stats.applied, stats.interviewing, stats.offered, stats.rejected],
		labels: ["Applied", "Interviewing", "Offered", "Rejected"],
		colors: ["#3b82f6", "#f59e0b", "#10b981", "#ef4444"],
		plotOptions: {
			pie: {
				donut: {
					size: "70%",
				},
			},
		},
	});

	// Get unique companies for filter
	const companies = Array.from(new Set(filteredApplications.map((app) => app.company).filter(Boolean)));

	// Recent applications (last 5)
	const recentApplications = filteredApplications.sort((a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()).slice(0, 5);

	// Top companies by application count
	const topCompanies = Object.entries(
		applications.reduce(
			(acc, application) => {
				const company = application.company || "Unknown";
				acc[company] = (acc[company] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		),
	)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 5);

	// Pagination
	const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedApplications = filteredApplications.slice(startIndex, startIndex + itemsPerPage);

	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
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

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	// Refresh data
	const handleRefresh = async () => {
		if (!user || user.role !== 0) return;

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

			const response = await proposalService.getProposalList({
				limit: 1000,
				startDate,
				endDate,
			});
			setApplications(response.proposals);
		} catch (error) {
			console.error("Failed to refresh applications:", error);
		} finally {
			setLoading(false);
		}
	};

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
							Loading Application Data
						</Title>
						<Text className="text-muted-foreground">Fetching the latest application information...</Text>
					</div>
				</ModernCard>
			</m.div>
		);
	}

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
							className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-blue-500/10 text-green-600 dark:text-green-400"
						>
							<Icon icon="mdi:file-document-multiple" className="h-6 w-6" />
						</m.div>
						<div>
							<Title
								as="h1"
								className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent"
							>
								Proposal Management
							</Title>
							<Text className="text-muted-foreground mt-1">Monitor, update, and manage all user applications across the platform</Text>
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
					<ModernButton variant="outline" size="sm" className="gap-2">
						<Icon icon="mdi:download" className="h-4 w-4" />
						Export Data
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
					title="Total Applications"
					value={stats.total}
					icon={<Icon icon="mdi:file-document-multiple" className="h-6 w-6" />}
					colorScheme="gray"
					change={{
						value: 15,
						type: "increase",
					}}
				/>
				<ModernStatsCard
					title="Applied"
					value={stats.applied}
					icon={<Icon icon="mdi:file-send" className="h-6 w-6" />}
					colorScheme="blue"
					change={{
						value: Math.round(Number(getPercentage(stats.applied, stats.total))),
						type: "increase",
					}}
				/>
				<ModernStatsCard
					title="Interviewing"
					value={stats.interviewing}
					icon={<Icon icon="mdi:calendar-clock" className="h-6 w-6" />}
					colorScheme="orange"
					change={{
						value: Math.round(Number(getPercentage(stats.interviewing, stats.total))),
						type: "increase",
					}}
				/>
				<ModernStatsCard
					title="Offered"
					value={stats.offered}
					icon={<Icon icon="mdi:handshake" className="h-6 w-6" />}
					colorScheme="green"
					change={{
						value: Math.round(Number(getPercentage(stats.offered, stats.total))),
						type: "increase",
					}}
				/>
				<ModernStatsCard
					title="Rejected"
					value={stats.rejected}
					icon={<Icon icon="mdi:close-circle" className="h-6 w-6" />}
					colorScheme="red"
					change={{
						value: Math.round(Number(getPercentage(stats.rejected, stats.total))),
						type: "decrease",
					}}
				/>
			</m.div>

			{/* Charts and Analytics */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Status Distribution Chart */}
				<ModernCard>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Icon icon="mdi:pie-chart" className="h-5 w-5 text-blue-600" />
							Status Distribution
						</CardTitle>
					</CardHeader>
					<CardContent>
						{stats.total > 0 ? (
							<Chart type="donut" series={statusChart.series} options={statusChart} height={250} />
						) : (
							<div className="flex items-center justify-center h-48">
								<div className="text-center space-y-3">
									<Icon icon="mdi:chart-donut" className="h-12 w-12 text-gray-300 mx-auto" />
									<Text className="text-gray-500">No data to display</Text>
								</div>
							</div>
						)}
					</CardContent>
				</ModernCard>

				{/* Top Companies */}
				<ModernCard>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Icon icon="mdi:office-building" className="h-5 w-5 text-purple-600" />
							Top Companies
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{topCompanies.length > 0 ? (
								topCompanies.map(([company, count], index) => (
									<div key={company} className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">{index + 1}</div>
											<span className="font-medium text-sm">{company}</span>
										</div>
										<Badge variant="secondary" className="text-xs">
											{count}
										</Badge>
									</div>
								))
							) : (
								<div className="text-center space-y-3 py-8">
									<Icon icon="mdi:office-building-outline" className="h-12 w-12 text-gray-300 mx-auto" />
									<Text className="text-gray-500">No company data available</Text>
								</div>
							)}
						</div>
					</CardContent>
				</ModernCard>

				{/* Recent Applications */}
				<ModernCard>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Icon icon="mdi:clock-outline" className="h-5 w-5 text-orange-600" />
							Recent Applications
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{recentApplications.length > 0 ? (
								recentApplications.map((application) => (
									<div key={application.id} className="flex items-center justify-between p-2 border rounded">
										<div className="space-y-1">
											<div className="font-medium text-xs">{application.company}</div>
											<div className="text-xs text-muted-foreground">{application.user}</div>
											<div className="text-xs font-medium">{formatDate(application.created_at || "")}</div>
										</div>
										<Badge variant={getStatusBadgeVariant(application.status || "")} className="text-xs">
											{application.status}
										</Badge>
									</div>
								))
							) : (
								<div className="text-center space-y-3 py-8">
									<Icon icon="mdi:file-document-outline" className="h-12 w-12 text-gray-300 mx-auto" />
									<Text className="text-gray-500">No recent applications</Text>
								</div>
							)}
						</div>
					</CardContent>
				</ModernCard>
			</div>

			{/* Applications Table */}
			<m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}>
				<ModernCard className="overflow-hidden">
					<div className="p-6 border-b border-gray-100 dark:border-gray-800">
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
							<div>
								<Title as="h3" className="text-xl font-semibold">
									All Applications
								</Title>
								<Text className="text-muted-foreground text-sm mt-1">{filteredApplications.length} total applications</Text>
							</div>
							<div className="flex items-center gap-3 flex-wrap">
								<Input
									placeholder="Search by company, user, or description..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-64 border-2 hover:border-primary/20 transition-colors"
								/>
								<Select value={statusFilter} onValueChange={setStatusFilter}>
									<SelectTrigger className="w-40 border-2 hover:border-primary/20 transition-colors">
										<SelectValue placeholder="Status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Status</SelectItem>
										<SelectItem value="applied">Applied</SelectItem>
										<SelectItem value="interviewing">Interviewing</SelectItem>
										<SelectItem value="offered">Offered</SelectItem>
										<SelectItem value="rejected">Rejected</SelectItem>
									</SelectContent>
								</Select>
								<Select value={companyFilter} onValueChange={setCompanyFilter}>
									<SelectTrigger className="w-40 border-2 hover:border-primary/20 transition-colors">
										<SelectValue placeholder="Company" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Companies</SelectItem>
										{companies.slice(0, 10).map((company) => (
											<SelectItem key={company} value={company || ""}>
												{company}
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
									<ModernTableHead>User</ModernTableHead>
									<ModernTableHead>Company</ModernTableHead>
									<ModernTableHead>Applied Date</ModernTableHead>
									<ModernTableHead>Status</ModernTableHead>
									<ModernTableHead>Actions</ModernTableHead>
								</ModernTableRow>
							</ModernTableHeader>
							<ModernTableBody>
								{paginatedApplications.length > 0 ? (
									paginatedApplications.map((application, index) => (
										<m.tr
											key={application.id}
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: index * 0.05 }}
											className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
										>
											<ModernTableCell>
												<div className="flex items-center gap-2">
													<div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
														{(application.user || "U")[0].toUpperCase()}
													</div>
													<div className="font-medium">{application.user || "Unknown User"}</div>
												</div>
											</ModernTableCell>
											<ModernTableCell>
												<div className="font-semibold text-gray-900 dark:text-white">{application.company}</div>
											</ModernTableCell>
											<ModernTableCell>
												<div className="space-y-1">
													<div className="font-semibold text-gray-900 dark:text-white">{formatDate(application.created_at || "")}</div>
													<div className="text-sm text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
														{application.job_description ? `${application.job_description.substring(0, 30)}...` : "No description"}
													</div>
												</div>
											</ModernTableCell>
											<ModernTableCell>
												<Badge variant={getStatusBadgeVariant(application.status || "")} className="font-medium">
													{application.status}
												</Badge>
											</ModernTableCell>
											<ModernTableCell>
												<div className="flex items-center gap-1">
													<ModernButton
														variant="ghost"
														size="sm"
														className="h-8 w-8 p-0"
														title="View Details"
														onClick={() => handleViewApplication(application)}
													>
														<Icon icon="mdi:eye" className="h-4 w-4" />
													</ModernButton>
													<ModernButton
														variant="ghost"
														size="sm"
														className="h-8 w-8 p-0"
														title="Update Status"
														onClick={() => handleEditApplication(application)}
													>
														<Icon icon="mdi:pencil" className="h-4 w-4" />
													</ModernButton>
													<ModernButton
														variant="ghost"
														size="sm"
														className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
														title="Send Message"
														onClick={() => handleSendMessage(application)}
													>
														<Icon icon="mdi:message" className="h-4 w-4" />
													</ModernButton>
													<ModernButton
														variant="ghost"
														size="sm"
														className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
														title="Delete Application"
														onClick={() => handleDeleteApplication(application)}
													>
														<Icon icon="mdi:delete" className="h-4 w-4" />
													</ModernButton>
												</div>
											</ModernTableCell>
										</m.tr>
									))
								) : (
									<ModernTableRow>
										<ModernTableCell colSpan={5} className="text-center py-12">
											<div className="space-y-3">
												<Icon icon="mdi:file-document-outline" className="h-12 w-12 text-gray-300 mx-auto" />
												<Text className="text-gray-500 font-medium">No applications found</Text>
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
								Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredApplications.length)} of {filteredApplications.length} results
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

			{/* Application Details Dialog */}
			<ApplicationDetailsDialog
				application={selectedApplication}
				show={showDetailsDialog}
				onClose={() => {
					setShowDetailsDialog(false);
					setSelectedApplication(null);
				}}
			/>
		</m.div>
	);
}
