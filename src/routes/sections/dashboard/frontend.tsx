import { lazy } from "react";
import type { RouteObject } from "react-router";
import { Navigate } from "react-router";
import { Component } from "./utils";

export const frontendDashboardRoutes: RouteObject[] = [
	{ index: true, element: <Navigate to="job-dashboard" replace /> },
	{ path: "job-dashboard", element: Component("/pages/dashboard/job-dashboard") },
	{ path: "resume-workshop", element: Component("/pages/dashboard/resume-workshop") },
	{ path: "workbench", element: Component("/pages/dashboard/workbench") },

	// New Admin routes
	{
		path: "admin",
		children: [
			{ index: true, element: <Navigate to="system-overview" replace /> },
			{ path: "system-overview", element: Component("/pages/admin/system-overview") },
			{ path: "user-management", element: Component("/pages/admin/user-management") },
			{ path: "job-applications", element: Component("/pages/admin/job-applications") },
			{ path: "calendar", element: Component("/pages/admin/calendar") },
			{ path: "schedule-permissions", element: Component("/pages/admin/schedule-permissions") },
			{ path: "analytics", element: Component("/pages/admin/analytics") },
			{ path: "settings", element: Component("/pages/admin/settings") },
		],
	},

	// Caller-specific routes
	{
		path: "caller",
		children: [
			{ index: true, element: <Navigate to="dashboard" replace /> },
			{ path: "dashboard", element: Component("/pages/caller/dashboard") },
			{ path: "call-management", element: Component("/pages/caller/call-management") },
		],
	},

	// New dashboard routes
	{
		path: "dashboard",
		children: [
			{ index: true, element: <Navigate to="job-applications" replace /> },
			{ path: "job-applications", element: Component("/pages/dashboard/job-applications") },
			{ path: "interviews", element: Component("/pages/dashboard/interviews") },

			{ path: "resume-builder", element: Component("/pages/dashboard/resume-builder") },
			{ path: "calendar", element: Component("/pages/dashboard/calendar") },
			{ path: "notifications", element: Component("/pages/dashboard/notifications") },
			{ path: "analytics", element: Component("/pages/dashboard/analytics") },
		],
	},
	{
		path: "management",
		children: [
			{ index: true, element: <Navigate to="system" replace /> },
			{
				path: "user",
				children: [
					{ index: true, element: <Navigate to="account" replace /> },
					{ path: "profile", element: Component("/pages/management/user/profile") },
					{ path: "account", element: Component("/pages/management/user/account") },
				],
			},
			{
				path: "system",
				children: [
					{ index: true, element: <Navigate to="user" replace /> },

					{ path: "user", element: Component("/pages/management/system/user") },
					{ path: "user/:id", element: Component("/pages/management/system/user/detail") },
					{ path: "proposal", element: Component("/pages/management/system/proposal/user") },
					{ path: "proposal/:userId", element: Component("/pages/management/system/proposal/detail") },
					{ path: "interview", element: Component("/pages/management/system/interview") },
				],
			},
		],
	},
];
