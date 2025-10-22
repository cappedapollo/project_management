// Vercel Serverless Function - User Registration
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
		const { email, username, password, full_name, role = "user", phone, department, position } = req.body;

		// Validate required fields
		if (!email || !username || !password) {
			return res.status(400).json({
				error: "Email, username, and password are required",
			});
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return res.status(400).json({
				error: "Invalid email format",
			});
		}

		// Validate password strength
		if (password.length < 6) {
			return res.status(400).json({
				error: "Password must be at least 6 characters long",
			});
		}

		// Check if user already exists
		const existingUsers = await query("SELECT id FROM users WHERE email = $1 OR username = $2", [email, username]);

		if (existingUsers.length > 0) {
			return res.status(400).json({
				error: "User with this email or username already exists",
			});
		}

		// Hash password
		const passwordHash = await bcrypt.hash(password, 12);

		// Create user
		const result = await query(
			`INSERT INTO users (email, username, password_hash, full_name, role, phone, department, position, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
       RETURNING id, email, username, full_name, role, created_at`,
			[email, username, passwordHash, full_name, role, phone, department, position],
		);

		const user = result[0];

		// Generate JWT token
		const token = jwt.sign(
			{
				userId: user.id,
				email: user.email,
				username: user.username,
				role: user.role,
			},
			process.env.JWT_SECRET,
			{ expiresIn: "24h" },
		);

		// Generate refresh token
		const refreshToken = jwt.sign({ userId: user.id, type: "refresh" }, process.env.JWT_SECRET, { expiresIn: "7d" });

		res.status(201).json({
			success: true,
			message: "User registered successfully",
			user: {
				id: user.id,
				email: user.email,
				username: user.username,
				full_name: user.full_name,
				role: user.role,
				created_at: user.created_at,
			},
			token,
			refreshToken,
		});
	} catch (error) {
		console.error("Registration error:", error);
		res.status(500).json({
			error: "Internal server error",
			details: process.env.NODE_ENV === "development" ? error.message : undefined,
		});
	}
}
