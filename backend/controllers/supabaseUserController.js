const bcrypt = require("bcryptjs");
const { supabase } = require("../supabase");

// Get all users (admin only)
async function getAllUsers(req, res) {
	try {
		const { data: users, error } = await supabase
			.from("users")
			.select(`
				id, email, username, role, is_active, created_at,
				full_name, phone, department, position, profile_picture
			`)
			.order("created_at", { ascending: false });

		if (error) {
			console.error("Get all users error:", error);
			return res.status(500).json({ error: "Failed to fetch users" });
		}

		res.json({
			success: true,
			users: users.map((user) => ({
				id: user.id,
				email: user.email,
				username: user.username,
				role: user.role,
				status: user.is_active ? 1 : 0,
				createdAt: user.created_at,
				profile: {
					fullName: user.full_name,
					phone: user.phone,
					department: user.department,
					position: user.position,
					profilePicture: user.profile_picture,
				},
			})),
		});
	} catch (error) {
		console.error("Get all users error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Get user by ID
async function getUserById(req, res) {
	try {
		const { userId } = req.params;

		const { data: user, error } = await supabase
			.from("users")
			.select(`
				id, email, username, role, is_active, created_at, updated_at,
				full_name, phone, department, position, profile_picture, last_login
			`)
			.eq("id", userId)
			.single();

		if (error || !user) {
			return res.status(404).json({ error: "User not found" });
		}

		res.json({
			success: true,
			user: {
				id: user.id,
				email: user.email,
				username: user.username,
				role: user.role,
				status: user.is_active ? 1 : 0,
				createdAt: user.created_at,
				updatedAt: user.updated_at,
				lastLogin: user.last_login,
				profile: {
					fullName: user.full_name,
					phone: user.phone,
					department: user.department,
					position: user.position,
					profilePicture: user.profile_picture,
				},
			},
		});
	} catch (error) {
		console.error("Get user by ID error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Update user (admin only)
async function updateUser(req, res) {
	try {
		const { userId } = req.params;
		const { email, username, role, is_active, full_name, phone, department, position } = req.body;

		// Check if admin
		if (req.user.role !== 0) {
			return res.status(403).json({ error: "Admin access required" });
		}

		const { data: updatedUser, error } = await supabase
			.from("users")
			.update({
				email,
				username,
				role,
				is_active,
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
			console.error("Update user error:", error);
			return res.status(500).json({ error: "Failed to update user" });
		}

		res.json({
			success: true,
			message: "User updated successfully",
			user: {
				id: updatedUser.id,
				email: updatedUser.email,
				username: updatedUser.username,
				role: updatedUser.role,
				status: updatedUser.is_active ? 1 : 0,
				profile: {
					fullName: updatedUser.full_name,
					phone: updatedUser.phone,
					department: updatedUser.department,
					position: updatedUser.position,
				},
			},
		});
	} catch (error) {
		console.error("Update user error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Delete user (admin only)
async function deleteUser(req, res) {
	try {
		const { userId } = req.params;

		// Check if admin
		if (req.user.role !== 0) {
			return res.status(403).json({ error: "Admin access required" });
		}

		// Don't allow deleting yourself
		if (req.user.id === userId) {
			return res.status(400).json({ error: "Cannot delete your own account" });
		}

		const { error } = await supabase.from("users").delete().eq("id", userId);

		if (error) {
			console.error("Delete user error:", error);
			return res.status(500).json({ error: "Failed to delete user" });
		}

		res.json({
			success: true,
			message: "User deleted successfully",
		});
	} catch (error) {
		console.error("Delete user error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Change user password (admin or own account)
async function changePassword(req, res) {
	try {
		const { userId } = req.params;
		const { currentPassword, newPassword } = req.body;

		// Check if user can change this password (admin or own account)
		if (req.user.role !== 0 && req.user.id !== userId) {
			return res.status(403).json({ error: "Access denied" });
		}

		// Validate input
		if (!newPassword || newPassword.length < 6) {
			return res.status(400).json({ error: "New password must be at least 6 characters long" });
		}

		// Get current user
		const { data: user, error: userError } = await supabase.from("users").select("password_hash").eq("id", userId).single();

		if (userError || !user) {
			return res.status(404).json({ error: "User not found" });
		}

		// If not admin, verify current password
		if (req.user.role !== 0) {
			if (!currentPassword) {
				return res.status(400).json({ error: "Current password is required" });
			}

			const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
			if (!isCurrentPasswordValid) {
				return res.status(400).json({ error: "Current password is incorrect" });
			}
		}

		// Hash new password
		const newPasswordHash = await bcrypt.hash(newPassword, 12);

		// Update password
		const { error: updateError } = await supabase
			.from("users")
			.update({
				password_hash: newPasswordHash,
				updated_at: new Date().toISOString(),
			})
			.eq("id", userId);

		if (updateError) {
			console.error("Change password error:", updateError);
			return res.status(500).json({ error: "Failed to change password" });
		}

		res.json({
			success: true,
			message: "Password changed successfully",
		});
	} catch (error) {
		console.error("Change password error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Get user statistics (admin only)
async function getUserStats(req, res) {
	try {
		// Check if admin
		if (req.user.role !== 0) {
			return res.status(403).json({ error: "Admin access required" });
		}

		// Get total users count
		const { count: totalUsers, error: totalError } = await supabase.from("users").select("*", { count: "exact", head: true });

		if (totalError) {
			console.error("Get user stats error:", totalError);
			return res.status(500).json({ error: "Failed to get user statistics" });
		}

		// Get active users count
		const { count: activeUsers, error: activeError } = await supabase.from("users").select("*", { count: "exact", head: true }).eq("is_active", true);

		if (activeError) {
			console.error("Get active users error:", activeError);
			return res.status(500).json({ error: "Failed to get active user statistics" });
		}

		// Get users by role
		const { data: roleStats, error: roleError } = await supabase.from("users").select("role").eq("is_active", true);

		if (roleError) {
			console.error("Get role stats error:", roleError);
			return res.status(500).json({ error: "Failed to get role statistics" });
		}

		const roleCounts = roleStats.reduce((acc, user) => {
			acc[user.role] = (acc[user.role] || 0) + 1;
			return acc;
		}, {});

		res.json({
			success: true,
			stats: {
				totalUsers: totalUsers || 0,
				activeUsers: activeUsers || 0,
				inactiveUsers: (totalUsers || 0) - (activeUsers || 0),
				adminUsers: roleCounts[0] || 0,
				regularUsers: roleCounts[1] || 0,
				callerUsers: roleCounts[2] || 0,
			},
		});
	} catch (error) {
		console.error("Get user stats error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

module.exports = {
	getAllUsers,
	getUserById,
	updateUser,
	deleteUser,
	changePassword,
	getUserStats,
};
