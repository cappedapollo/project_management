// Vercel Serverless Function - Get Current User
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

		const token = authHeader.substring(7); // Remove 'Bearer ' prefix

		// Verify JWT token
		let decoded;
		try {
			decoded = jwt.verify(token, process.env.JWT_SECRET);
		} catch (jwtError) {
			return res.status(401).json({
				error: "Invalid or expired token",
			});
		}

		// Get current user data from database
		const users = await query(
			`SELECT id, email, username, full_name, role, phone, department, position, 
              profile_picture, is_active, created_at, updated_at, last_login
       FROM users WHERE id = $1 AND is_active = true`,
			[decoded.userId],
		);

		if (users.length === 0) {
			return res.status(404).json({
				error: "User not found or inactive",
			});
		}

		const user = users[0];

		res.json({
			success: true,
			user: {
				id: user.id,
				email: user.email,
				username: user.username,
				full_name: user.full_name,
				role: user.role, // Use numeric role directly
				phone: user.phone,
				department: user.department,
				position: user.position,
				profile_picture: user.profile_picture,
				is_active: user.is_active,
				created_at: user.created_at,
				updated_at: user.updated_at,
				last_login: user.last_login,
			},
		});
	} catch (error) {
		console.error("Get current user error:", error);
		res.status(500).json({
			error: "Internal server error",
			details: process.env.NODE_ENV === "development" ? error.message : undefined,
		});
	}
}
