import Logo from "@/assets/icons/ic-logo-static.svg";
import { QueryClientProvider } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/react-query";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { useEffect } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { MotionLazy } from "./components/animate/motion-lazy";
import { RouteLoadingProgress } from "./components/loading";
import { GlobalNotificationProvider } from "./components/notifications/GlobalNotificationProvider";
import Toast from "./components/toast";
import { GLOBAL_CONFIG } from "./global-config";
import { AntdAdapter } from "./theme/adapter/antd.adapter";
import { ThemeProvider } from "./theme/theme-provider";

// React-scan removed - not installed as dependency
// if (import.meta.env.DEV) {
// 	import("react-scan").then(({ scan }) => {
// 		scan({
// 			enabled: false,
// 			showToolbar: false,
// 			log: false,
// 			animationSpeed: "fast",
// 		});
// 	});
// }

// Create a QueryClient with default options
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000, // 5 minutes
			gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
			retry: 1,
			refetchOnWindowFocus: false,
		},
		mutations: {
			retry: 1,
		},
	},
});

function App({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		// One-time check for expired tokens on app load
		const checkAndClearExpiredTokens = () => {
			try {
				const userStore = localStorage.getItem("userStore");
				if (userStore) {
					const parsed = JSON.parse(userStore);
					const token = parsed?.state?.userToken?.access_token;

					if (token) {
						const payload = JSON.parse(atob(token.split(".")[1]));
						const currentTime = Date.now() / 1000;

						if (payload.exp < currentTime) {
							console.log("🔒 Expired token detected on app load, clearing all storage");
							localStorage.clear();
							sessionStorage.clear();
							window.location.href = "/auth/login";
						}
					}
				}
			} catch (error) {
				console.log("🔒 Invalid token detected on app load, clearing all storage");
				localStorage.clear();
				sessionStorage.clear();
				window.location.href = "/auth/login";
			}
		};

		checkAndClearExpiredTokens();
	}, []);

	return (
		<HelmetProvider>
			<QueryClientProvider client={queryClient}>
				<ThemeProvider adapters={[AntdAdapter]}>
					<GlobalNotificationProvider>
						<VercelAnalytics debug={import.meta.env.PROD} />
						<Helmet>
							<title>{GLOBAL_CONFIG.appName}</title>
							<link rel="icon" href={Logo} />
						</Helmet>
						<Toast />
						<RouteLoadingProgress />
						<MotionLazy>{children}</MotionLazy>
					</GlobalNotificationProvider>
				</ThemeProvider>
			</QueryClientProvider>
		</HelmetProvider>
	);
}

export default App;
