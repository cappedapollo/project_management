import { useAuth } from "@/components/auth/use-auth";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Text, Title } from "@/ui/typography";
import {
	Button as AntButton,
	Avatar,
	DatePicker,
	Form,
	List,
	Modal,
	Progress,
	Select,
	Space,
	Switch,
	Table,
	Tabs,
	TimePicker,
	Timeline,
	Tooltip,
	message,
	notification,
} from "antd";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

// Configure dayjs plugins
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);
import notificationService, { type CallNotificationData } from "@/services/notificationService";
import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";

const { Option } = Select;
// Remove deprecated TabPane import

interface CallSchedule {
	id: number;
	contact_name: string;
	company: string;
	phone_number: string;
	email: string;
	call_type: "interview" | "follow_up" | "networking" | "client" | "personal";
	scheduled_time: string;
	duration_minutes: number;
	status: "scheduled" | "in_progress" | "completed" | "failed" | "rescheduled" | "cancelled";
	priority: "low" | "medium" | "high" | "urgent";
	notes: string;
	preparation_notes: string;
	outcome_notes: string;
	assigned_caller_id: number;
	created_by: number;
	auto_dial_enabled: boolean;
	recording_enabled: boolean;
	follow_up_required: boolean;
	reminder_minutes: number[];
	related_entity_type?: string;
	related_entity_id?: number;
	created_at: string;
	updated_at: string;
	completed_at?: string;
	failed_reason?: string;
	// Job details
	job_title?: string;
	job_description?: string;
	job_requirements?: string;
	job_link?: string;
	salary_range?: string;
	// Resume details
	resume_filename?: string;
	resume_url?: string;
	resume_uploaded_at?: string;
	application_date?: string;
}

interface CallNotification {
	id: number;
	call_id: number;
	caller_id: number;
	type: "reminder" | "assignment" | "status_change" | "follow_up";
	title: string;
	message: string;
	scheduled_for: string;
	status: "pending" | "sent" | "read" | "dismissed";
	priority: "low" | "medium" | "high" | "urgent";
	delivery_method: "in_app" | "email" | "sms" | "push";
	created_at: string;
	sent_at?: string;
	read_at?: string;
	call_details?: CallSchedule;
}

interface CallerPerformance {
	id: number;
	caller_id: number;
	date: string;
	calls_scheduled: number;
	calls_completed: number;
	calls_failed: number;
	total_call_duration_minutes: number;
	success_rate: number;
	average_call_duration: number;
	follow_ups_generated: number;
	performance_score: number;
}

interface DashboardStats {
	todayCalls: number;
	pendingCalls: number;
	completedCalls: number;
	failedCalls: number;
	totalCallTime: number;
	successRate: number;
	averageCallDuration: number;
	upcomingReminders: number;
}

const CallerDashboardPage: React.FC = () => {
	const { user, access_token } = useAuth();
	const [calls, setCalls] = useState<CallSchedule[]>([]);
	const [notifications, setNotifications] = useState<CallNotification[]>([]);
	const [performance, setPerformance] = useState<CallerPerformance[]>([]);
	const [stats, setStats] = useState<DashboardStats>({
		todayCalls: 0,
		pendingCalls: 0,
		completedCalls: 0,
		failedCalls: 0,
		totalCallTime: 0,
		successRate: 0,
		averageCallDuration: 0,
		upcomingReminders: 0,
	});
	const [activeTab, setActiveTab] = useState("dashboard");
	const [modalVisible, setModalVisible] = useState(false);
	const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
	const [selectedCall, setSelectedCall] = useState<CallSchedule | null>(null);
	const [loading, setLoading] = useState(true);
	const [form] = Form.useForm();
	const [rescheduleForm] = Form.useForm();
	const [googleCalendarNotificationCount, setGoogleCalendarNotificationCount] = useState(0);

	// Check if user has caller role (role = 2)
	if (user && user.role !== 2) {
		return <Navigate to="/dashboard" replace />;
	}

	useEffect(() => {
		fetchData();
		// Set up real-time updates for call notifications
		const interval = setInterval(fetchNotifications, 30000);
		return () => clearInterval(interval);
	}, []);

	// Set up notification count callback for badge synchronization
	useEffect(() => {
		notificationService.setNotificationCountCallback((count) => {
			setGoogleCalendarNotificationCount(count);
		});

		// Cleanup callback when component unmounts
		return () => {
			notificationService.setNotificationCountCallback(() => {});
		};
	}, []);

	const fetchData = async () => {
		try {
			const [callsRes, notificationsRes, performanceRes, statsRes] = await Promise.all([
				fetch("/api/caller/calls", {
					headers: {
						Authorization: `Bearer ${access_token}`,
						"Content-Type": "application/json",
					},
				}),
				fetch("/api/caller/notifications", {
					headers: {
						Authorization: `Bearer ${access_token}`,
						"Content-Type": "application/json",
					},
				}),
				fetch("/api/caller/performance", {
					headers: {
						Authorization: `Bearer ${access_token}`,
						"Content-Type": "application/json",
					},
				}),
				fetch("/api/caller/stats", {
					headers: {
						Authorization: `Bearer ${access_token}`,
						"Content-Type": "application/json",
					},
				}),
			]);

			if (callsRes.ok) {
				const data = await callsRes.json();
				setCalls(data.calls || []);

				// Show message if no permissions granted
				if (data.message && data.calls?.length === 0) {
					message.warning(data.message);
				}
			}

			if (notificationsRes.ok) {
				const data = await notificationsRes.json();
				setNotifications(data.notifications || []);
			}

			if (performanceRes.ok) {
				const data = await performanceRes.json();
				setPerformance(data.performance || []);
			}

			if (statsRes.ok) {
				const data = await statsRes.json();
				setStats(data.stats || stats);
			}
		} catch (error) {
			console.error("Error fetching caller data:", error);
		} finally {
			setLoading(false);
		}
	};

	const fetchNotifications = async () => {
		try {
			const response = await fetch("/api/caller/notifications", {
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				const data = await response.json();
				setNotifications(data.notifications || []);
			}
		} catch (error) {
			console.error("Error fetching notifications:", error);
		}
	};

	const handleCallStatusUpdate = async (callId: number, status: string, outcomeNotes?: string, failedReason?: string) => {
		try {
			const response = await fetch(`/api/caller/calls/${callId}/status`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					status,
					outcome_notes: outcomeNotes,
					failed_reason: failedReason,
					completed_at: status === "completed" ? new Date().toISOString() : null,
				}),
			});

			if (response.ok) {
				message.success(`Call marked as ${status}`);
				fetchData();
			} else {
				message.error("Failed to update call status");
			}
		} catch (error) {
			console.error("Error updating call status:", error);
			message.error("Error updating call status");
		}
	};

	const handleStartCall = async (callId: number) => {
		try {
			const response = await fetch(`/api/caller/calls/${callId}/start`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				message.success("Call started");

				// Show immediate call notification
				const call = calls.find((c) => c.id === callId);
				if (call) {
					notificationService.showImmediateCallNotification({
						id: call.id,
						contact_name: call.contact_name,
						company: call.company,
						scheduled_time: call.scheduled_time,
						call_type: call.call_type,
						phone_number: call.phone_number,
						preparation_notes: call.preparation_notes,
					});
				}

				fetchData();
			}
		} catch (error) {
			console.error("Error starting call:", error);
			message.error("Failed to start call");
		}
	};

	const handleMarkNotificationRead = async (notificationId: number) => {
		try {
			const response = await fetch(`/api/caller/notifications/${notificationId}/read`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				fetchNotifications();
			}
		} catch (error) {
			console.error("Error marking notification as read:", error);
		}
	};

	const handleRescheduleCallTime = async (values: any) => {
		if (!selectedCall) return;

		const newScheduledTime = dayjs(values.date).hour(dayjs(values.time).hour()).minute(dayjs(values.time).minute()).toISOString();

		try {
			const response = await fetch(`/api/caller/calls/${selectedCall.id}/reschedule`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					scheduled_time: newScheduledTime,
					status: "scheduled", // Keep as scheduled, just update time
				}),
			});

			if (response.ok) {
				message.success("Call time updated successfully");
				fetchData();
				setRescheduleModalVisible(false);
				rescheduleForm.resetFields();
			} else {
				message.error("Failed to update call time");
			}
		} catch (error) {
			console.error("Error updating call time:", error);
			message.error("Error updating call time");
		}
	};

	const getStatusColor = (status: string) => {
		const colors = {
			scheduled: "#1890ff",
			in_progress: "#faad14",
			completed: "#52c41a",
			failed: "#ff4d4f",
			rescheduled: "#722ed1",
			cancelled: "#8c8c8c",
		};
		return colors[status as keyof typeof colors] || "#1890ff";
	};

	const getPriorityColor = (priority: string) => {
		const colors = {
			low: "#52c41a",
			medium: "#faad14",
			high: "#ff4d4f",
			urgent: "#a0000a",
		};
		return colors[priority as keyof typeof colors] || "#faad14";
	};

	const getCallTypeIcon = (type: string) => {
		const icons = {
			interview: "solar:video-camera-bold",
			follow_up: "solar:phone-bold",
			networking: "solar:users-group-rounded-bold",
			client: "solar:briefcase-bold",
			personal: "solar:user-bold",
		};
		return icons[type as keyof typeof icons] || "solar:phone-bold";
	};

	const DashboardView = () => (
		<div className="space-y-6">
			{/* Notification Settings Panel */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Icon icon="solar:bell-bold" size={20} />
						Call Notifications
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						<div>
							<Text className="font-medium">Google Calendar Style Notifications</Text>
							<div className="text-sm text-gray-600">Visual notifications appear in the top-right corner at 15, 10, 5, and 1 minute intervals</div>
						</div>
						<div className="flex items-center gap-4">
							<AntButton size="small" onClick={() => notificationService.requestPermission()} icon={<Icon icon="solar:settings-bold" size={14} />}>
								Enable Browser Notifications
							</AntButton>
							<AntButton
								size="small"
								type="primary"
								onClick={() => {
									const testCall: CallNotificationData = {
										id: 999,
										contact_name: "Test Contact",
										company: "Test Company",
										scheduled_time: dayjs().add(1, "minute").toISOString(),
										call_type: "interview",
										phone_number: "+1234567890",
										preparation_notes: "This is a test notification",
									};
									notificationService.showCallNotification(testCall, 1);
								}}
								icon={<Icon icon="solar:play-bold" size={14} />}
							>
								Test Notification
							</AntButton>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Key Stats */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-blue-600">{stats.todayCalls}</div>
						<Text className="text-sm text-gray-600">Today's Calls</Text>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-orange-600">{stats.pendingCalls}</div>
						<Text className="text-sm text-gray-600">Pending Calls</Text>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-green-600">{stats.completedCalls}</div>
						<Text className="text-sm text-gray-600">Completed Today</Text>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-purple-600">{stats.successRate}%</div>
						<Text className="text-sm text-gray-600">Success Rate</Text>
					</CardContent>
				</Card>
			</div>

			{/* Performance Overview */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Icon icon="solar:chart-2-bold" size={20} />
							Performance Metrics
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div>
								<div className="flex justify-between mb-2">
									<Text>Success Rate</Text>
									<Text>{stats.successRate}%</Text>
								</div>
								<Progress percent={stats.successRate} />
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div className="text-center p-3 bg-blue-50 rounded">
									<div className="text-lg font-bold text-blue-600">{stats.averageCallDuration}m</div>
									<Text className="text-sm text-gray-600">Avg Call Duration</Text>
								</div>
								<div className="text-center p-3 bg-green-50 rounded">
									<div className="text-lg font-bold text-green-600">{Math.floor(stats.totalCallTime / 60)}h</div>
									<Text className="text-sm text-gray-600">Total Call Time</Text>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Icon icon="solar:bell-bold" size={20} />
							Recent Notifications
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3 max-h-64 overflow-y-auto">
							{notifications.slice(0, 5).map((notification) => (
								<div
									key={notification.id}
									className={`p-3 border rounded cursor-pointer transition-all ${
										notification.status === "pending" ? "bg-blue-50 border-blue-200" : "bg-gray-50"
									}`}
									onClick={() => handleMarkNotificationRead(notification.id)}
								>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<Text className="font-medium">{notification.title}</Text>
											<div className="text-sm text-gray-600 mt-1">{notification.message}</div>
											<div className="text-xs text-gray-500 mt-1">
												{notification.scheduled_for ? dayjs(notification.scheduled_for).format("MMM DD, HH:mm") : "No schedule"}
											</div>
										</div>
										<span className="px-2 py-1 text-xs rounded-full text-white" style={{ backgroundColor: getPriorityColor(notification.priority) }}>
											{notification.priority}
										</span>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Upcoming Calls */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Icon icon="solar:clock-circle-bold" size={20} />
						Upcoming Calls
					</CardTitle>
				</CardHeader>
				<CardContent>
					{calls.length === 0 ? (
						<div className="text-center py-8">
							<Icon icon="solar:shield-user-bold" size={48} className="mx-auto mb-4 text-gray-400" />
							<div className="text-lg font-semibold text-gray-600 mb-2">No Schedule Permissions</div>
							<Text className="text-gray-500 mb-4">You don't have permission to view any user schedules yet.</Text>
							<Text className="text-sm text-gray-400">Contact your administrator to request access to specific user schedules.</Text>
						</div>
					) : (
						<div className="space-y-3">
							{calls
								.filter((call) => dayjs(call.scheduled_time).isAfter(dayjs()) && call.status === "scheduled")
								.sort((a, b) => dayjs(a.scheduled_time).diff(dayjs(b.scheduled_time)))
								.slice(0, 5)
								.map((call) => (
									<div key={call.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-all">
										<div className="flex items-center gap-4">
											<div
												className="w-12 h-12 rounded-full flex items-center justify-center"
												style={{ backgroundColor: `${getPriorityColor(call.priority)}20` }}
											>
												<Icon icon={getCallTypeIcon(call.call_type)} size={20} style={{ color: getPriorityColor(call.priority) }} />
											</div>
											<div>
												<Text className="font-medium">{call.contact_name}</Text>
												<div className="text-sm text-gray-600">{call.company}</div>
												<div className="text-sm text-gray-600">
													{dayjs(call.scheduled_time).format("MMM DD, HH:mm")} • {call.duration_minutes}m
												</div>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<span className="px-2 py-1 text-xs rounded-full text-white" style={{ backgroundColor: getPriorityColor(call.priority) }}>
												{call.priority}
											</span>
											<span className="px-2 py-1 text-xs rounded-full text-white capitalize" style={{ backgroundColor: getStatusColor(call.status) }}>
												{call.status}
											</span>
											<Space>
												<Tooltip title="Start Call">
													<AntButton
														size="small"
														type="primary"
														onClick={() => handleStartCall(call.id)}
														disabled={dayjs(call.scheduled_time).isAfter(dayjs().add(15, "minutes"))}
													>
														<Icon icon="solar:phone-bold" size={14} />
													</AntButton>
												</Tooltip>
												<Tooltip title="View Details">
													<AntButton
														size="small"
														onClick={() => {
															setSelectedCall(call);
															setModalVisible(true);
														}}
													>
														<Icon icon="solar:eye-bold" size={14} />
													</AntButton>
												</Tooltip>
											</Space>
										</div>
									</div>
								))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);

	const CallsView = () => (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<Text className="font-medium">My Assigned Calls</Text>
				<div className="flex items-center gap-2">
					<Select defaultValue="all" style={{ width: 120 }}>
						<Option value="all">All Status</Option>
						<Option value="scheduled">Scheduled</Option>
						<Option value="in_progress">In Progress</Option>
						<Option value="completed">Completed</Option>
						<Option value="failed">Failed</Option>
					</Select>
					<Select defaultValue="today" style={{ width: 120 }}>
						<Option value="today">Today</Option>
						<Option value="week">This Week</Option>
						<Option value="month">This Month</Option>
						<Option value="all">All Time</Option>
					</Select>
				</div>
			</div>

			<Table
				dataSource={calls}
				columns={[
					{
						title: "Contact",
						key: "contact",
						render: (_, record) => (
							<div>
								<Text className="font-medium">{record.contact_name}</Text>
								<div className="text-sm text-gray-600">{record.company}</div>
								{record.phone_number && <div className="text-sm text-gray-500">{record.phone_number}</div>}
							</div>
						),
					},
					{
						title: "Type",
						dataIndex: "call_type",
						key: "call_type",
						render: (type) => (
							<div className="flex items-center gap-2">
								<Icon icon={getCallTypeIcon(type)} size={16} />
								<span className="capitalize">{type?.replace("_", " ") || type || "N/A"}</span>
							</div>
						),
					},
					{
						title: "Scheduled Time",
						dataIndex: "scheduled_time",
						key: "scheduled_time",
						render: (time) => (
							<div>
								<div>{dayjs(time).format("MMM DD, YYYY")}</div>
								<div className="text-sm text-gray-600">{dayjs(time).format("HH:mm")}</div>
							</div>
						),
					},
					{
						title: "Duration",
						dataIndex: "duration_minutes",
						key: "duration_minutes",
						render: (minutes) => `${minutes}m`,
					},
					{
						title: "Priority",
						dataIndex: "priority",
						key: "priority",
						render: (priority) => (
							<span className="px-2 py-1 text-xs rounded-full text-white" style={{ backgroundColor: getPriorityColor(priority) }}>
								{priority}
							</span>
						),
					},
					{
						title: "Status",
						dataIndex: "status",
						key: "status",
						render: (status) => (
							<span className="px-2 py-1 text-xs rounded-full text-white capitalize" style={{ backgroundColor: getStatusColor(status) }}>
								{status?.replace("_", " ") || status || "N/A"}
							</span>
						),
					},
					{
						title: "Actions",
						key: "actions",
						render: (_, record) => (
							<Space>
								{record.status === "scheduled" && (
									<Tooltip title="Start Call">
										<AntButton size="small" type="primary" onClick={() => handleStartCall(record.id)}>
											<Icon icon="solar:play-bold" size={14} />
										</AntButton>
									</Tooltip>
								)}
								{record.status === "in_progress" && (
									<>
										<Tooltip title="Complete Call">
											<AntButton size="small" onClick={() => handleCallStatusUpdate(record.id, "completed")}>
												<Icon icon="solar:check-circle-bold" size={14} />
											</AntButton>
										</Tooltip>
										<Tooltip title="Mark as Failed">
											<AntButton size="small" danger onClick={() => handleCallStatusUpdate(record.id, "failed")}>
												<Icon icon="solar:close-circle-bold" size={14} />
											</AntButton>
										</Tooltip>
									</>
								)}
								<Tooltip title="View Details">
									<AntButton
										size="small"
										onClick={() => {
											setSelectedCall(record);
											setModalVisible(true);
										}}
									>
										<Icon icon="solar:eye-bold" size={14} />
									</AntButton>
								</Tooltip>
								{record.phone_number && (
									<Tooltip title="Call Now">
										<AntButton size="small" onClick={() => window.open(`tel:${record.phone_number}`)}>
											<Icon icon="solar:phone-bold" size={14} />
										</AntButton>
									</Tooltip>
								)}
							</Space>
						),
					},
				]}
				pagination={{ pageSize: 10 }}
			/>
		</div>
	);

	const NotificationsView = () => (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<Text className="font-medium">Call Notifications</Text>
				<Button
					onClick={async () => {
						try {
							await fetch("/api/caller/notifications/mark-all-read", {
								method: "PUT",
								headers: {
									Authorization: `Bearer ${access_token}`,
									"Content-Type": "application/json",
								},
							});
							message.success("All notifications marked as read");

							// Clear Google Calendar style notifications
							notificationService.clearAllNotifications();

							fetchNotifications();
						} catch (error) {
							message.error("Failed to mark notifications as read");
						}
					}}
				>
					Mark All Read
				</Button>
			</div>

			<List
				dataSource={notifications}
				renderItem={(notification) => (
					<List.Item
						className={`cursor-pointer transition-all ${notification.status === "pending" ? "bg-blue-50 border-l-4 border-blue-500" : ""}`}
						onClick={() => handleMarkNotificationRead(notification.id)}
						actions={[
							<span key="priority" className="px-2 py-1 text-xs rounded-full text-white" style={{ backgroundColor: getPriorityColor(notification.priority) }}>
								{notification.priority}
							</span>,
							<Text key="time" className="text-xs text-gray-500">
								{notification.scheduled_for ? dayjs(notification.scheduled_for).fromNow() : "No schedule"}
							</Text>,
						]}
					>
						<List.Item.Meta
							avatar={
								<div
									className="w-10 h-10 rounded-full flex items-center justify-center"
									style={{
										backgroundColor: notification.status === "pending" ? "#1890ff20" : "#f0f0f0",
									}}
								>
									<Icon
										icon="solar:bell-bold"
										size={20}
										style={{
											color: notification.status === "pending" ? "#1890ff" : "#8c8c8c",
										}}
									/>
								</div>
							}
							title={
								<div className="flex items-center justify-between">
									<span className={notification.status === "pending" ? "font-semibold" : ""}>{notification.title}</span>
									<span
										className={`px-2 py-1 text-xs rounded-full ${notification.status === "pending" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}
									>
										{notification.type?.replace("_", " ") || notification.type || "N/A"}
									</span>
								</div>
							}
							description={
								<div>
									<Text className="text-gray-600">{notification.message}</Text>
									{notification.call_details && (
										<div className="mt-2 p-2 bg-gray-50 rounded text-sm">
											<strong>Call:</strong> {notification.call_details.contact_name} at {notification.call_details.company}
											<br />
											<strong>Time:</strong> {dayjs(notification.call_details.scheduled_time).format("MMM DD, HH:mm")}
										</div>
									)}
								</div>
							}
						/>
					</List.Item>
				)}
			/>
		</div>
	);

	const PerformanceView = () => (
		<div className="space-y-4">
			<Text className="font-medium">Performance Analytics</Text>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-green-600">{stats.completedCalls}</div>
						<Text className="text-sm text-gray-600">Calls Completed</Text>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-blue-600">{stats.successRate}%</div>
						<Text className="text-sm text-gray-600">Success Rate</Text>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-purple-600">{stats.averageCallDuration}m</div>
						<Text className="text-sm text-gray-600">Avg Duration</Text>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-orange-600">{Math.floor(stats.totalCallTime / 60)}h</div>
						<Text className="text-sm text-gray-600">Total Time</Text>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Daily Performance</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{performance.slice(0, 7).map((perf) => (
							<div key={perf.id} className="flex items-center justify-between p-3 border rounded">
								<div>
									<Text className="font-medium">{dayjs(perf.date).format("MMM DD, YYYY")}</Text>
									<div className="text-sm text-gray-600">
										{perf.calls_completed}/{perf.calls_scheduled} calls completed
									</div>
								</div>
								<div className="text-right">
									<div className="text-lg font-bold text-green-600">{perf.success_rate}%</div>
									<div className="text-sm text-gray-600">Success Rate</div>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);

	return (
		<div className="p-6">
			<div className="flex justify-between items-center mb-6">
				<div>
					<Title as="h2" className="flex items-center gap-2">
						<Icon icon="solar:phone-bold" size={24} />
						Caller Dashboard
					</Title>
					<Text className="text-gray-600">Manage your assigned calls and track performance</Text>
				</div>
				<div className="flex items-center gap-2">
					<div className="relative">
						<Button>
							<Icon icon="solar:bell-bold" size={16} />
						</Button>
						{googleCalendarNotificationCount > 0 && (
							<span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
								{googleCalendarNotificationCount}
							</span>
						)}
					</div>
				</div>
			</div>

			<Card>
				<CardContent>
					<Tabs
						activeKey={activeTab}
						onChange={setActiveTab}
						items={[
							{
								key: "dashboard",
								label: (
									<span>
										<Icon icon="solar:home-bold" size={16} className="mr-1" />
										Dashboard
									</span>
								),
								children: <DashboardView />,
							},
							{
								key: "calls",
								label: (
									<span>
										<Icon icon="solar:phone-bold" size={16} className="mr-1" />
										My Calls ({calls.length})
									</span>
								),
								children: <CallsView />,
							},
							{
								key: "notifications",
								label: (
									<span>
										<Icon icon="solar:bell-bold" size={16} className="mr-1" />
										Notifications ({googleCalendarNotificationCount})
									</span>
								),
								children: <NotificationsView />,
							},
							{
								key: "performance",
								label: (
									<span>
										<Icon icon="solar:chart-2-bold" size={16} className="mr-1" />
										Performance
									</span>
								),
								children: <PerformanceView />,
							},
						]}
					/>
				</CardContent>
			</Card>

			{/* Call Details Modal */}
			<Modal
				title="Call Details"
				open={modalVisible}
				onCancel={() => setModalVisible(false)}
				footer={[
					selectedCall && selectedCall.status === "scheduled" && (
						<Button
							key="reschedule"
							onClick={() => {
								rescheduleForm.setFieldsValue({
									date: dayjs(selectedCall.scheduled_time),
									time: dayjs(selectedCall.scheduled_time),
								});
								setRescheduleModalVisible(true);
							}}
						>
							<Icon icon="solar:calendar-bold" size={16} className="mr-1" />
							Reschedule
						</Button>
					),
					<Button key="close" onClick={() => setModalVisible(false)}>
						Close
					</Button>,
				]}
				width={900}
			>
				{selectedCall && (
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Text className="text-sm text-gray-600">Contact Name</Text>
								<div className="font-medium">{selectedCall.contact_name}</div>
							</div>
							<div>
								<Text className="text-sm text-gray-600">Company</Text>
								<div className="font-medium">{selectedCall.company}</div>
							</div>
							<div>
								<Text className="text-sm text-gray-600">Phone Number</Text>
								<div className="font-medium">{selectedCall.phone_number}</div>
							</div>
							<div>
								<Text className="text-sm text-gray-600">Email</Text>
								<div className="font-medium">{selectedCall.email}</div>
							</div>
							<div>
								<Text className="text-sm text-gray-600">Call Type</Text>
								<div className="font-medium capitalize">{selectedCall.call_type?.replace("_", " ") || selectedCall.call_type || "N/A"}</div>
							</div>
							<div>
								<Text className="text-sm text-gray-600">Duration</Text>
								<div className="font-medium">{selectedCall.duration_minutes} minutes</div>
							</div>
						</div>

						<div>
							<Text className="text-sm text-gray-600">Scheduled Time</Text>
							<div className="font-medium">{dayjs(selectedCall.scheduled_time).format("MMMM DD, YYYY HH:mm")}</div>
						</div>

						{/* Job Details Section */}
						{selectedCall.job_title && (
							<div className="border-t pt-4">
								<Title as="h5" className="mb-3 text-blue-600">
									📋 Job Details
								</Title>
								<div className="space-y-3">
									<div className="grid grid-cols-2 gap-4">
										<div>
											<Text className="text-sm text-gray-600">Job Title</Text>
											<div className="font-medium">{selectedCall.job_title}</div>
										</div>
										<div>
											<Text className="text-sm text-gray-600">Salary Range</Text>
											<div className="font-medium text-green-600">{selectedCall.salary_range || "Not specified"}</div>
										</div>
									</div>

									{selectedCall.job_description && (
										<div>
											<Text className="text-sm text-gray-600">Job Description</Text>
											<div className="p-3 bg-blue-50 rounded text-sm leading-relaxed">{selectedCall.job_description}</div>
										</div>
									)}

									{selectedCall.job_requirements && (
										<div>
											<Text className="text-sm text-gray-600">Requirements</Text>
											<div className="p-3 bg-gray-50 rounded text-sm">
												<pre className="whitespace-pre-wrap font-sans">{selectedCall.job_requirements}</pre>
											</div>
										</div>
									)}

									{selectedCall.job_link && (
										<div>
											<Text className="text-sm text-gray-600">Job Link</Text>
											<div>
												<a
													href={selectedCall.job_link}
													target="_blank"
													rel="noopener noreferrer"
													className="text-blue-600 hover:text-blue-800 underline break-all"
												>
													{selectedCall.job_link}
												</a>
											</div>
										</div>
									)}
								</div>
							</div>
						)}

						{/* Resume Details Section */}
						{selectedCall.resume_filename && (
							<div className="border-t pt-4">
								<Title as="h5" className="mb-3 text-green-600">
									📄 Resume Details
								</Title>
								<div className="space-y-3">
									<div className="grid grid-cols-2 gap-4">
										<div>
											<Text className="text-sm text-gray-600">Resume File</Text>
											<div className="font-medium">{selectedCall.resume_filename}</div>
										</div>
										<div>
											<Text className="text-sm text-gray-600">Application Date</Text>
											<div className="font-medium">{selectedCall.application_date ? dayjs(selectedCall.application_date).format("MMM DD, YYYY") : "N/A"}</div>
										</div>
									</div>

									<div>
										<Text className="text-sm text-gray-600">Resume Uploaded</Text>
										<div className="font-medium">
											{selectedCall.resume_uploaded_at ? dayjs(selectedCall.resume_uploaded_at).format("MMM DD, YYYY HH:mm") : "N/A"}
										</div>
									</div>

									{selectedCall.resume_url && (
										<div>
											<AntButton
												type="primary"
												icon={<Icon icon="solar:document-bold" size={16} />}
												onClick={() => window.open(selectedCall.resume_url, "_blank")}
												className="w-full"
											>
												View Resume
											</AntButton>
										</div>
									)}
								</div>
							</div>
						)}

						{selectedCall.notes && (
							<div className="border-t pt-4">
								<Text className="text-sm text-gray-600">Notes</Text>
								<div className="p-3 bg-gray-50 rounded">{selectedCall.notes}</div>
							</div>
						)}

						{selectedCall.preparation_notes && (
							<div>
								<Text className="text-sm text-gray-600">Preparation Notes</Text>
								<div className="font-medium">{selectedCall.preparation_notes}</div>
							</div>
						)}

						{selectedCall.outcome_notes && (
							<div>
								<Text className="text-sm text-gray-600">Outcome Notes</Text>
								<div className="font-medium">{selectedCall.outcome_notes}</div>
							</div>
						)}

						<div className="flex items-center gap-2">
							<span className="px-2 py-1 text-xs rounded-full text-white capitalize" style={{ backgroundColor: getStatusColor(selectedCall.status) }}>
								{selectedCall.status?.replace("_", " ") || selectedCall.status || "N/A"}
							</span>
							<span className="px-2 py-1 text-xs rounded-full text-white" style={{ backgroundColor: getPriorityColor(selectedCall.priority) }}>
								{selectedCall.priority}
							</span>
						</div>

						{selectedCall.status === "scheduled" && (
							<div className="flex gap-2 pt-4 border-t">
								<AntButton type="primary" onClick={() => handleStartCall(selectedCall.id)}>
									<Icon icon="solar:play-bold" size={14} className="mr-1" />
									Start Call
								</AntButton>
								{selectedCall.phone_number && (
									<Button onClick={() => window.open(`tel:${selectedCall.phone_number}`)}>
										<Icon icon="solar:phone-bold" size={14} className="mr-1" />
										Call Now
									</Button>
								)}
							</div>
						)}

						{selectedCall.status === "in_progress" && (
							<div className="flex gap-2 pt-4 border-t">
								<AntButton type="primary" onClick={() => handleCallStatusUpdate(selectedCall.id, "completed")}>
									<Icon icon="solar:check-circle-bold" size={14} className="mr-1" />
									Mark Complete
								</AntButton>
								<AntButton danger onClick={() => handleCallStatusUpdate(selectedCall.id, "failed")}>
									<Icon icon="solar:close-circle-bold" size={14} className="mr-1" />
									Mark Failed
								</AntButton>
							</div>
						)}
					</div>
				)}
			</Modal>

			{/* Reschedule Time Modal */}
			<Modal
				title={
					<div className="flex items-center gap-2">
						<Icon icon="solar:calendar-bold" size={20} />
						Reschedule Call Time
					</div>
				}
				open={rescheduleModalVisible}
				onCancel={() => setRescheduleModalVisible(false)}
				footer={null}
				width={500}
			>
				{selectedCall && (
					<div className="space-y-4">
						<div className="p-4 bg-blue-50 rounded-lg">
							<Text className="font-medium">{selectedCall.contact_name}</Text>
							<div className="text-sm text-gray-600">{selectedCall.company}</div>
							<div className="text-sm text-gray-600">Current: {dayjs(selectedCall.scheduled_time).format("MMM DD, YYYY HH:mm")}</div>
						</div>

						<Form form={rescheduleForm} layout="vertical" onFinish={handleRescheduleCallTime}>
							<div className="grid grid-cols-2 gap-4">
								<Form.Item name="date" label="New Date" rules={[{ required: true, message: "Please select a date" }]}>
									<DatePicker style={{ width: "100%" }} disabledDate={(current) => current && current < dayjs().startOf("day")} />
								</Form.Item>
								<Form.Item name="time" label="New Time" rules={[{ required: true, message: "Please select a time" }]}>
									<TimePicker format="HH:mm" style={{ width: "100%" }} />
								</Form.Item>
							</div>

							<div className="flex justify-end gap-2 pt-4">
								<Button onClick={() => setRescheduleModalVisible(false)}>Cancel</Button>
								<Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
									<Icon icon="solar:calendar-bold" size={14} className="mr-1" />
									Update Time
								</Button>
							</div>
						</Form>
					</div>
				)}
			</Modal>
		</div>
	);
};

export default CallerDashboardPage;
