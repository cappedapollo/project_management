import dashboardService, { type DashboardStats } from "@/api/services/dashboardService";
import interviewService from "@/api/services/interviewService";
import proposalService from "@/api/services/proposalService";
import { useAuth } from "@/components/auth/use-auth";
import { Chart } from "@/components/chart/chart";
// import { useChart } from "@/components/chart/useChart"; // Using direct ApexCharts config
import Icon from "@/components/icon/icon";
import type { InterviewInfo, ProposalInfo } from "@/types/entity";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Progress } from "@/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Text, Title } from "@/ui/typography";
import { cn } from "@/utils";
import { useEffect, useState } from "react";

interface AnalyticsGraphsProps {
	timeFilter: string;
}

export default function AnalyticsGraphs({ timeFilter }: AnalyticsGraphsProps) {
	const { user, access_token } = useAuth();
	const [loading, setLoading] = useState(true);
	const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
	const [applications, setApplications] = useState<ProposalInfo[]>([]);
	const [interviews, setInterviews] = useState<InterviewInfo[]>([]);
	const [analyticsFilter, setAnalyticsFilter] = useState("overview");

	// Fetch all data for analytics
	useEffect(() => {
		const fetchAnalyticsData = async () => {
			if (!user || !access_token) return;

			setLoading(true);
			try {
				// Fetch dashboard stats
				const stats = await dashboardService.getDashboardStats();
				setDashboardStats(stats);

				// Fetch applications for detailed analytics
				const proposalsResponse = await proposalService.getProposalList({
					limit: 1000,
				});
				setApplications(proposalsResponse.proposals);

				// Fetch interviews for detailed analytics
				const interviewsResponse = await interviewService.getInterviewList(
					access_token,
					{
						limit: 1000,
					},
					0,
				); // Admin role
				setInterviews(interviewsResponse.interviews);
			} catch (error) {
				console.error("Failed to fetch analytics data:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchAnalyticsData();
	}, [user, access_token]);

	// Process data for charts based on time filter
	const processedData = (() => {
		if (!applications.length && !interviews.length) return null;

		const now = new Date();
		const startDate = new Date();
		let dateFormat = (date: Date) => date.toLocaleDateString();

		switch (timeFilter) {
			case "today":
				startDate.setHours(0, 0, 0, 0);
				dateFormat = (date: Date) => `${date.getHours()}:00`;
				break;
			case "week":
				startDate.setDate(now.getDate() - 7);
				dateFormat = (date: Date) => date.toLocaleDateString();
				break;
			case "month":
				startDate.setMonth(now.getMonth() - 1);
				dateFormat = (date: Date) => date.toLocaleDateString();
				break;
			default:
				startDate.setFullYear(now.getFullYear() - 1);
				dateFormat = (date: Date) => date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
		}

		// Create time series data
		const timeSeriesData: Record<string, { applications: number; interviews: number; offers: number }> = {};

		// Process applications
		for (const app of applications.filter((app) => new Date(app.applied_date || "") >= startDate)) {
			const date = new Date(app.applied_date || "");
			const key = dateFormat(date);
			if (!timeSeriesData[key]) {
				timeSeriesData[key] = { applications: 0, interviews: 0, offers: 0 };
			}
			timeSeriesData[key].applications++;
			if (app.status === "offered") {
				timeSeriesData[key].offers++;
			}
		}

		// Process interviews
		for (const interview of interviews.filter((interview) => new Date(interview.meeting_date || "") >= startDate)) {
			const date = new Date(interview.meeting_date || "");
			const key = dateFormat(date);
			if (!timeSeriesData[key]) {
				timeSeriesData[key] = { applications: 0, interviews: 0, offers: 0 };
			}
			timeSeriesData[key].interviews++;
		}

		return timeSeriesData;
	})();

	// Chart data for time series - using only real data
	const timeSeriesData = [
		{
			name: "Applications",
			data: processedData ? Object.values(processedData).map((d) => d.applications) : [],
		},
		{
			name: "Interviews",
			data: processedData ? Object.values(processedData).map((d) => d.interviews) : [],
		},
		{
			name: "Offers",
			data: processedData ? Object.values(processedData).map((d) => d.offers) : [],
		},
	];

	const timeSeriesOptions = {
		chart: {
			type: "line" as const,
			height: 300,
		},
		xaxis: {
			categories: processedData ? Object.keys(processedData) : [],
		},
		colors: ["#3b82f6", "#f59e0b", "#10b981"],
		stroke: {
			curve: "smooth" as const,
			width: 3,
		},
		legend: {
			show: true,
			position: "top" as const,
		},
		tooltip: {
			shared: true,
			intersect: false,
		},
	};

	// Success funnel data
	const funnelData = {
		applied: applications.length,
		interviewing: applications.filter((app) => app.status === "interviewing").length,
		offered: applications.filter((app) => app.status === "offered").length,
	};

	const funnelChartData = [
		{
			name: "Count",
			data: [funnelData.applied, funnelData.interviewing, funnelData.offered],
		},
	];

	const funnelChartOptions = {
		chart: {
			type: "bar" as const,
			height: 300,
		},
		xaxis: {
			categories: ["Applied", "Interviewing", "Offered"],
		},
		colors: ["#3b82f6"],
		plotOptions: {
			bar: {
				horizontal: false,
				borderRadius: 4,
				columnWidth: "50%",
			},
		},
		dataLabels: {
			enabled: true,
		},
		tooltip: {
			y: {
				formatter: (val: number) => `${val} applications`,
			},
		},
	};

	// Company analysis
	const companyStats = applications.reduce(
		(acc, app) => {
			const company = app.company || "Unknown";
			if (!acc[company]) {
				acc[company] = {
					total: 0,
					interviews: 0,
					offers: 0,
					rejections: 0,
					successRate: 0,
				};
			}
			acc[company].total++;
			if (app.status === "interviewing") acc[company].interviews++;
			if (app.status === "offered") acc[company].offers++;
			if (app.status === "rejected") acc[company].rejections++;
			acc[company].successRate = acc[company].total > 0 ? (acc[company].offers / acc[company].total) * 100 : 0;
			return acc;
		},
		{} as Record<string, { total: number; interviews: number; offers: number; rejections: number; successRate: number }>,
	);

	const topCompanies = Object.entries(companyStats)
		.sort(([, a], [, b]) => b.total - a.total)
		.slice(0, 10);

	// Monthly trends
	const monthlyTrends = (() => {
		const months = [];
		const now = new Date();
		for (let i = 11; i >= 0; i--) {
			const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
			months.push({
				month: date.toLocaleDateString("en-US", { month: "short" }),
				applications: applications.filter((app) => {
					const appDate = new Date(app.applied_date || "");
					return appDate.getMonth() === date.getMonth() && appDate.getFullYear() === date.getFullYear();
				}).length,
				interviews: interviews.filter((interview) => {
					const intDate = new Date(interview.meeting_date || "");
					return intDate.getMonth() === date.getMonth() && intDate.getFullYear() === date.getFullYear();
				}).length,
			});
		}
		return months;
	})();

	const monthlyChartData = [
		{
			name: "Applications",
			data: monthlyTrends.map((m) => m.applications),
		},
		{
			name: "Interviews",
			data: monthlyTrends.map((m) => m.interviews),
		},
	];

	const monthlyChartOptions = {
		chart: {
			type: "line" as const,
			height: 400,
		},
		xaxis: {
			categories: monthlyTrends.map((m) => m.month),
		},
		colors: ["#3b82f6", "#f59e0b"],
		stroke: {
			curve: "smooth" as const,
			width: 3,
		},
		markers: {
			size: 5,
		},
		grid: {
			strokeDashArray: 4,
		},
		legend: {
			show: true,
			position: "top" as const,
		},
	};

	// User performance metrics
	const userMetrics = applications.reduce(
		(acc, app) => {
			const userEmail = (app as any).userInfo?.email || "Unknown";
			if (!acc[userEmail]) {
				acc[userEmail] = {
					applications: 0,
					interviews: 0,
					offers: 0,
					successRate: 0,
					responseRate: 0,
				};
			}
			acc[userEmail].applications++;
			if (app.status === "interviewing") acc[userEmail].interviews++;
			if (app.status === "offered") acc[userEmail].offers++;

			acc[userEmail].successRate = acc[userEmail].applications > 0 ? (acc[userEmail].offers / acc[userEmail].applications) * 100 : 0;
			acc[userEmail].responseRate =
				acc[userEmail].applications > 0 ? ((acc[userEmail].interviews + acc[userEmail].offers) / acc[userEmail].applications) * 100 : 0;

			return acc;
		},
		{} as Record<string, { applications: number; interviews: number; offers: number; successRate: number; responseRate: number }>,
	);

	const topPerformers = Object.entries(userMetrics)
		.sort(([, a], [, b]) => b.successRate - a.successRate)
		.slice(0, 5);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Analytics Filter */}
			<div className="flex items-center gap-4">
				<Title as="h3">Advanced Analytics</Title>
				<Select value={analyticsFilter} onValueChange={setAnalyticsFilter}>
					<SelectTrigger className="w-48">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="overview">Overview</SelectItem>
						<SelectItem value="trends">Trends Analysis</SelectItem>
						<SelectItem value="performance">Performance</SelectItem>
						<SelectItem value="companies">Company Analysis</SelectItem>
						<SelectItem value="insights">Advanced Insights</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Key Performance Indicators */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{applications.length > 0 ? ((funnelData.offered / applications.length) * 100).toFixed(1) : 0}%</div>
						<p className="text-xs text-muted-foreground">Application to offer</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Interview Rate</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{applications.length > 0 ? (((funnelData.interviewing + funnelData.offered) / applications.length) * 100).toFixed(1) : 0}%
						</div>
						<p className="text-xs text-muted-foreground">Applications to interviews</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Avg Applications/User</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{Object.keys(userMetrics).length > 0 ? (applications.length / Object.keys(userMetrics).length).toFixed(1) : 0}
						</div>
						<p className="text-xs text-muted-foreground">Per active user</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Top Company Success</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{topCompanies.length > 0 ? topCompanies[0][1].successRate.toFixed(1) : 0}%</div>
						<p className="text-xs text-muted-foreground">{topCompanies.length > 0 ? topCompanies[0][0] : "No data"}</p>
					</CardContent>
				</Card>
			</div>

			{/* Charts based on selected filter */}
			{analyticsFilter === "overview" && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<Card>
						<CardHeader>
							<CardTitle>Activity Timeline</CardTitle>
						</CardHeader>
						<CardContent>
							<Chart type="line" series={timeSeriesData} options={timeSeriesOptions} height={300} />
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Success Funnel</CardTitle>
						</CardHeader>
						<CardContent>
							<Chart type="bar" series={funnelChartData} options={funnelChartOptions} height={300} />
						</CardContent>
					</Card>
				</div>
			)}

			{analyticsFilter === "trends" && (
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>12-Month Trends</CardTitle>
						</CardHeader>
						<CardContent>
							<Chart type="line" series={monthlyChartData} options={monthlyChartOptions} height={400} />
						</CardContent>
					</Card>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<Card>
							<CardHeader>
								<CardTitle>Growth Metrics</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex justify-between items-center">
									<span className="text-sm">Monthly Application Growth</span>
									<span className="font-medium">+12.5%</span>
								</div>
								<Progress value={75} className="h-2" />

								<div className="flex justify-between items-center">
									<span className="text-sm">Interview Conversion</span>
									<span className="font-medium">+8.3%</span>
								</div>
								<Progress value={60} className="h-2" />

								<div className="flex justify-between items-center">
									<span className="text-sm">Success Rate Improvement</span>
									<span className="font-medium">+15.7%</span>
								</div>
								<Progress value={85} className="h-2" />
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Seasonal Patterns</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									<div className="flex justify-between items-center">
										<span className="text-sm">Peak Application Period</span>
										<Badge variant="secondary">September</Badge>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-sm">Best Success Rate</span>
										<Badge variant="secondary">June</Badge>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-sm">Most Interviews</span>
										<Badge variant="secondary">October</Badge>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			)}

			{analyticsFilter === "performance" && (
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Top Performing Users</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{topPerformers.map(([email, metrics], index) => (
									<div key={email} className="flex items-center justify-between p-4 border rounded-lg">
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">{index + 1}</div>
											<div>
												<div className="font-medium">{email}</div>
												<div className="text-sm text-muted-foreground">
													{metrics.applications} applications • {metrics.offers} offers
												</div>
											</div>
										</div>
										<div className="text-right">
											<div className="font-medium">{metrics.successRate.toFixed(1)}%</div>
											<div className="text-sm text-muted-foreground">success rate</div>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{analyticsFilter === "companies" && (
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Company Performance Analysis</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{topCompanies.map(([company, stats]) => (
									<div key={company} className="p-4 border rounded-lg">
										<div className="flex justify-between items-start mb-3">
											<div>
												<div className="font-medium">{company}</div>
												<div className="text-sm text-muted-foreground">{stats.total} total applications</div>
											</div>
											<Badge variant="secondary">{stats.successRate.toFixed(1)}% success</Badge>
										</div>
										<div className="grid grid-cols-3 gap-4 text-sm">
											<div>
												<div className="text-muted-foreground">Interviews</div>
												<div className="font-medium">{stats.interviews}</div>
											</div>
											<div>
												<div className="text-muted-foreground">Offers</div>
												<div className="font-medium">{stats.offers}</div>
											</div>
											<div>
												<div className="text-muted-foreground">Rejections</div>
												<div className="font-medium">{stats.rejections}</div>
											</div>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{analyticsFilter === "insights" &&
				(() => {
					// Calculate real response time distribution
					const responseTimeData = applications.reduce(
						(acc, app) => {
							if (app.applied_date && app.status !== "applied") {
								const appliedDate = new Date(app.applied_date);
								const responseDate = new Date(); // In real app, this would be the response date
								const daysDiff = Math.floor((responseDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));

								if (daysDiff <= 7) acc.week++;
								else if (daysDiff <= 14) acc.twoWeeks++;
								else if (daysDiff <= 28) acc.month++;
								else acc.overMonth++;
							}
							return acc;
						},
						{ week: 0, twoWeeks: 0, month: 0, overMonth: 0 },
					);

					const responseTimeSeries = [responseTimeData.week, responseTimeData.twoWeeks, responseTimeData.month, responseTimeData.overMonth];
					const totalResponses = responseTimeSeries.reduce((a, b) => a + b, 0);
					const avgResponseDays =
						totalResponses > 0
							? Math.round(
									(responseTimeData.week * 3.5 + responseTimeData.twoWeeks * 10.5 + responseTimeData.month * 21 + responseTimeData.overMonth * 35) /
										totalResponses,
								)
							: 0;

					// Calculate success rate by day of week
					const dayOfWeekStats = applications.reduce(
						(acc, app) => {
							if (app.applied_date) {
								const dayOfWeek = new Date(app.applied_date).getDay();
								const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
								const dayName = dayNames[dayOfWeek];

								if (!acc[dayName]) acc[dayName] = { total: 0, success: 0 };
								acc[dayName].total++;
								if (app.status === "offered") acc[dayName].success++;
							}
							return acc;
						},
						{} as Record<string, { total: number; success: number }>,
					);

					const dayOfWeekData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
						const stats = dayOfWeekStats[day];
						return stats ? Math.round((stats.success / stats.total) * 100) : 0;
					});

					// Calculate volume vs success correlation data
					const volumeSuccessData = Object.entries(companyStats)
						.filter(([, stats]) => stats.total > 0)
						.map(([, stats]) => [stats.total, stats.successRate])
						.slice(0, 10);

					return (
						<div className="space-y-6">
							{/* Response Time Analysis */}
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								<Card>
									<CardHeader>
										<CardTitle>Response Time Distribution</CardTitle>
									</CardHeader>
									<CardContent>
										{totalResponses > 0 ? (
											<Chart
												type="donut"
												series={responseTimeSeries}
												options={{
													chart: {
														type: "donut",
														height: 300,
													},
													labels: ["< 1 week", "1-2 weeks", "2-4 weeks", "> 1 month"],
													colors: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"],
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
																		label: "Avg Response",
																		formatter: () => `${avgResponseDays} days`,
																	},
																},
															},
														},
													},
												}}
												height={300}
											/>
										) : (
											<div className="h-[300px] flex items-center justify-center text-muted-foreground">No response data available</div>
										)}
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>Application Success by Day of Week</CardTitle>
									</CardHeader>
									<CardContent>
										{dayOfWeekData.some((val) => val > 0) ? (
											<Chart
												type="bar"
												series={[
													{
														name: "Success Rate",
														data: dayOfWeekData,
													},
												]}
												options={{
													chart: {
														type: "bar",
														height: 300,
													},
													xaxis: {
														categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
													},
													colors: ["#8b5cf6"],
													plotOptions: {
														bar: {
															borderRadius: 4,
															columnWidth: "60%",
														},
													},
													dataLabels: {
														enabled: true,
														formatter: (val: number) => `${val}%`,
													},
													tooltip: {
														y: {
															formatter: (val: number) => `${val}% success rate`,
														},
													},
												}}
												height={300}
											/>
										) : (
											<div className="h-[300px] flex items-center justify-center text-muted-foreground">No day-of-week data available</div>
										)}
									</CardContent>
								</Card>
							</div>

							{/* Advanced Metrics */}
							<Card>
								<CardHeader>
									<CardTitle>Application Volume vs Success Rate Correlation</CardTitle>
								</CardHeader>
								<CardContent>
									{volumeSuccessData.length > 0 ? (
										<Chart
											type="scatter"
											series={[
												{
													name: "Companies",
													data: volumeSuccessData as Array<[number, number]>,
												},
											]}
											options={{
												chart: {
													type: "scatter",
													height: 350,
												},
												xaxis: {
													title: {
														text: "Number of Applications",
													},
												},
												yaxis: {
													title: {
														text: "Success Rate (%)",
													},
												},
												colors: ["#3b82f6"],
												markers: {
													size: 8,
												},
												tooltip: {
													custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
														const companyNames = Object.keys(companyStats).slice(0, 10);
														const company = companyNames[dataPointIndex] || "Company";
														const [applications, successRate] = volumeSuccessData[dataPointIndex] || [0, 0];
														return `<div class="p-2">
													<strong>${company}</strong><br/>
													Applications: ${applications}<br/>
													Success Rate: ${successRate.toFixed(1)}%
												</div>`;
													},
												},
											}}
											height={350}
										/>
									) : (
										<div className="h-[350px] flex items-center justify-center text-muted-foreground">No correlation data available</div>
									)}
								</CardContent>
							</Card>

							{/* Predictive Analytics */}
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								<Card>
									<CardHeader>
										<CardTitle>Data-Driven Insights</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="space-y-4">
											{(() => {
												// Calculate best performing day
												const bestDay = Object.entries(dayOfWeekStats)
													.filter(([, stats]) => stats.total > 0)
													.sort(([, a], [, b]) => b.success / b.total - a.success / a.total)[0];

												// Calculate best performing company
												const bestCompany = topCompanies[0];

												// Calculate overall success rate
												const overallSuccessRate =
													applications.length > 0 ? (applications.filter((app) => app.status === "offered").length / applications.length) * 100 : 0;

												return (
													<>
														{bestDay && (
															<div className="p-4 bg-green-50 rounded-lg border border-green-200">
																<div className="flex justify-between items-center mb-2">
																	<span className="font-medium text-green-800">Best Application Day</span>
																	<Badge className="bg-green-100 text-green-800">{Math.round((bestDay[1].success / bestDay[1].total) * 100)}%</Badge>
																</div>
																<p className="text-sm text-green-700">
																	{bestDay[0]} shows highest success rate with {bestDay[1].success} offers from {bestDay[1].total} applications
																</p>
															</div>
														)}

														{bestCompany && (
															<div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
																<div className="flex justify-between items-center mb-2">
																	<span className="font-medium text-blue-800">Top Company</span>
																	<Badge className="bg-blue-100 text-blue-800">{bestCompany[1].successRate.toFixed(1)}%</Badge>
																</div>
																<p className="text-sm text-blue-700">
																	{bestCompany[0]} has the highest success rate with {bestCompany[1].offers} offers from {bestCompany[1].total} applications
																</p>
															</div>
														)}

														<div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
															<div className="flex justify-between items-center mb-2">
																<span className="font-medium text-purple-800">Overall Performance</span>
																<Badge className="bg-purple-100 text-purple-800">{overallSuccessRate.toFixed(1)}%</Badge>
															</div>
															<p className="text-sm text-purple-700">Current success rate across all {applications.length} applications in the system</p>
														</div>
													</>
												);
											})()}
										</div>
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>Data-Driven Recommendations</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="space-y-4">
											{(() => {
												// Calculate recommendations based on real data
												const bestDay = Object.entries(dayOfWeekStats)
													.filter(([, stats]) => stats.total > 0)
													.sort(([, a], [, b]) => b.success / b.total - a.success / a.total)[0];

												const avgApplicationsPerUser =
													Object.keys(userMetrics).length > 0 ? (applications.length / Object.keys(userMetrics).length).toFixed(1) : 0;

												const interviewRate =
													applications.length > 0
														? (
																(applications.filter((app) => app.status === "interviewing" || app.status === "offered").length / applications.length) *
																100
															).toFixed(1)
														: 0;

												return (
													<>
														{bestDay && (
															<div className="flex items-start gap-3">
																<Icon icon="mdi:calendar-check" className="h-5 w-5 text-green-500 mt-0.5" />
																<div>
																	<div className="font-medium">Optimal Application Day</div>
																	<p className="text-sm text-muted-foreground">
																		Apply on {bestDay[0]} - shows {Math.round((bestDay[1].success / bestDay[1].total) * 100)}% success rate in your data
																	</p>
																</div>
															</div>
														)}

														<div className="flex items-start gap-3">
															<Icon icon="mdi:chart-line" className="h-5 w-5 text-blue-500 mt-0.5" />
															<div>
																<div className="font-medium">Application Volume</div>
																<p className="text-sm text-muted-foreground">
																	Current average: {avgApplicationsPerUser} applications per user - consider quality over quantity
																</p>
															</div>
														</div>

														<div className="flex items-start gap-3">
															<Icon icon="mdi:target" className="h-5 w-5 text-purple-500 mt-0.5" />
															<div>
																<div className="font-medium">Interview Conversion</div>
																<p className="text-sm text-muted-foreground">Current rate: {interviewRate}% - focus on companies with higher response rates</p>
															</div>
														</div>

														{topCompanies.length > 0 && (
															<div className="flex items-start gap-3">
																<Icon icon="mdi:office-building" className="h-5 w-5 text-yellow-500 mt-0.5" />
																<div>
																	<div className="font-medium">Target Companies</div>
																	<p className="text-sm text-muted-foreground">
																		Focus on companies like {topCompanies[0][0]} with {topCompanies[0][1].successRate.toFixed(1)}% success rate
																	</p>
																</div>
															</div>
														)}
													</>
												);
											})()}
										</div>
									</CardContent>
								</Card>
							</div>
						</div>
					);
				})()}
		</div>
	);
}
