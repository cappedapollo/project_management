const bcrypt = require("bcryptjs");
const { supabase } = require("../supabase");
const { generateToken, generateRefreshToken } = require("../middleware/auth");

// User registration using Supabase
async function register(req, res) {
	try {
		const { email, username, password, role = 1 } = req.body;

		// Validate input
		if (!email || !username || !password) {
			return res.status(400).json({ error: "Email, username, and password are required" });
		}

		// Check if user already exists
		const { data: existingUser, error: checkError } = await supabase.from("users").select("id").or(`email.eq.${email},username.eq.${username}`).single();

		if (existingUser && !checkError) {
			return res.status(400).json({ error: "User with this email or username already exists" });
		}

		// Hash password
		const passwordHash = await bcrypt.hash(password, 12);

		// Create user in Supabase (inactive by default, requires admin approval)
		const { data: newUser, error: insertError } = await supabase
			.from("users")
			.insert([
				{
					email,
					username,
					password_hash: passwordHash,
					role,
					is_active: false, // Requires admin approval
				},
			])
			.select()
			.single();

		if (insertError) {
			console.error("Registration error:", insertError);
			return res.status(500).json({ error: "Failed to create user" });
		}

		res.status(201).json({
			message: "Registration successful! Your account is pending admin approval. You will be able to login once an administrator activates your account.",
			user: {
				id: newUser.id,
				email: newUser.email,
				username: newUser.username,
				role: newUser.role,
				is_active: newUser.is_active,
			},
			requiresApproval: true,
		});
	} catch (error) {
		console.error("Registration error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// User login using Supabase
async function login(req, res) {
	try {
		const { email, password } = req.body;

		// Validate input
		if (!email || !password) {
			return res.status(400).json({ error: "Email and password are required" });
		}

		// Find user by email
		const { data: user, error: userError } = await supabase.from("users").select("*").eq("email", email).eq("is_active", true).single();

		if (userError || !user) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		// Check password
		const isPasswordValid = await bcrypt.compare(password, user.password_hash);
		if (!isPasswordValid) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		// Update last login
		await supabase.from("users").update({ last_login: new Date().toISOString() }).eq("id", user.id);

		// Generate tokens
		const token = generateToken(user);
		const refreshToken = generateRefreshToken(user);

		// Store refresh token
		await supabase.from("sessions").insert([
			{
				user_id: user.id,
				token_hash: token,
				refresh_token_hash: refreshToken,
				expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
			},
		]);

		res.json({
			success: true,
			message: "Login successful",
			user: {
				id: user.id,
				email: user.email,
				username: user.username,
				role: user.role,
				full_name: user.full_name,
			},
			token,
			refreshToken,
		});
	} catch (error) {
		console.error("Login error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Get user profile
async function getProfile(req, res) {
	try {
		const userId = req.user.id;

		const { data: user, error } = await supabase
			.from("users")
			.select("id, email, username, full_name, role, phone, department, position, profile_picture, created_at")
			.eq("id", userId)
			.single();

		if (error || !user) {
			return res.status(404).json({ error: "User not found" });
		}

		res.json({ success: true, user });
	} catch (error) {
		console.error("Get profile error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Update user profile
async function updateProfile(req, res) {
	try {
		const userId = req.user.id;
		const { full_name, phone, department, position } = req.body;

		const { data: updatedUser, error } = await supabase
			.from("users")
			.update({
				full_name,
				phone,
				department,
				position,
				updated_at: new Date().toISOString(),
			})
			.eq("id", userId)
			.select()
			.single();

		if (error) {
			console.error("Update profile error:", error);
			return res.status(500).json({ error: "Failed to update profile" });
		}

		res.json({
			message: "Profile updated successfully",
			user: {
				id: updatedUser.id,
				email: updatedUser.email,
				username: updatedUser.username,
				full_name: updatedUser.full_name,
				phone: updatedUser.phone,
				department: updatedUser.department,
				position: updatedUser.position,
			},
		});
	} catch (error) {
		console.error("Update profile error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Refresh token
async function refreshToken(req, res) {
	try {
		const { refreshToken } = req.body;

		if (!refreshToken) {
			return res.status(401).json({ error: "Refresh token required" });
		}

		// Find valid refresh token
		const { data: session, error } = await supabase
			.from("user_sessions")
			.select("*")
			.eq("refresh_token", refreshToken)
			.gt("expires_at", new Date().toISOString())
			.single();

		if (error || !session) {
			return res.status(401).json({ error: "Invalid or expired refresh token" });
		}

		// Generate new tokens
		const newToken = generateToken(session.user_id);
		const newRefreshToken = generateRefreshToken(session.user_id);

		// Update refresh token in database
		await supabase
			.from("user_sessions")
			.update({
				refresh_token: newRefreshToken,
				expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			})
			.eq("id", session.id);

		res.json({
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
			await supabase.from("user_sessions").delete().eq("refresh_token", refreshToken);
		}

		res.json({ message: "Logged out successfully" });
	} catch (error) {
		console.error("Logout error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Get current user info (alias for getProfile for compatibility)
async function getCurrentUser(req, res) {
	return getProfile(req, res);
}

module.exports = {
	register,
	login,
	getProfile,
	updateProfile,
	refreshToken,
	logout,
	getCurrentUser,
};
