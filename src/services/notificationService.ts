import { message, notification } from "antd";
import dayjs from "dayjs";

export interface CallNotificationData {
	id: number;
	contact_name: string;
	company: string;
	scheduled_time: string;
	call_type: string;
	phone_number?: string;
	preparation_notes?: string;
}

class NotificationService {
	private notificationPermission: NotificationPermission = "default";
	private activeNotifications: Map<number, Notification> = new Map();
	private checkInterval: NodeJS.Timeout | null = null;
	private activeGoogleCalendarNotifications: Map<number, HTMLElement> = new Map();
	private notificationCallData: Map<number, CallNotificationData> = new Map();
	private notificationCountCallback: ((count: number) => void) | null = null;
	private notificationClickCallback: ((callData: CallNotificationData) => void) | null = null;

	constructor() {
		this.requestPermission();
	}

	// Set callback for notification count updates
	setNotificationCountCallback(callback: (count: number) => void): void {
		this.notificationCountCallback = callback;
	}

	// Set callback for notification clicks
	setNotificationClickCallback(callback: (callData: CallNotificationData) => void): void {
		this.notificationClickCallback = callback;
	}

	// Update notification count
	private updateNotificationCount(): void {
		const count = this.activeGoogleCalendarNotifications.size;
		if (this.notificationCountCallback) {
			this.notificationCountCallback(count);
		}
	}

	// Clear all Google Calendar notifications
	clearAllNotifications(): void {
		// Remove all Google Calendar style notifications
		for (const element of this.activeGoogleCalendarNotifications.values()) {
			if (element.parentNode) {
				element.style.animation = "slideOutRight 0.3s ease-in";
				setTimeout(() => {
					if (element.parentNode) {
						element.remove();
					}
				}, 300);
			}
		}
		this.activeGoogleCalendarNotifications.clear();
		this.notificationCallData.clear();
		this.updateNotificationCount();
	}

	// Remove individual notification
	removeNotification(notificationId: number): void {
		const element = this.activeGoogleCalendarNotifications.get(notificationId);
		if (element?.parentNode) {
			element.style.animation = "slideOutRight 0.3s ease-in";
			setTimeout(() => {
				if (element.parentNode) {
					element.remove();
				}
			}, 300);
			this.activeGoogleCalendarNotifications.delete(notificationId);
			this.notificationCallData.delete(notificationId);
			this.updateNotificationCount();
		}
	}

	// Request browser notification permission
	async requestPermission(): Promise<void> {
		if ("Notification" in window) {
			try {
				this.notificationPermission = await Notification.requestPermission();
				if (this.notificationPermission === "granted") {
					console.log("✅ Notification permission granted");
				} else {
					console.log("❌ Notification permission denied");
				}
			} catch (error) {
				console.error("Error requesting notification permission:", error);
			}
		}
	}

	// Show browser notification
	private showBrowserNotification(call: CallNotificationData, minutesUntil: number): void {
		if (this.notificationPermission !== "granted") return;

		const title = `📞 Upcoming Call - ${minutesUntil} minutes`;
		const body = `${call.contact_name} from ${call.company}\nScheduled: ${dayjs(call.scheduled_time).format("HH:mm")}`;

		const browserNotification = new Notification(title, {
			body,
			icon: "/favicon.ico",
			badge: "/favicon.ico",
			tag: `call-${call.id}`,
			requireInteraction: true,
			actions: [
				{ action: "prepare", title: "📋 Prepare" },
				{ action: "call", title: "📞 Call Now" },
				{ action: "snooze", title: "⏰ Snooze 5min" },
			],
		});

		browserNotification.onclick = () => {
			window.focus();
			browserNotification.close();
		};

		this.activeNotifications.set(call.id, browserNotification);

		// Auto-close after 30 seconds
		setTimeout(() => {
			browserNotification.close();
			this.activeNotifications.delete(call.id);
		}, 30000);
	}

	// Show in-app notification
	private showInAppNotification(call: CallNotificationData, minutesUntil: number): void {
		const key = `call-notification-${call.id}`;

		const description = `${call.contact_name} - ${call.company}\n${dayjs(call.scheduled_time).format("MMM DD, YYYY HH:mm")}${call.preparation_notes ? `\n📝 ${call.preparation_notes}` : ""}`;

		notification.open({
			key,
			message: `📞 Upcoming Call in ${minutesUntil} minutes`,
			description,
			duration: 0, // Don't auto-close
			placement: "topRight",
			style: {
				width: 350,
			},
			onClose: () => {
				this.activeNotifications.delete(call.id);
			},
		});

		// Add action buttons after a short delay to allow notification to render
		setTimeout(() => {
			const notificationElement = document.querySelector(`[data-testid="${key}"]`);
			if (notificationElement) {
				const buttonContainer = document.createElement("div");
				buttonContainer.style.cssText = "display: flex; gap: 8px; margin-top: 8px;";

				// Call Now button
				const callButton = document.createElement("button");
				callButton.textContent = "📞 Call Now";
				callButton.style.cssText = "padding: 4px 12px; font-size: 12px; background: #1890ff; color: white; border: none; border-radius: 4px; cursor: pointer;";
				callButton.onclick = () => {
					if (call.phone_number) {
						window.open(`tel:${call.phone_number}`);
					}
					notification.close(key);
				};

				// Snooze button
				const snoozeButton = document.createElement("button");
				snoozeButton.textContent = "⏰ Snooze 5min";
				snoozeButton.style.cssText =
					"padding: 4px 12px; font-size: 12px; background: #8c8c8c; color: white; border: none; border-radius: 4px; cursor: pointer;";
				snoozeButton.onclick = () => {
					this.snoozeNotification(call, 5);
					notification.close(key);
				};

				// Dismiss button
				const dismissButton = document.createElement("button");
				dismissButton.textContent = "✕ Dismiss";
				dismissButton.style.cssText =
					"padding: 4px 12px; font-size: 12px; background: #ff4d4f; color: white; border: none; border-radius: 4px; cursor: pointer;";
				dismissButton.onclick = () => notification.close(key);

				buttonContainer.appendChild(callButton);
				buttonContainer.appendChild(snoozeButton);
				buttonContainer.appendChild(dismissButton);

				const descriptionElement = notificationElement.querySelector(".ant-notification-notice-description");
				if (descriptionElement) {
					descriptionElement.appendChild(buttonContainer);
				}
			}
		}, 100);
	}

	// Helper to create close button onclick handler
	private createCloseButtonHandler(notificationId: number): string {
		// Make notification service globally accessible for onclick handlers
		(window as any).notificationService = this;
		return `
			const notificationElement = this.parentElement.parentElement;
			notificationElement.style.animation = 'slideOutRight 0.3s ease-in';
			setTimeout(() => {
				if (notificationElement.parentNode) {
					notificationElement.remove();
				}
			}, 300);
			if (window.notificationService && window.notificationService.removeNotification) {
				window.notificationService.removeNotification(${notificationId});
			}
		`;
	}

	// Show Google Calendar style notification
	private showGoogleCalendarStyleNotification(call: CallNotificationData, minutesUntil: number): void {
		// Make notification service globally accessible for onclick handlers
		(window as any).notificationService = this;

		// Create notification container if it doesn't exist
		let notificationContainer = document.getElementById("google-calendar-notifications");
		if (!notificationContainer) {
			notificationContainer = document.createElement("div");
			notificationContainer.id = "google-calendar-notifications";
			notificationContainer.style.cssText = `
				position: fixed;
				top: 20px;
				right: 20px;
				z-index: 10000;
				pointer-events: none;
			`;
			document.body.appendChild(notificationContainer);
		}

		// Create notification element
		const notificationElement = document.createElement("div");
		notificationElement.id = `gcal-notification-${call.id}`;
		notificationElement.style.cssText = `
			background: white;
			border: 1px solid #dadce0;
			border-radius: 8px;
			box-shadow: 0 4px 16px rgba(0,0,0,0.2);
			margin-bottom: 12px;
			padding: 16px;
			width: 350px;
			font-family: 'Google Sans', Roboto, Arial, sans-serif;
			font-size: 14px;
			line-height: 1.4;
			pointer-events: auto;
			animation: slideInRight 0.3s ease-out;
			position: relative;
		`;

		// Add animation keyframes
		if (!document.getElementById("gcal-notification-styles")) {
			const style = document.createElement("style");
			style.id = "gcal-notification-styles";
			style.textContent = `
				@keyframes slideInRight {
					from {
						transform: translateX(100%);
						opacity: 0;
					}
					to {
						transform: translateX(0);
						opacity: 1;
					}
				}
				@keyframes slideOutRight {
					from {
						transform: translateX(0);
						opacity: 1;
					}
					to {
						transform: translateX(100%);
						opacity: 0;
					}
				}
			`;
			document.head.appendChild(style);
		}

		// Create notification content
		const timeText = minutesUntil === 0 ? "now" : `in ${minutesUntil} minute${minutesUntil === 1 ? "" : "s"}`;

		notificationElement.innerHTML = `
			<div style="display: flex; align-items: flex-start; gap: 12px;">
				<div style="width: 4px; height: 40px; background: #1a73e8; border-radius: 2px; flex-shrink: 0;"></div>
				<div style="flex: 1;">
					<div style="font-weight: 500; color: #202124; margin-bottom: 4px;">
						📞 Call ${timeText}
					</div>
					<div style="color: #5f6368; font-size: 13px; margin-bottom: 2px;">
						${call.contact_name} - ${call.company}
					</div>
					<div style="color: #5f6368; font-size: 13px;">
						${dayjs(call.scheduled_time).format("MMM DD, YYYY HH:mm")}
					</div>
					${
						call.preparation_notes
							? `
						<div style="color: #1a73e8; font-size: 13px; margin-top: 8px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
							📝 ${call.preparation_notes}
						</div>
					`
							: ""
					}
				</div>
				<button onclick="${this.createCloseButtonHandler(call.id)}" style="
					background: none;
					border: none;
					color: #5f6368;
					cursor: pointer;
					font-size: 18px;
					padding: 4px;
					border-radius: 4px;
					width: 24px;
					height: 24px;
					display: flex;
					align-items: center;
					justify-content: center;
				" onmouseover="this.style.background='#f1f3f4'" onmouseout="this.style.background='none'">
					×
				</button>
			</div>
			<div style="display: flex; gap: 8px; margin-top: 12px; padding-left: 16px;">
				<button onclick="
					if ('${call.phone_number}') {
						window.open('tel:${call.phone_number}');
					}
					${this.createCloseButtonHandler(call.id)}
				" style="
					background: #1a73e8;
					color: white;
					border: none;
					padding: 8px 16px;
					border-radius: 4px;
					font-size: 13px;
					font-weight: 500;
					cursor: pointer;
				" onmouseover="this.style.background='#1557b0'" onmouseout="this.style.background='#1a73e8'">
					📞 Call now
				</button>
				<button onclick="${this.createCloseButtonHandler(call.id)}" style="
					background: #f8f9fa;
					color: #5f6368;
					border: 1px solid #dadce0;
					padding: 8px 16px;
					border-radius: 4px;
					font-size: 13px;
					font-weight: 500;
					cursor: pointer;
				" onmouseover="this.style.background='#f1f3f4'" onmouseout="this.style.background='#f8f9fa'">
					Dismiss
				</button>
			</div>
		`;

		// Add click handler to the main notification area (not the buttons)
		const mainNotificationArea = notificationElement.querySelector('div[style*="display: flex; align-items: flex-start"]') as HTMLElement;
		if (mainNotificationArea) {
			mainNotificationArea.style.cursor = "pointer";
			mainNotificationArea.addEventListener("click", (e) => {
				// Prevent click if clicking on buttons
				if ((e.target as HTMLElement).tagName === "BUTTON") {
					return;
				}
				if (this.notificationClickCallback) {
					this.notificationClickCallback(call);
				}
			});
		}

		// Add to container
		notificationContainer.appendChild(notificationElement);

		// Track this notification and store call data
		this.activeGoogleCalendarNotifications.set(call.id, notificationElement);
		this.notificationCallData.set(call.id, call);
		this.updateNotificationCount();

		// Auto-remove after 30 seconds
		setTimeout(() => {
			if (notificationElement.parentNode) {
				notificationElement.style.animation = "slideOutRight 0.3s ease-in";
				setTimeout(() => {
					if (notificationElement.parentNode) {
						notificationElement.remove();
					}
					this.activeGoogleCalendarNotifications.delete(call.id);
					this.notificationCallData.delete(call.id);
					this.updateNotificationCount();
				}, 300);
			}
		}, 30000);
	}

	// Show Google Calendar style urgent notification
	private showGoogleCalendarUrgentNotification(call: CallNotificationData): void {
		// Make notification service globally accessible for onclick handlers
		(window as any).notificationService = this;

		// Create notification container if it doesn't exist
		let notificationContainer = document.getElementById("google-calendar-notifications");
		if (!notificationContainer) {
			notificationContainer = document.createElement("div");
			notificationContainer.id = "google-calendar-notifications";
			notificationContainer.style.cssText = `
				position: fixed;
				top: 20px;
				right: 20px;
				z-index: 10000;
				pointer-events: none;
			`;
			document.body.appendChild(notificationContainer);
		}

		// Create urgent notification element
		const notificationElement = document.createElement("div");
		notificationElement.id = `gcal-urgent-notification-${call.id}`;
		notificationElement.style.cssText = `
			background: white;
			border: 2px solid #ea4335;
			border-radius: 8px;
			box-shadow: 0 8px 24px rgba(234, 67, 53, 0.3);
			margin-bottom: 12px;
			padding: 20px;
			width: 380px;
			font-family: 'Google Sans', Roboto, Arial, sans-serif;
			font-size: 14px;
			line-height: 1.4;
			pointer-events: auto;
			animation: slideInRight 0.3s ease-out, urgentPulse 2s infinite;
			position: relative;
		`;

		// Add urgent animation keyframes
		if (!document.getElementById("gcal-urgent-notification-styles")) {
			const style = document.createElement("style");
			style.id = "gcal-urgent-notification-styles";
			style.textContent = `
				@keyframes urgentPulse {
					0%, 100% { box-shadow: 0 8px 24px rgba(234, 67, 53, 0.3); }
					50% { box-shadow: 0 8px 24px rgba(234, 67, 53, 0.6); }
				}
			`;
			document.head.appendChild(style);
		}

		// Create urgent notification content
		notificationElement.innerHTML = `
			<div style="display: flex; align-items: flex-start; gap: 12px;">
				<div style="width: 6px; height: 50px; background: #ea4335; border-radius: 3px; flex-shrink: 0;"></div>
				<div style="flex: 1;">
					<div style="font-weight: 600; color: #ea4335; margin-bottom: 6px; font-size: 16px;">
						🚨 CALL STARTING NOW!
					</div>
					<div style="color: #202124; font-weight: 500; font-size: 15px; margin-bottom: 4px;">
						${call.contact_name}
					</div>
					<div style="color: #5f6368; font-size: 14px; margin-bottom: 2px;">
						${call.company}
					</div>
					<div style="color: #5f6368; font-size: 13px;">
						${dayjs(call.scheduled_time).format("MMM DD, YYYY HH:mm")}
					</div>
					${
						call.preparation_notes
							? `
						<div style="color: #1a73e8; font-size: 13px; margin-top: 12px; padding: 12px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #1a73e8;">
							<div style="font-weight: 500; margin-bottom: 4px;">📝 Preparation Notes:</div>
							${call.preparation_notes}
						</div>
					`
							: ""
					}
				</div>
				<button onclick="${this.createCloseButtonHandler(call.id + 1000)}" style="
					background: none;
					border: none;
					color: #ea4335;
					cursor: pointer;
					font-size: 20px;
					padding: 4px;
					border-radius: 4px;
					width: 28px;
					height: 28px;
					display: flex;
					align-items: center;
					justify-content: center;
					font-weight: bold;
				" onmouseover="this.style.background='#fce8e6'" onmouseout="this.style.background='none'">
					×
				</button>
			</div>
			<div style="display: flex; gap: 12px; margin-top: 16px; padding-left: 18px;">
				<button onclick="
					if ('${call.phone_number}') {
						window.open('tel:${call.phone_number}');
					}
					${this.createCloseButtonHandler(call.id + 1000)}
				" style="
					background: #ea4335;
					color: white;
					border: none;
					padding: 12px 24px;
					border-radius: 6px;
					font-size: 14px;
					font-weight: 600;
					cursor: pointer;
					box-shadow: 0 2px 8px rgba(234, 67, 53, 0.3);
				" onmouseover="this.style.background='#d33b2c'" onmouseout="this.style.background='#ea4335'">
					📞 START CALL NOW
				</button>
				<button onclick="${this.createCloseButtonHandler(call.id + 1000)}" style="
					background: #f8f9fa;
					color: #5f6368;
					border: 1px solid #dadce0;
					padding: 12px 20px;
					border-radius: 6px;
					font-size: 14px;
					font-weight: 500;
					cursor: pointer;
				" onmouseover="this.style.background='#f1f3f4'" onmouseout="this.style.background='#f8f9fa'">
					Dismiss
				</button>
			</div>
		`;

		// Add click handler to the main notification area (not the buttons)
		const mainNotificationArea = notificationElement.querySelector('div[style*="display: flex; align-items: flex-start"]') as HTMLElement;
		if (mainNotificationArea) {
			mainNotificationArea.style.cursor = "pointer";
			mainNotificationArea.addEventListener("click", (e) => {
				// Prevent click if clicking on buttons
				if ((e.target as HTMLElement).tagName === "BUTTON") {
					return;
				}
				if (this.notificationClickCallback) {
					this.notificationClickCallback(call);
				}
			});
		}

		// Add to container
		notificationContainer.appendChild(notificationElement);

		// Track this urgent notification
		const urgentId = call.id + 1000;
		this.activeGoogleCalendarNotifications.set(urgentId, notificationElement);
		this.notificationCallData.set(urgentId, call);
		this.updateNotificationCount();

		// Auto-remove after 60 seconds (longer for urgent)
		setTimeout(() => {
			if (notificationElement.parentNode) {
				notificationElement.style.animation = "slideOutRight 0.3s ease-in";
				setTimeout(() => {
					if (notificationElement.parentNode) {
						notificationElement.remove();
					}
					this.activeGoogleCalendarNotifications.delete(call.id + 1000);
					this.notificationCallData.delete(call.id + 1000);
					this.updateNotificationCount();
				}, 300);
			}
		}, 60000);
	}

	// Show notification for upcoming call
	showCallNotification(call: CallNotificationData, minutesUntil: number): void {
		// Avoid duplicate Google Calendar notifications
		if (this.activeGoogleCalendarNotifications.has(call.id)) {
			return;
		}

		// Show both browser and in-app notifications
		this.showBrowserNotification(call, minutesUntil);
		this.showInAppNotification(call, minutesUntil);
		this.showGoogleCalendarStyleNotification(call, minutesUntil);

		// Don't play notification sound - user prefers visual only
		// this.playNotificationSound();
	}

	// Play notification sound
	private playNotificationSound(): void {
		try {
			// Create audio context for notification sound
			const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
			const oscillator = audioContext.createOscillator();
			const gainNode = audioContext.createGain();

			oscillator.connect(gainNode);
			gainNode.connect(audioContext.destination);

			oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
			oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
			oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

			gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
			gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

			oscillator.start(audioContext.currentTime);
			oscillator.stop(audioContext.currentTime + 0.3);
		} catch (error) {
			console.log("Could not play notification sound:", error);
		}
	}

	// Snooze notification
	private snoozeNotification(call: CallNotificationData, minutes: number): void {
		message.info(`⏰ Call reminder snoozed for ${minutes} minutes`);

		setTimeout(
			() => {
				this.showCallNotification(call, 0);
			},
			minutes * 60 * 1000,
		);
	}

	// Check for upcoming calls and show notifications
	checkUpcomingCalls(calls: CallNotificationData[]): void {
		const now = dayjs();

		for (const call of calls) {
			const callTime = dayjs(call.scheduled_time);
			const minutesUntil = callTime.diff(now, "minutes");

			// Show notifications at 15, 10, 5, and 1 minute intervals
			if ([15, 10, 5, 1].includes(minutesUntil) && callTime.isAfter(now)) {
				this.showCallNotification(call, minutesUntil);
			}

			// Show immediate notification for calls starting now
			if (minutesUntil === 0) {
				this.showCallNotification(call, 0);
			}
		}
	}

	// Start monitoring calls
	startMonitoring(calls: CallNotificationData[]): void {
		// Clear existing interval
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
		}

		// Check every minute
		this.checkInterval = setInterval(() => {
			this.checkUpcomingCalls(calls);
		}, 60000); // Check every minute

		// Initial check
		this.checkUpcomingCalls(calls);
	}

	// Stop monitoring
	stopMonitoring(): void {
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}

		// Close all active notifications
		for (const notification of this.activeNotifications.values()) {
			notification.close();
		}
		this.activeNotifications.clear();

		// Clear all Google Calendar notifications
		this.clearAllNotifications();

		// Clean up Google Calendar style notifications container
		const notificationContainer = document.getElementById("google-calendar-notifications");
		if (notificationContainer) {
			notificationContainer.remove();
		}
	}

	// Show immediate call notification
	showImmediateCallNotification(call: CallNotificationData): void {
		const key = `immediate-call-${call.id}`;

		const description = `${call.contact_name}\n${call.company}\n${dayjs(call.scheduled_time).format("MMM DD, YYYY HH:mm")}${call.preparation_notes ? `\n\n📝 Notes: ${call.preparation_notes}` : ""}`;

		notification.open({
			key,
			message: "🚨 CALL STARTING NOW!",
			description,
			duration: 0,
			placement: "topRight",
			style: {
				width: 400,
				backgroundColor: "#fff2f0",
				borderLeft: "4px solid #ff4d4f",
			},
		});

		// Add action buttons after a short delay
		setTimeout(() => {
			const notificationElement = document.querySelector(`[data-testid="${key}"]`);
			if (notificationElement) {
				const buttonContainer = document.createElement("div");
				buttonContainer.style.cssText = "display: flex; gap: 8px; margin-top: 12px;";

				// Start Call button
				const startButton = document.createElement("button");
				startButton.textContent = "📞 START CALL";
				startButton.style.cssText =
					"padding: 8px 16px; font-size: 14px; font-weight: bold; background: #52c41a; color: white; border: none; border-radius: 4px; cursor: pointer;";
				startButton.onclick = () => {
					if (call.phone_number) {
						window.open(`tel:${call.phone_number}`);
					}
					notification.close(key);
				};

				// Dismiss button
				const dismissButton = document.createElement("button");
				dismissButton.textContent = "✕ Dismiss";
				dismissButton.style.cssText =
					"padding: 8px 12px; font-size: 14px; background: #ff4d4f; color: white; border: none; border-radius: 4px; cursor: pointer;";
				dismissButton.onclick = () => notification.close(key);

				buttonContainer.appendChild(startButton);
				buttonContainer.appendChild(dismissButton);

				const descriptionElement = notificationElement.querySelector(".ant-notification-notice-description");
				if (descriptionElement) {
					descriptionElement.appendChild(buttonContainer);
				}
			}
		}, 100);

		// Show Google Calendar style urgent notification
		this.showGoogleCalendarUrgentNotification(call);

		// Don't play urgent sound - user prefers visual only
		// this.playUrgentSound();
	}

	// Play urgent notification sound
	private playUrgentSound(): void {
		try {
			const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

			// Play 3 beeps
			for (let i = 0; i < 3; i++) {
				setTimeout(() => {
					const oscillator = audioContext.createOscillator();
					const gainNode = audioContext.createGain();

					oscillator.connect(gainNode);
					gainNode.connect(audioContext.destination);

					oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
					gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
					gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

					oscillator.start(audioContext.currentTime);
					oscillator.stop(audioContext.currentTime + 0.2);
				}, i * 300);
			}
		} catch (error) {
			console.log("Could not play urgent sound:", error);
		}
	}
}

// Create singleton instance
export const notificationService = new NotificationService();
export default notificationService;
