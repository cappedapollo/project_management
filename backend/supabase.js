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
		console.log(`🔍 Executing query: ${sql.substring(0, 100)}...`);
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
			// Handle WHERE id IN ($1, $2, ...)
			else if (sql.includes("WHERE id IN") && params.length > 0) {
				query = query.in("id", params);
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
			// Handle complex job applications query with JOINs
			if (sql.includes("LEFT JOIN users") && sql.includes("LEFT JOIN interviews")) {
				let query = supabase.from("job_applications").select(`
						*,
						users:user_id (
							username,
							full_name
						),
						interviews (
							id
						)
					`);

				// Handle WHERE ja.user_id = $1 (user filtering)
				if (sql.includes("ja.user_id = $") && params.length > 0) {
					const userParamIndex = sql.match(/ja\.user_id = \$\d+/);
					if (userParamIndex) {
						const paramNum = Number.parseInt(userParamIndex[0].match(/\$(\d+)/)[1], 10);
						if (params[paramNum - 1]) {
							query = query.eq("user_id", params[paramNum - 1]);
						}
					}
				}

				// Handle status filtering
				if (sql.includes("ja.status = $") && params.length > 1) {
					const statusParamIndex = sql.match(/ja\.status = \$\d+/);
					if (statusParamIndex) {
						const paramNum = Number.parseInt(statusParamIndex[0].match(/\$(\d+)/)[1], 10);
						if (params[paramNum - 1]) {
							query = query.eq("status", params[paramNum - 1]);
						}
					}
				}

				// Add ordering
				if (sql.includes("ORDER BY ja.created_at DESC")) {
					query = query.order("created_at", { ascending: false });
				}

				const { data, error } = await query;

				if (error) {
					console.error("❌ Supabase job_applications complex query error:", error);
					throw error;
				}

				// Transform the data to match the expected format with interview_count
				const transformedData =
					data?.map((app) => ({
						...app,
						username: app.users?.username || null,
						full_name: app.users?.full_name || null,
						interview_count: app.interviews?.length || 0,
					})) || [];

				console.log(`✅ Job applications complex query returned ${transformedData.length} results`);
				return transformedData;
			}

			// Handle simple job_applications queries
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

		// Handle SELECT queries for schedule_permissions table
		if (sql.includes("SELECT") && sql.includes("FROM schedule_permissions")) {
			// Handle complex schedule_permissions query with JOINs
			if (sql.includes("LEFT JOIN users")) {
				let query = supabase.from("schedule_permissions").select(`
						*,
						users:user_id (
							username,
							email,
							full_name,
							role
						),
						target_users:target_user_id (
							username,
							email,
							full_name
						),
						granted_by_users:granted_by (
							username,
							email
						)
					`);

				// Add ordering
				if (sql.includes("ORDER BY sp.granted_at DESC")) {
					query = query.order("granted_at", { ascending: false });
				}

				const { data, error } = await query;

				if (error) {
					console.error("❌ Supabase schedule_permissions complex query error:", error);
					throw error;
				}

				// Transform the data to match the expected format
				const transformedData =
					data?.map((permission) => ({
						...permission,
						username: permission.users?.username || null,
						email: permission.users?.email || null,
						full_name: permission.users?.full_name || null,
						role: permission.users?.role || null,
						target_username: permission.target_users?.username || null,
						target_email: permission.target_users?.email || null,
						target_full_name: permission.target_users?.full_name || null,
						granted_by_username: permission.granted_by_users?.username || null,
						granted_by_email: permission.granted_by_users?.email || null,
					})) || [];

				console.log(`✅ Schedule permissions complex query returned ${transformedData.length} results`);
				return transformedData;
			}

			// Handle simple schedule_permissions queries
			let query = supabase.from("schedule_permissions").select("*");

			// Handle WHERE user_id = $1
			if (sql.includes("WHERE user_id = $1") && params[0]) {
				query = query.eq("user_id", params[0]);
			}

			// Handle WHERE is_active = true
			if (sql.includes("WHERE is_active = true")) {
				query = query.eq("is_active", true);
			}

			const { data, error } = await query;

			if (error) {
				console.error("❌ Supabase schedule_permissions query error:", error);
				throw error;
			}

			console.log(`✅ Schedule permissions query returned ${data?.length || 0} results`);
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
			// Handle job_applications INSERT
			if (sql.includes("INSERT INTO job_applications")) {
				const { data, error } = await supabase
					.from("job_applications")
					.insert({
						user_id: params[0],
						company_name: params[1],
						position_title: params[2],
						application_date: params[3],
						status: params[4],
						job_description: params[5],
						salary_range: params[6],
						location: params[7],
						application_url: params[8],
						notes: params[9],
						follow_up_date: params[10],
						resume_file_path: params[11],
						has_resume: params[12],
					})
					.select()
					.single();

				if (error) {
					console.error("❌ Supabase job_applications INSERT error:", error);
					throw error;
				}

				console.log(`✅ Job application created with ID: ${data?.id}`);
				return [data];
			}

			// Handle interviews INSERT
			if (sql.includes("INSERT INTO interviews")) {
				const { data, error } = await supabase
					.from("interviews")
					.insert({
						user_id: params[0],
						job_application_id: params[1],
						company_name: params[2],
						position_title: params[3],
						interview_type: params[4],
						scheduled_date: params[5],
						duration_minutes: params[6],
						interviewer_name: params[7],
						interviewer_email: params[8],
						location: params[9],
						meeting_link: params[10],
						status: params[11],
						notes: params[12],
						feedback: params[13],
						rating: params[14],
						job_description: params[15],
						resume_link: params[16],
					})
					.select()
					.single();

				if (error) {
					console.error("❌ Supabase interviews INSERT error:", error);
					throw error;
				}

				console.log(`✅ Interview created with ID: ${data?.id}`);
				return [data];
			}

			// Handle schedule_permissions INSERT
			if (sql.includes("INSERT INTO schedule_permissions")) {
				const { data, error } = await supabase
					.from("schedule_permissions")
					.insert({
						user_id: params[0],
						target_user_id: params[1],
						granted_by: params[2],
						is_active: params[3] || true,
					})
					.select()
					.single();

				if (error) {
					console.error("❌ Supabase schedule_permissions INSERT error:", error);
					throw error;
				}

				console.log(`✅ Schedule permission created with ID: ${data?.id}`);
				return [data];
			}

			// Handle other INSERT queries
			console.log("⚠️ Unsupported INSERT query:", sql);
			throw new Error("Unsupported INSERT query type");
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
