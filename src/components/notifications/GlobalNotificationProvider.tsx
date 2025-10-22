import { useAuth } from "@/components/auth/use-auth";
import notificationService, { type CallNotificationData } from "@/services/notificationService";
import { useUserToken } from "@/store/userStore";
import { notification } from "antd";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import { CallDetailsModal } from "./CallDetailsModal";

interface CallSchedule {
	id: number;
	contact_name: string;
	company: string;
	scheduled_time: string;
	call_type: string;
	phone_number?: string;
	preparation_notes?: string;
	status: string;
}

/**
 * Global Notification Provider
 * Initializes and manages notifications for caller users across all pages
 */
export const GlobalNotificationProvider = ({ children }: { children: React.ReactNode }) => {
	const { user, isAuthenticated } = useAuth();
	const { access_token } = useUserToken();
	const notificationInitialized = useRef(false);
	const isCallerUser = isAuthenticated && user?.role === 2;

	// Modal state for call details
	const [modalVisible, setModalVisible] = useState(false);
	const [selectedCall, setSelectedCall] = useState<CallNotificationData | null>(null);

	// Initialize notifications for caller users
	useEffect(() => {
		if (!isCallerUser || notificationInitialized.current) {
			return;
		}

		const initializeNotifications = async () => {
			try {
				await notificationService.requestPermission();

				// Set up notification click callback
				notificationService.setNotificationClickCallback((callData: CallNotificationData) => {
					setSelectedCall(callData);
					setModalVisible(true);
				});

				// Show welcome notification
				notification.open({
					message: "🔔 Call Notifications Enabled",
					description: "You will receive notifications for upcoming calls at 15, 10, 5, and 1 minute intervals.",
					duration: 4,
					placement: "topRight",
					style: {
						backgroundColor: "#f6ffed",
						borderLeft: "4px solid #52c41a",
					},
				});

				notificationInitialized.current = true;
			} catch (error) {
				console.error("Failed to initialize notifications:", error);
			}
		};

		initializeNotifications();

		// Cleanup on unmount
		return () => {
			notificationService.stopMonitoring();
			notificationInitialized.current = false;
		};
	}, [isCallerUser]);

	// Monitor calls for notifications
	useEffect(() => {
		if (!isCallerUser || !notificationInitialized.current) {
			return;
		}

		const startCallMonitoring = async () => {
			try {
				// Fetch calls from API
				const response = await fetch("/api/caller/calls", {
					headers: {
						Authorization: `Bearer ${access_token}`,
						"Content-Type": "application/json",
					},
				});

				if (response.ok) {
					const data = await response.json();
					const calls: CallSchedule[] = data.calls || [];

					// Convert to notification format
					const upcomingCalls: CallNotificationData[] = calls
						.filter((call) => call.status === "scheduled" && dayjs(call.scheduled_time).isAfter(dayjs()))
						.map((call) => ({
							id: call.id,
							contact_name: call.contact_name,
							company: call.company,
							scheduled_time: call.scheduled_time,
							call_type: call.call_type,
							phone_number: call.phone_number,
							preparation_notes: call.preparation_notes,
						}));

					// Start monitoring
					notificationService.startMonitoring(upcomingCalls);
				}
			} catch (error) {
				console.error("Error fetching calls for notifications:", error);
			}
		};

		// Start monitoring immediately and then every 5 minutes
		startCallMonitoring();
		const monitoringInterval = setInterval(startCallMonitoring, 5 * 60 * 1000);

		return () => {
			clearInterval(monitoringInterval);
		};
	}, [isCallerUser, access_token]);

	// Cleanup when user logs out or role changes
	useEffect(() => {
		if (!isCallerUser && notificationInitialized.current) {
			notificationService.stopMonitoring();
			notificationInitialized.current = false;
		}
	}, [isCallerUser]);

	// Modal handlers
	const handleModalClose = () => {
		setModalVisible(false);
		setSelectedCall(null);
	};

	const handleStartCall = (callData: CallNotificationData) => {
		if (callData.phone_number) {
			window.open(`tel:${callData.phone_number}`);
		}
		handleModalClose();
	};

	const handleReschedule = (callData: CallNotificationData) => {
		// TODO: Implement reschedule functionality
		console.log("Reschedule call:", callData);
		handleModalClose();
	};

	return (
		<>
			{children}
			<CallDetailsModal
				visible={modalVisible}
				onClose={handleModalClose}
				callData={selectedCall}
				onStartCall={handleStartCall}
				onReschedule={handleReschedule}
			/>
		</>
	);
};

export default GlobalNotificationProvider;
