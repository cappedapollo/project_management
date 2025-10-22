import { useAuth } from "@/components/auth/use-auth";
import { Chart } from "@/components/chart/chart";
// import { useChart } from "@/components/chart/useChart"; // Not needed for direct chart config
import Icon from "@/components/icon/icon";
import { useRouter } from "@/routes/hooks";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Progress } from "@/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Text, Title } from "@/ui/typography";
import { cn } from "@/utils";
import { useEffect, useState } from "react";

// Import services
import dashboardService, { type DashboardStats } from "@/api/services/dashboardService";
import interviewService from "@/api/services/interviewService";
import proposalService from "@/api/services/proposalService";
import userService from "@/api/services/userService";
import type { InterviewInfo, ProposalInfo, UserInfo } from "@/types/entity";

// Import components
import AnalyticsGraphs from "./components/AnalyticsGraphs";

// Time filter options
const timeOptions = [
	{ label: "Today", value: "today" },
	{ label: "This Week", value: "week" },
	{ label: "This Month", value: "month" },
	{ label: "All Time", value: "all" },
];

export default function AdminDashboard() {
	const { user, access_token } = useAuth();
	const router = useRouter();
	const [timeFilter, setTimeFilter] = useState("week");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Data states
	const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
	const [allApplications, setAllApplications] = useState<ProposalInfo[]>([]);
	const [allInterviews, setAllInterviews] = useState<InterviewInfo[]>([]);
	const [allUsers, setAllUsers] = useState<UserInfo[]>([]);

	// Check if user is admin
	useEffect(() => {
		if (user && user.role !== 0) {
			router.replace("/job-dashboard");
			return;
		}
	}, [user, router]);

	// Fetch all admin data
	useEffect(() => {
		const fetchAdminData = async () => {
			if (!user || user.role !== 0 || !access_token) return;

			setLoading(true);
			setError(null);

			try {
				console.log("🔄 Fetching admin dashboard data...");

				// Fetch dashboard stats from API
				const stats = await dashboardService.getDashboardStats();
				console.log("📊 Dashboard stats:", stats);
				setDashboardStats(stats);

				// Fetch all applications
				const proposalsResponse = await proposalService.getProposalList({
					limit: 1000,
				});
				console.log("📝 Applications fetched:", proposalsResponse.proposals.length);
				setAllApplications(proposalsResponse.proposals);

				// Fetch all interviews
				const interviewsResponse = await interviewService.getInterviewList(
					access_token,
					{
						limit: 1000,
					},
					user?.role,
				);
				console.log("🎥 Interviews fetched:", interviewsResponse.interviews.length);
				setAllInterviews(interviewsResponse.interviews);

				// Fetch all users
				try {
					const usersResponse = await userService.getUserList(access_token);
					console.log("👥 Users fetched:", usersResponse.length);
					setAllUsers(usersResponse as UserInfo[]);
				} catch (userError) {
					console.warn("⚠️ Could not fetch users:", userError);
					setAllUsers([]);
				}

				console.log("✅ All admin data fetched successfully");
			} catch (error) {
				console.error("❌ Failed to fetch admin data:", error);
				setError("Failed to load dashboard data. Please try again.");
			} finally {
				setLoading(false);
			}
		};

		fetchAdminData();
	}, [user, access_token]);

	// Using direct ApexCharts configuration for all charts

	// Calculate additional metrics
	const totalApplications = dashboardStats?.totalApplications || allApplications.length;
	const totalInterviews = dashboardStats?.totalInterviews || allInterviews.length;
	const activeUsers = dashboardStats?.activeUsers || allUsers.length;
	const successRate = dashboardStats?.successRate || 0;

	if (!user || user.role !== 0) {
		return null; // Will redirect in useEffect
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="text-center space-y-4">
					<div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto" />
					<Text className="text-muted-foreground">Loading dashboard data...</Text>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="text-center space-y-4">
					<Icon icon="mdi:alert-circle" className="h-16 w-16 text-red-500 mx-auto" />
					<Title as="h3">Failed to Load Dashboard</Title>
					<Text className="text-muted-foreground">{error}</Text>
					<Button onClick={() => window.location.reload()}>Retry</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full space-y-8">
			{/* Enhanced Header */}
			<div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div className="space-y-2">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-blue-100 rounded-lg">
								<Icon icon="mdi:view-dashboard" className="h-6 w-6 text-blue-600" />
							</div>
							<Title as="h2" className="text-3xl font-bold text-gray-900">
								Admin Dashboard
							</Title>
						</div>
						<Text className="text-gray-600 text-lg">Comprehensive system overview and analytics</Text>
					</div>
					<div className="flex items-center gap-3">
						<Select value={timeFilter} onValueChange={setTimeFilter}>
							<SelectTrigger className="w-44 bg-white border-blue-200">
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
						<Button variant="outline" size="sm" className="bg-white border-blue-200">
							<Icon icon="mdi:download" className="mr-2" />
							Export Data
						</Button>
					</div>
				</div>
			</div>

			{/* Enhanced Key Metrics */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-semibold text-blue-800">Total Applications</CardTitle>
						<div className="p-2 bg-blue-200 rounded-lg">
							<Icon icon="mdi:file-document-multiple" className="h-5 w-5 text-blue-700" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold text-blue-900">{totalApplications}</div>
						<div className="flex items-center gap-2 mt-2">
							<Icon icon="mdi:trending-up" className="h-4 w-4 text-green-600" />
							<p className="text-sm text-blue-700">+{dashboardStats?.applicationsThisMonth || 0} this month</p>
						</div>
					</CardContent>
				</Card>

				<Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-semibold text-green-800">Total Interviews</CardTitle>
						<div className="p-2 bg-green-200 rounded-lg">
							<Icon icon="mdi:video" className="h-5 w-5 text-green-700" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold text-green-900">{totalInterviews}</div>
						<div className="flex items-center gap-2 mt-2">
							<Icon icon="mdi:trending-up" className="h-4 w-4 text-green-600" />
							<p className="text-sm text-green-700">+{dashboardStats?.interviewsThisMonth || 0} this month</p>
						</div>
					</CardContent>
				</Card>

				<Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-semibold text-purple-800">Active Users</CardTitle>
						<div className="p-2 bg-purple-200 rounded-lg">
							<Icon icon="mdi:account-group" className="h-5 w-5 text-purple-700" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold text-purple-900">{activeUsers}</div>
						<div className="flex items-center gap-2 mt-2">
							<Icon icon="mdi:account-plus" className="h-4 w-4 text-green-600" />
							<p className="text-sm text-purple-700">+{dashboardStats?.newUsersThisMonth || 0} new this month</p>
						</div>
					</CardContent>
				</Card>

				<Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-semibold text-orange-800">Success Rate</CardTitle>
						<div className="p-2 bg-orange-200 rounded-lg">
							<Icon icon="mdi:chart-line-variant" className="h-5 w-5 text-orange-700" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold text-orange-900">{successRate.toFixed(1)}%</div>
						<div className="flex items-center gap-2 mt-2">
							<Icon icon="mdi:check-circle" className="h-4 w-4 text-green-600" />
							<p className="text-sm text-orange-700">Offer acceptance rate</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Enhanced Analytics Dashboard */}
			<div className="space-y-8">
				{/* Overview Charts */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* Applications Trend */}
					<Card className="border-0 shadow-lg">
						<CardHeader className="border-b border-gray-100">
							<CardTitle className="flex items-center gap-2">
								<Icon icon="mdi:chart-line" className="h-5 w-5 text-blue-600" />
								Applications & Interviews Trend
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-6">
							{dashboardStats?.applicationTrends && dashboardStats.applicationTrends.length > 0 ? (
								<Chart
									type="line"
									series={[
										{
											name: "Applications",
											data: dashboardStats.applicationTrends?.map((trend) => trend.applications) || [],
										},
										{
											name: "Interviews",
											data: dashboardStats.applicationTrends?.map((trend) => trend.interviews) || [],
										},
									]}
									options={{
										chart: {
											type: "line",
											height: 300,
										},
										xaxis: {
											categories: dashboardStats.applicationTrends?.map((trend) => trend.date) || [],
										},
										colors: ["#3b82f6", "#10b981"],
										stroke: {
											curve: "smooth",
											width: 3,
										},
										dataLabels: {
											enabled: false,
										},
										grid: {
											strokeDashArray: 4,
										},
										legend: {
											show: true,
											position: "top",
											// horizontalAlign: "right", // Not supported in custom chart
										},
										tooltip: {
											shared: true,
											intersect: false,
										},
									}}
									height={300}
								/>
							) : (
								<div className="h-[300px] flex items-center justify-center text-muted-foreground">No trend data available</div>
							)}
						</CardContent>
					</Card>

					{/* Applications by Status */}
					<Card className="border-0 shadow-lg">
						<CardHeader className="border-b border-gray-100">
							<CardTitle className="flex items-center gap-2">
								<Icon icon="mdi:pie-chart" className="h-5 w-5 text-green-600" />
								Applications by Status
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-6">
							{dashboardStats?.applicationsByStatus ? (
								<Chart
									type="donut"
									series={Object.values(dashboardStats.applicationsByStatus)}
									options={{
										chart: {
											type: "donut",
											height: 300,
										},
										labels: Object.keys(dashboardStats.applicationsByStatus),
										colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
										legend: {
											show: true,
											position: "bottom",
										},
										plotOptions: {
											pie: {
												donut: {
													size: "65%",
													labels: {
														show: true,
														total: {
															show: true,
															label: "Total",
														},
													},
												},
											},
										},
									}}
									height={300}
								/>
							) : (
								<div className="h-[300px] flex items-center justify-center text-muted-foreground">No application status data available</div>
							)}
						</CardContent>
					</Card>

					{/* Interview Progress */}
					<Card className="border-0 shadow-lg">
						<CardHeader className="border-b border-gray-100">
							<CardTitle className="flex items-center gap-2">
								<Icon icon="mdi:calendar-check" className="h-5 w-5 text-purple-600" />
								Interview Progress
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-6">
							{dashboardStats?.interviewsByProgress ? (
								<Chart
									type="donut"
									series={Object.values(dashboardStats.interviewsByProgress)}
									options={{
										chart: {
											type: "donut",
											height: 300,
										},
										labels: Object.keys(dashboardStats.interviewsByProgress),
										colors: ["#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444"],
										legend: {
											show: true,
											position: "bottom",
										},
										plotOptions: {
											pie: {
												donut: {
													size: "65%",
													labels: {
														show: true,
														total: {
															show: true,
															label: "Total",
														},
													},
												},
											},
										},
									}}
									height={300}
								/>
							) : (
								<div className="h-[300px] flex items-center justify-center text-muted-foreground">No interview progress data available</div>
							)}
						</CardContent>
					</Card>

					{/* Top Companies */}
					<Card className="border-0 shadow-lg">
						<CardHeader className="border-b border-gray-100">
							<CardTitle className="flex items-center gap-2">
								<Icon icon="mdi:office-building" className="h-5 w-5 text-orange-600" />
								Top Companies
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-6">
							<div className="space-y-4">
								{dashboardStats?.topCompanies && dashboardStats.topCompanies.length > 0 ? (
									dashboardStats.topCompanies.slice(0, 5).map((company, index) => (
										<div key={company.company} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
											<div className="flex items-center gap-3">
												<div
													className={cn(
														"w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white",
														index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : index === 2 ? "bg-orange-500" : "bg-blue-500",
													)}
												>
													{index + 1}
												</div>
												<span className="font-semibold text-gray-900">{company.company}</span>
											</div>
											<Badge variant="secondary" className="bg-blue-100 text-blue-800">
												{company.count} applications
											</Badge>
										</div>
									))
								) : (
									<div className="text-center py-8">
										<Icon icon="mdi:office-building-outline" className="h-12 w-12 text-gray-400 mx-auto mb-4" />
										<Text className="text-gray-500">No company data available</Text>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Advanced Analytics - Temporarily disabled for debugging */}
				<Card className="border-0 shadow-lg">
					<CardHeader className="border-b border-gray-100">
						<CardTitle className="flex items-center gap-2">
							<Icon icon="mdi:chart-box" className="h-5 w-5 text-indigo-600" />
							Advanced Analytics
						</CardTitle>
					</CardHeader>
					<CardContent className="pt-6">
						<AnalyticsGraphs timeFilter={timeFilter} />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
