import { pool } from "../../../../backend/db-postgres.js";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
	// Set CORS headers
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "PUT, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

	if (req.method === "OPTIONS") {
		return res.status(200).end();
	}

	if (req.method !== "PUT") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		// Verify JWT token
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({ error: "No token provided" });
		}

		const token = authHeader.substring(7);
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const userId = decoded.userId;

		// Verify user has caller role (role = 2)
		const userResult = await pool.query("SELECT role FROM users WHERE id = $1", [userId]);
		if (userResult.rows.length === 0 || userResult.rows[0].role !== 2) {
			return res.status(403).json({ error: "Access denied. Caller role required." });
		}

		const { id } = req.query;
		const { status, outcome_notes, failed_reason, completed_at, actual_duration } = req.body;

		if (!status) {
			return res.status(400).json({ error: "Status is required" });
		}

		// Verify the call belongs to this caller
		const callCheck = await pool.query("SELECT id, contact_name, company FROM call_schedules WHERE id = $1 AND assigned_caller_id = $2", [id, userId]);

		if (callCheck.rows.length === 0) {
			return res.status(404).json({ error: "Call not found or not assigned to you" });
		}

		const call = callCheck.rows[0];

		// Update call status
		let updateQuery = `
			UPDATE call_schedules 
			SET status = $1, updated_at = NOW()
		`;
		let values = [status];
		let paramCount = 1;

		if (outcome_notes) {
			paramCount++;
			updateQuery += `, outcome_notes = $${paramCount}`;
			values.push(outcome_notes);
		}

		if (failed_reason) {
			paramCount++;
			updateQuery += `, failed_reason = $${paramCount}`;
			values.push(failed_reason);
		}

		if (completed_at) {
			paramCount++;
			updateQuery += `, completed_at = $${paramCount}`;
			values.push(completed_at);
		}

		paramCount++;
		updateQuery += ` WHERE id = $${paramCount} AND assigned_caller_id = $${paramCount + 1} RETURNING *`;
		values.push(id, userId);

		const result = await pool.query(updateQuery, values);

		// Create status change notification
		const notificationTitle =
			status === "completed" ? "Call Completed" : status === "failed" ? "Call Failed" : status === "in_progress" ? "Call Started" : "Call Status Updated";

		const notificationMessage = `Call with ${call.contact_name} at ${call.company || "N/A"} has been marked as ${status}`;

		await pool.query(
			`
			INSERT INTO call_notifications (
				call_id, caller_id, notification_type, title, message, 
				scheduled_for, status, priority
			) VALUES ($1, $2, $3, $4, $5, NOW(), 'sent', 'medium')
		`,
			[id, userId, "status_change", notificationTitle, notificationMessage],
		);

		// Update daily performance metrics
		const today = new Date().toISOString().split("T")[0];

		if (status === "completed" || status === "failed") {
			// Update or insert performance record
			const performanceQuery = `
				INSERT INTO caller_performance (caller_id, date, calls_completed, calls_failed, total_call_duration_minutes)
				VALUES ($1, $2, $3, $4, $5)
				ON CONFLICT (caller_id, date) 
				DO UPDATE SET 
					calls_completed = caller_performance.calls_completed + $3,
					calls_failed = caller_performance.calls_failed + $4,
					total_call_duration_minutes = caller_performance.total_call_duration_minutes + $5,
					updated_at = NOW()
			`;

			const completedIncrement = status === "completed" ? 1 : 0;
			const failedIncrement = status === "failed" ? 1 : 0;
			const durationIncrement = status === "completed" && actual_duration ? actual_duration : 0;

			await pool.query(performanceQuery, [userId, today, completedIncrement, failedIncrement, durationIncrement]);

			// Recalculate success rate and performance score
			const updatePerformanceQuery = `
				UPDATE caller_performance 
				SET 
					success_rate = CASE 
						WHEN (calls_completed + calls_failed) > 0 
						THEN ROUND((calls_completed::decimal / (calls_completed + calls_failed)) * 100, 2)
						ELSE 0 
					END,
					average_call_duration = CASE 
						WHEN calls_completed > 0 
						THEN ROUND(total_call_duration_minutes::decimal / calls_completed, 2)
						ELSE 0 
					END,
					performance_score = CASE 
						WHEN (calls_completed + calls_failed) > 0 
						THEN ROUND(((calls_completed::decimal / (calls_completed + calls_failed)) * 70) + 
							(LEAST(calls_completed, 10) * 3), 2)
						ELSE 0 
					END
				WHERE caller_id = $1 AND date = $2
			`;

			await pool.query(updatePerformanceQuery, [userId, today]);
		}

		return res.status(200).json({
			message: "Call status updated successfully",
			call: result.rows[0],
		});
	} catch (error) {
		console.error("Call status update API error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
}
