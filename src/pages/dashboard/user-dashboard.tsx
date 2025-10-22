import dashboardService, { type DashboardStats } from "@/api/services/dashboardService";
import { useAuth } from "@/components/auth/use-auth";
import { Chart } from "@/components/chart/chart";
import { useChart } from "@/components/chart/useChart";
import Icon from "@/components/icon/icon";
import { Button } from "@/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { ModernButton } from "@/ui/modern-button";
import { ModernCard } from "@/ui/modern-card";
import { ModernStatsCard } from "@/ui/modern-stats-card";
import { Progress } from "@/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Text, Title } from "@/ui/typography";
import { cn } from "@/utils";
import { m } from "motion/react";
import { useEffect, useState } from "react";

// Time options for filtering
const timeOptions = [
	{ label: "Today", value: "today" },
	{ label: "This Week", value: "week" },
	{ label: "This Month", value: "month" },
];

// User-specific dashboard data
const userDashboardData = {
	overview: {
		today: {
			myApplications: 2,
			myInterviews: 1,
			responseRate: 85.5,
			avgResponseTime: "2.3 days",
		},
		week: {
			myApplications: 8,
			myInterviews: 3,
			responseRate: 87.2,
			avgResponseTime: "2.1 days",
		},
		month: {
			myApplications: 23,
			myInterviews: 7,
			responseRate: 89.1,
			avgResponseTime: "1.8 days",
		},
	},
	applicationStatus: {
		today: [
			{ status: "Applied", count: 2, color: "#3b82f6" },
			{ status: "Interviewing", count: 1, color: "#f59e0b" },
			{ status: "Offered", count: 0, color: "#10b981" },
			{ status: "Rejected", count: 0, color: "#ef4444" },
		],
		week: [
			{ status: "Applied", count: 5, color: "#3b82f6" },
			{ status: "Interviewing", count: 2, color: "#f59e0b" },
			{ status: "Offered", count: 1, color: "#10b981" },
			{ status: "Rejected", count: 0, color: "#ef4444" },
		],
		month: [
			{ status: "Applied", count: 12, color: "#3b82f6" },
			{ status: "Interviewing", count: 6, color: "#f59e0b" },
			{ status: "Offered", count: 3, color: "#10b981" },
			{ status: "Rejected", count: 2, color: "#ef4444" },
		],
	},
	interviewProgress: {
		today: [
			{ progress: "Scheduled", count: 1, color: "#3b82f6" },
			{ progress: "Completed", count: 0, color: "#10b981" },
			{ progress: "Cancelled", count: 0, color: "#ef4444" },
		],
		week: [
			{ progress: "Scheduled", count: 2, color: "#3b82f6" },
			{ progress: "Completed", count: 1, color: "#10b981" },
			{ progress: "Cancelled", count: 0, color: "#ef4444" },
		],
		month: [
			{ progress: "Scheduled", count: 4, color: "#3b82f6" },
			{ progress: "Completed", count: 2, color: "#10b981" },
			{ progress: "Cancelled", count: 1, color: "#ef4444" },
		],
	},
	personalTrends: {
		today: {
			series: [
				{ name: "Applications", data: [1, 2, 1, 2, 1, 2, 2] },
				{ name: "Interviews", data: [0, 1, 0, 1, 0, 1, 1] },
			],
			categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
		},
		week: {
			series: [
				{ name: "Applications", data: [2, 3, 2, 3, 2, 3, 3] },
				{ name: "Interviews", data: [1, 1, 0, 1, 1, 0, 1] },
			],
			categories: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7"],
		},
		month: {
			series: [
				{ name: "Applications", data: [5, 6, 7, 8, 9, 10, 11] },
				{ name: "Interviews", data: [2, 2, 3, 3, 4, 4, 5] },
			],
			categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
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

export default function UserDashboard() {
	const [timeType, setTimeType] = useState<"today" | "week" | "month">("today");
	const { user } = useAuth();
	const [stats, setStats] = useState<DashboardStats | null>(null);

	const overview = userDashboardData.overview[timeType];
	const applicationStatus = userDashboardData.applicationStatus[timeType];
	const interviewProgress = userDashboardData.interviewProgress[timeType];
	const personalTrends = userDashboardData.personalTrends[timeType];

	// Fetch dashboard statistics
	useEffect(() => {
		const fetchStats = async () => {
			if (user?.id) {
				try {
					const dashboardStats = await dashboardService.getDashboardStats();
					setStats(dashboardStats);
				} catch (error) {
					console.error("Failed to fetch dashboard stats:", error);
				}
			}
		};
		fetchStats();
	}, [user]);

	const chartOptions = useChart({
		xaxis: { categories: personalTrends.categories },
		stroke: {
			curve: "smooth",
		},
		legend: {
			position: "top",
		},
	});

	const applicationChartOptions = useChart({
		labels: applicationStatus.map((item) => item.status),
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
		labels: interviewProgress.map((item) => item.progress),
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
		<m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col gap-8">
			{/* Header */}
			<m.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
				<ModernCard className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-none shadow-none">
					<div className="space-y-2">
						<div className="flex items-center gap-3">
							<m.div
								initial={{ scale: 0, rotate: -180 }}
								animate={{ scale: 1, rotate: 0 }}
								transition={{ type: "spring", stiffness: 300, damping: 20 }}
								className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-blue-600 dark:text-blue-400"
							>
								<Icon icon="mdi:chart-line" className="h-6 w-6" />
							</m.div>
							<div>
								<Title
									as="h1"
									className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent"
								>
									My Job Dashboard
								</Title>
								<Text variant="body2" className="text-muted-foreground">
									Track your job applications and interview progress.
								</Text>
							</div>
						</div>
					</div>
					<m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex items-center gap-2">
						<Text variant="body2" className="text-muted-foreground mr-2">
							Time Period:
						</Text>
						<Select value={timeType} onValueChange={(v) => setTimeType(v as any)}>
							<SelectTrigger className="w-32 h-9 border-2 hover:border-primary/20 transition-colors">
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
					</m.div>
				</ModernCard>
			</m.div>

			{/* Key Metrics */}
			<m.div
				initial={{ opacity: 0, y: 30 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.3, duration: 0.5 }}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
			>
				<ModernStatsCard
					title="My Applications"
					value={stats?.totalApplications || overview.myApplications}
					icon={<Icon icon="mdi:briefcase-plus" className="h-6 w-6" />}
					colorScheme="blue"
					change={{
						value: Math.round(stats?.applicationTrend || 12.5),
						type: "increase",
					}}
				/>
				<ModernStatsCard
					title="My Interviews"
					value={stats?.totalInterviews || overview.myInterviews}
					icon={<Icon icon="mdi:calendar-clock" className="h-6 w-6" />}
					colorScheme="green"
					change={{
						value: Math.round(stats?.interviewTrend || 8.3),
						type: "increase",
					}}
				/>
				<ModernStatsCard
					title="Response Rate"
					value={`${overview.responseRate}%`}
					icon={<Icon icon="mdi:percent" className="h-6 w-6" />}
					colorScheme="purple"
					change={{
						value: 5.2,
						type: "increase",
					}}
				/>
				<ModernStatsCard
					title="Avg Response Time"
					value={overview.avgResponseTime}
					icon={<Icon icon="mdi:clock-outline" className="h-6 w-6" />}
					colorScheme="orange"
					change={{
						value: -2.1,
						type: "decrease",
					}}
				/>
			</m.div>

			{/* Charts Section */}
			<m.div
				initial={{ opacity: 0, y: 30 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.4, duration: 0.5 }}
				className="grid grid-cols-1 lg:grid-cols-2 gap-6"
			>
				{/* Personal Trends Chart */}
				<ModernCard>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Icon icon="mdi:chart-line" className="h-5 w-5 text-blue-600" />
							Personal Trends
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Chart type="line" series={personalTrends.series} options={chartOptions} height={300} />
					</CardContent>
				</ModernCard>

				{/* Application Status Chart */}
				<ModernCard>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Icon icon="mdi:pie-chart" className="h-5 w-5 text-green-600" />
							Application Status
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Chart type="donut" series={applicationStatus.map((item) => item.count)} options={applicationChartOptions} height={300} />
					</CardContent>
				</ModernCard>
			</m.div>

			{/* Interview Progress */}
			<m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
				<ModernCard>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Icon icon="mdi:calendar-check" className="h-5 w-5 text-purple-600" />
							Interview Progress
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{interviewProgress.map((item, index) => (
								<m.div
									key={item.progress}
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 0.6 + index * 0.1 }}
									className="flex items-center justify-between"
								>
									<div className="flex items-center gap-3">
										<div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
										<Text className="font-medium">{item.progress}</Text>
									</div>
									<div className="flex items-center gap-4">
										<Text className="font-bold">{item.count}</Text>
										<Progress value={(item.count / Math.max(...interviewProgress.map((i) => i.count))) * 100} className="w-24" />
									</div>
								</m.div>
							))}
						</div>
					</CardContent>
				</ModernCard>
			</m.div>

			{/* Quick Actions */}
			<m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}>
				<ModernCard>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Icon icon="mdi:lightning-bolt" className="h-5 w-5 text-yellow-600" />
							Quick Actions
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<ModernButton variant="outline" className="h-16 flex flex-col items-center justify-center gap-2">
								<Icon icon="mdi:plus" className="h-6 w-6" />
								<span>New Application</span>
							</ModernButton>
							<ModernButton variant="outline" className="h-16 flex flex-col items-center justify-center gap-2">
								<Icon icon="mdi:calendar-plus" className="h-6 w-6" />
								<span>Schedule Interview</span>
							</ModernButton>
							<ModernButton variant="outline" className="h-16 flex flex-col items-center justify-center gap-2">
								<Icon icon="mdi:file-document" className="h-6 w-6" />
								<span>View Applications</span>
							</ModernButton>
						</div>
					</CardContent>
				</ModernCard>
			</m.div>
		</m.div>
	);
}
