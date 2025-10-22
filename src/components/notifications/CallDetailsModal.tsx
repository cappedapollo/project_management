import { Icon } from "@/components/icon";
import type { CallNotificationData } from "@/services/notificationService";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Text, Title } from "@/ui/typography";
import { Divider, Modal, Space, Tag } from "antd";
import dayjs from "dayjs";

interface CallDetailsModalProps {
	visible: boolean;
	onClose: () => void;
	callData: CallNotificationData | null;
	onStartCall?: (callData: CallNotificationData) => void;
	onReschedule?: (callData: CallNotificationData) => void;
}

export const CallDetailsModal = ({ visible, onClose, callData, onStartCall, onReschedule }: CallDetailsModalProps) => {
	if (!callData) return null;

	const isUpcoming = dayjs(callData.scheduled_time).isAfter(dayjs());
	const timeUntilCall = dayjs(callData.scheduled_time).diff(dayjs(), "minutes");
	const isImminent = timeUntilCall <= 5 && timeUntilCall >= 0;

	const getCallTypeColor = (type: string) => {
		switch (type.toLowerCase()) {
			case "interview":
				return "blue";
			case "follow_up":
				return "green";
			case "networking":
				return "purple";
			case "client":
				return "orange";
			default:
				return "default";
		}
	};

	const formatCallType = (type: string) => {
		return type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
	};

	return (
		<Modal
			title={
				<div className="flex items-center gap-2">
					<Icon icon="solar:phone-bold" size={20} className="text-blue-500" />
					<span>Call Details</span>
				</div>
			}
			open={visible}
			onCancel={onClose}
			footer={null}
			width={600}
			centered
		>
			<div className="space-y-4">
				{/* Call Status Alert */}
				{isImminent && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
						<div className="flex items-center gap-2">
							<Icon icon="solar:bell-bing-bold" size={16} className="text-red-500" />
							<Text className="text-red-700 font-medium">
								Call starting in {timeUntilCall} minute{timeUntilCall !== 1 ? "s" : ""}!
							</Text>
						</div>
					</div>
				)}

				{/* Contact Information */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Icon icon="solar:user-bold" size={18} />
							Contact Information
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Text className="text-sm text-gray-500">Contact Name</Text>
								<Title as="h4" className="text-lg font-semibold">
									{callData.contact_name}
								</Title>
							</div>
							<div>
								<Text className="text-sm text-gray-500">Company</Text>
								<Title as="h4" className="text-lg font-semibold">
									{callData.company}
								</Title>
							</div>
						</div>

						{callData.phone_number && (
							<div>
								<Text className="text-sm text-gray-500">Phone Number</Text>
								<div className="flex items-center gap-2">
									<Icon icon="solar:phone-bold" size={16} className="text-green-500" />
									<Text className="font-medium">{callData.phone_number}</Text>
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Call Information */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Icon icon="solar:calendar-bold" size={18} />
							Call Information
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Text className="text-sm text-gray-500">Call Type</Text>
								<div>
									<Tag color={getCallTypeColor(callData.call_type)}>{formatCallType(callData.call_type)}</Tag>
								</div>
							</div>
							<div>
								<Text className="text-sm text-gray-500">Scheduled Time</Text>
								<div className="flex items-center gap-2">
									<Icon icon="solar:clock-circle-bold" size={16} className="text-blue-500" />
									<Text className="font-medium">{dayjs(callData.scheduled_time).format("MMM DD, YYYY HH:mm")}</Text>
								</div>
							</div>
						</div>

						{isUpcoming && (
							<div>
								<Text className="text-sm text-gray-500">Time Until Call</Text>
								<Text className={`font-medium ${isImminent ? "text-red-600" : "text-blue-600"}`}>
									{timeUntilCall > 0 ? `${timeUntilCall} minute${timeUntilCall !== 1 ? "s" : ""}` : "Call time has passed"}
								</Text>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Preparation Notes */}
				{callData.preparation_notes && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Icon icon="solar:document-text-bold" size={18} />
								Preparation Notes
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Text className="whitespace-pre-wrap">{callData.preparation_notes}</Text>
						</CardContent>
					</Card>
				)}

				<Divider />

				{/* Action Buttons */}
				<div className="flex justify-end gap-3">
					<Button variant="outline" onClick={onClose}>
						Close
					</Button>

					{onReschedule && isUpcoming && (
						<Button variant="outline" onClick={() => onReschedule(callData)}>
							<Icon icon="solar:calendar-mark-bold" size={16} />
							Reschedule
						</Button>
					)}

					{onStartCall && (
						<Button onClick={() => onStartCall(callData)} className={isImminent ? "bg-red-600 hover:bg-red-700" : ""}>
							<Icon icon="solar:phone-bold" size={16} />
							{isImminent ? "Start Call Now" : "Call Now"}
						</Button>
					)}
				</div>
			</div>
		</Modal>
	);
};

export default CallDetailsModal;
