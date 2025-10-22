import { Icon } from "@/components/icon";
import type { NavProps } from "@/components/nav";

export const frontendNavData: NavProps["data"] = [
	{
		name: "Caller Dashboard",
		items: [
			{
				title: "Call Dashboard",
				path: "/caller/dashboard",
				icon: <Icon icon="mdi:phone" size="24" />,
				auth: ["permission:caller"],
			},
			{
				title: "Call Management",
				path: "/caller/call-management",
				icon: <Icon icon="mdi:phone-settings" size="24" />,
				auth: ["permission:caller"],
			},
		],
	},
	{
		name: "Admin Panel",
		items: [
			{
				title: "System Overview",
				path: "/admin/system-overview",
				icon: <Icon icon="mdi:chart-line" size="24" />,
				auth: ["permission:admin"],
			},
			{
				title: "User Management",
				path: "/admin/user-management",
				icon: <Icon icon="mdi:account-group" size="24" />,
				auth: ["permission:admin"],
			},
			{
				title: "Job Applications",
				path: "/admin/job-applications",
				icon: <Icon icon="mdi:briefcase" size="24" />,
				auth: ["permission:admin"],
			},
			{
				title: "Interview Calendar",
				path: "/admin/calendar",
				icon: <Icon icon="mdi:calendar" size="24" />,
				auth: ["permission:admin"],
			},
			{
				title: "Schedule Permissions",
				path: "/admin/schedule-permissions",
				icon: <Icon icon="mdi:shield-account" size="24" />,
				auth: ["permission:admin"],
			},
			{
				title: "Admin Analytics",
				path: "/admin/analytics",
				icon: <Icon icon="mdi:chart-box" size="24" />,
				auth: ["permission:admin"],
			},
			{
				title: "System Settings",
				path: "/admin/settings",
				icon: <Icon icon="mdi:cog" size="24" />,
				auth: ["permission:admin"],
			},
		],
	},
	{
		name: "Job Search",
		items: [
			{
				title: "Job Dashboard",
				path: "/job-dashboard",
				icon: <Icon icon="mdi:chart-line" size="24" />,
				auth: ["permission:user"],
			},
			{
				title: "Job Applications",
				path: "/dashboard/job-applications",
				icon: <Icon icon="mdi:briefcase" size="24" />,
				auth: ["permission:user"],
			},
			{
				title: "Interviews",
				path: "/dashboard/interviews",
				icon: <Icon icon="mdi:calendar-clock" size="24" />,
				auth: ["permission:user"],
			},
			{
				title: "Resume Workshop",
				path: "/resume-workshop",
				icon: <Icon icon="mdi:file-document-edit" size="24" />,
				auth: ["permission:user"],
			},
		],
	},

	{
		name: "Advanced Tools",
		items: [
			{
				title: "Resume Builder",
				path: "/dashboard/resume-builder",
				icon: <Icon icon="mdi:file-document-plus" size="24" />,
				auth: ["permission:user"],
			},
			{
				title: "Calendar",
				path: "/dashboard/calendar",
				icon: <Icon icon="mdi:calendar" size="24" />,
				auth: ["permission:caller", "permission:user"],
			},
			{
				title: "Notifications",
				path: "/dashboard/notifications",
				icon: <Icon icon="mdi:bell" size="24" />,
				auth: ["permission:user"],
			},
			{
				title: "Analytics",
				path: "/dashboard/analytics",
				icon: <Icon icon="mdi:chart-line" size="24" />,
				auth: ["permission:user"],
			},
		],
	},
];
