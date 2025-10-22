import packageJson from "../package.json";

/**
 * Global application configuration type definition
 */
export type GlobalConfig = {
	/** Application name */
	appName: string;
	/** Application version number */
	appVersion: string;
	/** Default route path for the application */
	defaultRoute: string;
	/** Public path for static assets */
	publicPath: string;
	/** Base URL for API endpoints */
	apiBaseUrl: string;

	resetPasswordUrl: string;
	/** Routing mode: frontend routing or backend routing */
	routerMode: "frontend" | "backend";

	geminiApiUrl: string;

	geminiApiKey: string;

	openAIUrl: string;

	openAIKey: string;
};

/**
 * Global configuration constants
 * Reads configuration from environment variables and package.json
 *
 * @warning
 * Please don't use the import.meta.env to get the configuration, use the GLOBAL_CONFIG instead
 */
export const GLOBAL_CONFIG: GlobalConfig = {
	appName: "Project Management",
	appVersion: packageJson.version,
	defaultRoute: import.meta.env.VITE_APP_DEFAULT_ROUTE || "/job-dashboard",
	publicPath: import.meta.env.VITE_APP_PUBLIC_PATH || "/",
	apiBaseUrl: import.meta.env.VITE_APP_API_BASE_URL || "/api",
	resetPasswordUrl: import.meta.env.VITE_RESET_PASSWORD_URL || "/auth/reset-password",
	routerMode: import.meta.env.VITE_APP_ROUTER_MODE || "frontend",
	geminiApiUrl: import.meta.env.VITE_GEMINI_API_URL,
	geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
	openAIUrl: import.meta.env.VITE_OPENAI_URL,
	openAIKey: import.meta.env.VITE_OPENAI_KEY,
};
