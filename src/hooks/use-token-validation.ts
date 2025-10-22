import { useRouter } from "@/routes/hooks";
import { useUserToken } from "@/store/userStore";
import { useEffect } from "react";

// Utility function to check if JWT token is expired
const isTokenExpired = (token: string): boolean => {
	try {
		const payload = JSON.parse(atob(token.split(".")[1]));
		const currentTime = Date.now() / 1000;
		// Add a 5-minute buffer to handle clock skew (subtract from expiry time)
		return payload.exp - 300 < currentTime;
	} catch (error) {
		// If we can't parse the token, consider it invalid
		return true;
	}
};

/**
 * Hook to periodically validate JWT token and redirect to login if expired
 */
export const useTokenValidation = () => {
	const { access_token } = useUserToken();
	const router = useRouter();

	useEffect(() => {
		if (!access_token) return;

		// Check token immediately
		if (isTokenExpired(access_token)) {
			if (import.meta.env.DEV) {
				console.log("🔒 Token expired, redirecting to login");
			}
			// Clear the expired token
			import("@/store/userStore").then(({ default: userStore }) => {
				userStore.getState().actions.clearUserInfoAndToken();
			});
			router.replace("/auth/login");
			return;
		}

		// Set up periodic validation (every 5 minutes)
		const interval = setInterval(
			() => {
				if (access_token && isTokenExpired(access_token)) {
					if (import.meta.env.DEV) {
						console.log("🔒 Token expired during session, redirecting to login");
					}
					// Clear the expired token
					import("@/store/userStore").then(({ default: userStore }) => {
						userStore.getState().actions.clearUserInfoAndToken();
					});
					router.replace("/auth/login");
				}
			},
			5 * 60 * 1000,
		); // Check every 5 minutes

		return () => clearInterval(interval);
	}, [access_token, router]);
};
