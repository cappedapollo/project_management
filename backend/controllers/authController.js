const bcrypt = require("bcryptjs");
const { query } = require("../db");
const { generateToken, generateRefreshToken } = require("../middleware/auth");

// User registration
async function register(req, res) {
	try {
		const { email, username, password, role = 1 } = req.body;

		// Validate input
		if (!email || !username || !password) {
			return res.status(400).json({ error: "Email, username, and password are required" });
		}

		// Check if user already exists
		const existingUser = await query("SELECT id FROM users WHERE email = ? OR username = ?", [email, username]);
		if (existingUser.length > 0) {
			return res.status(400).json({ error: "User with this email or username already exists" });
		}

		// Hash password
		const passwordHash = await bcrypt.hash(password, 12);

		// Create user
		const result = await query("INSERT INTO users (email, username, password_hash, role, status, created_at) VALUES (?, ?, ?, ?, 1, NOW())", [
			email,
			username,
			passwordHash,
			role,
		]);

		// Get created user
		const users = await query("SELECT id, email, username, role FROM users WHERE id = ?", [result.insertId]);
		const user = users[0];

		// Generate tokens
		const token = generateToken(user);
		const refreshToken = generateRefreshToken(user);

		// Store refresh token
		await query("INSERT INTO user_sessions (user_id, refresh_token, created_at, expires_at) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))", [
			user.id,
			refreshToken,
		]);

		res.status(201).json({
			success: true,
			user: {
				id: user.id,
				email: user.email,
				username: user.username,
				role: user.role,
			},
			token,
			refreshToken,
		});
	} catch (error) {
		console.error("Registration error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// User login
async function login(req, res) {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({ error: "Email and password are required" });
		}

		// Get user by email
		const users = await query("SELECT * FROM users WHERE email = ?", [email]);
		if (users.length === 0) {
			return res.status(401).json({ error: "Invalid email or password" });
		}

		const user = users[0];

		// Check if user is active
		if (user.status !== 1) {
			return res.status(401).json({ error: "Account is disabled" });
		}

		// Verify password
		const isValidPassword = await bcrypt.compare(password, user.password_hash);
		if (!isValidPassword) {
			return res.status(401).json({ error: "Invalid email or password" });
		}

		// Generate tokens
		const token = generateToken(user);
		const refreshToken = generateRefreshToken(user);

		// Store refresh token
		await query("INSERT INTO user_sessions (user_id, refresh_token, created_at, expires_at) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))", [
			user.id,
			refreshToken,
		]);

		res.json({
			success: true,
			user: {
				id: user.id,
				email: user.email,
				username: user.username,
				role: user.role,
			},
			token,
			refreshToken,
		});
	} catch (error) {
		console.error("Login error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Refresh token
async function refreshToken(req, res) {
	try {
		const { refreshToken } = req.body;

		if (!refreshToken) {
			return res.status(400).json({ error: "Refresh token required" });
		}

		// Verify refresh token exists and is valid
		const sessions = await query(
			"SELECT s.*, u.id, u.email, u.username, u.role FROM user_sessions s JOIN users u ON s.user_id = u.id WHERE s.refresh_token = ? AND s.expires_at > NOW()",
			[refreshToken],
		);

		if (sessions.length === 0) {
			return res.status(401).json({ error: "Invalid or expired refresh token" });
		}

		const session = sessions[0];
		const user = {
			id: session.id,
			email: session.email,
			username: session.username,
			role: session.role,
		};

		// Generate new tokens
		const newToken = generateToken(user);
		const newRefreshToken = generateRefreshToken(user);

		// Update refresh token in database
		await query("UPDATE user_sessions SET refresh_token = ?, expires_at = DATE_ADD(NOW(), INTERVAL 7 DAY) WHERE id = ?", [newRefreshToken, session.id]);

		res.json({
			success: true,
			token: newToken,
			refreshToken: newRefreshToken,
		});
	} catch (error) {
		console.error("Refresh token error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Logout
async function logout(req, res) {
	try {
		const { refreshToken } = req.body;

		if (refreshToken) {
			// Remove refresh token from database
			await query("DELETE FROM user_sessions WHERE refresh_token = ?", [refreshToken]);
		}

		res.json({ success: true, message: "Logged out successfully" });
	} catch (error) {
		console.error("Logout error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Get current user
async function getCurrentUser(req, res) {
	try {
		// User is already attached by auth middleware
		res.json({
			success: true,
			user: {
				id: req.user.id,
				email: req.user.email,
				username: req.user.username,
				role: req.user.role,
			},
		});
	} catch (error) {
		console.error("Get current user error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

module.exports = {
	register,
	login,
	refreshToken,
	logout,
	getCurrentUser,
};
