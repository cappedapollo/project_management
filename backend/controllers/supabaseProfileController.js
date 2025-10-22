const { supabase } = require("../supabase");

// Get user profile
async function getProfile(req, res) {
	try {
		const userId = req.params.userId || req.user.id;

		// Check if user can access this profile (admin or own profile)
		if (req.user.role !== 0 && req.user.id !== userId) {
			return res.status(403).json({ error: "Access denied" });
		}

		const { data: user, error } = await supabase
			.from("users")
			.select(`
				id, email, username, full_name, phone, department, position,
				profile_picture, created_at, updated_at
			`)
			.eq("id", userId)
			.single();

		if (error || !user) {
			return res.status(404).json({ error: "Profile not found" });
		}

		res.json({
			success: true,
			profile: {
				user: user.id,
				fullName: user.full_name,
				phone: user.phone,
				department: user.department,
				position: user.position,
				profilePicture: user.profile_picture,
				email: user.email,
				username: user.username,
				createdAt: user.created_at,
				updatedAt: user.updated_at,
			},
		});
	} catch (error) {
		console.error("Get profile error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Update user profile
async function updateProfile(req, res) {
	try {
		const userId = req.params.userId || req.user.id;
		const { full_name, phone, department, position, profile_picture } = req.body;

		// Check if user can update this profile (admin or own profile)
		if (req.user.role !== 0 && req.user.id !== userId) {
			return res.status(403).json({ error: "Access denied" });
		}

		const { data: updatedUser, error } = await supabase
			.from("users")
			.update({
				full_name,
				phone,
				department,
				position,
				profile_picture,
				updated_at: new Date().toISOString(),
			})
			.eq("id", userId)
			.select(`
				id, email, username, full_name, phone, department, position,
				profile_picture, updated_at
			`)
			.single();

		if (error) {
			console.error("Update profile error:", error);
			return res.status(500).json({ error: "Failed to update profile" });
		}

		res.json({
			success: true,
			message: "Profile updated successfully",
			profile: {
				user: updatedUser.id,
				fullName: updatedUser.full_name,
				phone: updatedUser.phone,
				department: updatedUser.department,
				position: updatedUser.position,
				profilePicture: updatedUser.profile_picture,
				email: updatedUser.email,
				username: updatedUser.username,
				updatedAt: updatedUser.updated_at,
			},
		});
	} catch (error) {
		console.error("Update profile error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Upload profile picture
async function uploadProfilePicture(req, res) {
	try {
		const userId = req.params.userId || req.user.id;

		// Check if user can update this profile (admin or own profile)
		if (req.user.role !== 0 && req.user.id !== userId) {
			return res.status(403).json({ error: "Access denied" });
		}

		if (!req.file) {
			return res.status(400).json({ error: "No file uploaded" });
		}

		// In a real implementation, you would upload to Supabase Storage
		// For now, we'll just store a placeholder URL
		const profilePictureUrl = `/uploads/profiles/${userId}_${Date.now()}.jpg`;

		const { data: updatedUser, error } = await supabase
			.from("users")
			.update({
				profile_picture: profilePictureUrl,
				updated_at: new Date().toISOString(),
			})
			.eq("id", userId)
			.select("profile_picture")
			.single();

		if (error) {
			console.error("Upload profile picture error:", error);
			return res.status(500).json({ error: "Failed to update profile picture" });
		}

		res.json({
			success: true,
			message: "Profile picture updated successfully",
			profilePicture: updatedUser.profile_picture,
		});
	} catch (error) {
		console.error("Upload profile picture error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Delete profile picture
async function deleteProfilePicture(req, res) {
	try {
		const userId = req.params.userId || req.user.id;

		// Check if user can update this profile (admin or own profile)
		if (req.user.role !== 0 && req.user.id !== userId) {
			return res.status(403).json({ error: "Access denied" });
		}

		const { error } = await supabase
			.from("users")
			.update({
				profile_picture: null,
				updated_at: new Date().toISOString(),
			})
			.eq("id", userId);

		if (error) {
			console.error("Delete profile picture error:", error);
			return res.status(500).json({ error: "Failed to delete profile picture" });
		}

		res.json({
			success: true,
			message: "Profile picture deleted successfully",
		});
	} catch (error) {
		console.error("Delete profile picture error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Get all profiles (admin only)
async function getAllProfiles(req, res) {
	try {
		// Check if admin
		if (req.user.role !== 0) {
			return res.status(403).json({ error: "Admin access required" });
		}

		const { data: users, error } = await supabase
			.from("users")
			.select(`
				id, email, username, full_name, phone, department, position,
				profile_picture, is_active, created_at
			`)
			.order("created_at", { ascending: false });

		if (error) {
			console.error("Get all profiles error:", error);
			return res.status(500).json({ error: "Failed to fetch profiles" });
		}

		res.json({
			success: true,
			profiles: users.map((user) => ({
				user: user.id,
				fullName: user.full_name,
				phone: user.phone,
				department: user.department,
				position: user.position,
				profilePicture: user.profile_picture,
				email: user.email,
				username: user.username,
				isActive: user.is_active,
				createdAt: user.created_at,
			})),
		});
	} catch (error) {
		console.error("Get all profiles error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Delete user profile
async function deleteProfile(req, res) {
	try {
		const userId = req.params.userId || req.user.id;

		// Check if user can delete this profile (admin or own profile)
		if (req.user.role !== 0 && req.user.id !== Number.parseInt(userId)) {
			return res.status(403).json({ error: "Access denied" });
		}

		const { error } = await supabase.from("users").delete().eq("id", userId);

		if (error) {
			console.error("Delete profile error:", error);
			return res.status(500).json({ error: "Failed to delete profile" });
		}

		res.json({
			success: true,
			message: "Profile deleted successfully",
		});
	} catch (error) {
		console.error("Delete profile error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

module.exports = {
	getProfile,
	updateProfile,
	uploadProfilePicture,
	deleteProfilePicture,
	getAllProfiles,
	deleteProfile,
};
