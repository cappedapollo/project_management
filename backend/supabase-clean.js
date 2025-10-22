const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Supabase configuration - only real database, no mock fallback
const supabaseUrl = process.env.SUPABASE_URL || "https://zcxkzwbldehrfbsyrccy.supabase.co";
let supabaseServiceKey =
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjeGt6d2JsZGVocmZic3lyY2N5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjcyODMyOCwiZXhwIjoyMDcyMzA0MzI4fQ.W0DWwAh8BcFiaAmkixLseqf9aTCWq4_Qy-Nb4RYws6g";

// Handle PowerShell line splitting issue
if (supabaseServiceKey?.includes("\n")) {
	supabaseServiceKey = supabaseServiceKey.replace(/\n/g, "").replace(/\r/g, "");
}

// Create Supabase client - ONLY real database connection
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

// Test connection function
const testConnection = async () => {
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

// Simplified query function that only handles essential queries with real Supabase
const query = async (sql, params = []) => {
	try {
		console.log("🔍 Executing query:", sql.substring(0, 100) + "...");
		console.log("📝 Params:", params);

		// Handle SELECT queries for users table
		if (sql.includes("SELECT") && sql.includes("FROM users")) {
			let query = supabase.from("users").select("*");

			// Handle WHERE email = $1 OR username = $1 (login query)
			if (sql.includes("WHERE email = $1 OR username = $1") && params[0]) {
				query = query.or(`email.eq.${params[0]},username.eq.${params[0]}`);
			}
			// Handle WHERE email = $1
			else if (sql.includes("WHERE email = $1") && params[0]) {
				query = query.eq("email", params[0]);
			}
			// Handle WHERE id = $1
			else if (sql.includes("WHERE id = $1") && params[0]) {
				query = query.eq("id", params[0]);
			}

			// Add ordering
			if (sql.includes("ORDER BY created_at DESC")) {
				query = query.order("created_at", { ascending: false });
			}

			const { data, error } = await query;

			if (error) {
				console.error("❌ Supabase users query error:", error);
				throw error;
			}

			console.log(`✅ Users query returned ${data?.length || 0} results`);
			return data || [];
		}

		// Handle SELECT queries for job_applications table
		if (sql.includes("SELECT") && sql.includes("FROM job_applications")) {
			let query = supabase.from("job_applications").select("*");

			// Handle WHERE user_id = $1
			if (sql.includes("WHERE user_id = $1") && params[0]) {
				query = query.eq("user_id", params[0]);
			}

			// Add ordering
			if (sql.includes("ORDER BY created_at DESC")) {
				query = query.order("created_at", { ascending: false });
			}

			const { data, error } = await query;

			if (error) {
				console.error("❌ Supabase job_applications query error:", error);
				throw error;
			}

			console.log(`✅ Job applications query returned ${data?.length || 0} results`);
			return data || [];
		}

		// Handle SELECT queries for interviews table
		if (sql.includes("SELECT") && sql.includes("FROM interviews")) {
			let query = supabase.from("interviews").select(`
				*,
				job_applications:job_application_id (
					company_name,
					position_title
				),
				users:user_id (
					username,
					full_name,
					email
				)
			`);

			// Handle WHERE user_id = $1
			if (sql.includes("WHERE") && sql.includes("user_id") && params[0]) {
				query = query.eq("user_id", params[0]);
			}

			// Handle WHERE id = $1
			if (sql.includes("WHERE id = $1") && params[0]) {
				query = query.eq("id", params[0]);
			}

			// Add ordering
			if (sql.includes("ORDER BY scheduled_date DESC")) {
				query = query.order("scheduled_date", { ascending: false });
			}

			const { data, error } = await query;

			if (error) {
				console.error("❌ Supabase interviews query error:", error);
				throw error;
			}

			// Transform the data to match expected format
			const transformedData =
				data?.map((interview) => ({
					...interview,
					company_name: interview.company_name || interview.job_applications?.company_name,
					position_title: interview.position_title || interview.job_applications?.position_title,
					username: interview.users?.username,
					full_name: interview.users?.full_name,
					email: interview.users?.email,
				})) || [];

			console.log(`✅ Interviews query returned ${transformedData.length} results`);
			return transformedData;
		}

		// Handle INSERT queries
		if (sql.includes("INSERT INTO")) {
			console.log("⚠️ INSERT queries should use Supabase client directly, not query function");
			throw new Error("Use supabase.from(table).insert() instead of raw INSERT queries");
		}

		// Handle UPDATE queries
		if (sql.includes("UPDATE")) {
			console.log("⚠️ UPDATE queries should use Supabase client directly, not query function");
			throw new Error("Use supabase.from(table).update() instead of raw UPDATE queries");
		}

		// Handle DELETE queries
		if (sql.includes("DELETE")) {
			console.log("⚠️ DELETE queries should use Supabase client directly, not query function");
			throw new Error("Use supabase.from(table).delete() instead of raw DELETE queries");
		}

		// For any other queries, log and return empty array
		console.log("⚠️ Unhandled query type:", sql);
		return [];
	} catch (error) {
		console.error("❌ Query execution error:", error);
		throw error;
	}
};

// Export the Supabase client and functions
module.exports = {
	supabase,
	query,
	testConnection,
};

console.log("🚀 Supabase client initialized - REAL DATABASE ONLY (no mock data)");
