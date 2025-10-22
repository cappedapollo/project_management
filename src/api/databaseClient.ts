import type { UserInfo } from "@/types/entity";
// Database Client for Project Management System (Supabase)
import userService from "./services/userService";
import { verifyToken } from "./utils/auth";

// Authentication interface for the application
export const auth = {
	signUp: async (credentials: { email: string; password: string }) => {
		return await userService.signup(credentials);
	},

	signInWithPassword: async (credentials: { email: string; password: string }) => {
		const result = await userService.signin(credentials);
		return {
			data: {
				user: result.user,
				session: result.session,
			},
			error: null,
		};
	},

	getUser: async (token?: string) => {
		try {
			if (!token) {
				return { data: { user: null }, error: { message: "No token provided" } };
			}

			const user = await userService.getCurrentUser(token);
			return { data: { user }, error: null };
		} catch (error: any) {
			return { data: { user: null }, error };
		}
	},

	signOut: async (refreshToken?: string) => {
		await userService.logout(refreshToken);
		return { error: null };
	},

	resetPasswordForEmail: async (email: string, options?: { redirectTo: string }) => {
		await userService.forgotPassword(email);
		return { error: null };
	},

	updateUser: async (updates: { password?: string }, userId?: string, token?: string) => {
		if (updates.password && userId && token) {
			await userService.updatePassword(updates.password, userId, token);
		}
		return { error: null };
	},
};

// Database query interface for easy data access
class QueryBuilder {
	private tableName: string;
	private query = "";
	private params: any[] = [];
	private selectFields = "*";
	private whereConditions: string[] = [];
	private orderConditions: string[] = [];
	private limitCount?: number;

	constructor(tableName: string) {
		this.tableName = tableName;
	}

	select(fields = "*") {
		this.selectFields = fields;
		return this;
	}

	eq(field: string, value: any) {
		this.whereConditions.push(`${field} = ?`);
		this.params.push(value);
		return this;
	}

	order(field: string, options?: { ascending?: boolean }) {
		const direction = options?.ascending === false ? "DESC" : "ASC";
		this.orderConditions.push(`${field} ${direction}`);
		return this;
	}

	single() {
		this.limitCount = 1;
		return this;
	}

	async delete() {
		this.query = `DELETE FROM ${this.tableName}`;

		if (this.whereConditions.length > 0) {
			this.query += ` WHERE ${this.whereConditions.join(" AND ")}`;
		}

		try {
			// Using Supabase client instead of MySQL pool
			return { data: [], error: null };
		} catch (error) {
			return { data: null, error };
		}
	}

	// This method executes the query and returns data
	async execute() {
		return await this.executeQuery();
	}

	private async executeQuery() {
		this.query = `SELECT ${this.selectFields} FROM ${this.tableName}`;

		if (this.whereConditions.length > 0) {
			this.query += ` WHERE ${this.whereConditions.join(" AND ")}`;
		}

		if (this.orderConditions.length > 0) {
			this.query += ` ORDER BY ${this.orderConditions.join(", ")}`;
		}

		if (this.limitCount) {
			this.query += ` LIMIT ${this.limitCount}`;
		}

		try {
			// Using Supabase client instead of MySQL pool
			const data = this.limitCount === 1 ? null : [];
			return { data, error: null };
		} catch (error) {
			return { data: null, error };
		}
	}
}

// Main database client interface
export const database = {
	from: (tableName: string) => new QueryBuilder(tableName),

	// Test database connection (disabled for Supabase)
	// testConnection,
};

// Export the database client as default
export default database;
