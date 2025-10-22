import type { UserInfo } from "@/types/entity";
import { SessionRepository, UserRepository } from "../database/repository";

// Conditional imports for Node.js-only packages
const getBcrypt = async () => {
	if (typeof window === "undefined") {
		// Server-side (Node.js) environment
		const bcrypt = await import("bcryptjs");
		return bcrypt.default;
	}
	// Client-side (browser) environment - provide mock
	return {
		hash: () => Promise.reject(new Error("Bcrypt not available in browser")),
		compare: () => Promise.reject(new Error("Bcrypt not available in browser")),
	};
};

const getJwt = async () => {
	if (typeof window === "undefined") {
		// Server-side (Node.js) environment
		const jwt = await import("jsonwebtoken");
		return jwt.default;
	}
	// Client-side (browser) environment - provide mock
	return {
		sign: () => {
			throw new Error("JWT not available in browser");
		},
		verify: () => {
			throw new Error("JWT not available in browser");
		},
	};
};

// JWT configuration
const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";
const JWT_EXPIRES_IN = "1h";
const REFRESH_TOKEN_EXPIRES_IN = "30d";

export interface AuthTokens {
	access_token: string;
	refresh_token: string;
	expires_at: number;
}

export interface AuthUser {
	id: string;
	email: string;
	username?: string;
	role: number;
	status: number;
}

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
	const bcrypt = await getBcrypt();
	const saltRounds = 12;
	return await bcrypt.hash(password, saltRounds);
};

// Verify password
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
	const bcrypt = await getBcrypt();
	return await bcrypt.compare(password, hashedPassword);
};

// Generate JWT tokens
export const generateTokens = async (user: AuthUser): Promise<AuthTokens> => {
	const jwt = await getJwt();
	const payload = {
		id: user.id,
		email: user.email,
		username: user.username,
		role: user.role,
		status: user.status,
	};

	const access_token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
	const refresh_token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

	// Store refresh token in database
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
	await SessionRepository.create(user.id, refresh_token, expiresAt);

	return {
		access_token,
		refresh_token,
		expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
	};
};

// Verify JWT token
export const verifyToken = async (token: string): Promise<AuthUser | null> => {
	try {
		const jwt = await getJwt();
		const decoded = jwt.verify(token, JWT_SECRET) as any;
		return {
			id: decoded.id,
			email: decoded.email,
			username: decoded.username,
			role: decoded.role,
			status: decoded.status,
		};
	} catch (error) {
		console.error("Token verification failed:", error);
		return null;
	}
};

// Refresh token
export const refreshAccessToken = async (refreshToken: string): Promise<AuthTokens | null> => {
	try {
		const jwt = await getJwt();
		// Verify refresh token
		const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;

		// Check if refresh token exists in database
		const session = await SessionRepository.findByRefreshToken(refreshToken);
		if (!session) {
			throw new Error("Invalid refresh token");
		}

		// Get user
		const user = await UserRepository.findById(decoded.id);
		if (!user) {
			throw new Error("User not found");
		}

		// Generate new tokens
		const authUser: AuthUser = {
			id: user.id,
			email: user.email,
			username: user.username,
			role: user.role || 1,
			status: user.status || 1,
		};

		// Delete old refresh token
		await SessionRepository.deleteByUserId(user.id);

		return await generateTokens(authUser);
	} catch (error) {
		console.error("Token refresh failed:", error);
		return null;
	}
};

// Convert database user to UserInfo
export const convertToUserInfo = (dbUser: any): UserInfo => {
	return {
		id: dbUser.id,
		email: dbUser.email,
		username: dbUser.username,
		avatar: dbUser.avatar,
		country: dbUser.country,
		status: dbUser.status,
		role: dbUser.role,
		created_at: dbUser.created_at,
		// These are required by the UserInfo interface but not used in Supabase
		app_metadata: {},
		user_metadata: {},
		aud: "authenticated",
	};
};

// Generate password reset token
export const generatePasswordResetToken = async (): Promise<string> => {
	const jwt = await getJwt();
	return jwt.sign({ purpose: "password_reset" }, JWT_SECRET, { expiresIn: "1h" });
};

// Verify password reset token
export const verifyPasswordResetToken = async (token: string): Promise<boolean> => {
	try {
		const jwt = await getJwt();
		const decoded = jwt.verify(token, JWT_SECRET) as any;
		return decoded.purpose === "password_reset";
	} catch (error) {
		return false;
	}
};

// Clean expired sessions
export const cleanExpiredSessions = async (): Promise<void> => {
	await SessionRepository.deleteExpired();
};
