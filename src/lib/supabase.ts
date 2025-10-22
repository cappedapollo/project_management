import { createClient } from "@supabase/supabase-js";

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://zcxkzwbldehrfbsyrccy.supabase.co";
const supabaseAnonKey =
	import.meta.env.VITE_SUPABASE_ANON_KEY ||
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjeGt6d2JsZGVocmZic3lyY2N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MjgzMjgsImV4cCI6MjA3MjMwNDMyOH0.hM-QtJIeSkSY-y_n1aUhyjQF9mBA02iI83h-rsLOEug";

if (!supabaseUrl || !supabaseAnonKey) {
	console.error("❌ Missing Supabase configuration. Please check your .env file.");
	console.log("Required environment variables:");
	console.log("- VITE_SUPABASE_URL");
	console.log("- VITE_SUPABASE_ANON_KEY");
}

// Create Supabase client
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
	auth: {
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: true,
	},
});

// Test connection function
export const testConnection = async () => {
	try {
		const { data, error } = await supabase.from("users").select("count", { count: "exact", head: true });

		if (error) {
			console.error("❌ Supabase connection test failed:", error.message);
			return false;
		}

		console.log("✅ Supabase connection successful");
		return true;
	} catch (error) {
		console.error("❌ Supabase connection error:", error.message);
		return false;
	}
};

// Database types (you can generate these from Supabase CLI)
export type Database = {
	public: {
		Tables: {
			users: {
				Row: {
					id: number;
					username: string;
					email: string;
					password_hash: string;
					full_name: string | null;
					role: number;
					is_active: boolean;
					created_at: string;
					updated_at: string;
					last_login: string | null;
					profile_picture: string | null;
					phone: string | null;
					department: string | null;
					position: string | null;
				};
				Insert: {
					username: string;
					email: string;
					password_hash: string;
					full_name?: string | null;
					role?: number;
					is_active?: boolean;
					profile_picture?: string | null;
					phone?: string | null;
					department?: string | null;
					position?: string | null;
				};
				Update: {
					username?: string;
					email?: string;
					password_hash?: string;
					full_name?: string | null;
					role?: number;
					is_active?: boolean;
					last_login?: string | null;
					profile_picture?: string | null;
					phone?: string | null;
					department?: string | null;
					position?: string | null;
				};
			};
			projects: {
				Row: {
					id: number;
					name: string;
					description: string | null;
					status: string;
					priority: string;
					start_date: string | null;
					end_date: string | null;
					budget: number | null;
					spent_budget: number;
					progress: number;
					created_by: number | null;
					assigned_to: number | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					name: string;
					description?: string | null;
					status?: string;
					priority?: string;
					start_date?: string | null;
					end_date?: string | null;
					budget?: number | null;
					spent_budget?: number;
					progress?: number;
					created_by?: number | null;
					assigned_to?: number | null;
				};
				Update: {
					name?: string;
					description?: string | null;
					status?: string;
					priority?: string;
					start_date?: string | null;
					end_date?: string | null;
					budget?: number | null;
					spent_budget?: number;
					progress?: number;
					created_by?: number | null;
					assigned_to?: number | null;
				};
			};
			// Add more table types as needed
		};
	};
};
