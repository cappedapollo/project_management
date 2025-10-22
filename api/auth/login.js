// Vercel Serverless Function - User Login
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../../backend/db-postgres.js";

export default async function handler(req, res) {
	// Set CORS headers
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

	if (req.method === "OPTIONS") {
		res.status(200).end();
		return;
	}

	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { email, password, username } = req.body;

		// Allow login with either email or username
		const loginField = email || username;

		if (!loginField || !password) {
			return res.status(400).json({
				error: "Email/username and password are required",
			});
		}

		// Get user by email or username
		const users = await query("SELECT * FROM users WHERE email = $1 OR username = $1", [loginField]);

		if (users.length === 0) {
			return res.status(401).json({
				error: "Invalid credentials",
			});
		}

		const user = users[0];

		// Check if user is active
		if (!user.is_active) {
			return res.status(401).json({
				error: "Account is disabled",
			});
		}

		// Verify password
		const isValidPassword = await bcrypt.compare(password, user.password_hash);
		if (!isValidPassword) {
			return res.status(401).json({
				error: "Invalid credentials",
			});
		}

		// Update last login
		await query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);

		// Generate JWT token
		const token = jwt.sign(
			{
				userId: user.id,
				email: user.email,
				username: user.username,
				role: user.role, // Use numeric role directly
			},
			process.env.JWT_SECRET,
			{ expiresIn: "24h" },
		);

		// Generate refresh token
		const refreshToken = jwt.sign({ userId: user.id, type: "refresh" }, process.env.JWT_SECRET, { expiresIn: "7d" });

		// Store session (optional - for logout functionality)
		try {
			await query(
				`INSERT INTO sessions (user_id, token_hash, refresh_token_hash, expires_at, created_at, ip_address, user_agent)
         VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours', NOW(), $4, $5)`,
				[
					user.id,
					token.substring(0, 50), // Store partial token for reference
					refreshToken.substring(0, 50),
					req.headers["x-forwarded-for"] || req.connection.remoteAddress || "unknown",
					req.headers["user-agent"] || "unknown",
				],
			);
		} catch (sessionError) {
			console.warn("Session storage failed:", sessionError);
			// Continue anyway - session storage is optional
		}

		res.json({
			success: true,
			message: "Login successful",
			user: {
				id: user.id,
				email: user.email,
				username: user.username,
				full_name: user.full_name,
				role: user.role, // Use numeric role directly
				created_at: user.created_at,
			},
			token,
			refreshToken,
		});
	} catch (error) {
		console.error("Login error:", error);
		res.status(500).json({
			error: "Internal server error",
			details: process.env.NODE_ENV === "development" ? error.message : undefined,
		});
	}
}
