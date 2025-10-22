const { query } = require("./db");

async function getDashboardStats(userId, userRole, timePeriod = "month") {
	const isAdmin = userRole === 0;

	console.log(`🔍 Dashboard called for userId: ${userId}, userRole: ${userRole}, isAdmin: ${isAdmin}`);

	// Proposals
	const proposals = isAdmin ? await query("SELECT * FROM proposals") : await query("SELECT * FROM proposals WHERE user = ?", [userId]);

	// Interviews
	const interviews = isAdmin ? await query("SELECT * FROM interviews") : await query("SELECT * FROM interviews WHERE user = ?", [userId]);

	// Debug logging for interview calculations
	console.log(`📊 Dashboard Debug - User ${userId}:`);
	console.log(`   Total interviews in DB: ${interviews.length}`);
	console.log(
		"   Interview details:",
		interviews.map((i) => ({
			id: i.id,
			meeting_title: i.meeting_title,
			progress: i.progress,
			created_at: i.created_at,
			user: i.user,
		})),
	);

	// Count by progress
	const progressCounts = {
		pending: interviews.filter((i) => i.progress === 0 || i.progress === "0" || i.progress === "PENDING").length,
		success: interviews.filter((i) => i.progress === 1 || i.progress === "1" || i.progress === "SUCCESS").length,
		fail: interviews.filter((i) => i.progress === 2 || i.progress === "2" || i.progress === "FAIL").length,
	};
	console.log("   Progress counts:", progressCounts);
	console.log(`   Total should be: ${progressCounts.pending + progressCounts.success + progressCounts.fail}`);

	// Users (admin only)
	const users = isAdmin ? await query("SELECT * FROM users") : [];

	// Time ranges
	const now = new Date();
	const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	// Helper
	const inRange = (date, start) => new Date(date) >= start;

	// Determine the time range based on the period filter
	let periodStart;
	switch (timePeriod) {
		case "today":
			periodStart = startOfDay;
			break;
		case "week":
			periodStart = startOfWeek;
			break;
		default:
			periodStart = startOfMonth;
			break;
	}

	// Filter data based on the selected time period
	const filteredProposals = timePeriod === "all" ? proposals : proposals.filter((p) => inRange(p.created_at, periodStart));
	const filteredInterviews = timePeriod === "all" ? interviews : interviews.filter((i) => inRange(i.created_at, periodStart));

	// Stats for the selected period
	const totalApplications = filteredProposals.length;
	const totalInterviews = filteredInterviews.length;

	// Always show total counts regardless of time period for main stats
	const allTimeApplications = proposals.length;
	const allTimeInterviews = interviews.length;

	console.log(`   allTimeApplications: ${allTimeApplications}`);
	console.log(`   allTimeInterviews: ${allTimeInterviews}`);

	// Stats for different time periods (for trend calculation)
	const applicationsThisMonth = proposals.filter((p) => inRange(p.created_at, startOfMonth)).length;
	const interviewsThisMonth = interviews.filter((i) => inRange(i.created_at, startOfMonth)).length;
	const applicationsThisWeek = proposals.filter((p) => inRange(p.created_at, startOfWeek)).length;
	const interviewsThisWeek = interviews.filter((i) => inRange(i.created_at, startOfWeek)).length;
	const applicationsToday = proposals.filter((p) => inRange(p.created_at, startOfDay)).length;
	const interviewsToday = interviews.filter((i) => inRange(i.created_at, startOfDay)).length;

	// Trends (simplified) - use all-time data for trend calculation
	const applicationTrend = allTimeApplications > 0 ? Math.round((applicationsThisWeek / allTimeApplications) * 100) : 0;
	const interviewTrend = allTimeInterviews > 0 ? Math.round((interviewsThisWeek / allTimeInterviews) * 100) : 0;

	// Calculate trends based on the selected time period
	const trendData = [];
	const trendLabels = [];

	switch (timePeriod) {
		case "today": {
			// Show hourly trends for today
			for (let i = 23; i >= 0; i--) {
				const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), i);
				const hourEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), i + 1);

				const hourApplications = proposals.filter((p) => {
					const createdDate = new Date(p.created_at);
					return createdDate >= hourStart && createdDate < hourEnd;
				}).length;

				const hourInterviews = interviews.filter((i) => {
					const createdDate = new Date(i.created_at);
					return createdDate >= hourStart && createdDate < hourEnd;
				}).length;

				trendData.push({
					label: `${i}:00`,
					applications: hourApplications,
					interviews: hourInterviews,
				});
				trendLabels.push(`${i}:00`);
			}
			break;
		}

		case "week": {
			// Show daily trends for this week
			for (let i = 6; i >= 0; i--) {
				const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
				const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);

				const dayApplications = proposals.filter((p) => {
					const createdDate = new Date(p.created_at);
					return createdDate >= dayStart && createdDate < dayEnd;
				}).length;

				const dayInterviews = interviews.filter((i) => {
					const createdDate = new Date(i.created_at);
					return createdDate >= dayStart && createdDate < dayEnd;
				}).length;

				trendData.push({
					label: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
					applications: dayApplications,
					interviews: dayInterviews,
				});
				trendLabels.push(dayStart.toLocaleDateString("en-US", { weekday: "short" }));
			}
			break;
		}

		case "month": {
			// Show weekly trends for this month
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			const weeksInMonth = Math.ceil((now.getDate() + startOfMonth.getDay()) / 7);

			for (let i = 0; i < weeksInMonth; i++) {
				const weekStart = new Date(startOfMonth);
				weekStart.setDate(1 + i * 7);
				const weekEnd = new Date(weekStart);
				weekEnd.setDate(weekStart.getDate() + 7);

				const weekApplications = proposals.filter((p) => {
					const createdDate = new Date(p.created_at);
					return createdDate >= weekStart && createdDate < weekEnd;
				}).length;

				const weekInterviews = interviews.filter((i) => {
					const createdDate = new Date(i.created_at);
					return createdDate >= weekStart && createdDate < weekEnd;
				}).length;

				trendData.push({
					label: `Week ${i + 1}`,
					applications: weekApplications,
					interviews: weekInterviews,
				});
				trendLabels.push(`Week ${i + 1}`);
			}
			break;
		}
		default: {
			// Show monthly trends for the last 6 months (original behavior)
			for (let i = 5; i >= 0; i--) {
				const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
				const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

				const monthApplications = proposals.filter((p) => {
					const createdDate = new Date(p.created_at);
					return createdDate >= date && createdDate < nextMonth;
				}).length;

				const monthInterviews = interviews.filter((i) => {
					const createdDate = new Date(i.created_at);
					return createdDate >= date && createdDate < nextMonth;
				}).length;

				trendData.push({
					label: date.toLocaleDateString("en-US", { month: "short" }),
					applications: monthApplications,
					interviews: monthInterviews,
				});
				trendLabels.push(date.toLocaleDateString("en-US", { month: "short" }));
			}
			break;
		}
	}

	// Recent applications (use filtered data for the period, but limit to last 5)
	const recentApplications = filteredProposals.slice(-5);
	const upcomingInterviews = filteredInterviews.filter((i) => new Date(i.meeting_date) > now).slice(0, 5);

	// Status breakdowns (use ALL data for main stats, not filtered by time period)
	const applicationsByStatus = {
		applied: proposals.filter((p) => p.status === "applied").length,
		interviewing: proposals.filter((p) => p.status === "interviewing").length,
		offered: proposals.filter((p) => p.status === "offered").length,
		rejected: proposals.filter((p) => p.status === "rejected").length,
	};
	const interviewsByProgress = {
		scheduled: interviews.filter((i) => i.progress === 0 || i.progress === "0" || i.progress === "PENDING").length, // PENDING
		completed: interviews.filter((i) => i.progress === 1 || i.progress === "1" || i.progress === "SUCCESS").length, // SUCCESS
		cancelled: interviews.filter((i) => i.progress === 2 || i.progress === "2" || i.progress === "FAIL").length, // FAIL
	};

	// Debug the progress breakdown
	console.log("   Final interviewsByProgress:", interviewsByProgress);
	console.log(`   Total calculated: ${interviewsByProgress.scheduled + interviewsByProgress.completed + interviewsByProgress.cancelled}`);

	// Admin analytics
	let adminStats = {};
	if (isAdmin) {
		const totalUsers = users.length;
		const activeUsers = await query("SELECT COUNT(DISTINCT user) as active FROM proposals WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
		const newUsersThisMonth = await query("SELECT COUNT(*) as new_users FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
		const averageApplicationsPerUser = totalUsers > 0 ? totalApplications / totalUsers : 0;
		const topCompanies = await query(
			"SELECT company, COUNT(*) as count FROM proposals WHERE company IS NOT NULL AND company != '' GROUP BY company ORDER BY count DESC LIMIT 5",
		);
		adminStats = {
			totalUsers,
			activeUsers: activeUsers[0]?.active || 0,
			newUsersThisMonth: newUsersThisMonth[0]?.new_users || 0,
			averageApplicationsPerUser: Math.round(averageApplicationsPerUser * 100) / 100,
			topCompanies,
		};
	}

	// If DB is empty, return all zeros
	const hasRealData = allTimeApplications > 0 || allTimeInterviews > 0;
	if (!hasRealData) {
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
			applicationsByStatus: { applied: 0, interviewing: 0, offered: 0, rejected: 0 },
			interviewsByProgress: { scheduled: 0, completed: 0, cancelled: 0 },
			monthlyTrends: [],
			trendData: [],
			trendLabels: [],
			...adminStats,
			hasRealData: false,
		};
	}

	return {
		// Use all-time counts for main dashboard stats
		totalApplications: allTimeApplications,
		totalInterviews: allTimeInterviews,
		applicationsThisMonth,
		interviewsThisMonth,
		applicationsThisWeek,
		interviewsThisWeek,
		applicationsToday,
		interviewsToday,
		applicationTrend,
		interviewTrend,
		recentApplications,
		upcomingInterviews,
		applicationsByStatus,
		interviewsByProgress,
		monthlyTrends: trendData,
		trendData,
		trendLabels,
		...adminStats,
		hasRealData: true,
	};
}

module.exports = { getDashboardStats };
