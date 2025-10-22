const bcrypt = require("bcryptjs");
const { query } = require("../db");

// Get all users (admin only)
async function getAllUsers(req, res) {
	try {
		const users = await query(`
			SELECT u.id, u.email, u.username, u.role, u.status, u.created_at,
				   p.first_name, p.last_name, p.phone, p.country, p.summary
			FROM users u 
			LEFT JOIN profiles p ON u.id = p.user
			ORDER BY u.created_at DESC
		`);

		res.json({
			success: true,
			users: users.map((user) => ({
				id: user.id,
				email: user.email,
				username: user.username,
				role: user.role,
				status: user.status,
				createdAt: user.created_at,
				profile: {
					firstName: user.first_name,
					lastName: user.last_name,
					phone: user.phone,
					country: user.country,
					summary: user.summary,
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
		const { id } = req.params;

		// Check if user can access this data (admin or own data)
		if (req.user.role !== 0 && req.user.id !== Number.parseInt(id)) {
			return res.status(403).json({ error: "Access denied" });
		}

		const users = await query(
			`
			SELECT u.id, u.email, u.username, u.role, u.status, u.created_at,
				   p.first_name, p.last_name, p.phone, p.country, p.summary, p.bio,
				   p.job_title, p.experience_level, p.preferred_salary, p.location
			FROM users u 
			LEFT JOIN profiles p ON u.id = p.user
			WHERE u.id = ?
		`,
			[id],
		);

		if (users.length === 0) {
			return res.status(404).json({ error: "User not found" });
		}

		const user = users[0];

		res.json({
			success: true,
			user: {
				id: user.id,
				email: user.email,
				username: user.username,
				role: user.role,
				status: user.status,
				createdAt: user.created_at,
				profile: {
					firstName: user.first_name,
					lastName: user.last_name,
					phone: user.phone,
					country: user.country,
					summary: user.summary,
					bio: user.bio,
					jobTitle: user.job_title,
					experienceLevel: user.experience_level,
					preferredSalary: user.preferred_salary,
					location: user.location,
				},
			},
		});
	} catch (error) {
		console.error("Get user by ID error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Update user
async function updateUser(req, res) {
	try {
		const { id } = req.params;
		const { email, username, role, status } = req.body;

		// Check if user can update this data (admin or own data)
		if (req.user.role !== 0 && req.user.id !== Number.parseInt(id)) {
			return res.status(403).json({ error: "Access denied" });
		}

		// Regular users cannot change role or status
		let updateData = { email, username };
		if (req.user.role === 0) {
			updateData = { email, username, role, status };
		}

		// Build update query
		const updateFields = [];
		const values = [];

		for (const key of Object.keys(updateData)) {
			if (updateData[key] !== undefined) {
				updateFields.push(`${key} = ?`);
				values.push(updateData[key]);
			}
		}

		if (updateFields.length === 0) {
			return res.status(400).json({ error: "No valid fields to update" });
		}

		values.push(id);

		await query(`UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`, values);

		// Get updated user
		const updatedUser = await query("SELECT id, email, username, role, status FROM users WHERE id = ?", [id]);

		res.json({
			success: true,
			user: updatedUser[0],
		});
	} catch (error) {
		console.error("Update user error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Delete user (admin only)
async function deleteUser(req, res) {
	try {
		const { id } = req.params;

		// Prevent admin from deleting themselves
		if (req.user.id === Number.parseInt(id)) {
			return res.status(400).json({ error: "Cannot delete your own account" });
		}

		// Delete user (cascade will handle related records)
		await query("DELETE FROM users WHERE id = ?", [id]);

		res.json({
			success: true,
			message: "User deleted successfully",
		});
	} catch (error) {
		console.error("Delete user error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Update password
async function updatePassword(req, res) {
	try {
		const { id } = req.params;
		const { currentPassword, newPassword } = req.body;

		// Check if user can update this password (admin or own password)
		if (req.user.role !== 0 && req.user.id !== Number.parseInt(id)) {
			return res.status(403).json({ error: "Access denied" });
		}

		if (!newPassword) {
			return res.status(400).json({ error: "New password is required" });
		}

		// If not admin, require current password
		if (req.user.role !== 0) {
			if (!currentPassword) {
				return res.status(400).json({ error: "Current password is required" });
			}

			// Verify current password
			const users = await query("SELECT password_hash FROM users WHERE id = ?", [id]);
			const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);

			if (!isValidPassword) {
				return res.status(400).json({ error: "Current password is incorrect" });
			}
		}

		// Hash new password
		const newPasswordHash = await bcrypt.hash(newPassword, 12);

		// Update password
		await query("UPDATE users SET password_hash = ? WHERE id = ?", [newPasswordHash, id]);

		res.json({
			success: true,
			message: "Password updated successfully",
		});
	} catch (error) {
		console.error("Update password error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

module.exports = {
	getAllUsers,
	getUserById,
	updateUser,
	deleteUser,
	updatePassword,
};
