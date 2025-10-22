import { GLOBAL_CONFIG } from "@/global-config";
import type { UserInfo, UserToken } from "#/entity";
import apiClient from "../apiClient";

interface ApiResponse<T = any> {
	success: boolean;
	error?: string;
	message?: string;
	[key: string]: any;
}

export interface AuthReq {
	email: string;
	password: string;
}

export interface SignInReq {
	username: string;
	password: string;
}

export interface SignUpReq extends SignInReq {
	email: string;
}

export type SignInRes = UserToken & { user: UserInfo };

export enum UserApi {
	SignIn = "/auth/login",
	SignUp = "/auth/register",
	Logout = "/auth/logout",
	Refresh = "/auth/refresh",
	Me = "/auth/me",
	Users = "/users",
}

const signup = async (credentials: AuthReq): Promise<{ data: any; error: any }> => {
	// Registering user silently

	try {
		const response = await apiClient.post<ApiResponse>({
			url: UserApi.SignUp,
			data: {
				email: credentials.email,
				username: credentials.email.split("@")[0],
				password: credentials.password,
			},
		});

		if (response.success) {
			const user: UserInfo = {
				id: response.user.id,
				email: response.user.email,
				username: response.user.username,
				avatar: "",
				country: "",
				summary: "",
				role: response.user.role,
				status: 1,
				created_at: new Date().toISOString(),
				app_metadata: {},
				user_metadata: {},
				aud: "authenticated",
				permissions: [
					{
						id: "user",
						name: "user_permission",
						code: "permission:user",
					},
				],
				roles: [
					{
						id: "user",
						name: "user_role",
						code: "role:user",
					},
				],
			};

			// User registered successfully
			return {
				data: {
					user,
					session: {
						access_token: response.token,
						refresh_token: response.refreshToken,
					},
				},
				error: null,
			};
		}

		throw new Error("Registration failed");
	} catch (error: any) {
		console.error("Signup error:", error.message);
		return {
			data: null,
			error: error.response?.data?.error || error.message || "Registration failed",
		};
	}
};

const signin = async (credentials: AuthReq): Promise<{ user: UserInfo; session: any }> => {
	try {
		// Signing in user silently

		const response = await apiClient.post<ApiResponse>({
			url: UserApi.SignIn,
			data: {
				email: credentials.email,
				password: credentials.password,
			},
		});

		if (response.success) {
			const user: UserInfo = {
				id: response.user.id,
				email: response.user.email,
				username: response.user.username,
				avatar: "",
				country: "",
				summary: "",
				role: response.user.role,
				status: 1,
				created_at: new Date().toISOString(),
				app_metadata: {},
				user_metadata: {},
				aud: "authenticated",
				permissions:
					response.user.role === 0
						? [
								{
									id: "admin",
									name: "admin_permission",
									code: "permission:admin",
								},
							]
						: [
								{
									id: "user",
									name: "user_permission",
									code: "permission:user",
								},
							],
				roles:
					response.user.role === 0
						? [
								{
									id: "admin",
									name: "admin_role",
									code: "role:admin",
								},
							]
						: [
								{
									id: "user",
									name: "user_role",
									code: "role:user",
								},
							],
			};

			const session = {
				access_token: response.token,
				refresh_token: response.refreshToken,
				expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
				user,
			};

			// User signed in successfully
			return { user, session };
		}

		throw new Error("Login failed");
	} catch (error: any) {
		console.error("Signin error:", error.message);
		throw new Error(error.response?.data?.error || error.message || "Invalid email or password");
	}
};

const getCurrentUser = async (token?: string) => {
	try {
		if (!token) {
			throw new Error("No authentication token provided");
		}

		const response = await apiClient.get<ApiResponse>({
			url: UserApi.Me,
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (response.success) {
			const user: UserInfo = {
				id: response.user.id,
				email: response.user.email,
				username: response.user.username,
				avatar: "",
				country: "",
				summary: "",
				role: response.user.role,
				status: 1,
				created_at: new Date().toISOString(),
				app_metadata: {},
				user_metadata: {},
				aud: "authenticated",
				permissions:
					response.user.role === 0
						? [
								{
									id: "admin",
									name: "admin_permission",
									code: "permission:admin",
								},
							]
						: [
								{
									id: "user",
									name: "user_permission",
									code: "permission:user",
								},
							],
				roles:
					response.user.role === 0
						? [
								{
									id: "admin",
									name: "admin_role",
									code: "role:admin",
								},
							]
						: [
								{
									id: "user",
									name: "user_role",
									code: "role:user",
								},
							],
			};

			// Current user retrieved silently
			return user;
		}

		throw new Error("Failed to get current user");
	} catch (error: any) {
		console.error("Get user error:", error.message);
		throw new Error(error.response?.data?.error || error.message || "Failed to get current user");
	}
};

const getUserList = async (token: string): Promise<Partial<UserInfo>[]> => {
	try {
		const response = await apiClient.get<ApiResponse>({
			url: UserApi.Users,
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (response.success) {
			return response.users.map((user: any) => ({
				id: user.id,
				email: user.email,
				username: user.username,
				role: user.role,
				status: user.status,
				created_at: user.createdAt,
				avatar: "",
				country: user.profile?.country || "",
				summary: user.profile?.summary || "",
				app_metadata: {},
				user_metadata: {},
				aud: "authenticated",
				permissions: [],
				roles: [],
			}));
		}

		throw new Error("Failed to fetch users");
	} catch (error: any) {
		console.error("Error fetching users:", error.message);
		throw new Error(error.response?.data?.error || error.message || "Failed to fetch users");
	}
};

const logout = async (refreshToken?: string) => {
	try {
		if (refreshToken) {
			await apiClient.post<ApiResponse>({
				url: UserApi.Logout,
				data: { refreshToken },
			});
		}
		// User signed out successfully
	} catch (error: any) {
		console.error("Signout error:", error.message);
		// Don't throw error on logout failure, just log it
	}
};

const forgotPassword = async (email: string) => {
	try {
		// Password reset functionality is disabled for now
		// Password reset requested silently
		return "Password reset functionality is disabled. Please contact an administrator for assistance.";
	} catch (error: any) {
		console.error("Error processing reset request:", error.message);
		throw error;
	}
};

const updatePassword = async (newPassword: string, userId: string, token: string, currentPassword?: string) => {
	try {
		const response = await apiClient.put<ApiResponse>({
			url: `${UserApi.Users}/${userId}/password`,
			headers: {
				Authorization: `Bearer ${token}`,
			},
			data: {
				newPassword,
				currentPassword,
			},
		});

		if (response.success) {
			return "Password updated successfully. You can now log in.";
		}

		throw new Error("Failed to update password");
	} catch (error: any) {
		console.error("Error updating password:", error.message);
		throw new Error(error.response?.data?.error || error.message || "Failed to update password");
	}
};

const updateProfile = async (profile: Partial<UserInfo>, userId: string, token: string) => {
	try {
		const updates: any = {};
		if (profile.username) updates.username = profile.username;
		if (profile.status !== undefined) updates.status = profile.status;
		if (profile.role !== undefined) updates.role = profile.role;

		const response = await apiClient.put<ApiResponse>({
			url: `${UserApi.Users}/${userId}`,
			headers: {
				Authorization: `Bearer ${token}`,
			},
			data: updates,
		});

		if (response.success) {
			return {
				id: response.user.id,
				email: response.user.email,
				username: response.user.username,
				role: response.user.role,
				status: response.user.status,
				avatar: "",
				country: "",
				summary: "",
				created_at: new Date().toISOString(),
				app_metadata: {},
				user_metadata: {},
				aud: "authenticated",
				permissions: [],
				roles: [],
			};
		}

		throw new Error("Failed to update user profile");
	} catch (error: any) {
		console.error("Error updating user profile:", error.message);
		throw new Error(error.response?.data?.error || error.message || "Failed to update user profile");
	}
};

const deleteUser = async (userId: string, token: string) => {
	try {
		const response = await apiClient.delete<ApiResponse>({
			url: `${UserApi.Users}/${userId}`,
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (response.success) {
			// User deleted successfully
			return { success: true };
		}

		throw new Error("Failed to delete user");
	} catch (error: any) {
		console.error("Error deleting user:", error.message);
		throw new Error(error.response?.data?.error || error.message || "Failed to delete user");
	}
};

const refreshTokens = async (refreshToken: string) => {
	try {
		const response = await apiClient.post<ApiResponse>({
			url: UserApi.Refresh,
			data: { refreshToken },
		});

		if (response.success) {
			return {
				access_token: response.token,
				refresh_token: response.refreshToken,
			};
		}

		throw new Error("Failed to refresh tokens");
	} catch (error: any) {
		console.error("Error refreshing tokens:", error.message);
		throw new Error(error.response?.data?.error || error.message || "Failed to refresh tokens");
	}
};

export default {
	signin,
	signup,
	getCurrentUser,
	logout,
	forgotPassword,
	updatePassword,
	updateProfile,
	getUserList,
	deleteUser,
	refreshTokens,
};
