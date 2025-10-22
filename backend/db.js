// Import Supabase client instead of MySQL
const { supabase, query, testConnection } = require("./supabase");

// Export the same interface for backward compatibility
module.exports = {
	supabase, // Supabase client
	query, // Query function (adapted for Supabase)
	testConnection, // Connection test function
};
