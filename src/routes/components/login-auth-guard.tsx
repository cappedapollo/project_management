import { useUserToken } from "@/store/userStore";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "../hooks";

type Props = {
	children: React.ReactNode;
};

// Utility function to check if JWT token is expired
const isTokenExpired = (token: string): boolean => {
	try {
		const payload = JSON.parse(atob(token.split(".")[1]));
		const currentTime = Date.now() / 1000;
		// Only consider expired if actually past expiry time (no buffer here for auth guard)
		return payload.exp < currentTime;
	} catch (error) {
		// If we can't parse the token, consider it invalid
		return true;
	}
};

export default function LoginAuthGuard({ children }: Props) {
	const router = useRouter();
	const { access_token } = useUserToken();
	const [isValidating, setIsValidating] = useState(true);

	const check = useCallback(() => {
		if (!access_token) {
			// Only log in development mode
			if (import.meta.env.DEV) {
				console.log("🔒 LoginAuthGuard - No token, redirecting to login");
			}
			router.replace("/auth/login");
			return;
		}

		// Check if token is expired
		if (isTokenExpired(access_token)) {
			if (import.meta.env.DEV) {
				console.log("🔒 LoginAuthGuard - Token expired, redirecting to login");
			}
			// Clear the expired token
			import("@/store/userStore").then(({ default: userStore }) => {
				userStore.getState().actions.clearUserInfoAndToken();
			});
			router.replace("/auth/login");
			return;
		}

		setIsValidating(false);
	}, [router, access_token]);

	useEffect(() => {
		// Add a small delay to allow token to be stored after login
		const timer = setTimeout(() => {
			check();
		}, 200);

		return () => clearTimeout(timer);
	}, [check]);

	// Don't render children if no token or token is expired
	if (!access_token || isValidating) {
		return (
			<div style={{ padding: "20px", background: "#f0f0f0" }}>
				<h3>🔒 Authentication Check</h3>
				<p>{!access_token ? "No access token found." : "Validating token..."} Redirecting to login...</p>
			</div>
		);
	}

	return <>{children}</>;
}
