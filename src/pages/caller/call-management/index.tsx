import { useAuth } from "@/components/auth/use-auth";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Text, Title } from "@/ui/typography";
import { Button as AntButton, DatePicker, Form, InputNumber, Modal, Progress, Select, Space, Switch, Table, Tabs, TimePicker, Tooltip, message } from "antd";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

// Configure dayjs plugins
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);
import notificationService, { CallNotificationData } from "@/services/notificationService";
import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";

const { Option } = Select;
// Remove deprecated TabPane import
// TextArea will be imported from antd directly
import { Input as AntInput } from "antd";
const { TextArea } = AntInput;

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

interface CallTemplate {
	id: number;
	name: string;
	call_type: string;
	duration_minutes: number;
	preparation_checklist: string[];
	script_template: string;
	follow_up_actions: string[];
}

const CallManagementPage: React.FC = () => {
	const { user, access_token } = useAuth();
	const [calls, setCalls] = useState<CallSchedule[]>([]);
	const [templates, setTemplates] = useState<CallTemplate[]>([]);
	const [activeTab, setActiveTab] = useState("scheduled");
	const [modalVisible, setModalVisible] = useState(false);
	const [modalType, setModalType] = useState<"call" | "outcome" | "reschedule">("call");
	const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
	const [selectedCall, setSelectedCall] = useState<CallSchedule | null>(null);
	const [loading, setLoading] = useState(true);
	const [form] = Form.useForm();
	const [outcomeForm] = Form.useForm();
	const [rescheduleForm] = Form.useForm();

	// Check if user has caller role (role = 2)
	if (user && user.role !== 2) {
		return <Navigate to="/dashboard" replace />;
	}

	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		try {
			const [callsRes, templatesRes] = await Promise.all([
				fetch("/api/caller/calls", {
					headers: {
						Authorization: `Bearer ${access_token}`,
						"Content-Type": "application/json",
					},
				}),
				fetch("/api/caller/templates", {
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

			if (templatesRes.ok) {
				const data = await templatesRes.json();
				setTemplates(data.templates || []);
			}
		} catch (error) {
			console.error("Error fetching call management data:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleCallStatusUpdate = async (callId: number, status: string, data?: any) => {
		try {
			const response = await fetch(`/api/caller/calls/${callId}/status`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					status,
					...data,
					completed_at: status === "completed" ? new Date().toISOString() : null,
				}),
			});

			if (response.ok) {
				message.success(`Call ${status} successfully`);
				fetchData();
				setModalVisible(false);
				form.resetFields();
				outcomeForm.resetFields();
			} else {
				message.error("Failed to update call status");
			}
		} catch (error) {
			console.error("Error updating call status:", error);
			message.error("Error updating call status");
		}
	};

	const handleRescheduleCall = async (values: any) => {
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
					duration_minutes: values.duration_minutes,
					notes: values.notes,
					status: "rescheduled",
				}),
			});

			if (response.ok) {
				message.success("Call rescheduled successfully");
				fetchData();
				setModalVisible(false);
				form.resetFields();
			} else {
				message.error("Failed to reschedule call");
			}
		} catch (error) {
			console.error("Error rescheduling call:", error);
			message.error("Error rescheduling call");
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

	const handleCompleteCall = async (values: any) => {
		if (!selectedCall) return;

		await handleCallStatusUpdate(selectedCall.id, "completed", {
			outcome_notes: values.outcome_notes,
			follow_up_required: values.follow_up_required,
			actual_duration: values.actual_duration,
		});
	};

	const handleFailCall = async (values: any) => {
		if (!selectedCall) return;

		await handleCallStatusUpdate(selectedCall.id, "failed", {
			failed_reason: values.failed_reason,
			outcome_notes: values.outcome_notes,
			follow_up_required: values.follow_up_required,
		});
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

	const filterCallsByStatus = (status: string) => {
		if (status === "all") return calls;
		return calls.filter((call) => call.status === status);
	};

	const CallTable = ({ status }: { status: string }) => {
		const filteredCalls = filterCallsByStatus(status);

		// Show empty state if no calls available
		if (calls.length === 0) {
			return (
				<div className="text-center py-12">
					<Icon icon="solar:shield-user-bold" size={64} className="mx-auto mb-4 text-gray-400" />
					<div className="text-xl font-semibold text-gray-600 mb-2">No Schedule Permissions</div>
					<Text className="text-gray-500 mb-4">You don't have permission to view any user schedules yet.</Text>
					<Text className="text-sm text-gray-400">Contact your administrator to request access to specific user schedules.</Text>
				</div>
			);
		}

		return (
			<Table
				dataSource={filteredCalls}
				columns={[
					{
						title: "Contact",
						key: "contact",
						render: (_, record) => (
							<div>
								<Text className="font-medium">{record.contact_name}</Text>
								<div className="text-sm text-gray-600">{record.company}</div>
								<div className="text-sm text-gray-500">{record.phone_number}</div>
							</div>
						),
					},
					{
						title: "Type & Priority",
						key: "type_priority",
						render: (_, record) => (
							<div className="flex items-center gap-2">
								<Icon icon={getCallTypeIcon(record.call_type)} size={16} />
								<div>
									<div className="capitalize">{record.call_type?.replace("_", " ") || record.call_type || "N/A"}</div>
									<span className="px-2 py-1 text-xs rounded-full text-white" style={{ backgroundColor: getPriorityColor(record.priority) }}>
										{record.priority}
									</span>
								</div>
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
								<div className="text-xs text-gray-500">{dayjs(time).isAfter(dayjs()) ? dayjs(time).fromNow() : "Past due"}</div>
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
									<>
										<Tooltip title="Start Call">
											<AntButton size="small" type="primary" onClick={() => handleCallStatusUpdate(record.id, "in_progress")}>
												<Icon icon="solar:play-bold" size={14} />
											</AntButton>
										</Tooltip>
										<Tooltip title="Reschedule">
											<AntButton
												size="small"
												onClick={() => {
													setSelectedCall(record);
													setModalType("reschedule");
													form.setFieldsValue({
														date: dayjs(record.scheduled_time),
														time: dayjs(record.scheduled_time),
														duration_minutes: record.duration_minutes,
													});
													setModalVisible(true);
												}}
											>
												<Icon icon="solar:calendar-bold" size={14} />
											</AntButton>
										</Tooltip>
									</>
								)}
								{record.status === "in_progress" && (
									<>
										<Tooltip title="Complete Call">
											<AntButton
												size="small"
												onClick={() => {
													setSelectedCall(record);
													setModalType("outcome");
													outcomeForm.setFieldsValue({
														actual_duration: record.duration_minutes,
													});
													setModalVisible(true);
												}}
											>
												<Icon icon="solar:check-circle-bold" size={14} />
											</AntButton>
										</Tooltip>
										<Tooltip title="Mark as Failed">
											<AntButton
												size="small"
												danger
												onClick={() => {
													setSelectedCall(record);
													setModalType("outcome");
													outcomeForm.setFieldsValue({
														call_result: "failed",
													});
													setModalVisible(true);
												}}
											>
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
											setModalType("call");
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
		);
	};

	return (
		<div className="p-6">
			<div className="flex justify-between items-center mb-6">
				<div>
					<Title as="h2" className="flex items-center gap-2">
						<Icon icon="solar:phone-calling-bold" size={24} />
						Call Management
					</Title>
					<Text className="text-gray-600">Manage your assigned calls, track progress, and update outcomes</Text>
				</div>
			</div>

			{/* Quick Stats */}
			<div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
				<Card>
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-blue-600">{calls.filter((c) => c.status === "scheduled").length}</div>
						<Text className="text-sm text-gray-600">Scheduled</Text>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-orange-600">{calls.filter((c) => c.status === "in_progress").length}</div>
						<Text className="text-sm text-gray-600">In Progress</Text>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-green-600">{calls.filter((c) => c.status === "completed").length}</div>
						<Text className="text-sm text-gray-600">Completed</Text>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-red-600">{calls.filter((c) => c.status === "failed").length}</div>
						<Text className="text-sm text-gray-600">Failed</Text>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-purple-600">{calls.filter((c) => c.status === "rescheduled").length}</div>
						<Text className="text-sm text-gray-600">Rescheduled</Text>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardContent>
					<Tabs
						activeKey={activeTab}
						onChange={setActiveTab}
						items={[
							{
								key: "scheduled",
								label: (
									<span>
										<Icon icon="solar:clock-circle-bold" size={16} className="mr-1" />
										Scheduled ({calls.filter((c) => c.status === "scheduled").length})
									</span>
								),
								children: <CallTable status="scheduled" />,
							},
							{
								key: "in_progress",
								label: (
									<span>
										<Icon icon="solar:play-bold" size={16} className="mr-1" />
										In Progress ({calls.filter((c) => c.status === "in_progress").length})
									</span>
								),
								children: <CallTable status="in_progress" />,
							},
							{
								key: "completed",
								label: (
									<span>
										<Icon icon="solar:check-circle-bold" size={16} className="mr-1" />
										Completed ({calls.filter((c) => c.status === "completed").length})
									</span>
								),
								children: <CallTable status="completed" />,
							},
							{
								key: "failed",
								label: (
									<span>
										<Icon icon="solar:close-circle-bold" size={16} className="mr-1" />
										Failed ({calls.filter((c) => c.status === "failed").length})
									</span>
								),
								children: <CallTable status="failed" />,
							},
							{
								key: "all",
								label: (
									<span>
										<Icon icon="solar:calendar-bold" size={16} className="mr-1" />
										All Calls ({calls.length})
									</span>
								),
								children: <CallTable status="all" />,
							},
						]}
					/>
				</CardContent>
			</Card>

			{/* Call Details Modal */}
			<Modal
				title="Call Details"
				open={modalVisible && modalType === "call"}
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
								<div className="p-3 bg-blue-50 rounded">{selectedCall.preparation_notes}</div>
							</div>
						)}

						{selectedCall.outcome_notes && (
							<div>
								<Text className="text-sm text-gray-600">Outcome Notes</Text>
								<div className="p-3 bg-green-50 rounded">{selectedCall.outcome_notes}</div>
							</div>
						)}

						{selectedCall.failed_reason && (
							<div>
								<Text className="text-sm text-gray-600">Failed Reason</Text>
								<div className="p-3 bg-red-50 rounded">{selectedCall.failed_reason}</div>
							</div>
						)}

						<div className="flex items-center gap-2">
							<span className="px-2 py-1 text-xs rounded-full text-white capitalize" style={{ backgroundColor: getStatusColor(selectedCall.status) }}>
								{selectedCall.status?.replace("_", " ") || selectedCall.status || "N/A"}
							</span>
							<span className="px-2 py-1 text-xs rounded-full text-white" style={{ backgroundColor: getPriorityColor(selectedCall.priority) }}>
								{selectedCall.priority}
							</span>
							{selectedCall.auto_dial_enabled && (
								<span className="px-2 py-1 text-xs rounded-full text-white" style={{ backgroundColor: "#1890ff" }}>
									Auto Dial
								</span>
							)}
							{selectedCall.recording_enabled && (
								<span className="px-2 py-1 text-xs rounded-full text-white" style={{ backgroundColor: "#722ed1" }}>
									Recording
								</span>
							)}
							{selectedCall.follow_up_required && (
								<span className="px-2 py-1 text-xs rounded-full text-white" style={{ backgroundColor: "#faad14" }}>
									Follow-up Required
								</span>
							)}
						</div>

						{selectedCall.reminder_minutes && selectedCall.reminder_minutes.length > 0 && (
							<div>
								<Text className="text-sm text-gray-600">Reminders</Text>
								<div className="flex gap-1">
									{selectedCall.reminder_minutes.map((minutes) => (
										<span key={`reminder-${minutes}`} className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
											{minutes}m before
										</span>
									))}
								</div>
							</div>
						)}

						<div className="text-xs text-gray-500 pt-4 border-t">
							<div>Created: {dayjs(selectedCall.created_at).format("MMM DD, YYYY HH:mm")}</div>
							<div>Updated: {dayjs(selectedCall.updated_at).format("MMM DD, YYYY HH:mm")}</div>
							{selectedCall.completed_at && <div>Completed: {dayjs(selectedCall.completed_at).format("MMM DD, YYYY HH:mm")}</div>}
						</div>
					</div>
				)}
			</Modal>

			{/* Reschedule Modal */}
			<Modal title="Reschedule Call" open={modalVisible && modalType === "reschedule"} onCancel={() => setModalVisible(false)} footer={null} width={500}>
				<Form form={form} layout="vertical" onFinish={handleRescheduleCall}>
					<div className="grid grid-cols-2 gap-4">
						<Form.Item name="date" label="New Date" rules={[{ required: true }]}>
							<DatePicker style={{ width: "100%" }} />
						</Form.Item>
						<Form.Item name="time" label="New Time" rules={[{ required: true }]}>
							<TimePicker format="HH:mm" style={{ width: "100%" }} />
						</Form.Item>
					</div>
					<Form.Item name="duration_minutes" label="Duration (minutes)" rules={[{ required: true }]}>
						<InputNumber min={15} max={180} style={{ width: "100%" }} />
					</Form.Item>
					<Form.Item name="notes" label="Reschedule Reason">
						<TextArea rows={3} placeholder="Reason for rescheduling..." />
					</Form.Item>
					<div className="flex justify-end gap-2">
						<Button onClick={() => setModalVisible(false)}>Cancel</Button>
						<AntButton type="primary" htmlType="submit">
							Reschedule Call
						</AntButton>
					</div>
				</Form>
			</Modal>

			{/* Call Outcome Modal */}
			<Modal title="Call Outcome" open={modalVisible && modalType === "outcome"} onCancel={() => setModalVisible(false)} footer={null} width={600}>
				<Form form={outcomeForm} layout="vertical">
					<Form.Item name="call_result" label="Call Result" rules={[{ required: true }]}>
						<Select placeholder="Select call result">
							<Option value="completed">Completed Successfully</Option>
							<Option value="failed">Failed / No Answer</Option>
						</Select>
					</Form.Item>

					<Form.Item name="actual_duration" label="Actual Duration (minutes)">
						<InputNumber min={1} max={300} style={{ width: "100%" }} />
					</Form.Item>

					<Form.Item name="outcome_notes" label="Call Notes" rules={[{ required: true }]}>
						<TextArea rows={4} placeholder="Describe what happened during the call..." />
					</Form.Item>

					<Form.Item name="failed_reason" label="Failed Reason" dependencies={["call_result"]}>
						{({ getFieldValue }) =>
							getFieldValue("call_result") === "failed" ? (
								<Select placeholder="Select reason for failure">
									<Option value="no_answer">No Answer</Option>
									<Option value="busy">Line Busy</Option>
									<Option value="wrong_number">Wrong Number</Option>
									<Option value="not_interested">Not Interested</Option>
									<Option value="technical_issues">Technical Issues</Option>
									<Option value="other">Other</Option>
								</Select>
							) : null
						}
					</Form.Item>

					<Form.Item name="follow_up_required" valuePropName="checked">
						<Switch checkedChildren="Follow-up Required" unCheckedChildren="No Follow-up" />
					</Form.Item>

					<div className="flex justify-end gap-2">
						<Button onClick={() => setModalVisible(false)}>Cancel</Button>
						<AntButton
							type="primary"
							onClick={() => {
								outcomeForm.validateFields().then((values) => {
									if (values.call_result === "completed") {
										handleCompleteCall(values);
									} else {
										handleFailCall(values);
									}
								});
							}}
						>
							Save Outcome
						</AntButton>
					</div>
				</Form>
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

export default CallManagementPage;
