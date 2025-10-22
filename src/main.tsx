import "./global.css";
import "./theme/theme.css";
import "./locales/i18n";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import { Outlet, RouterProvider, createBrowserRouter } from "react-router";
import App from "./App";
import menuService from "./api/services/menuService";
import { registerLocalIcons } from "./components/icon";
import { GLOBAL_CONFIG } from "./global-config";
import PageError from "./pages/sys/error/PageError";
import { routesSection } from "./routes/sections";
import { urlJoin } from "./utils";

await registerLocalIcons();
// await worker.start({ onUnhandledRequest: "bypass", serviceWorker: { url: urlJoin(GLOBAL_CONFIG.publicPath, "mockServiceWorker.js") } });

// Note: Database setup is handled server-side only
// Admin user creation is done via separate script: node createAdmin.js

// Temporarily disable menu loading to prevent infinite loading
// if (GLOBAL_CONFIG.routerMode === "backend") {
// 	try {
// 		await menuService.getMenuList();
// 	} catch (error) {
// 		console.warn("Failed to load menu list:", error);
// 		// Continue with app initialization even if menu loading fails
// 	}
// }

const router = createBrowserRouter(
	[
		{
			Component: () => (
				<App>
					<Outlet />
				</App>
			),
			errorElement: <ErrorBoundary fallbackRender={PageError} />,
			children: routesSection,
		},
	],
	{
		basename: GLOBAL_CONFIG.publicPath,
	},
);

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(<RouterProvider router={router} />);
