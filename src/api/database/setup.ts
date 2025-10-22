import { hashPassword } from "../utils/auth";
// Database setup script (disabled for Supabase)

// Placeholder functions for compatibility
const executeQuery = async (query: string, params?: any[]): Promise<any[]> => {
	console.warn("executeQuery called but disabled - using Supabase instead");
	return [];
};

const testConnection = async (): Promise<boolean> => {
	console.warn("testConnection called but disabled - using Supabase instead");
	return true;
};

// Check if tables exist
const checkTables = async (): Promise<boolean> => {
	try {
		await executeQuery("SELECT 1 FROM users LIMIT 1");
		await executeQuery("SELECT 1 FROM profiles LIMIT 1");
		await executeQuery("SELECT 1 FROM proposals LIMIT 1");
		await executeQuery("SELECT 1 FROM interviews LIMIT 1");
		return true;
	} catch (error) {
		return false;
	}
};

// Create default admin user
const createDefaultAdmin = async (): Promise<void> => {
	try {
		// Check if admin user already exists
		const existingAdmin = await executeQuery("SELECT id FROM users WHERE role = 0 LIMIT 1");
		if (existingAdmin.length > 0) {
			console.log("Admin user already exists");
			return;
		}

		// Create default admin user
		const adminPassword = await hashPassword("admin123"); // Change this in production
		const adminId = await executeQuery(
			`
      INSERT INTO users (email, username, password_hash, role, status) 
      VALUES (?, ?, ?, ?, ?)
    `,
			["admin@example.com", "admin", adminPassword, 0, 1],
		);

		console.log("Default admin user created:", adminId);
		console.log("Email: admin@example.com");
		console.log("Password: admin123 (CHANGE THIS IN PRODUCTION)");
	} catch (error) {
		console.error("Error creating admin user:", error);
	}
};

// Setup database
export const setupDatabase = async (): Promise<void> => {
	// Skip database setup in browser environment
	if (typeof window !== "undefined") {
		console.log("Database setup skipped in browser environment");
		return;
	}

	console.log("Setting up database...");

	// Test connection
	const connected = await testConnection();
	if (!connected) {
		console.error("Failed to connect to database");
		return;
	}

	// Check if tables exist
	const tablesExist = await checkTables();
	if (!tablesExist) {
		console.log("Tables do not exist. Please run the schema.sql file first.");
		console.log("You can find the schema at: src/api/database/schema.sql");
		return;
	}

	console.log("Database tables verified");

	// Create default admin user
	await createDefaultAdmin();

	console.log("Database setup complete");
};

// Run setup if this file is executed directly
if (import.meta.url.endsWith("setup.ts")) {
	setupDatabase().catch(console.error);
}
