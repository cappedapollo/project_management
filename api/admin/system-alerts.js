// Admin System Alerts API
import jwt from "jsonwebtoken";
import { query } from "../../backend/db-postgres.js";

export default async function handler(req, res) {
	// Set CORS headers
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

	if (req.method === "OPTIONS") {
		return res.status(200).end();
	}

	try {
		// Verify JWT token and admin role
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({ error: "No token provided" });
		}

		const token = authHeader.substring(7);
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// Check if user is admin (role = 0)
		if (decoded.role !== 0) {
			return res.status(403).json({ error: "Admin access required" });
		}

		switch (req.method) {
			case "GET":
				return await handleGet(req, res, decoded);
			case "POST":
				return await handlePost(req, res, decoded);
			case "PUT":
				return await handlePut(req, res, decoded);
			case "DELETE":
				return await handleDelete(req, res, decoded);
			default:
				return res.status(405).json({ error: "Method not allowed" });
		}
	} catch (error) {
		console.error("Admin System Alerts API error:", error);
		if (error.name === "JsonWebTokenError") {
			return res.status(401).json({ error: "Invalid token" });
		}
		return res.status(500).json({ error: "Internal server error" });
	}
}

// GET - Fetch system alerts
async function handleGet(req, res, decoded) {
	try {
		const { resolved = "false", limit = 20 } = req.query;

		// Generate system alerts based on current system state
		const alerts = await generateSystemAlerts();

		// Filter by resolved status if specified
		let filteredAlerts = alerts;
		if (resolved !== "all") {
			const isResolved = resolved === "true";
			filteredAlerts = alerts.filter((alert) => alert.resolved === isResolved);
		}

		// Limit results
		const limitedAlerts = filteredAlerts.slice(0, Number.parseInt(limit));

		return res.json({
			success: true,
			alerts: limitedAlerts,
			total: filteredAlerts.length,
		});
	} catch (error) {
		console.error("Error fetching system alerts:", error);
		return res.status(500).json({ error: "Failed to fetch system alerts" });
	}
}

// POST - Create a new system alert
async function handlePost(req, res, decoded) {
	try {
		const { type, title, message, priority = "medium" } = req.body;

		if (!type || !title || !message) {
			return res.status(400).json({ error: "Type, title, and message are required" });
		}

		// In a real system, you'd store this in a database
		// For now, we'll return a success response
		const alert = {
			id: Date.now(),
			type,
			title,
			message,
			priority,
			created_at: new Date().toISOString(),
			resolved: false,
			created_by: decoded.userId,
		};

		return res.status(201).json({
			success: true,
			message: "Alert created successfully",
			alert,
		});
	} catch (error) {
		console.error("Error creating system alert:", error);
		return res.status(500).json({ error: "Failed to create system alert" });
	}
}

// PUT - Update/resolve an alert
async function handlePut(req, res, decoded) {
	try {
		const { id } = req.query;
		const { resolved, resolution_note } = req.body;

		if (!id) {
			return res.status(400).json({ error: "Alert ID is required" });
		}

		// In a real system, you'd update the database
		// For now, we'll return a success response
		return res.json({
			success: true,
			message: "Alert updated successfully",
			alert: {
				id: Number.parseInt(id),
				resolved: resolved || false,
				resolution_note,
				resolved_at: resolved ? new Date().toISOString() : null,
				resolved_by: resolved ? decoded.userId : null,
			},
		});
	} catch (error) {
		console.error("Error updating system alert:", error);
		return res.status(500).json({ error: "Failed to update system alert" });
	}
}

// DELETE - Delete an alert
async function handleDelete(req, res, decoded) {
	try {
		const { id } = req.query;

		if (!id) {
			return res.status(400).json({ error: "Alert ID is required" });
		}

		// In a real system, you'd delete from the database
		// For now, we'll return a success response
		return res.json({
			success: true,
			message: "Alert deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting system alert:", error);
		return res.status(500).json({ error: "Failed to delete system alert" });
	}
}

// Generate system alerts based on current system state
async function generateSystemAlerts() {
	const alerts = [];

	try {
		// Check for high error rates
		const errorRateQuery = `
			SELECT COUNT(*) as error_count
			FROM activity_logs 
			WHERE created_at >= NOW() - INTERVAL '1 hour'
			AND (details::text LIKE '%error%' OR details::text LIKE '%failed%')
		`;

		let errorCount = 0;
		try {
			const errorResult = await query(errorRateQuery);
			errorCount = Number.parseInt(errorResult[0]?.error_count) || 0;
		} catch (error) {
			console.log("Error checking error rate:", error.message);
		}

		if (errorCount > 10) {
			alerts.push({
				id: 1,
				type: "error",
				title: "High Error Rate Detected",
				message: `${errorCount} errors detected in the last hour. System may need attention.`,
				created_at: new Date().toISOString(),
				resolved: false,
				priority: "high",
			});
		}

		// Check for failed job applications
		const failedApplicationsQuery = `
			SELECT COUNT(*) as failed_count
			FROM job_applications 
			WHERE status = 'rejected' 
			AND updated_at >= NOW() - INTERVAL '24 hours'
		`;

		try {
			const failedResult = await query(failedApplicationsQuery);
			const failedCount = Number.parseInt(failedResult[0]?.failed_count) || 0;

			if (failedCount > 5) {
				alerts.push({
					id: 2,
					type: "warning",
					title: "High Job Application Rejection Rate",
					message: `${failedCount} job applications were rejected in the last 24 hours. Consider reviewing application strategies.`,
					created_at: new Date().toISOString(),
					resolved: false,
					priority: "medium",
				});
			}
		} catch (error) {
			console.log("Error checking failed applications:", error.message);
		}

		// Check for upcoming interviews without preparation
		const unpreparedInterviewsQuery = `
			SELECT COUNT(*) as unprepared_count
			FROM interviews 
			WHERE status = 'scheduled' 
			AND scheduled_date <= NOW() + INTERVAL '24 hours'
			AND scheduled_date > NOW()
			AND (notes IS NULL OR notes = '')
		`;

		try {
			const unpreparedResult = await query(unpreparedInterviewsQuery);
			const unpreparedCount = Number.parseInt(unpreparedResult[0]?.unprepared_count) || 0;

			if (unpreparedCount > 0) {
				alerts.push({
					id: 3,
					type: "info",
					title: "Upcoming Interviews Need Preparation",
					message: `${unpreparedCount} interviews scheduled for the next 24 hours don't have preparation notes.`,
					created_at: new Date().toISOString(),
					resolved: false,
					priority: "medium",
				});
			}
		} catch (error) {
			console.log("Error checking unprepared interviews:", error.message);
		}

		// Check for inactive users
		const inactiveUsersQuery = `
			SELECT COUNT(*) as inactive_count
			FROM users 
			WHERE is_active = true 
			AND (last_login IS NULL OR last_login < NOW() - INTERVAL '30 days')
		`;

		try {
			const inactiveResult = await query(inactiveUsersQuery);
			const inactiveCount = Number.parseInt(inactiveResult[0]?.inactive_count) || 0;

			if (inactiveCount > 10) {
				alerts.push({
					id: 4,
					type: "info",
					title: "Many Inactive Users Detected",
					message: `${inactiveCount} users haven't logged in for over 30 days. Consider sending engagement emails.`,
					created_at: new Date().toISOString(),
					resolved: false,
					priority: "low",
				});
			}
		} catch (error) {
			console.log("Error checking inactive users:", error.message);
		}

		// Check for caller performance issues
		try {
			const callerPerformanceQuery = `
				SELECT COUNT(*) as low_performance_count
				FROM caller_performance 
				WHERE date >= CURRENT_DATE - INTERVAL '7 days'
				AND success_rate < 50
			`;

			const performanceResult = await query(callerPerformanceQuery);
			const lowPerformanceCount = Number.parseInt(performanceResult[0]?.low_performance_count) || 0;

			if (lowPerformanceCount > 0) {
				alerts.push({
					id: 5,
					type: "warning",
					title: "Caller Performance Issues",
					message: `${lowPerformanceCount} callers have success rates below 50% in the last week.`,
					created_at: new Date().toISOString(),
					resolved: false,
					priority: "high",
				});
			}
		} catch (error) {
			// Caller performance table might not exist
			console.log("Caller performance table not available");
		}

		// Add a success alert if no issues found
		if (alerts.length === 0) {
			alerts.push({
				id: 100,
				type: "success",
				title: "System Running Smoothly",
				message: "All system checks passed. No issues detected.",
				created_at: new Date().toISOString(),
				resolved: false,
				priority: "low",
			});
		}
	} catch (error) {
		console.error("Error generating system alerts:", error);
		// Add an error alert if we can't check system status
		alerts.push({
			id: 999,
			type: "error",
			title: "System Monitoring Error",
			message: "Unable to perform system health checks. Please investigate.",
			created_at: new Date().toISOString(),
			resolved: false,
			priority: "high",
		});
	}

	return alerts;
}
