import { useAuth } from "@/components/auth/use-auth";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Text, Title } from "@/ui/typography";
import { Alert, Col, DatePicker, List, Progress, Row, Select, Space, Statistic, Table } from "antd";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useEffect, useState } from "react";

// Configure dayjs plugins
dayjs.extend(relativeTime);

interface SystemStats {
	users: {
		total: number;
		active: number;
		newThisMonth: number;
		adminCount: number;
	};
	content: {
		totalApplications: number;
		totalInterviews: number;
		totalResumes: number;
		totalProposals: number;
	};
	activity: {
		dailyActiveUsers: number;
		totalSessions: number;
		averageSessionDuration: number;
		totalPageViews: number;
	};
	system: {
		serverUptime: number;
		databaseSize: number;
		storageUsed: number;
		storageLimit: number;
		apiRequestsToday: number;
		errorRate: number;
	};
}

interface RecentActivity {
	id: number;
	source_type: "user_activity" | "caller_activity";
	user_id: number;
	user_name: string;
	user_role_name: string;
	user_role: number;
	action: string;
	entity_type: string;
	entity_id: number;
	entity_name: string;
	details: any;
	ip_address: string;
	created_at: string;
	target_user_name?: string;
	duration_minutes?: number;
	outcome?: string;
	description: string;
}

interface SystemAlert {
	id: number;
	type: "info" | "warning" | "error" | "success";
	title: string;
	message: string;
	created_at: string;
	resolved: boolean;
}

interface TopUser {
	id: number;
	full_name: string;
	username: string;
	total_applications: number;
	total_interviews: number;
	last_login: string;
}

const AdminSystemOverviewPage: React.FC = () => {
	const { user, access_token } = useAuth();
	const [stats, setStats] = useState<SystemStats | null>(null);
	const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
	const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
	const [topUsers, setTopUsers] = useState<TopUser[]>([]);

	const [loading, setLoading] = useState(true);
	const [activityFilter, setActivityFilter] = useState<"all" | "user_activity" | "caller_activity">("all");
	const [userRoleFilter, setUserRoleFilter] = useState<"all" | "0" | "1" | "2">("all");
	const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all");
	const [customDateRange, setCustomDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
	const [systemDateFilter, setSystemDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all");
	const [systemCustomDateRange, setSystemCustomDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

	useEffect(() => {
		if (user?.role === 0) {
			fetchData();
			// Set up auto-refresh every 30 seconds
			const interval = setInterval(fetchData, 30000);
			return () => clearInterval(interval);
		}
	}, [user]);

	// Refetch data when date filters change
	useEffect(() => {
		if (user?.role === 0) {
			fetchData();
		}
	}, [dateFilter, customDateRange, systemDateFilter, systemCustomDateRange]);

	const fetchData = async () => {
		try {
			// Build date filter parameters for system stats
			const systemDateParams = new URLSearchParams();
			if (systemDateFilter === "today") {
				systemDateParams.set("date_filter", "today");
			} else if (systemDateFilter === "week") {
				systemDateParams.set("date_filter", "week");
			} else if (systemDateFilter === "month") {
				systemDateParams.set("date_filter", "month");
			} else if (systemDateFilter === "custom" && systemCustomDateRange && systemCustomDateRange[0] && systemCustomDateRange[1]) {
				systemDateParams.set("date_filter", "custom");
				systemDateParams.set("start_date", systemCustomDateRange[0].format("YYYY-MM-DD"));
				systemDateParams.set("end_date", systemCustomDateRange[1].format("YYYY-MM-DD"));
			}

			const systemStatsUrl = `/api/admin/system-stats${systemDateParams.toString() ? `?${systemDateParams.toString()}` : ""}`;

			// Build date filter parameters for top users
			const dateParams = new URLSearchParams();
			if (dateFilter === "today") {
				dateParams.set("date_filter", "today");
			} else if (dateFilter === "week") {
				dateParams.set("date_filter", "week");
			} else if (dateFilter === "month") {
				dateParams.set("date_filter", "month");
			} else if (dateFilter === "custom" && customDateRange && customDateRange[0] && customDateRange[1]) {
				dateParams.set("date_filter", "custom");
				dateParams.set("start_date", customDateRange[0].format("YYYY-MM-DD"));
				dateParams.set("end_date", customDateRange[1].format("YYYY-MM-DD"));
			}

			const topUsersUrl = `/api/admin/top-users${dateParams.toString() ? `?${dateParams.toString()}` : ""}`;

			const [statsRes, activityRes, alertsRes, usersRes] = await Promise.all([
				fetch(systemStatsUrl, {
					headers: {
						Authorization: `Bearer ${access_token}`,
						"Content-Type": "application/json",
					},
				}),
				fetch("/api/admin/recent-activity", {
					headers: {
						Authorization: `Bearer ${access_token}`,
						"Content-Type": "application/json",
					},
				}),
				fetch("/api/admin/system-alerts", {
					headers: {
						Authorization: `Bearer ${access_token}`,
						"Content-Type": "application/json",
					},
				}),
				fetch(topUsersUrl, {
					headers: {
						Authorization: `Bearer ${access_token}`,
						"Content-Type": "application/json",
					},
				}),
			]);

			if (statsRes.ok) {
				const data = await statsRes.json();
				setStats(data.stats);
			}

			if (activityRes.ok) {
				const data = await activityRes.json();
				setRecentActivity(data.activities || []);
			}

			if (alertsRes.ok) {
				const data = await alertsRes.json();
				setSystemAlerts(data.alerts || []);
			}

			if (usersRes.ok) {
				const data = await usersRes.json();
				setTopUsers(data.users || []);
			} else {
				console.error("❌ Failed to fetch top users:", usersRes.status, usersRes.statusText);
			}
		} catch (error) {
			console.error("Error fetching system data:", error);
		} finally {
			setLoading(false);
		}
	};

	const getActivityIcon = (activity: RecentActivity) => {
		// Different icons based on source type and activity
		if (activity.source_type === "caller_activity") {
			const callerIcons = {
				call_scheduled: "solar:phone-calling-bold",
				call_started: "solar:phone-bold",
				call_completed: "solar:phone-check-bold",
				call_failed: "solar:phone-cross-bold",
				call_rescheduled: "solar:calendar-edit-bold",
				call_cancelled: "solar:phone-cancel-bold",
			};
			return callerIcons[activity.action as keyof typeof callerIcons] || "solar:phone-bold";
		}

		const icons = {
			project: "solar:folder-bold",
			task: "solar:checklist-bold",
			job_application: "solar:document-send-bold",
			interview: "solar:video-camera-bold",
			resume: "solar:document-text-bold",
			proposal: "solar:file-document-edit-bold",
			user: "solar:user-bold",
			call: "solar:phone-bold",
		};
		return icons[activity.entity_type as keyof typeof icons] || "solar:notification-bold";
	};

	const getAlertColor = (type: string) => {
		const colors = {
			info: "info",
			warning: "warning",
			error: "error",
			success: "success",
		};
		return colors[type as keyof typeof colors] || "info";
	};

	const topUsersColumns = [
		{
			title: "User",
			key: "user",
			render: (record: TopUser) => (
				<div>
					<div className="font-medium">{record.full_name || record.username}</div>
					<div className="text-sm text-gray-600">@{record.username}</div>
				</div>
			),
		},
		{
			title: "Job Applications",
			dataIndex: "total_applications",
			key: "applications",
			sorter: (a: TopUser, b: TopUser) => a.total_applications - b.total_applications,
		},
		{
			title: "Call Schedules",
			dataIndex: "total_interviews",
			key: "interviews",
			sorter: (a: TopUser, b: TopUser) => (a.total_interviews || 0) - (b.total_interviews || 0),
		},
		{
			title: "Last Login",
			dataIndex: "last_login",
			key: "last_login",
			render: (date: string) => (date ? dayjs(date).format("MMM DD, YYYY") : "Never"),
		},
	];

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
						System Overview
					</Title>
					<Text className="text-gray-600">Monitor system health, user activity, and platform performance</Text>
				</div>
				<Button onClick={fetchData} loading={loading}>
					<Icon icon="solar:refresh-bold" size={16} className="mr-1" />
					Refresh
				</Button>
			</div>

			{/* Date Filter Controls */}
			<Card className="mb-6">
				<CardContent className="py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<Text strong>System Overview Date Filter:</Text>
							<Select
								value={systemDateFilter}
								onChange={(value) => {
									setSystemDateFilter(value);
									if (value !== "custom") {
										setSystemCustomDateRange(null);
									}
								}}
								style={{ width: 140 }}
								size="small"
							>
								<Select.Option value="all">All Time</Select.Option>
								<Select.Option value="today">Today</Select.Option>
								<Select.Option value="week">This Week</Select.Option>
								<Select.Option value="month">This Month</Select.Option>
								<Select.Option value="custom">Custom</Select.Option>
							</Select>
							{systemDateFilter === "custom" && (
								<DatePicker.RangePicker
									value={systemCustomDateRange}
									onChange={(dates) => setSystemCustomDateRange(dates)}
									size="small"
									format="YYYY-MM-DD"
									placeholder={["Start Date", "End Date"]}
								/>
							)}
						</div>
						<div className="text-sm text-gray-500">
							{systemDateFilter === "all" && "Showing all-time data"}
							{systemDateFilter === "today" && "Showing today's data"}
							{systemDateFilter === "week" && "Showing this week's data"}
							{systemDateFilter === "month" && "Showing this month's data"}
							{systemDateFilter === "custom" &&
								systemCustomDateRange &&
								systemCustomDateRange[0] &&
								systemCustomDateRange[1] &&
								`Showing data from ${systemCustomDateRange[0].format("MMM DD, YYYY")} to ${systemCustomDateRange[1].format("MMM DD, YYYY")}`}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* System Alerts */}
			{systemAlerts.length > 0 && (
				<div className="mb-6">
					{systemAlerts.slice(0, 3).map((alert) => (
						<Alert key={alert.id} type={getAlertColor(alert.type)} message={alert.title} description={alert.message} showIcon closable className="mb-2" />
					))}
				</div>
			)}

			{/* Key Metrics */}
			{stats && (
				<>
					<Row gutter={16} className="mb-6">
						<Col span={6}>
							<Card>
								<Statistic
									title="Total Users"
									value={stats.users.total}
									prefix={<Icon icon="solar:users-group-rounded-bold" />}
									suffix={<Badge count={`+${stats.users.newThisMonth}`} style={{ backgroundColor: "#52c41a" }} />}
								/>
							</Card>
						</Col>
						<Col span={6}>
							<Card>
								<Statistic
									title="Daily Active Users"
									value={stats.activity.dailyActiveUsers}
									prefix={<Icon icon="solar:user-check-bold" />}
									valueStyle={{ color: "#3f8600" }}
								/>
							</Card>
						</Col>
						<Col span={6}>
							<Card>
								<Statistic
									title="Total Content Items"
									value={stats.content.totalApplications + stats.content.totalInterviews + stats.content.totalResumes + stats.content.totalProposals}
									prefix={<Icon icon="solar:folder-bold" />}
									valueStyle={{ color: "#1890ff" }}
								/>
							</Card>
						</Col>
						<Col span={6}>
							<Card>
								<Statistic
									title="API Requests Today"
									value={stats.system.apiRequestsToday}
									prefix={<Icon icon="solar:server-bold" />}
									suffix={
										<Badge
											count={`${stats.system.errorRate}% errors`}
											style={{
												backgroundColor: stats.system.errorRate > 5 ? "#ff4d4f" : "#52c41a",
											}}
										/>
									}
								/>
							</Card>
						</Col>
					</Row>

					{/* Content Overview */}
					<Row gutter={16} className="mb-6">
						<Col span={6}>
							<Card className="text-center">
								<CardContent className="pt-6">
									<div className="flex flex-col items-center space-y-2">
										<div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
											<Icon icon="solar:document-send-bold" size={24} className="text-blue-600" />
										</div>
										<Statistic title="Job Applications" value={stats.content.totalApplications} valueStyle={{ fontSize: "24px", color: "#1890ff" }} />
									</div>
								</CardContent>
							</Card>
						</Col>
						<Col span={6}>
							<Card className="text-center">
								<CardContent className="pt-6">
									<div className="flex flex-col items-center space-y-2">
										<div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
											<Icon icon="solar:video-camera-bold" size={24} className="text-green-600" />
										</div>
										<Statistic title="Interviews" value={stats.content.totalInterviews} valueStyle={{ fontSize: "24px", color: "#52c41a" }} />
									</div>
								</CardContent>
							</Card>
						</Col>
						<Col span={6}>
							<Card className="text-center">
								<CardContent className="pt-6">
									<div className="flex flex-col items-center space-y-2">
										<div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
											<Icon icon="solar:users-group-rounded-bold" size={24} className="text-purple-600" />
										</div>
										<Statistic
											title="Active Users"
											value={stats.users.active}
											suffix={`/ ${stats.users.total}`}
											valueStyle={{ fontSize: "24px", color: "#722ed1" }}
										/>
									</div>
								</CardContent>
							</Card>
						</Col>
						<Col span={6}>
							<Card className="text-center">
								<CardContent className="pt-6">
									<div className="flex flex-col items-center space-y-2">
										<div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
											<Icon icon="solar:chart-2-bold" size={24} className="text-orange-600" />
										</div>
										<Statistic title="Page Views Today" value={stats.activity.totalPageViews} valueStyle={{ fontSize: "24px", color: "#fa8c16" }} />
									</div>
								</CardContent>
							</Card>
						</Col>
					</Row>
				</>
			)}

			{/* Recent Activity and Top Users */}
			<Row gutter={16}>
				<Col span={12}>
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle className="flex items-center gap-2">
									<Icon icon="solar:history-bold" size={20} />
									Recent Activity
								</CardTitle>
								<Space>
									<Select value={activityFilter} onChange={setActivityFilter} size="small" style={{ width: 140 }}>
										<Select.Option value="all">All Activities</Select.Option>
										<Select.Option value="user_activity">User Activities</Select.Option>
										<Select.Option value="caller_activity">Caller Activities</Select.Option>
									</Select>
									<Select value={userRoleFilter} onChange={setUserRoleFilter} size="small" style={{ width: 120 }}>
										<Select.Option value="all">All Roles</Select.Option>
										<Select.Option value="0">Admins</Select.Option>
										<Select.Option value="1">Users</Select.Option>
										<Select.Option value="2">Callers</Select.Option>
									</Select>
								</Space>
							</div>
						</CardHeader>
						<CardContent>
							<List
								dataSource={recentActivity
									.filter((activity) => {
										if (activityFilter !== "all" && activity.source_type !== activityFilter) {
											return false;
										}
										if (userRoleFilter !== "all" && activity.user_role !== Number.parseInt(userRoleFilter)) {
											return false;
										}
										return true;
									})
									.slice(0, 15)}
								renderItem={(activity) => (
									<List.Item>
										<List.Item.Meta
											avatar={
												<div
													className={`w-8 h-8 rounded-full flex items-center justify-center ${
														activity.source_type === "caller_activity" ? "bg-green-100" : activity.user_role === 0 ? "bg-red-100" : "bg-blue-100"
													}`}
												>
													<Icon
														icon={getActivityIcon(activity)}
														size={16}
														className={
															activity.source_type === "caller_activity" ? "text-green-600" : activity.user_role === 0 ? "text-red-600" : "text-blue-600"
														}
													/>
												</div>
											}
											title={
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-2">
														<span className="font-medium">{activity.user_name}</span>
														<Badge
															count={activity.user_role_name}
															style={{
																backgroundColor: activity.user_role === 0 ? "#ff4d4f" : activity.user_role === 2 ? "#52c41a" : "#1890ff",
																fontSize: "10px",
															}}
														/>
													</div>
													<span className="text-xs text-gray-500">{dayjs(activity.created_at).fromNow()}</span>
												</div>
											}
											description={
												<div>
													<div className="text-sm">{activity.description}</div>
													{activity.duration_minutes && <div className="text-xs text-green-600 mt-1">Duration: {activity.duration_minutes} minutes</div>}
													{activity.outcome && (
														<div className={`text-xs mt-1 ${activity.outcome === "success" ? "text-green-600" : "text-red-600"}`}>
															Outcome: {activity.outcome}
														</div>
													)}
													<div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
														<span>{activity.ip_address}</span>
														{activity.source_type === "caller_activity" && (
															<Badge count="Caller Activity" style={{ backgroundColor: "#52c41a", fontSize: "9px" }} />
														)}
													</div>
												</div>
											}
										/>
									</List.Item>
								)}
							/>
							{recentActivity.length === 0 && (
								<div className="text-center py-8 text-gray-500">
									<Icon icon="solar:history-bold" size={32} className="mx-auto mb-2 opacity-50" />
									<div>No recent activity found</div>
								</div>
							)}
						</CardContent>
					</Card>
				</Col>
				<Col span={12}>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Icon icon="solar:medal-star-bold" size={20} />
								Top Active Users
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="mb-4">
								<Space wrap>
									<Select
										value={dateFilter}
										onChange={(value) => {
											setDateFilter(value);
											if (value !== "custom") {
												setCustomDateRange(null);
											}
										}}
										style={{ width: 140 }}
										size="small"
									>
										<Select.Option value="all">All Time</Select.Option>
										<Select.Option value="today">Today</Select.Option>
										<Select.Option value="week">This Week</Select.Option>
										<Select.Option value="month">This Month</Select.Option>
										<Select.Option value="custom">Custom</Select.Option>
									</Select>
									{dateFilter === "custom" && (
										<DatePicker.RangePicker
											value={customDateRange}
											onChange={(dates) => setCustomDateRange(dates)}
											size="small"
											format="YYYY-MM-DD"
											placeholder={["Start Date", "End Date"]}
										/>
									)}
								</Space>
							</div>
							<Table columns={topUsersColumns} dataSource={topUsers} rowKey="id" pagination={false} size="small" />
						</CardContent>
					</Card>
				</Col>
			</Row>
		</div>
	);
};

export default AdminSystemOverviewPage;
