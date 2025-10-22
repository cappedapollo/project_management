// Vercel Serverless Function - Dashboard Statistics
import jwt from "jsonwebtoken";
import { query } from "../../backend/db-postgres.js";

export default async function handler(req, res) {
	// Set CORS headers
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

	if (req.method === "OPTIONS") {
		res.status(200).end();
		return;
	}

	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		// Get token from Authorization header
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({
				error: "No token provided",
			});
		}

		const token = authHeader.substring(7);

		// Verify JWT token
		let decoded;
		try {
			decoded = jwt.verify(token, process.env.JWT_SECRET);
		} catch (jwtError) {
			return res.status(401).json({
				error: "Invalid or expired token",
			});
		}

		// Get dashboard statistics
		const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM projects WHERE status = 'active') as active_projects,
        (SELECT COUNT(*) FROM tasks WHERE status IN ('todo', 'in_progress')) as pending_tasks,
        (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
        (SELECT COUNT(*) FROM job_applications WHERE status = 'applied') as pending_applications,
        (SELECT COUNT(*) FROM interviews WHERE status = 'scheduled' AND scheduled_date > NOW()) as upcoming_interviews,
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM tasks) as total_tasks,
        (SELECT COUNT(*) FROM job_applications) as total_applications,
        (SELECT COUNT(*) FROM saved_resumes) as total_resumes,
        (SELECT COUNT(*) FROM proposals) as total_proposals
    `;

		const stats = await query(statsQuery);
		const dashboardStats = stats[0];

		// Get recent activities (last 10)
		const recentActivitiesQuery = `
      SELECT action, entity_type, entity_id, details, created_at, user_id
      FROM activity_logs 
      ORDER BY created_at DESC 
      LIMIT 10
    `;

		const recentActivities = await query(recentActivitiesQuery);

		// Get project status distribution
		const projectStatusQuery = `
      SELECT status, COUNT(*) as count
      FROM projects 
      GROUP BY status
      ORDER BY count DESC
    `;

		const projectStatusStats = await query(projectStatusQuery);

		// Get task priority distribution
		const taskPriorityQuery = `
      SELECT priority, COUNT(*) as count
      FROM tasks 
      GROUP BY priority
      ORDER BY 
        CASE priority 
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END
    `;

		const taskPriorityStats = await query(taskPriorityQuery);

		res.json({
			success: true,
			stats: {
				overview: {
					active_projects: Number.parseInt(dashboardStats.active_projects) || 0,
					pending_tasks: Number.parseInt(dashboardStats.pending_tasks) || 0,
					active_users: Number.parseInt(dashboardStats.active_users) || 0,
					pending_applications: Number.parseInt(dashboardStats.pending_applications) || 0,
					upcoming_interviews: Number.parseInt(dashboardStats.upcoming_interviews) || 0,
					total_projects: Number.parseInt(dashboardStats.total_projects) || 0,
					total_tasks: Number.parseInt(dashboardStats.total_tasks) || 0,
					total_applications: Number.parseInt(dashboardStats.total_applications) || 0,
					total_resumes: Number.parseInt(dashboardStats.total_resumes) || 0,
					total_proposals: Number.parseInt(dashboardStats.total_proposals) || 0,
				},
				recent_activities: recentActivities,
				project_status_distribution: projectStatusStats,
				task_priority_distribution: taskPriorityStats,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Dashboard stats error:", error);
		res.status(500).json({
			error: "Internal server error",
			details: process.env.NODE_ENV === "development" ? error.message : undefined,
		});
	}
}
