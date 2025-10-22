// PostgreSQL Database Connection for Supabase
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Create connection pool
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
	max: 10, // Maximum number of connections
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 10000, // Increased from 2s to 10s for serverless
});

// Query function
async function query(text, params) {
	const start = Date.now();
	try {
		const client = await pool.connect();
		try {
			const result = await client.query(text, params);
			const duration = Date.now() - start;
			console.log("Executed query", { text, duration, rows: result.rowCount });
			return result.rows;
		} finally {
			client.release();
		}
	} catch (error) {
		console.error("Database query error:", error);
		throw error;
	}
}

// Get a client from the pool (for transactions)
async function getClient() {
	return await pool.connect();
}

// Test connection
async function testConnection() {
	try {
		// Direct connection test without using the query function
		const client = await pool.connect();
		try {
			const result = await client.query("SELECT NOW() as current_time, version() as postgres_version");
			console.log("Database connected successfully:", result.rows[0]);
			return true;
		} finally {
			client.release();
		}
	} catch (error) {
		console.error("Database connection failed:", error.message);
		console.error("Error details:", {
			code: error.code,
			errno: error.errno,
			syscall: error.syscall,
			hostname: error.hostname,
			address: error.address,
			port: error.port,
		});
		return false;
	}
}

// Graceful shutdown
process.on("SIGINT", async () => {
	console.log("Closing database pool...");
	await pool.end();
	process.exit(0);
});

export { pool, query, getClient, testConnection };
