// Vercel Serverless Function Entry Point
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create and configure Express app
async function createApp() {
	const app = express();

	// CORS configuration for Vercel
	app.use(
		cors({
			origin: process.env.CORS_ORIGIN || "*",
			credentials: true,
		}),
	);

	app.use(express.json({ limit: "10mb" }));
	app.use(express.urlencoded({ extended: true, limit: "10mb" }));

	// Import your existing routes from backend
	try {
		// Import dashboard routes
		const { default: dashboardRoutes } = await import("../backend/dashboard.js");

		// Health check endpoint
		app.get("/api/health", (req, res) => {
			res.json({
				status: "healthy",
				timestamp: new Date().toISOString(),
				environment: process.env.NODE_ENV || "development",
			});
		});

		// Mount dashboard routes
		app.use("/api", dashboardRoutes);
	} catch (error) {
		console.error("Error loading backend routes:", error);

		// Fallback routes
		app.get("/api/health", (req, res) => {
			res.json({ status: "healthy", message: "Backend routes not loaded" });
		});

		app.get("/api/*", (req, res) => {
			res.status(503).json({
				error: "Backend services temporarily unavailable",
				message: "Please check configuration",
			});
		});
	}

	// Error handling middleware
	app.use((error, req, res, next) => {
		console.error("API Error:", error);
		res.status(500).json({
			error: "Internal server error",
			message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
		});
	});

	// 404 handler
	app.use("*", (req, res) => {
		res.status(404).json({ error: "API endpoint not found" });
	});

	return app;
}

// Export for Vercel
export default createApp();
