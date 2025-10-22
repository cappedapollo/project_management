import dashboardService, { type DashboardStats } from "@/api/services/dashboardService";
import { useAuth } from "@/components/auth/use-auth";
import { Chart } from "@/components/chart/chart";
import { useChart } from "@/components/chart/useChart";
import Icon from "@/components/icon/icon";
// Removed import - using backend API endpoints instead
import { Button } from "@/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Progress } from "@/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Text, Title } from "@/ui/typography";
import { cn } from "@/utils";
import { useEffect, useState } from "react";

// Time options for filtering
const timeOptions = [
	{ label: "Today", value: "today" },
	{ label: "This Week", value: "week" },
	{ label: "This Month", value: "month" },
];

// Admin-specific dashboard data with enhanced analytics
const adminDashboardData = {
	overview: {
		today: {
			totalApplications: 156,
			totalInterviews: 34,
			activeUsers: 89,
			successRate: 78.5,
			avgResponseTime: "1.2 days",
			conversionRate: 12.3,
		},
		week: {
			totalApplications: 1247,
			totalInterviews: 289,
			activeUsers: 456,
			successRate: 82.3,
			avgResponseTime: "1.8 days",
			conversionRate: 15.7,
		},
		month: {
			totalApplications: 5234,
			totalInterviews: 1234,
			activeUsers: 1890,
			successRate: 85.7,
			avgResponseTime: "2.1 days",
			conversionRate: 18.2,
		},
	},
	applicationsByStatus: {
		today: [
			{ status: "Applied", count: 45, color: "#3b82f6" },
			{ status: "Interviewing", count: 23, color: "#f59e0b" },
			{ status: "Offered", count: 12, color: "#10b981" },
			{ status: "Rejected", count: 34, color: "#ef4444" },
		],
		week: [
			{ status: "Applied", count: 345, color: "#3b82f6" },
			{ status: "Interviewing", count: 189, color: "#f59e0b" },
			{ status: "Offered", count: 89, color: "#10b981" },
			{ status: "Rejected", count: 234, color: "#ef4444" },
		],
		month: [
			{ status: "Applied", count: 1234, color: "#3b82f6" },
			{ status: "Interviewing", count: 678, color: "#f59e0b" },
			{ status: "Offered", count: 345, color: "#10b981" },
			{ status: "Rejected", count: 567, color: "#ef4444" },
		],
	},
	interviewsByProgress: {
		today: [
			{ progress: "Scheduled", count: 15, color: "#3b82f6" },
			{ progress: "Completed", count: 12, color: "#10b981" },
			{ progress: "Cancelled", count: 7, color: "#ef4444" },
		],
		week: [
			{ progress: "Scheduled", count: 123, color: "#3b82f6" },
			{ progress: "Completed", count: 98, color: "#10b981" },
			{ progress: "Cancelled", count: 34, color: "#ef4444" },
		],
		month: [
			{ progress: "Scheduled", count: 456, color: "#3b82f6" },
			{ progress: "Completed", count: 345, color: "#10b981" },
			{ progress: "Cancelled", count: 123, color: "#ef4444" },
		],
	},
	trends: {
		today: {
			series: [
				{ name: "Applications", data: [12, 15, 18, 22, 25, 28, 31] },
				{ name: "Interviews", data: [3, 5, 7, 9, 11, 13, 15] },
			],
			categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
		},
		week: {
			series: [
				{ name: "Applications", data: [89, 123, 156, 189, 234, 267, 289] },
				{ name: "Interviews", data: [23, 34, 45, 56, 67, 78, 89] },
			],
			categories: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7"],
		},
		month: {
			series: [
				{ name: "Applications", data: [456, 567, 678, 789, 890, 1001, 1112] },
				{ name: "Interviews", data: [123, 145, 167, 189, 201, 223, 245] },
			],
			categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
		},
	},
	userActivity: {
		today: [
			{ activity: "New Users", count: 12, color: "#3b82f6" },
			{ activity: "Active Users", count: 89, color: "#10b981" },
			{ activity: "Returning Users", count: 67, color: "#f59e0b" },
		],
		week: [
			{ activity: "New Users", count: 89, color: "#3b82f6" },
			{ activity: "Active Users", count: 456, color: "#10b981" },
			{ activity: "Returning Users", count: 234, color: "#f59e0b" },
		],
		month: [
			{ activity: "New Users", count: 345, color: "#3b82f6" },
			{ activity: "Active Users", count: 1890, color: "#10b981" },
			{ activity: "Returning Users", count: 1234, color: "#f59e0b" },
		],
	},
	performanceMetrics: {
		today: {
			avgApplicationTime: "15 min",
			avgInterviewDuration: "45 min",
			responseRate: 92.5,
			satisfactionScore: 4.2,
		},
		week: {
			avgApplicationTime: "12 min",
			avgInterviewDuration: "42 min",
			responseRate: 94.1,
			satisfactionScore: 4.4,
		},
		month: {
			avgApplicationTime: "10 min",
			avgInterviewDuration: "40 min",
			responseRate: 95.8,
			satisfactionScore: 4.6,
		},
	},
};

function Trend({ value }: { value: number }) {
	const trendClass = value > 0 ? "text-success" : value < 0 ? "text-error" : "text-muted-foreground";
	return (
		<span className={cn(trendClass, "flex items-center gap-1 font-bold")}>
			{value > 0 ? (
				<Icon icon="mdi:arrow-up" className="inline-block align-middle" size={16} />
			) : value < 0 ? (
				<Icon icon="mdi:arrow-down" className="inline-block align-middle" size={16} />
			) : null}
			{Math.abs(value)}%
		</span>
	);
}

export default function AdminDashboard() {
	const [timeType, setTimeType] = useState<"today" | "week" | "month">("today");
	const { user, access_token } = useAuth();
	const [stats, setStats] = useState<DashboardStats | null>(null);
	const [isSeeding, setIsSeeding] = useState(false);

	const overview = adminDashboardData.overview[timeType];
	const applicationsByStatus = adminDashboardData.applicationsByStatus[timeType];
	const interviewsByProgress = adminDashboardData.interviewsByProgress[timeType];
	const trends = adminDashboardData.trends[timeType];
	const userActivity = adminDashboardData.userActivity[timeType];
	const performanceMetrics = adminDashboardData.performanceMetrics[timeType];

	// Fetch dashboard statistics
	useEffect(() => {
		const fetchStats = async () => {
			console.log("🔄 Dashboard useEffect triggered");
			console.log("User ID:", user?.id);
			console.log("Access token present:", !!access_token);
			console.log("Time type:", timeType);

			if (user?.id && access_token) {
				try {
					console.log("✅ Fetching admin dashboard data...");
					const dashboardStats = await dashboardService.getDashboardStats(user.id, access_token, timeType);
					console.log("📊 Dashboard stats received:", dashboardStats);
					setStats(dashboardStats);
				} catch (error) {
					console.error("❌ Failed to fetch dashboard stats:", error);
				}
			} else {
				console.log("❌ Missing user ID or access token");
			}
		};
		fetchStats();
	}, [user, access_token, timeType]);

	// Function to seed test data
	const handleSeedTestData = async () => {
		setIsSeeding(true);
		try {
			await dashboardService.seedTestData();
			// Refresh stats after seeding
			if (user?.id && access_token) {
				const dashboardStats = await dashboardService.getDashboardStats(user.id, access_token, timeType);
				setStats(dashboardStats);
			}
		} catch (error) {
			console.error("Failed to seed test data:", error);
		} finally {
			setIsSeeding(false);
		}
	};

	// Function to clear test data
	const handleClearTestData = async () => {
		setIsSeeding(true);
		try {
			await dashboardService.clearTestData();
			// Refresh stats after clearing
			if (user?.id && access_token) {
				const dashboardStats = await dashboardService.getDashboardStats(user.id, access_token, timeType);
				setStats(dashboardStats);
			}
		} catch (error) {
			console.error("Failed to clear test data:", error);
		} finally {
			setIsSeeding(false);
		}
	};

	const chartOptions = useChart({
		xaxis: { categories: trends.categories },
		stroke: {
			curve: "smooth",
		},
		legend: {
			position: "top",
		},
	});

	const applicationChartOptions = useChart({
		labels: applicationsByStatus.map((item) => item.status),
		stroke: {
			show: false,
		},
		legend: {
			position: "bottom",
		},
		plotOptions: {
			pie: {
				donut: {
					size: "60%",
				},
			},
		},
	});

	const interviewChartOptions = useChart({
		labels: interviewsByProgress.map((item) => item.progress),
		stroke: {
			show: false,
		},
		legend: {
			position: "bottom",
		},
		plotOptions: {
			pie: {
				donut: {
					size: "60%",
				},
			},
		},
	});

	const userActivityChartOptions = useChart({
		labels: userActivity.map((item) => item.activity),
		stroke: {
			show: false,
		},
		legend: {
			position: "bottom",
		},
		plotOptions: {
			pie: {
				donut: {
					size: "60%",
				},
			},
		},
	});

	return (
		<div className="flex flex-col gap-6">
			{/* Header */}
			<Card className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-none shadow-none">
				<div>
					<Title as="h4" className="text-xl mb-1">
						Admin Dashboard Overview
					</Title>
					<Text variant="body2" className="text-muted-foreground">
						Comprehensive analytics and system-wide statistics for administration.
					</Text>
				</div>
				<div className="flex items-center gap-2">
					<Text variant="body2" className="text-muted-foreground mr-2">
						Time Period:
					</Text>
					<Select value={timeType} onValueChange={(v) => setTimeType(v as any)}>
						<SelectTrigger className="w-32 h-9">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{timeOptions.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</Card>

			{/* Key Metrics */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Text variant="subTitle2">Total Applications</Text>
						</CardTitle>
						<CardAction className="rounded-full bg-blue-100 p-2 w-10 h-10 flex items-center justify-center">
							<Icon icon="mdi:briefcase-plus" size={20} color="#3b82f6" />
						</CardAction>
					</CardHeader>
					<CardContent>
						<Title as="h3" className="text-2xl font-bold">
							{stats?.totalApplications || overview.totalApplications}
						</Title>
						<div className="flex items-center gap-2 mt-2">
							<Trend value={stats?.applicationTrend || 15.2} />
							<Text variant="caption" className="text-muted-foreground">
								vs last period
							</Text>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Text variant="subTitle2">Total Interviews</Text>
						</CardTitle>
						<CardAction className="rounded-full bg-green-100 p-2 w-10 h-10 flex items-center justify-center">
							<Icon icon="mdi:calendar-clock" size={20} color="#10b981" />
						</CardAction>
					</CardHeader>
					<CardContent>
						<Title as="h3" className="text-2xl font-bold">
							{stats?.totalInterviews || overview.totalInterviews}
						</Title>
						<div className="flex items-center gap-2 mt-2">
							<Trend value={stats?.interviewTrend || 10.8} />
							<Text variant="caption" className="text-muted-foreground">
								vs last period
							</Text>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Text variant="subTitle2">Active Users</Text>
						</CardTitle>
						<CardAction className="rounded-full bg-purple-100 p-2 w-10 h-10 flex items-center justify-center">
							<Icon icon="mdi:account-group" size={20} color="#8b5cf6" />
						</CardAction>
					</CardHeader>
					<CardContent>
						<Title as="h3" className="text-2xl font-bold">
							{stats?.activeUsers || overview.activeUsers}
						</Title>
						<div className="flex items-center gap-2 mt-2">
							<Trend value={8.5} />
							<Text variant="caption" className="text-muted-foreground">
								vs last period
							</Text>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Text variant="subTitle2">Success Rate</Text>
						</CardTitle>
						<CardAction className="rounded-full bg-emerald-100 p-2 w-10 h-10 flex items-center justify-center">
							<Icon icon="mdi:chart-line" size={20} color="#10b981" />
						</CardAction>
					</CardHeader>
					<CardContent>
						<Title as="h3" className="text-2xl font-bold">
							{stats?.successRate || overview.successRate}%
						</Title>
						<div className="flex items-center gap-2 mt-2">
							<Trend value={2.3} />
							<Text variant="caption" className="text-muted-foreground">
								vs last period
							</Text>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Additional Metrics */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Text variant="subTitle2">Avg Response Time</Text>
						</CardTitle>
						<CardAction className="rounded-full bg-orange-100 p-2 w-10 h-10 flex items-center justify-center">
							<Icon icon="mdi:clock-outline" size={20} color="#f97316" />
						</CardAction>
					</CardHeader>
					<CardContent>
						<Title as="h3" className="text-2xl font-bold">
							{overview.avgResponseTime}
						</Title>
						<div className="flex items-center gap-2 mt-2">
							<Trend value={-0.8} />
							<Text variant="caption" className="text-muted-foreground">
								vs last period
							</Text>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Text variant="subTitle2">Conversion Rate</Text>
						</CardTitle>
						<CardAction className="rounded-full bg-indigo-100 p-2 w-10 h-10 flex items-center justify-center">
							<Icon icon="mdi:percent" size={20} color="#6366f1" />
						</CardAction>
					</CardHeader>
					<CardContent>
						<Title as="h3" className="text-2xl font-bold">
							{stats?.conversionRate || overview.conversionRate}%
						</Title>
						<div className="flex items-center gap-2 mt-2">
							<Trend value={3.1} />
							<Text variant="caption" className="text-muted-foreground">
								vs last period
							</Text>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Text variant="subTitle2">Response Rate</Text>
						</CardTitle>
						<CardAction className="rounded-full bg-teal-100 p-2 w-10 h-10 flex items-center justify-center">
							<Icon icon="mdi:reply" size={20} color="#14b8a6" />
						</CardAction>
					</CardHeader>
					<CardContent>
						<Title as="h3" className="text-2xl font-bold">
							{stats?.responseRate || performanceMetrics.responseRate}%
						</Title>
						<div className="flex items-center gap-2 mt-2">
							<Trend value={1.2} />
							<Text variant="caption" className="text-muted-foreground">
								vs last period
							</Text>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Text variant="subTitle2">Satisfaction Score</Text>
						</CardTitle>
						<CardAction className="rounded-full bg-pink-100 p-2 w-10 h-10 flex items-center justify-center">
							<Icon icon="mdi:star" size={20} color="#ec4899" />
						</CardAction>
					</CardHeader>
					<CardContent>
						<Title as="h3" className="text-2xl font-bold">
							{performanceMetrics.satisfactionScore}/5
						</Title>
						<div className="flex items-center gap-2 mt-2">
							<Trend value={0.2} />
							<Text variant="caption" className="text-muted-foreground">
								vs last period
							</Text>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Charts Row */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Trends Chart */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Title as="h3" className="text-lg">
								Application & Interview Trends
							</Title>
						</CardTitle>
						<CardAction>
							<Button size="sm" variant="outline">
								<Icon icon="mdi:download" className="mr-1" />
								Export
							</Button>
						</CardAction>
					</CardHeader>
					<CardContent>
						<div className="w-full min-h-[300px]">
							<Chart type="line" height={320} options={chartOptions} series={trends.series} />
						</div>
					</CardContent>
				</Card>

				{/* User Activity Chart */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Title as="h3" className="text-lg">
								User Activity Distribution
							</Title>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="w-full min-h-[300px]">
							<Chart type="donut" height={320} options={userActivityChartOptions} series={userActivity.map((item) => item.count)} />
						</div>
						<div className="flex flex-col gap-2 mt-4">
							{userActivity.map((item) => (
								<div key={item.activity} className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
										<Text variant="body2">{item.activity}</Text>
									</div>
									<Text variant="body2" className="font-semibold">
										{item.count}
									</Text>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Additional Charts Row */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Applications by Status */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Title as="h3" className="text-lg">
								Applications by Status
							</Title>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="w-full min-h-[300px]">
							<Chart type="donut" height={320} options={applicationChartOptions} series={applicationsByStatus.map((item) => item.count)} />
						</div>
						<div className="flex flex-col gap-2 mt-4">
							{applicationsByStatus.map((item) => (
								<div key={item.status} className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
										<Text variant="body2">{item.status}</Text>
									</div>
									<Text variant="body2" className="font-semibold">
										{item.count}
									</Text>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Interviews by Progress */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Title as="h3" className="text-lg">
								Interviews by Progress
							</Title>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="w-full min-h-[300px]">
							<Chart type="donut" height={320} options={interviewChartOptions} series={interviewsByProgress.map((item) => item.count)} />
						</div>
						<div className="flex flex-col gap-2 mt-4">
							{interviewsByProgress.map((item) => (
								<div key={item.progress} className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
										<Text variant="body2">{item.progress}</Text>
									</div>
									<Text variant="body2" className="font-semibold">
										{item.count}
									</Text>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Performance Metrics */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<Card>
					<CardHeader>
						<CardTitle>
							<Title as="h3" className="text-lg">
								Database Analytics
							</Title>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<Text variant="body2">Total Users</Text>
							<Text variant="body2" className="font-semibold">
								{stats?.totalUsers ?? "N/A"}
							</Text>
						</div>
						<div className="flex items-center justify-between">
							<Text variant="body2">New Users This Month</Text>
							<Text variant="body2" className="font-semibold">
								{stats?.newUsersThisMonth ?? "N/A"}
							</Text>
						</div>
						<div className="flex items-center justify-between">
							<Text variant="body2">Avg Apps per User</Text>
							<Text variant="body2" className="font-semibold">
								{stats?.averageApplicationsPerUser ?? "N/A"}
							</Text>
						</div>
						<div className="flex items-center justify-between">
							<Text variant="body2">Database Status</Text>
							<Text variant="body2" className={`font-semibold ${stats?.hasRealData ? "text-green-600" : "text-orange-600"}`}>
								{stats?.hasRealData ? "Connected - Real Data" : "Empty or No Connection"}
							</Text>
						</div>
						{!stats?.hasRealData && (
							<div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
								<Text variant="caption" className="text-orange-700 mb-2 block">
									📭 No database data found. Add test data to populate the database and see real analytics.
								</Text>
								<Button size="sm" onClick={handleSeedTestData} disabled={isSeeding} className="mt-2">
									{isSeeding ? "Adding to Database..." : "Add Test Data to DB"}
								</Button>
							</div>
						)}
						{stats?.hasRealData && (
							<div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
								<Text variant="caption" className="text-green-700 mb-2 block">
									✅ Displaying real data from database
								</Text>
								<Button size="sm" variant="outline" onClick={handleClearTestData} disabled={isSeeding} className="mt-2">
									{isSeeding ? "Clearing Database..." : "Clear Test Data"}
								</Button>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Top Companies */}
				{stats?.topCompanies && stats.topCompanies.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>
								<Title as="h3" className="text-lg">
									Top Companies
								</Title>
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{stats.topCompanies.slice(0, 5).map((company, index) => (
								<div key={company.company} className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-600">{index + 1}</div>
										<Text variant="body2">{company.company}</Text>
									</div>
									<Text variant="body2" className="font-semibold">
										{company.count}
									</Text>
								</div>
							))}
						</CardContent>
					</Card>
				)}

				{/* Recent Activity */}
				<Card className="lg:col-span-2">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Title as="h3" className="text-lg">
								Recent System Activity
							</Title>
						</CardTitle>
						<CardAction>
							<Button size="sm" variant="outline">
								View All
							</Button>
						</CardAction>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{stats?.recentApplications?.slice(0, 5).map((application) => (
								<div key={application.id} className="flex items-center gap-3 p-3 rounded-lg border">
									<div className="p-2 rounded-full bg-blue-100">
										<Icon icon="mdi:briefcase" size={16} color="#3b82f6" />
									</div>
									<div className="flex-1">
										<Text variant="body2" className="font-semibold">
											{application.job_description}
										</Text>
										<Text variant="caption" className="text-muted-foreground">
											{application.company} • {application.created_at ? new Date(application.created_at).toLocaleDateString() : "N/A"}
										</Text>
									</div>
									<Button size="sm" variant="ghost">
										<Icon icon="mdi:eye" size={16} />
									</Button>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
