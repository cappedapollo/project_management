import { useAuth } from "@/components/auth/use-auth";
import { Icon } from "@/components/icon";
import InterviewModal from "@/components/interview-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Text, Title } from "@/ui/typography";
import { Card as AntCard, Badge, Button, Calendar, DatePicker, Popover, Select, Space, Tooltip, message } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface Interview {
	id: number;
	job_application_id?: number;
	user_id: number;
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
}

const CalendarPage: React.FC = () => {
	const { user, access_token } = useAuth();
	const [events, setEvents] = useState<CalendarEvent[]>([]);
	const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs()); // Start with current date
	const [loading, setLoading] = useState(false);
	const [calendarView, setCalendarView] = useState<"month" | "week">("week");
	const [currentTime, setCurrentTime] = useState(dayjs());
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [editingEvent, setEditingEvent] = useState<Interview | null>(null);

	// Fetch interviews from backend
	const fetchInterviews = useCallback(async () => {
		if (!access_token || !user) {
			console.log("📅 Calendar: No access token or user available");
			return;
		}

		try {
			setLoading(true);
			console.log("📅 Calendar: Fetching interviews for user:", user.email, "role:", user.role);

			// Use different API endpoint based on user role
			const apiEndpoint = user.role === 2 ? "/api/caller/calls" : "/api/interviews";
			console.log("📅 Calendar: Using API endpoint:", apiEndpoint);

			const response = await fetch(apiEndpoint, {
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
			});

			console.log("📅 Calendar: Response status:", response.status);

			if (response.ok) {
				const data = await response.json();
				console.log("📅 Calendar: Received data:", data);

				// Handle different response formats based on API endpoint
				let interviews = [];
				if (user.role === 2) {
					// Caller API returns { calls: [...] }
					interviews = data.calls || [];
					console.log("📅 Calendar: Processing caller calls:", interviews.length);
				} else {
					// Regular API returns interviews directly as an array
					interviews = Array.isArray(data) ? data : data.interviews || [];
					console.log("📅 Calendar: Processing user interviews:", interviews.length);
				}

				const interviewEvents: CalendarEvent[] = interviews.map((interview: any) => {
					const scheduledTime = interview.scheduled_time || interview.scheduled_date;
					const eventDate = dayjs(scheduledTime);

					// Handle different data structures
					const company = interview.company || interview.company_name || "Unknown Company";
					const position = interview.job_title || interview.position_title || "Unknown Position";

					return {
						id: interview.id,
						title: `${company} - ${position}`,
						date: eventDate.format("YYYY-MM-DD"),
						time: eventDate.format("HH:mm"),
						type: "interview" as const,
						status: interview.status,
						details: {
							...interview,
							company_name: company,
							position_title: position,
							scheduled_date: scheduledTime,
						},
					};
				});

				console.log("📅 Calendar: Created events:", interviewEvents);
				setEvents(interviewEvents);

				if (interviewEvents.length > 0) {
					message.success(`Loaded ${interviewEvents.length} interview${interviewEvents.length > 1 ? "s" : ""}`);
				} else {
					message.info("No interviews scheduled");
				}
			} else {
				console.warn("📅 Calendar: Failed to fetch interviews:", response.status);
				const errorText = await response.text();
				console.warn("📅 Calendar: Error response:", errorText);
				message.warning("Could not load interviews");
			}
		} catch (error) {
			console.error("📅 Calendar: Error fetching interviews:", error);
			message.error("Failed to load calendar events");
		} finally {
			setLoading(false);
		}
	}, [access_token, user]);

	useEffect(() => {
		console.log("📅 Calendar: Component mounted, user:", user?.email, "access_token:", !!access_token);
		fetchInterviews();
	}, [fetchInterviews, user?.email, access_token]);

	// Debug: Log events when they change
	useEffect(() => {
		console.log("📅 Calendar: Events updated:", events.length, events);
	}, [events]);

	// Update current time every minute for the red line
	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(dayjs());
		}, 60000); // Update every minute

		return () => clearInterval(interval);
	}, []);

	// Filter events based on status and type
	const filteredEvents = useMemo(() => {
		return events.filter((event) => {
			const statusMatch = statusFilter === "all" || event.status === statusFilter;
			const typeMatch = typeFilter === "all" || event.details.interview_type === typeFilter;
			return statusMatch && typeMatch;
		});
	}, [events, statusFilter, typeFilter]);

	// Get events for a specific date
	const getEventsForDate = useCallback(
		(date: Dayjs) => {
			const dateStr = date.format("YYYY-MM-DD");
			return filteredEvents.filter((event) => {
				const eventDateStr = dayjs(event.date).format("YYYY-MM-DD");
				return eventDateStr === dateStr;
			});
		},
		[filteredEvents],
	);

	// Handle date selection
	const onDateSelect = (date: Dayjs) => {
		setSelectedDate(date);
		// Show a subtle message about the selected date
		const eventsCount = getEventsForDate(date).length;
		if (eventsCount > 0) {
			message.info(`${eventsCount} event${eventsCount > 1 ? "s" : ""} on ${date.format("MMM DD, YYYY")}`);
		}
	};

	// Handle creating new interview (disabled for callers)
	const handleCreateInterview = () => {
		if (user?.role === 2) {
			message.warning("Callers can only view and manage existing schedules");
			return;
		}
		setEditingEvent(null);
		setIsModalVisible(true);
	};

	// Handle editing interview
	const handleEditInterview = (event: CalendarEvent) => {
		if (import.meta.env.DEV) {
			console.log("🎯 Editing interview:", event.details);
		}
		// Pass the interview details (not the CalendarEvent wrapper) to the modal
		setEditingEvent(event.details);
		setIsModalVisible(true);
	};

	// Handle time slot click to create new interview at specific time
	const handleTimeSlotClick = (date: Dayjs, hour: number) => {
		if (user?.role === 2) {
			message.warning("Callers can only view and manage existing schedules");
			return;
		}
		const selectedDateTime = date.hour(hour).minute(0).second(0);
		if (import.meta.env.DEV) {
			console.log("🎯 Creating new interview at:", selectedDateTime.format("YYYY-MM-DD HH:mm"));
		}
		setEditingEvent(null);
		setSelectedDate(selectedDateTime); // Update selected date to include the time
		setIsModalVisible(true);
	};

	// Handle modal success
	const handleModalSuccess = () => {
		fetchInterviews(); // Refresh the calendar
	};

	// Handle modal cancel
	const handleModalCancel = () => {
		setIsModalVisible(false);
		setEditingEvent(null);
	};

	// Calendar cell renderer - Teams style for month view
	const dateCellRender = useCallback(
		(value: Dayjs) => {
			const dayEvents = getEventsForDate(value);

			return (
				<div className="h-full p-1">
					{dayEvents.slice(0, 3).map((event) => (
						<div key={event.id} className="mb-1">
							<Tooltip
								title={
									<div>
										<div className="font-medium">{event.title}</div>
										<div className="text-xs">
											{event.time} • {event.details.duration_minutes}min
										</div>
										<div className="text-xs">{event.details.interviewer_name}</div>
										<div className="text-xs">{event.details.location}</div>
										<div className="text-xs">Status: {event.status}</div>
									</div>
								}
							>
								<div
									className="text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity bg-purple-100 text-purple-800 border-l-2 border-purple-500"
									onClick={(e) => {
										e.stopPropagation();
										window.location.href = `/dashboard/interviews?action=edit&id=${event.id}`;
									}}
								>
									<div className="font-medium truncate">{event.time}</div>
									<div className="truncate">{event.title}</div>
								</div>
							</Tooltip>
						</div>
					))}
					{dayEvents.length > 3 && (
						<div
							className="text-xs text-purple-600 cursor-pointer hover:text-purple-800 px-1 font-medium"
							onClick={(e) => {
								e.stopPropagation();
								setSelectedDate(value);
								setCalendarView("week");
								const eventsCount = getEventsForDate(value).length;
								if (eventsCount > 0) {
									message.info(`${eventsCount} event${eventsCount > 1 ? "s" : ""} on ${value.format("MMM DD, YYYY")}`);
								}
							}}
						>
							+{dayEvents.length - 3} more
						</div>
					)}
				</div>
			);
		},
		[getEventsForDate],
	);

	// Get events for selected date
	const selectedDateEvents = useMemo(() => getEventsForDate(selectedDate), [selectedDate, getEventsForDate]);

	// Generate time slots for Teams Calendar style
	const generateTimeSlots = () => {
		const slots = [];
		for (let hour = 0; hour < 24; hour++) {
			slots.push({
				time: dayjs().hour(hour).minute(0).format("h A"),
				hour24: hour,
				events: filteredEvents.filter((event) => {
					const eventTime = dayjs(`${event.date} ${event.time}`);
					return eventTime.hour() === hour && dayjs(event.date).isSame(selectedDate, "day");
				}),
			});
		}
		return slots;
	};

	const timeSlots = generateTimeSlots();

	// Get current time for the red line
	const getCurrentTimePosition = () => {
		const minutes = currentTime.hour() * 60 + currentTime.minute();
		return (minutes / 60) * 48; // 48px per hour
	};

	const currentTimePosition = getCurrentTimePosition();
	const isCurrentWeek = selectedDate.isSame(currentTime, "week");

	return (
		<div className="h-screen flex flex-col bg-white">
			{/* Teams Calendar Header */}
			<div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-3">
						<Icon icon="solar:calendar-bold" size={24} className="text-purple-600" />
						<h1 className="text-xl font-semibold text-gray-900">Calendar</h1>
					</div>

					<div className="flex items-center gap-2">
						<Button
							type="text"
							icon={<Icon icon="solar:arrow-left-bold" size={16} />}
							onClick={() => setSelectedDate(selectedDate.subtract(1, "week"))}
							className="hover:bg-gray-100"
						/>
						<Button type="text" onClick={() => setSelectedDate(dayjs())} className="px-3 hover:bg-gray-100">
							Today
						</Button>
						<Button
							type="text"
							icon={<Icon icon="solar:arrow-right-bold" size={16} />}
							onClick={() => setSelectedDate(selectedDate.add(1, "week"))}
							className="hover:bg-gray-100"
						/>
					</div>

					{/* Date Picker Popover */}
					<Popover
						open={showDatePicker}
						onOpenChange={setShowDatePicker}
						trigger="click"
						placement="bottomLeft"
						content={
							<div className="p-2">
								<Calendar
									value={selectedDate}
									onSelect={(date) => {
										setSelectedDate(date);
										setShowDatePicker(false);
									}}
									fullscreen={false}
									className="teams-date-picker"
								/>
							</div>
						}
					>
						<Button type="text" className="px-3 hover:bg-gray-100 flex items-center gap-2" icon={<Icon icon="solar:calendar-minimalistic-bold" size={16} />}>
							{selectedDate.format("MMMM YYYY")}
							<Icon icon="solar:alt-arrow-down-bold" size={12} />
						</Button>
					</Popover>
				</div>

				<div className="flex items-center gap-3">
					{/* Filters */}
					<div className="flex items-center gap-2 teams-calendar-filters">
						<Select value={statusFilter} onChange={setStatusFilter} placeholder="Filter by status" className="w-32" size="small">
							<Select.Option value="all">All Status</Select.Option>
							<Select.Option value="scheduled">Scheduled</Select.Option>
							<Select.Option value="completed">Completed</Select.Option>
							<Select.Option value="cancelled">Cancelled</Select.Option>
							<Select.Option value="rescheduled">Rescheduled</Select.Option>
						</Select>

						<Select value={typeFilter} onChange={setTypeFilter} placeholder="Filter by type" className="w-32" size="small">
							<Select.Option value="all">All Types</Select.Option>
							<Select.Option value="phone">Phone</Select.Option>
							<Select.Option value="video">Video</Select.Option>
							<Select.Option value="in_person">In Person</Select.Option>
							<Select.Option value="technical">Technical</Select.Option>
							<Select.Option value="behavioral">Behavioral</Select.Option>
							<Select.Option value="panel">Panel</Select.Option>
						</Select>
					</div>

					<Button
						type="primary"
						icon={<Icon icon="solar:add-circle-bold" size={16} />}
						onClick={handleCreateInterview}
						disabled={user?.role === 2}
						className={user?.role === 2 ? "opacity-50 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 border-purple-600"}
						title={user?.role === 2 ? "Callers can only view and manage existing schedules" : "Create new meeting"}
					>
						New meeting
					</Button>

					<Space.Compact>
						<Button type={calendarView === "month" ? "primary" : "default"} onClick={() => setCalendarView("month")}>
							Month
						</Button>
						<Button type={calendarView === "week" ? "primary" : "default"} onClick={() => setCalendarView("week")}>
							Work week
						</Button>
					</Space.Compact>
				</div>
			</div>

			{/* Calendar Content */}
			{calendarView === "week" ? (
				/* Teams Calendar Week View */
				<div className="flex-1 flex flex-col overflow-hidden bg-white">
					{/* Week Header with Days */}
					<div className="flex border-b border-gray-200 bg-white">
						{/* Time Column Header */}
						<div className="w-16 border-r border-gray-200 bg-gray-50" />

						{/* Days Header */}
						{Array.from({ length: 7 }, (_, i) => {
							const date = selectedDate.startOf("week").add(i, "day");
							const isToday = date.isSame(dayjs(), "day");
							return (
								<div key={date.format("YYYY-MM-DD")} className="flex-1 border-r border-gray-200 p-3 text-center bg-gray-50">
									<div className="text-xs text-gray-600 font-medium uppercase">{date.format("ddd")}</div>
									<div className={`text-lg font-semibold mt-1 ${isToday ? "text-purple-600" : "text-gray-900"}`}>{date.format("D")}</div>
								</div>
							);
						})}
					</div>

					{/* Calendar Grid */}
					<div className="flex-1 flex overflow-hidden">
						{/* Time Column */}
						<div className="w-16 border-r border-gray-200 bg-white">
							{timeSlots.map((slot) => (
								<div key={slot.hour24} className="h-16 border-b border-gray-100 flex items-center justify-center">
									<span className="text-xs text-gray-500 font-medium">{slot.time}</span>
								</div>
							))}
						</div>

						{/* Days Grid */}
						<div className="flex-1 relative overflow-auto">
							<div className="grid grid-cols-7 h-full">
								{Array.from({ length: 7 }, (_, dayIndex) => {
									const date = selectedDate.startOf("week").add(dayIndex, "day");
									const dayEvents = filteredEvents.filter((event) => {
										const eventDate = dayjs(event.date);
										return eventDate.isSame(date, "day");
									});

									return (
										<div key={date.format("YYYY-MM-DD")} className="border-r border-gray-200 relative">
											{/* Time slots background */}
											{timeSlots.map((slot) => (
												<div
													key={slot.hour24}
													className={`h-16 border-b border-gray-100 transition-colors relative ${
														user?.role === 2 ? "cursor-default" : "cursor-pointer hover:bg-blue-50 hover:border-blue-200 group"
													}`}
													onClick={() => handleTimeSlotClick(date, slot.hour24)}
													title={user?.role === 2 ? "Callers can only view existing schedules" : `Create interview at ${date.format("MMM DD")} ${slot.time}`}
												>
													{/* Subtle plus icon on hover (only for non-callers) */}
													{user?.role !== 2 && (
														<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-30 transition-opacity">
															<span className="text-blue-500 text-lg font-bold">+</span>
														</div>
													)}
												</div>
											))}

											{/* Events */}
											{dayEvents.map((event) => {
												const eventDateTime = dayjs(`${event.date}T${event.time}`);
												const startHour = eventDateTime.hour();
												const startMinute = eventDateTime.minute();
												const topPosition = (startHour - 8) * 64 + (startMinute / 60) * 64; // 64px per hour, starting from 8 AM
												const height = Math.max((event.details.duration_minutes / 60) * 64, 32); // Minimum 32px height

												return (
													<div
														key={event.id}
														className="absolute left-1 right-1 bg-red-400 rounded-md text-white text-xs p-2 cursor-pointer hover:bg-red-500 transition-colors shadow-sm z-10"
														style={{
															top: `${topPosition}px`,
															height: `${height}px`,
														}}
														onClick={() => handleEditInterview(event)}
													>
														<div className="font-semibold truncate">{event.title}</div>
														<div className="text-xs opacity-90 truncate">{event.time}</div>
														{event.details.interviewer_name && <div className="text-xs opacity-90 truncate">{event.details.interviewer_name}</div>}
													</div>
												);
											})}
										</div>
									);
								})}
							</div>

							{/* Current Time Red Line */}
							{isCurrentWeek && (
								<div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${currentTimePosition}px` }}>
									<div className="flex items-center">
										<div className="w-2 h-2 bg-red-500 rounded-full -ml-1" />
										<div className="flex-1 h-0.5 bg-red-500" />
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			) : (
				/* Teams Calendar Month View */
				<div className="flex-1 bg-white overflow-hidden">
					<div className="h-full">
						{/* Month Grid */}
						<div className="h-full flex flex-col">
							{/* Days of Week Header */}
							<div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
								{["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
									<div key={day} className="p-3 text-center text-xs font-semibold text-gray-600 border-r border-gray-200">
										{day}
									</div>
								))}
							</div>

							{/* Calendar Grid */}
							<div className="flex-1 grid grid-cols-7 grid-rows-6">
								{Array.from({ length: 42 }, (_, i) => {
									const date = selectedDate.startOf("month").startOf("week").add(i, "day");
									const isCurrentMonth = date.month() === selectedDate.month();
									const isToday = date.isSame(dayjs(), "day");
									const dayEvents = filteredEvents.filter((event) => {
										const eventDate = dayjs(event.date);
										return eventDate.isSame(date, "day");
									});

									return (
										<div
											key={date.format("YYYY-MM-DD")}
											className={`border-r border-b border-gray-200 p-2 min-h-[120px] transition-colors ${
												user?.role === 2 ? "cursor-default" : "cursor-pointer hover:bg-blue-50"
											} ${isCurrentMonth ? "bg-white" : "bg-gray-50"} ${isToday ? "bg-blue-50" : ""}`}
											onClick={(e) => {
												// Only trigger if clicking on empty space, not on events, and user is not a caller
												if (user?.role !== 2 && (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains("text-sm"))) {
													handleTimeSlotClick(date, 9); // Default to 9 AM for month view clicks
												}
											}}
											title={user?.role === 2 ? "Callers can only view existing schedules" : `Create interview on ${date.format("MMM DD, YYYY")}`}
										>
											<div className={`text-sm font-medium mb-2 ${isCurrentMonth ? (isToday ? "text-blue-600 font-bold" : "text-gray-900") : "text-gray-400"}`}>
												{date.format("D")}
											</div>

											{/* Events */}
											{dayEvents.slice(0, 3).map((event) => (
												<div
													key={event.id}
													className="mb-1 bg-red-400 text-white text-xs px-2 py-1 rounded cursor-pointer hover:bg-red-500 transition-colors"
													onClick={() => handleEditInterview(event)}
												>
													<div className="font-medium truncate">{event.time}</div>
													<div className="truncate">{event.title}</div>
												</div>
											))}

											{dayEvents.length > 3 && <div className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">+{dayEvents.length - 3} more</div>}
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Interview Modal */}
			<InterviewModal
				visible={isModalVisible}
				onCancel={handleModalCancel}
				onSuccess={handleModalSuccess}
				editingInterview={editingEvent}
				initialDate={selectedDate}
			/>
		</div>
	);
};

export default CalendarPage;
