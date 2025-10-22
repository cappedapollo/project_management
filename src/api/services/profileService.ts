import type { ProfileInfo } from "@/types/entity";
import apiClient from "../apiClient";

interface ApiResponse {
	success: boolean;
	error?: string;
	[key: string]: any;
}

const createAndUpdateProfile = async (profile: Partial<ProfileInfo>, token: string, userId?: string) => {
	try {
		// Use provided userId or extract from profile
		const targetUserId = userId || (typeof profile.user === "string" ? profile.user : profile.user?.id);

		const data = {
			firstName: profile.name?.split(" ")[0] || "",
			lastName: profile.name?.split(" ").slice(1).join(" ") || "",
			phone: profile.phone,
			country: profile.country,
			// Note: Backend expects different field names, adjust as needed
		};

		const url = targetUserId ? `/profiles/${targetUserId}` : "/profiles";

		const response = await apiClient.put<ApiResponse>({
			url,
			headers: {
				Authorization: `Bearer ${token}`,
			},
			data,
		});

		if (response.success) {
			// Profile saved successfully
			return { id: response.profile.id };
		}

		throw new Error("Failed to save profile");
	} catch (error: any) {
		console.error("Save profile error:", error);
		throw new Error(error.response?.data?.error || error.message || "Failed to save profile");
	}
};

const getProfileList = async (token: string, userId?: string) => {
	try {
		// Admin can get all profiles, users can only get their own
		const url = "/profiles";

		const response = await apiClient.get<ApiResponse>({
			url,
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (response.success) {
			// Transform backend response to match frontend format
			const profile = response.profile;
			const transformedProfile = {
				id: profile.id,
				name: `${profile.firstName || ""} ${profile.lastName || ""}`.trim(),
				phone: profile.phone,
				country: profile.country,
				email: profile.email || "",
				user: profile.user,
				created_at: profile.updatedAt,
			};

			// Profile data fetched successfully
			return [transformedProfile];
		}

		throw new Error("Failed to fetch profile");
	} catch (error: any) {
		console.error("Get profile error:", error);
		// Return empty array if no profile exists
		if (error.response?.status === 404) {
			return [];
		}
		throw new Error(error.response?.data?.error || error.message || "Failed to fetch profile");
	}
};

const getUserProfile = async (userId: string, token: string) => {
	try {
		const response = await apiClient.get<ApiResponse>({
			url: `/profiles/${userId}`,
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (response.success) {
			// Transform backend response to match frontend format
			const profile = response.profile;
			const transformedProfile = {
				id: profile.id,
				name: `${profile.firstName || ""} ${profile.lastName || ""}`.trim(),
				phone: profile.phone,
				country: profile.country,
				email: profile.email || "",
				user: profile.user,
				created_at: profile.updatedAt,
			};

			// User profile fetched successfully
			return transformedProfile;
		}

		return null;
	} catch (error: any) {
		console.error("Get user profile error:", error);
		// Return null if profile doesn't exist
		if (error.response?.status === 404) {
			return null;
		}
		throw new Error(error.response?.data?.error || error.message || "Failed to fetch user profile");
	}
};

const deleteProfile = async (userId: string, token: string) => {
	try {
		const response = await apiClient.delete<ApiResponse>({
			url: `/profiles/${userId}`,
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (response.success) {
			// Profile deleted successfully
			return { deletedId: userId };
		}

		throw new Error("Failed to delete profile");
	} catch (error: any) {
		console.error("Delete profile error:", error);
		throw new Error(error.response?.data?.error || error.message || "Failed to delete profile");
	}
};

export default {
	createAndUpdateProfile,
	getProfileList,
	getUserProfile,
	deleteProfile,
};
