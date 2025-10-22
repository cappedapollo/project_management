import type { InterviewInfo, ProposalInfo } from "@/types/entity";
import apiClient from "../apiClient";

export interface DashboardStats {
	totalApplications: number;
	totalInterviews: number;
	applicationsThisMonth: number;
	interviewsThisMonth: number;
	applicationsThisWeek: number;
	interviewsThisWeek: number;
	applicationsToday: number;
	interviewsToday: number;
	applicationTrend: number;
	interviewTrend: number;
	recentApplications: ProposalInfo[];
	upcomingInterviews: InterviewInfo[];
	applicationsByStatus: {
		applied: number;
		interviewing: number;
		offered: number;
		rejected: number;
		cancelled: number;
	};
	interviewsByProgress: {
		scheduled: number;
		completed: number;
		cancelled: number;
	};
	// Admin-specific analytics
	totalUsers?: number;
	activeUsers?: number;
	newUsersThisMonth?: number;
	averageApplicationsPerUser?: number;
	successRate?: number;
	responseRate?: number;
	conversionRate?: number;
	topCompanies?: Array<{ company: string; count: number }> | null;
	applicationTrends?: Array<{ date: string; applications: number; interviews: number }> | null;
	monthlyTrends?: Array<{ label: string; applications: number; interviews: number }> | null;
	trendData?: Array<{ label: string; applications: number; interviews: number }> | null;
	trendLabels?: string[] | null;
	hasRealData?: boolean;
}

interface ApiResponse {
	success: boolean;
	error?: string;
	[key: string]: any;
}

const getDashboardStats = async (userId?: string, token?: string, timePeriod = "month"): Promise<DashboardStats> => {
	try {
		// Fetching dashboard stats from backend API

		// Use the backend dashboard endpoint with time period parameter
		// Note: apiClient automatically adds Authorization header from userStore
		const response = await apiClient.get<ApiResponse>({
			url: `/dashboard/stats?period=${timePeriod}`,
		});

		// Backend returns data wrapped in success/data structure
		if (!response || typeof response !== "object") {
			throw new Error("Invalid response format from dashboard API");
		}

		// Extract data from backend response structure
		const data = response.success ? response.data : response;

		// Debug: Uncomment to see API response structure
		// console.log("🔍 Dashboard API Response:", {
		// 	hasSuccess: !!response.success,
		// 	hasData: !!response.data,
		// 	totalApplications: data?.totalApplications,
		// 	totalInterviews: data?.totalInterviews,
		// });

		if (!data) {
			throw new Error("No data received from dashboard API");
		}

		// Dashboard stats fetched successfully from backend

		// Transform backend response to match frontend interface
		const transformedStats: DashboardStats = {
			totalApplications: data.totalApplications || 0,
			totalInterviews: data.totalInterviews || 0,
			applicationsThisMonth: data.applicationsThisMonth || 0,
			interviewsThisMonth: data.interviewsThisMonth || 0,
			applicationsThisWeek: data.applicationsThisWeek || 0,
			interviewsThisWeek: data.interviewsThisWeek || 0,
			applicationsToday: data.applicationsToday || 0,
			interviewsToday: data.interviewsToday || 0,
			applicationTrend: data.applicationTrend || 0,
			interviewTrend: data.interviewTrend || 0,
			recentApplications: data.recentApplications || [],
			upcomingInterviews: data.upcomingInterviews || [],
			applicationsByStatus: data.applicationsByStatus || {
				applied: 0,
				interviewing: 0,
				offered: 0,
				rejected: 0,
				cancelled: 0,
			},
			interviewsByProgress: data.interviewsByProgress || {
				scheduled: 0,
				completed: 0,
				cancelled: 0,
			},
			// Admin-specific stats
			totalUsers: data.totalUsers || 0,
			activeUsers: data.activeUsers || 0,
			newUsersThisMonth: data.newUsersThisMonth || 0,
			averageApplicationsPerUser: data.averageApplicationsPerUser || 0,
			successRate: data.successRate || 0,
			responseRate: data.responseRate || 0,
			conversionRate: data.conversionRate || 0,
			topCompanies: data.topCompanies || [],
			applicationTrends: data.applicationTrends || [],
			monthlyTrends: data.monthlyTrends || [],
			trendData: data.trendData || [],
			trendLabels: data.trendLabels || [],
			hasRealData: data.hasRealData || false,
		};

		return transformedStats;
	} catch (error: any) {
		console.error("❌ Failed to fetch dashboard stats:", error.message);

		// Return empty stats when API fails
		return {
			totalApplications: 0,
			totalInterviews: 0,
			applicationsThisMonth: 0,
			interviewsThisMonth: 0,
			applicationsThisWeek: 0,
			interviewsThisWeek: 0,
			applicationsToday: 0,
			interviewsToday: 0,
			applicationTrend: 0,
			interviewTrend: 0,
			recentApplications: [],
			upcomingInterviews: [],
			applicationsByStatus: {
				applied: 0,
				interviewing: 0,
				offered: 0,
				rejected: 0,
				cancelled: 0,
			},
			interviewsByProgress: {
				scheduled: 0,
				completed: 0,
				cancelled: 0,
			},
			totalUsers: 0,
			activeUsers: 0,
			newUsersThisMonth: 0,
			averageApplicationsPerUser: 0,
			successRate: 0,
			responseRate: 0,
			conversionRate: 0,
			topCompanies: [],
			applicationTrends: [],
			monthlyTrends: [],
			trendData: [],
			trendLabels: [],
			hasRealData: false,
		};
	}
};

const seedTestData = async (): Promise<void> => {
	try {
		const response = await apiClient.post<ApiResponse>({
			url: "/dashboard/seed-test-data",
		});

		if (!response.success) {
			throw new Error(response.error || "Failed to seed test data");
		}
	} catch (error: any) {
		console.error("❌ Failed to seed test data:", error.message);
		throw error;
	}
};

const clearTestData = async (): Promise<void> => {
	try {
		const response = await apiClient.post<ApiResponse>({
			url: "/dashboard/clear-test-data",
		});

		if (!response.success) {
			throw new Error(response.error || "Failed to clear test data");
		}
	} catch (error: any) {
		console.error("❌ Failed to clear test data:", error.message);
		throw error;
	}
};

export default {
	getDashboardStats,
	seedTestData,
	clearTestData,
};
