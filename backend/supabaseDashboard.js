const { supabase } = require("./supabase");

async function getDashboardStats(userId, userRole, timePeriod = "month") {
	const isAdmin = userRole === 0;

	console.log(`🔍 Dashboard called for userId: ${userId}, userRole: ${userRole}, isAdmin: ${isAdmin}`);

	try {
		// Get job applications
		const { data: jobApplications, error: jobApplicationsError } = isAdmin
			? await supabase.from("job_applications").select("*")
			: await supabase.from("job_applications").select("*").eq("user_id", userId);

		if (jobApplicationsError) {
			console.error("Error fetching job applications:", jobApplicationsError);
		}

		// Get interviews
		const { data: interviews, error: interviewsError } = isAdmin
			? await supabase.from("interviews").select("*")
			: await supabase.from("interviews").select("*").eq("user_id", userId);

		if (interviewsError) {
			console.error("Error fetching interviews:", interviewsError);
		}

		// Get users (admin only)
		const { data: users, error: usersError } = isAdmin ? await supabase.from("users").select("*") : { data: [], error: null };

		if (usersError) {
			console.error("Error fetching users:", usersError);
		}

		// Debug logging
		console.log(`📊 Dashboard Debug - User ${userId}:`);
		console.log(`   Total job applications: ${jobApplications?.length || 0}`);
		console.log(`   Total interviews: ${interviews?.length || 0}`);
		console.log(`   Total users: ${users?.length || 0}`);

		// Time ranges
		const now = new Date();
		const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		// Helper function to check if date is in range
		const inRange = (date, start) => new Date(date) >= start;

		// Determine the time range based on the period filter
		let periodStart;
		switch (timePeriod) {
			case "day":
				periodStart = startOfDay;
				break;
			case "week":
				periodStart = startOfWeek;
				break;
			case "month":
				periodStart = startOfMonth;
				break;
			default:
				periodStart = startOfMonth;
				break;
		}

		// Application statistics
		const applicationStats = {
			total: jobApplications?.length || 0,
			applied: jobApplications?.filter((a) => a.status === "applied").length || 0,
			interviewing: jobApplications?.filter((a) => a.status === "interviewing").length || 0,
			offered: jobApplications?.filter((a) => a.status === "offered").length || 0,
			rejected: jobApplications?.filter((a) => a.status === "rejected").length || 0,
			thisMonth: jobApplications?.filter((a) => inRange(a.created_at, periodStart)).length || 0,
		};

		// Interview statistics
		const interviewStats = {
			total: interviews?.length || 0,
			scheduled: interviews?.filter((i) => i.status === "scheduled").length || 0,
			completed: interviews?.filter((i) => i.status === "completed").length || 0,
			cancelled: interviews?.filter((i) => i.status === "cancelled").length || 0,
			rescheduled: interviews?.filter((i) => i.status === "rescheduled").length || 0,
			thisMonth: interviews?.filter((i) => inRange(i.created_at, periodStart)).length || 0,
		};

		// Interview type statistics
		const interviewTypeStats = {
			phone: interviews?.filter((i) => i.interview_type === "phone").length || 0,
			video: interviews?.filter((i) => i.interview_type === "video").length || 0,
			in_person: interviews?.filter((i) => i.interview_type === "in_person").length || 0,
			technical: interviews?.filter((i) => i.interview_type === "technical").length || 0,
			panel: interviews?.filter((i) => i.interview_type === "panel").length || 0,
		};

		// User statistics (admin only)
		const userStats = isAdmin
			? {
					total: users?.length || 0,
					active: users?.filter((u) => u.is_active).length || 0,
					inactive: users?.filter((u) => !u.is_active).length || 0,
					admins: users?.filter((u) => u.role === 0).length || 0,
					users: users?.filter((u) => u.role === 1).length || 0,
					callers: users?.filter((u) => u.role === 2).length || 0,
					thisMonth: users?.filter((u) => inRange(u.created_at, periodStart)).length || 0,
				}
			: {
					total: 0,
					active: 0,
					inactive: 0,
					admins: 0,
					users: 0,
					callers: 0,
					thisMonth: 0,
				};

		// Recent activity (last 10 items)
		const recentApplications =
			jobApplications
				?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
				.slice(0, 5)
				.map((a) => ({
					id: a.id,
					company_name: a.company_name,
					position_title: a.position_title,
					status: a.status,
					created_at: a.created_at,
					type: "application",
				})) || [];

		const recentInterviews =
			interviews
				?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
				.slice(0, 5)
				.map((i) => ({
					id: i.id,
					company_name: i.company_name,
					position_title: i.position_title,
					interview_type: i.interview_type,
					status: i.status,
					scheduled_date: i.scheduled_date,
					created_at: i.created_at,
					type: "interview",
				})) || [];

		const recentActivity = [...recentApplications, ...recentInterviews].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);

		// Success statistics
		const successStats = {
			totalApplications: applicationStats.total,
			totalInterviews: interviewStats.total,
			interviewRate: applicationStats.total > 0 ? ((interviewStats.total / applicationStats.total) * 100).toFixed(1) : "0.0",
			offerRate: applicationStats.total > 0 ? ((applicationStats.offered / applicationStats.total) * 100).toFixed(1) : "0.0",
		};

		// Today's statistics
		const todayStats = {
			applicationsToday: jobApplications?.filter((a) => inRange(a.created_at, startOfDay)).length || 0,
			interviewsToday: interviews?.filter((i) => inRange(i.created_at, startOfDay)).length || 0,
		};

		// Generate monthly trends data for charts
		const monthlyTrends = [];
		const currentDate = new Date();

		// Generate data for the last 6 months
		for (let i = 5; i >= 0; i--) {
			const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
			const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);

			const monthName = monthStart.toLocaleDateString("en-US", { month: "short", year: "numeric" });

			const applicationsInMonth =
				jobApplications?.filter((a) => {
					const createdDate = new Date(a.created_at);
					return createdDate >= monthStart && createdDate <= monthEnd;
				}).length || 0;

			const interviewsInMonth =
				interviews?.filter((i) => {
					const createdDate = new Date(i.created_at);
					return createdDate >= monthStart && createdDate <= monthEnd;
				}).length || 0;

			monthlyTrends.push({
				label: monthName,
				applications: applicationsInMonth,
				interviews: interviewsInMonth,
			});
		}
		console.log("📈 Monthly trends generated:", monthlyTrends);

		console.log("📊 Dashboard stats calculated:", {
			applications: applicationStats.total,
			interviews: interviewStats.total,
			users: userStats.total,
			timePeriod,
		});

		return {
			success: true,
			data: {
				applications: applicationStats,
				interviews: interviewStats,
				interviewTypes: interviewTypeStats,
				users: userStats,
				success: successStats,
				today: todayStats,
				recentActivity,
				timePeriod,
				generatedAt: new Date().toISOString(),
				monthlyTrends,
				// Frontend compatibility fields
				totalApplications: applicationStats.total,
				totalInterviews: interviewStats.total,
				applicationsToday: todayStats.applicationsToday,
				interviewsToday: todayStats.interviewsToday,
				applicationsThisMonth: applicationStats.thisMonth,
				interviewsThisMonth: interviewStats.thisMonth,
				applicationsThisWeek: jobApplications?.filter((a) => inRange(a.created_at, startOfWeek)).length || 0,
				interviewsThisWeek: interviews?.filter((i) => inRange(i.created_at, startOfWeek)).length || 0,
				applicationTrend: 0, // Could be calculated based on previous period
				interviewTrend: 0, // Could be calculated based on previous period
				recentApplications,
				upcomingInterviews: interviews?.filter((i) => new Date(i.scheduled_date) > new Date()).slice(0, 5) || [],
				applicationsByStatus: {
					applied: applicationStats.applied,
					interviewing: applicationStats.interviewing,
					offered: applicationStats.offered,
					rejected: applicationStats.rejected,
					cancelled: 0,
				},
				interviewsByProgress: {
					scheduled: interviewStats.scheduled,
					completed: interviewStats.completed,
					cancelled: interviewStats.cancelled,
				},
				hasRealData: true,
			},
		};
	} catch (error) {
		console.error("❌ Dashboard stats error:", error);
		return {
			success: false,
			error: "Failed to fetch dashboard statistics",
			data: {
				applications: { total: 0, applied: 0, interviewing: 0, offered: 0, rejected: 0, thisMonth: 0 },
				interviews: { total: 0, scheduled: 0, completed: 0, cancelled: 0, rescheduled: 0, thisMonth: 0 },
				interviewTypes: { phone: 0, video: 0, in_person: 0, technical: 0, panel: 0 },
				users: { total: 0, active: 0, inactive: 0, admins: 0, users: 0, callers: 0, thisMonth: 0 },
				success: { totalApplications: 0, totalInterviews: 0, interviewRate: "0.0", offerRate: "0.0" },
				today: { applicationsToday: 0, interviewsToday: 0 },
				recentActivity: [],
				timePeriod,
				generatedAt: new Date().toISOString(),
				totalApplications: 0,
				totalInterviews: 0,
				applicationsToday: 0,
				interviewsToday: 0,
				applicationsThisMonth: 0,
				interviewsThisMonth: 0,
				applicationsThisWeek: 0,
				interviewsThisWeek: 0,
				applicationTrend: 0,
				interviewTrend: 0,
				recentApplications: [],
				upcomingInterviews: [],
				applicationsByStatus: { applied: 0, interviewing: 0, offered: 0, rejected: 0, cancelled: 0 },
				interviewsByProgress: { scheduled: 0, completed: 0, cancelled: 0 },
				hasRealData: false,
			},
		};
	}
}

module.exports = { getDashboardStats };
