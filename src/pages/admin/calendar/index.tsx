import { useAuth } from "@/components/auth/use-auth";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Text, Title } from "@/ui/typography";
import { Badge, Button, Calendar, DatePicker, Modal, Popover, Select, Space, Tag, Tooltip, message } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface Interview {
	id: number;
	job_application_id?: number;
	user_id: number;
	username?: string;
	email?: string;
	interview_type: string;
	scheduled_date: string;
	duration_minutes: number;
	interviewer_name: string;
	interviewer_email?: string;
	location: string;
	meeting_link?: string;
	status: "scheduled" | "completed" | "cancelled" | "rescheduled";
	notes?: string;
	feedback?: string;
	rating?: number;
	company_name: string;
	position_title: string;
	job_description?: string;
	resume_link?: string;
}

interface CalendarEvent {
	id: number;
	title: string;
	date: string;
	time: string;
	type: "interview" | "meeting" | "deadline";
	status: string;
	details: Interview;
	isConflicted?: boolean;
	conflictLevel?: number;
}

interface ConflictGroup {
	timeSlot: string;
	events: CalendarEvent[];
	conflictLevel: number;
}

const AdminCalendarPage: React.FC = () => {
	const { user, access_token } = useAuth();
	const [events, setEvents] = useState<CalendarEvent[]>([]);
	const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
	const [loading, setLoading] = useState(false);
	const [currentTime, setCurrentTime] = useState(dayjs());
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [selectedEvent, setSelectedEvent] = useState<Interview | null>(null);
	const [detailsModalVisible, setDetailsModalVisible] = useState(false);
	const [conflicts, setConflicts] = useState<ConflictGroup[]>([]);

	// Fetch all interviews from backend (admin view)
	const fetchAllInterviews = useCallback(async () => {
		if (!access_token || !user || user.role !== 0) {
			console.log("📅 Admin Calendar: No access token, user, or not admin");
			return;
		}

		try {
			setLoading(true);
			console.log("📅 Admin Calendar: Fetching all interviews");

			const response = await fetch("/api/admin/interviews", {
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
			});

			console.log("📅 Admin Calendar: Response status:", response.status);

			if (response.ok) {
				const data = await response.json();
				console.log("📅 Admin Calendar: Received data:", data);

				const interviews = data.interviews || [];
				console.log("📅 Admin Calendar: Processing interviews:", interviews.length);

				const interviewEvents: CalendarEvent[] = interviews.map((interview: any) => {
					const scheduledTime = interview.scheduled_time || interview.scheduled_date;
					const eventDate = dayjs(scheduledTime);

					return {
						id: interview.id,
						title: `${interview.company_name} - ${interview.position_title}`,
						date: eventDate.format("YYYY-MM-DD"),
						time: eventDate.format("HH:mm"),
						type: "interview" as const,
						status: interview.status || "scheduled",
						details: {
							...interview,
							scheduled_date: scheduledTime,
						},
					};
				});

				// Detect conflicts
				const detectedConflicts = detectTimeConflicts(interviewEvents);
				setConflicts(detectedConflicts);

				// Mark conflicted events
				const eventsWithConflicts = interviewEvents.map((event) => {
					const conflict = detectedConflicts.find((c) => c.events.some((e) => e.id === event.id));
					return {
						...event,
						isConflicted: !!conflict,
						conflictLevel: conflict?.conflictLevel || 0,
					};
				});

				setEvents(eventsWithConflicts);
				console.log("📅 Admin Calendar: Events processed:", eventsWithConflicts.length, "events,", detectedConflicts.length, "conflicts");
			} else {
				console.error("📅 Admin Calendar: Failed to fetch interviews");
				message.error("Failed to fetch interviews");
			}
		} catch (error) {
			console.error("📅 Admin Calendar: Error fetching interviews:", error);
			message.error("Error fetching interviews");
		} finally {
			setLoading(false);
		}
	}, [access_token, user]);

	// Detect time conflicts between interviews
	const detectTimeConflicts = (events: CalendarEvent[]): ConflictGroup[] => {
		const conflicts: ConflictGroup[] = [];
		const timeSlots: { [key: string]: CalendarEvent[] } = {};

		// Group events by time slots (30-minute intervals)
		for (const event of events) {
			const eventStart = dayjs(`${event.date} ${event.time}`);
			const duration = event.details.duration_minutes || 60;
			const eventEnd = eventStart.add(duration, "minute");

			// Create 30-minute time slots for this event
			let current = eventStart.startOf("hour");
			while (current.isBefore(eventEnd)) {
				const slotKey = current.format("YYYY-MM-DD HH:mm");
				if (!timeSlots[slotKey]) {
					timeSlots[slotKey] = [];
				}
				timeSlots[slotKey].push(event);
				current = current.add(30, "minute");
			}
		}

		// Find conflicts (more than 1 event in same time slot)
		for (const [timeSlot, slotEvents] of Object.entries(timeSlots)) {
			if (slotEvents.length > 1) {
				// Remove duplicates (same event in multiple slots)
				const uniqueEvents = Array.from(new Map(slotEvents.map((e) => [e.id, e])).values());

				if (uniqueEvents.length > 1) {
					conflicts.push({
						timeSlot,
						events: uniqueEvents,
						conflictLevel: uniqueEvents.length,
					});
				}
			}
		}

		return conflicts;
	};

	useEffect(() => {
		fetchAllInterviews();
	}, [fetchAllInterviews]);

	// Update current time every minute
	useEffect(() => {
		const timer = setInterval(() => {
			setCurrentTime(dayjs());
		}, 60000);

		return () => clearInterval(timer);
	}, []);

	// Filter events based on selected filters
	const filteredEvents = useMemo(() => {
		return events.filter((event) => {
			const statusMatch = statusFilter === "all" || event.status === statusFilter;
			const typeMatch = typeFilter === "all" || event.type === typeFilter;
			return statusMatch && typeMatch;
		});
	}, [events, statusFilter, typeFilter]);

	// Get events for selected date
	const selectedDateEvents = useMemo(() => {
		const dateStr = selectedDate.format("YYYY-MM-DD");
		return filteredEvents.filter((event) => event.date === dateStr);
	}, [filteredEvents, selectedDate]);

	// Get events for calendar cell
	const getEventsForDate = (date: Dayjs) => {
		const dateStr = date.format("YYYY-MM-DD");
		return filteredEvents.filter((event) => event.date === dateStr);
	};

	// Calendar cell renderer
	const dateCellRender = (date: Dayjs) => {
		const dayEvents = getEventsForDate(date);
		if (dayEvents.length === 0) return null;

		const conflictedEvents = dayEvents.filter((e) => e.isConflicted);
		const normalEvents = dayEvents.filter((e) => !e.isConflicted);

		return (
			<div className="space-y-1">
				{/* Normal events */}
				{normalEvents.slice(0, 2).map((event) => (
					<div
						key={event.id}
						className="text-xs p-1 rounded bg-blue-100 text-blue-800 truncate cursor-pointer hover:bg-blue-200"
						onClick={() => showEventDetails(event.details)}
					>
						{event.time} - {event.title}
					</div>
				))}

				{/* Conflicted events */}
				{conflictedEvents.slice(0, 2).map((event) => (
					<div
						key={event.id}
						className={`text-xs p-1 rounded truncate cursor-pointer ${
							event.conflictLevel && event.conflictLevel > 2 ? "bg-red-100 text-red-800 hover:bg-red-200" : "bg-orange-100 text-orange-800 hover:bg-orange-200"
						}`}
						onClick={() => showEventDetails(event.details)}
					>
						⚠️ {event.time} - {event.title}
					</div>
				))}

				{/* Show more indicator */}
				{dayEvents.length > 4 && <div className="text-xs text-gray-500 text-center">+{dayEvents.length - 4} more</div>}
			</div>
		);
	};

	const showEventDetails = (interview: Interview) => {
		setSelectedEvent(interview);
		setDetailsModalVisible(true);
	};

	const getStatusColor = (status: string) => {
		switch (status?.toLowerCase()) {
			case "scheduled":
				return "blue";
			case "completed":
				return "green";
			case "cancelled":
				return "red";
			case "rescheduled":
				return "orange";
			default:
				return "default";
		}
	};

	const getTypeIcon = (type: string) => {
		switch (type?.toLowerCase()) {
			case "phone":
				return "solar:phone-bold";
			case "video":
				return "solar:videocamera-bold";
			case "in-person":
				return "solar:user-bold";
			case "panel":
				return "solar:users-group-two-rounded-bold";
			default:
				return "solar:calendar-bold";
		}
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
						<Icon icon="solar:calendar-bold" size={24} />
						Interview Calendar - Admin View
					</Title>
					<Text className="text-gray-600">View all scheduled interviews with conflict detection</Text>
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
				<Card>
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-blue-600">{events.length}</div>
						<div className="text-sm text-gray-600">Total Interviews</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-green-600">{filteredEvents.length}</div>
						<div className="text-sm text-gray-600">Filtered Results</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-orange-600">{conflicts.length}</div>
						<div className="text-sm text-gray-600">Time Conflicts</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-red-600">{events.filter((e) => e.isConflicted).length}</div>
						<div className="text-sm text-gray-600">Conflicted Events</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters and Controls */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle>
						Filters & Controls
						{(statusFilter !== "all" || typeFilter !== "all") && <Badge count="Active" className="ml-2" style={{ backgroundColor: "#52c41a" }} />}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-4 items-center">
						<div>
							<Text className="block text-sm font-medium mb-1">Status Filter</Text>
							<Select style={{ width: 150 }} value={statusFilter} onChange={setStatusFilter}>
								<Select.Option value="all">All Status</Select.Option>
								<Select.Option value="scheduled">Scheduled</Select.Option>
								<Select.Option value="completed">Completed</Select.Option>
								<Select.Option value="cancelled">Cancelled</Select.Option>
								<Select.Option value="rescheduled">Rescheduled</Select.Option>
							</Select>
						</div>

						<div>
							<Text className="block text-sm font-medium mb-1">Quick Navigation</Text>
							<Space>
								<Button onClick={() => setSelectedDate(dayjs())}>Today</Button>
								<Popover
									content={
										<DatePicker
											value={selectedDate}
											onChange={(date) => {
												if (date) {
													setSelectedDate(date);
													setShowDatePicker(false);
												}
											}}
										/>
									}
									trigger="click"
									open={showDatePicker}
									onOpenChange={setShowDatePicker}
								>
									<Button icon={<Icon icon="solar:calendar-bold" size={16} />}>Jump to Date</Button>
								</Popover>
							</Space>
						</div>

						<div className="ml-auto">
							<Space>
								{(statusFilter !== "all" || typeFilter !== "all") && (
									<Button
										icon={<Icon icon="solar:close-circle-bold" size={16} />}
										onClick={() => {
											setStatusFilter("all");
											setTypeFilter("all");
										}}
									>
										Clear Filters
									</Button>
								)}
								<Button type="primary" icon={<Icon icon="solar:refresh-bold" size={16} />} onClick={fetchAllInterviews} loading={loading}>
									Refresh
								</Button>
							</Space>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Conflict Alerts */}
			{conflicts.length > 0 && (
				<Card className="mb-6 border-orange-200">
					<CardHeader>
						<CardTitle className="text-orange-600 flex items-center gap-2">
							<Icon icon="solar:danger-triangle-bold" size={20} />
							Schedule Conflicts Detected
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{conflicts.slice(0, 5).map((conflict) => (
								<div key={conflict.timeSlot} className="flex items-center justify-between p-3 bg-orange-50 rounded">
									<div>
										<Text className="font-medium">{dayjs(conflict.timeSlot).format("MMM DD, YYYY HH:mm")}</Text>
										<Text className="text-sm text-gray-600">{conflict.events.length} overlapping interviews</Text>
									</div>
									<Badge count={conflict.events.length} color="orange" />
								</div>
							))}
							{conflicts.length > 5 && <Text className="text-center text-gray-500">+{conflicts.length - 5} more conflicts</Text>}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Calendar */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Calendar */}
				<div className="lg:col-span-2">
					<Card>
						<CardContent className="p-4">
							<Calendar
								value={selectedDate}
								onSelect={setSelectedDate}
								dateCellRender={dateCellRender}
								headerRender={({ value, onChange }) => (
									<div className="flex justify-between items-center p-4 border-b">
										<Title level={4} className="m-0">
											{value.format("MMMM YYYY")}
										</Title>
										<Space>
											<Button size="small" icon={<Icon icon="solar:alt-arrow-left-bold" size={16} />} onClick={() => onChange(value.subtract(1, "month"))} />
											<Button size="small" icon={<Icon icon="solar:alt-arrow-right-bold" size={16} />} onClick={() => onChange(value.add(1, "month"))} />
										</Space>
									</div>
								)}
							/>
						</CardContent>
					</Card>
				</div>

				{/* Selected Date Events */}
				<div>
					<Card>
						<CardHeader>
							<CardTitle>
								{selectedDate.format("MMM DD, YYYY")}
								{selectedDateEvents.length > 0 && <Badge count={selectedDateEvents.length} className="ml-2" />}
							</CardTitle>
						</CardHeader>
						<CardContent>
							{selectedDateEvents.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									<Icon icon="solar:calendar-bold" size={48} className="mx-auto mb-2 opacity-50" />
									<Text>No interviews scheduled</Text>
								</div>
							) : (
								<div className="space-y-3 max-h-96 overflow-y-auto">
									{selectedDateEvents.map((event) => (
										<div
											key={event.id}
											className={`p-3 rounded border cursor-pointer hover:shadow-md transition-shadow ${
												event.isConflicted ? "border-orange-200 bg-orange-50" : "border-gray-200 hover:border-blue-300"
											}`}
											onClick={() => showEventDetails(event.details)}
										>
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<div className="flex items-center gap-2 mb-1">
														<Icon icon={getTypeIcon(event.details.interview_type)} size={16} />
														<Text className="font-medium text-sm">{event.time}</Text>
														{event.isConflicted && (
															<Tooltip title="Schedule conflict detected">
																<Icon icon="solar:danger-triangle-bold" size={14} className="text-orange-500" />
															</Tooltip>
														)}
													</div>
													<Text className="text-sm font-medium">{event.title}</Text>
													<Text className="text-xs text-gray-600">
														{event.details.username} - {event.details.interviewer_name}
													</Text>
													<Text className="text-xs text-gray-500">
														{event.details.duration_minutes}min - {event.details.location}
													</Text>
												</div>
												<Tag color={getStatusColor(event.status)} size="small">
													{event.status.toUpperCase()}
												</Tag>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Event Details Modal */}
			<Modal title="Interview Details" open={detailsModalVisible} onCancel={() => setDetailsModalVisible(false)} footer={null} width={800}>
				{selectedEvent && (
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<div className="block text-sm font-medium text-gray-700">Candidate</div>
								<div className="mt-1">
									<div className="font-medium">{selectedEvent.username}</div>
									<div className="text-sm text-gray-500">{selectedEvent.email}</div>
								</div>
							</div>
							<div>
								<div className="block text-sm font-medium text-gray-700">Status</div>
								<div className="mt-1">
									<Tag color={getStatusColor(selectedEvent.status)}>{selectedEvent.status?.toUpperCase() || "SCHEDULED"}</Tag>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<div className="block text-sm font-medium text-gray-700">Company</div>
								<div className="mt-1 text-sm">{selectedEvent.company_name}</div>
							</div>
							<div>
								<div className="block text-sm font-medium text-gray-700">Position</div>
								<div className="mt-1 text-sm">{selectedEvent.position_title}</div>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<div className="block text-sm font-medium text-gray-700">Interview Type</div>
								<div className="mt-1 text-sm flex items-center gap-2">
									<Icon icon={getTypeIcon(selectedEvent.interview_type)} size={16} />
									{selectedEvent.interview_type}
								</div>
							</div>
							<div>
								<div className="block text-sm font-medium text-gray-700">Duration</div>
								<div className="mt-1 text-sm">{selectedEvent.duration_minutes} minutes</div>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<div className="block text-sm font-medium text-gray-700">Scheduled Date & Time</div>
								<div className="mt-1 text-sm">{dayjs(selectedEvent.scheduled_date).format("MMMM DD, YYYY HH:mm")}</div>
							</div>
							<div>
								<div className="block text-sm font-medium text-gray-700">Location</div>
								<div className="mt-1 text-sm">{selectedEvent.location}</div>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<div className="block text-sm font-medium text-gray-700">Interviewer</div>
								<div className="mt-1 text-sm">
									<div>{selectedEvent.interviewer_name}</div>
									{selectedEvent.interviewer_email && <div className="text-gray-500">{selectedEvent.interviewer_email}</div>}
								</div>
							</div>
							<div>
								<div className="block text-sm font-medium text-gray-700">Meeting Link</div>
								<div className="mt-1 text-sm">
									{selectedEvent.meeting_link ? (
										<a href={selectedEvent.meeting_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 break-all">
											{selectedEvent.meeting_link}
										</a>
									) : (
										<span className="text-gray-500">No meeting link</span>
									)}
								</div>
							</div>
						</div>

						{selectedEvent.notes && (
							<div>
								<div className="block text-sm font-medium text-gray-700">Notes</div>
								<div className="mt-1 text-sm bg-gray-50 p-3 rounded">{selectedEvent.notes}</div>
							</div>
						)}

						{selectedEvent.job_description && (
							<div>
								<div className="block text-sm font-medium text-gray-700">Job Description</div>
								<div className="mt-1 text-sm bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">{selectedEvent.job_description}</div>
							</div>
						)}
					</div>
				)}
			</Modal>
		</div>
	);
};

export default AdminCalendarPage;
