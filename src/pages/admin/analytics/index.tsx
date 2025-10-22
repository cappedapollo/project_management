import { useAuth } from "@/components/auth/use-auth";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Text, Title } from "@/ui/typography";
import { Col, DatePicker, Progress, Row, Select, Space, Statistic, Table, Tabs } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";

const { Option } = Select;
const { RangePicker } = DatePicker;

interface AdminAnalytics {
	overview: {
		totalUsers: number;
		activeUsers: number;
		totalContent: number;
		systemUptime: number;
		storageUsed: number;
		apiRequests: number;
	};
	userMetrics: {
		newUsersThisMonth: number;
		userGrowthRate: number;
		averageSessionDuration: number;
		userRetentionRate: number;
		topActiveUsers: Array<{
			id: number;
			name: string;
			email: string;
			total_actions: number;
			last_active: string;
		}>;
	};
	contentMetrics: {
		contentByType: Record<string, number>;
		contentGrowthRate: number;
		averageContentPerUser: number;
		mostActiveContentType: string;
		contentCreationTrend: Array<{
			date: string;
			count: number;
			type: string;
		}>;
	};
	systemMetrics: {
		performanceScore: number;
		errorRate: number;
		responseTime: number;
		databaseQueries: number;
		serverLoad: number;
		memoryUsage: number;
	};
	reports: {
		userActivity: Array<{
			date: string;
			active_users: number;
			new_users: number;
			sessions: number;
		}>;
		contentActivity: Array<{
			date: string;
			applications: number;
			interviews: number;
		}>;
		systemHealth: Array<{
			date: string;
			uptime: number;
			response_time: number;
			error_rate: number;
		}>;
	};
}

interface TimeFilter {
	start: string;
	end: string;
	period: "week" | "month" | "quarter" | "year" | "custom";
}

const AdminAnalyticsPage: React.FC = () => {
	const { user, access_token } = useAuth();
	const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
	const [timeFilter, setTimeFilter] = useState<TimeFilter>({
		start: dayjs().subtract(30, "days").toISOString(),
		end: dayjs().toISOString(),
		period: "month",
	});
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState("overview");

	const fetchAnalytics = useCallback(async () => {
		try {
			const response = await fetch(`/api/admin/analytics?start=${timeFilter.start}&end=${timeFilter.end}`, {
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				const data = await response.json();
				setAnalytics(data.analytics);
			}
		} catch (error) {
			console.error("Error fetching analytics:", error);
		} finally {
			setLoading(false);
		}
	}, [timeFilter.start, timeFilter.end, access_token]);

	useEffect(() => {
		if (user?.role === 0) {
			fetchAnalytics();
		}
	}, [user?.role, fetchAnalytics]);

	const handlePeriodChange = (period: string) => {
		let start: dayjs.Dayjs;
		const end = dayjs();

		switch (period) {
			case "week":
				start = dayjs().subtract(7, "days");
				break;
			case "month":
				start = dayjs().subtract(30, "days");
				break;
			case "quarter":
				start = dayjs().subtract(90, "days");
				break;
			case "year":
				start = dayjs().subtract(365, "days");
				break;
			default:
				return;
		}

		setTimeFilter({
			start: start.toISOString(),
			end: end.toISOString(),
			period: period as "week" | "month" | "quarter" | "year" | "custom",
		});
	};

	const exportReport = async (reportType: string) => {
		try {
			const response = await fetch("/api/admin/export-report", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					reportType,
					startDate: timeFilter.start,
					endDate: timeFilter.end,
				}),
			});

			if (response.ok) {
				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `${reportType}-report-${dayjs().format("YYYY-MM-DD")}.csv`;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);
			}
		} catch (error) {
			console.error("Error exporting report:", error);
		}
	};

	const OverviewTab = () => {
		if (!analytics) return null;

		const { overview, systemMetrics } = analytics;

		return (
			<div className="space-y-6">
				{/* Key Metrics */}
				<Row gutter={16}>
					<Col span={6}>
						<Card>
							<Statistic
								title="Total Users"
								value={overview.totalUsers}
								prefix={<Icon icon="solar:users-group-rounded-bold" />}
								valueStyle={{ color: "#1890ff" }}
							/>
						</Card>
					</Col>
					<Col span={6}>
						<Card>
							<Statistic title="Active Users" value={overview.activeUsers} prefix={<Icon icon="solar:user-check-bold" />} valueStyle={{ color: "#3f8600" }} />
						</Card>
					</Col>
					<Col span={6}>
						<Card>
							<Statistic title="Total Content" value={overview.totalContent} prefix={<Icon icon="solar:folder-bold" />} valueStyle={{ color: "#722ed1" }} />
						</Card>
					</Col>
					<Col span={6}>
						<Card>
							<Statistic title="API Requests" value={overview.apiRequests} prefix={<Icon icon="solar:server-bold" />} valueStyle={{ color: "#fa8c16" }} />
						</Card>
					</Col>
				</Row>

				{/* System Health */}
				<Row gutter={16}>
					<Col span={12}>
						<Card>
							<CardHeader>
								<CardTitle>System Performance</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div>
										<div className="flex justify-between mb-1">
											<span>Performance Score</span>
											<span>{systemMetrics.performanceScore}/100</span>
										</div>
										<Progress
											percent={systemMetrics.performanceScore}
											status={systemMetrics.performanceScore > 80 ? "success" : systemMetrics.performanceScore > 60 ? "normal" : "exception"}
										/>
									</div>
									<div>
										<div className="flex justify-between mb-1">
											<span>Error Rate</span>
											<span>{systemMetrics.errorRate}%</span>
										</div>
										<Progress
											percent={systemMetrics.errorRate}
											status={systemMetrics.errorRate < 1 ? "success" : systemMetrics.errorRate < 5 ? "normal" : "exception"}
										/>
									</div>
									<div>
										<div className="flex justify-between mb-1">
											<span>Response Time</span>
											<span>{systemMetrics.responseTime}ms</span>
										</div>
										<Progress
											percent={Math.min((systemMetrics.responseTime / 1000) * 100, 100)}
											status={systemMetrics.responseTime < 200 ? "success" : systemMetrics.responseTime < 500 ? "normal" : "exception"}
										/>
									</div>
									<div>
										<div className="flex justify-between mb-1">
											<span>Server Load</span>
											<span>{systemMetrics.serverLoad}%</span>
										</div>
										<Progress
											percent={systemMetrics.serverLoad}
											status={systemMetrics.serverLoad < 70 ? "success" : systemMetrics.serverLoad < 85 ? "normal" : "exception"}
										/>
									</div>
								</div>
							</CardContent>
						</Card>
					</Col>
					<Col span={12}>
						<Card>
							<CardHeader>
								<CardTitle>Resource Usage</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<Statistic title="System Uptime" value={Math.round(overview.systemUptime / 24)} suffix="days" valueStyle={{ color: "#52c41a" }} />
									<Statistic title="Storage Used" value={(overview.storageUsed / 1024).toFixed(1)} suffix="GB" valueStyle={{ color: "#1890ff" }} />
									<Statistic
										title="Memory Usage"
										value={systemMetrics.memoryUsage}
										suffix="%"
										valueStyle={{ color: systemMetrics.memoryUsage > 80 ? "#ff4d4f" : "#52c41a" }}
									/>
									<Statistic title="Database Queries" value={systemMetrics.databaseQueries} suffix="/min" valueStyle={{ color: "#722ed1" }} />
								</div>
							</CardContent>
						</Card>
					</Col>
				</Row>
			</div>
		);
	};

	const UserMetricsTab = () => {
		if (!analytics) return null;

		const { userMetrics } = analytics;

		const userColumns = [
			{
				title: "User",
				key: "user",
				render: (record: any) => (
					<div>
						<div className="font-medium">{record.name}</div>
						<div className="text-sm text-gray-600">{record.email}</div>
					</div>
				),
			},
			{
				title: "Total Actions",
				dataIndex: "total_actions",
				key: "total_actions",
				sorter: (a: any, b: any) => a.total_actions - b.total_actions,
			},
			{
				title: "Last Active",
				dataIndex: "last_active",
				key: "last_active",
				render: (date: string) => dayjs(date).format("MMM DD, YYYY HH:mm"),
			},
		];

		return (
			<div className="space-y-6">
				<Row gutter={16}>
					<Col span={6}>
						<Card>
							<Statistic
								title="New Users This Month"
								value={userMetrics.newUsersThisMonth}
								prefix={<Icon icon="solar:user-plus-bold" />}
								valueStyle={{ color: "#52c41a" }}
							/>
						</Card>
					</Col>
					<Col span={6}>
						<Card>
							<Statistic
								title="User Growth Rate"
								value={userMetrics.userGrowthRate}
								suffix="%"
								prefix={<Icon icon="solar:graph-up-bold" />}
								valueStyle={{ color: userMetrics.userGrowthRate > 0 ? "#52c41a" : "#ff4d4f" }}
							/>
						</Card>
					</Col>
					<Col span={6}>
						<Card>
							<Statistic
								title="Avg Session Duration"
								value={Math.round(userMetrics.averageSessionDuration)}
								suffix="min"
								prefix={<Icon icon="solar:clock-circle-bold" />}
								valueStyle={{ color: "#1890ff" }}
							/>
						</Card>
					</Col>
					<Col span={6}>
						<Card>
							<Statistic
								title="User Retention Rate"
								value={userMetrics.userRetentionRate}
								suffix="%"
								prefix={<Icon icon="solar:shield-check-bold" />}
								valueStyle={{ color: "#722ed1" }}
							/>
						</Card>
					</Col>
				</Row>

				<Card>
					<CardHeader>
						<CardTitle>Top Active Users</CardTitle>
					</CardHeader>
					<CardContent>
						<Table columns={userColumns} dataSource={userMetrics.topActiveUsers} rowKey="id" pagination={false} size="small" />
					</CardContent>
				</Card>
			</div>
		);
	};

	const ContentMetricsTab = () => {
		if (!analytics) return null;

		const { contentMetrics } = analytics;

		return (
			<div className="space-y-6">
				<Row gutter={16}>
					<Col span={8}>
						<Card>
							<Statistic
								title="Content Growth Rate"
								value={contentMetrics.contentGrowthRate}
								suffix="%"
								prefix={<Icon icon="solar:graph-up-bold" />}
								valueStyle={{ color: contentMetrics.contentGrowthRate > 0 ? "#52c41a" : "#ff4d4f" }}
							/>
						</Card>
					</Col>
					<Col span={8}>
						<Card>
							<Statistic
								title="Avg Content Per User"
								value={contentMetrics.averageContentPerUser}
								precision={1}
								prefix={<Icon icon="solar:folder-bold" />}
								valueStyle={{ color: "#1890ff" }}
							/>
						</Card>
					</Col>
					<Col span={8}>
						<Card>
							<Statistic
								title="Most Active Type"
								value={contentMetrics.mostActiveContentType}
								prefix={<Icon icon="solar:star-bold" />}
								valueStyle={{ color: "#fa8c16" }}
							/>
						</Card>
					</Col>
				</Row>

				<Row gutter={16}>
					<Col span={12}>
						<Card>
							<CardHeader>
								<CardTitle>Content Distribution</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{Object.entries(contentMetrics.contentByType).map(([type, count]) => (
										<div key={type} className="flex justify-between items-center">
											<span className="flex items-center gap-2 capitalize">
												<Icon icon={`solar:${type === "application" ? "briefcase" : type === "interview" ? "calendar" : "document"}-bold`} size={16} />
												{type}s
											</span>
											<Badge count={count} style={{ backgroundColor: "#1890ff" }} />
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</Col>
					<Col span={12}>
						<Card>
							<CardHeader>
								<CardTitle>Content Creation Trend</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="h-64 flex items-center justify-center text-gray-500">
									<div className="text-center">
										<Icon icon="solar:chart-2-bold" size={48} className="mx-auto mb-2 opacity-50" />
										<Text>Content trend chart would be displayed here</Text>
										<Text className="text-sm">Using Chart.js or similar library</Text>
									</div>
								</div>
							</CardContent>
						</Card>
					</Col>
				</Row>
			</div>
		);
	};

	const ReportsTab = () => {
		if (!analytics) return null;

		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<Title level={4}>Generate Reports</Title>
					<Space>
						<Button onClick={() => exportReport("user-activity")}>
							<Icon icon="solar:download-bold" size={16} className="mr-1" />
							Export User Activity
						</Button>
						<Button onClick={() => exportReport("content-activity")}>
							<Icon icon="solar:download-bold" size={16} className="mr-1" />
							Export Content Activity
						</Button>
						<Button onClick={() => exportReport("system-health")}>
							<Icon icon="solar:download-bold" size={16} className="mr-1" />
							Export System Health
						</Button>
					</Space>
				</div>

				<Row gutter={16}>
					<Col span={8}>
						<Card>
							<CardHeader>
								<CardTitle>User Activity Report</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									<Text className="text-sm text-gray-600">Daily active users, new registrations, and session data</Text>
									<div className="text-2xl font-bold text-blue-600">{analytics.reports.userActivity.length} days</div>
									<Text className="text-xs text-gray-500">Data points available</Text>
								</div>
							</CardContent>
						</Card>
					</Col>
					<Col span={8}>
						<Card>
							<CardHeader>
								<CardTitle>Content Activity Report</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									<Text className="text-sm text-gray-600">Content creation, updates, and engagement metrics</Text>
									<div className="text-2xl font-bold text-green-600">{analytics.reports.contentActivity.length} days</div>
									<Text className="text-xs text-gray-500">Data points available</Text>
								</div>
							</CardContent>
						</Card>
					</Col>
					<Col span={8}>
						<Card>
							<CardHeader>
								<CardTitle>System Health Report</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									<Text className="text-sm text-gray-600">Uptime, response times, and error rates</Text>
									<div className="text-2xl font-bold text-purple-600">{analytics.reports.systemHealth.length} days</div>
									<Text className="text-xs text-gray-500">Data points available</Text>
								</div>
							</CardContent>
						</Card>
					</Col>
				</Row>
			</div>
		);
	};

	if (user?.role !== 0) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="text-center">
						<Icon icon="solar:shield-cross-bold" size={48} className="mx-auto mb-4 text-red-500" />
						<Title level={3}>Access Denied</Title>
						<Text>You don't have permission to access this page.</Text>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="p-6">
			<div className="flex justify-between items-center mb-6">
				<div>
					<Title level={2} className="flex items-center gap-2">
						<Icon icon="solar:chart-2-bold" size={24} />
						Admin Analytics & Reports
					</Title>
					<Text className="text-gray-600">Comprehensive analytics and reporting for system administration</Text>
				</div>
				<Space>
					<Select value={timeFilter.period} onChange={handlePeriodChange} style={{ width: 120 }}>
						<Option value="week">Last Week</Option>
						<Option value="month">Last Month</Option>
						<Option value="quarter">Last Quarter</Option>
						<Option value="year">Last Year</Option>
					</Select>
					<RangePicker
						value={[dayjs(timeFilter.start), dayjs(timeFilter.end)]}
						onChange={(dates) => {
							if (dates?.[0] && dates?.[1]) {
								setTimeFilter({
									start: dates[0].toISOString(),
									end: dates[1].toISOString(),
									period: "custom",
								});
							}
						}}
					/>
				</Space>
			</div>

			<Card>
				<CardContent>
					<Tabs
						activeKey={activeTab}
						onChange={setActiveTab}
						items={[
							{
								key: "overview",
								label: (
									<span>
										<Icon icon="solar:chart-2-bold" size={16} className="mr-1" />
										Overview
									</span>
								),
								children: <OverviewTab />,
							},
							{
								key: "users",
								label: (
									<span>
										<Icon icon="solar:users-group-rounded-bold" size={16} className="mr-1" />
										User Metrics
									</span>
								),
								children: <UserMetricsTab />,
							},
							{
								key: "content",
								label: (
									<span>
										<Icon icon="solar:folder-bold" size={16} className="mr-1" />
										Content Metrics
									</span>
								),
								children: <ContentMetricsTab />,
							},
							{
								key: "reports",
								label: (
									<span>
										<Icon icon="solar:document-text-bold" size={16} className="mr-1" />
										Reports
									</span>
								),
								children: <ReportsTab />,
							},
						]}
					/>
				</CardContent>
			</Card>
		</div>
	);
};

export default AdminAnalyticsPage;
