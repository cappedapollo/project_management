const { query } = require("../db");

// Get user profile
async function getProfile(req, res) {
	try {
		const userId = req.params.userId || req.user.id;

		// Check if user can access this profile (admin or own profile)
		if (req.user.role !== 0 && req.user.id !== userId) {
			return res.status(403).json({ error: "Access denied" });
		}

		const profiles = await query("SELECT * FROM profiles WHERE user = ?", [userId]);

		if (profiles.length === 0) {
			// Return empty profile if none exists
			return res.json({
				success: true,
				profile: {
					user: userId,
					firstName: null,
					lastName: null,
					phone: null,
					country: null,
					summary: null,
					bio: null,
					jobTitle: null,
					experienceLevel: null,
					preferredSalary: null,
					location: null,
					skills: null,
					education: null,
					experience: null,
				},
			});
		}

		const profile = profiles[0];

		res.json({
			success: true,
			profile: {
				id: profile.id,
				user: profile.user,
				firstName: profile.first_name,
				lastName: profile.last_name,
				phone: profile.phone,
				country: profile.country,
				summary: profile.summary,
				bio: profile.bio,
				jobTitle: profile.job_title,
				experienceLevel: profile.experience_level,
				preferredSalary: profile.preferred_salary,
				location: profile.location,
				skills: profile.skills,
				education: profile.education,
				experience: profile.experience,
				updatedAt: profile.updated_at,
			},
		});
	} catch (error) {
		console.error("Get profile error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Update or create user profile
async function updateProfile(req, res) {
	try {
		const userId = req.params.userId || req.user.id;

		// Check if user can update this profile (admin or own profile)
		if (req.user.role !== 0 && req.user.id !== userId) {
			return res.status(403).json({ error: "Access denied" });
		}

		const { firstName, lastName, phone, country, summary, bio, jobTitle, experienceLevel, preferredSalary, location, skills, education, experience } = req.body;

		// Check if profile exists
		const existingProfiles = await query("SELECT id FROM profiles WHERE user = ?", [userId]);

		if (existingProfiles.length === 0) {
			// Create new profile
			await query(
				`
				INSERT INTO profiles (
					user, first_name, last_name, phone, country, summary, bio,
					job_title, experience_level, preferred_salary, location,
					skills, education, experience, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
			`,
				[userId, firstName, lastName, phone, country, summary, bio, jobTitle, experienceLevel, preferredSalary, location, skills, education, experience],
			);
		} else {
			// Update existing profile
			await query(
				`
				UPDATE profiles SET
					first_name = ?, last_name = ?, phone = ?, country = ?, summary = ?, bio = ?,
					job_title = ?, experience_level = ?, preferred_salary = ?, location = ?,
					skills = ?, education = ?, experience = ?, updated_at = NOW()
				WHERE user = ?
			`,
				[firstName, lastName, phone, country, summary, bio, jobTitle, experienceLevel, preferredSalary, location, skills, education, experience, userId],
			);
		}

		// Get updated profile
		const updatedProfiles = await query("SELECT * FROM profiles WHERE user = ?", [userId]);
		const profile = updatedProfiles[0];

		res.json({
			success: true,
			profile: {
				id: profile.id,
				user: profile.user,
				firstName: profile.first_name,
				lastName: profile.last_name,
				phone: profile.phone,
				country: profile.country,
				summary: profile.summary,
				bio: profile.bio,
				jobTitle: profile.job_title,
				experienceLevel: profile.experience_level,
				preferredSalary: profile.preferred_salary,
				location: profile.location,
				skills: profile.skills,
				education: profile.education,
				experience: profile.experience,
				updatedAt: profile.updated_at,
			},
		});
	} catch (error) {
		console.error("Update profile error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

// Delete profile
async function deleteProfile(req, res) {
	try {
		const userId = req.params.userId || req.user.id;

		// Check if user can delete this profile (admin or own profile)
		if (req.user.role !== 0 && req.user.id !== userId) {
			return res.status(403).json({ error: "Access denied" });
		}

		await query("DELETE FROM profiles WHERE user = ?", [userId]);

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
	deleteProfile,
};
