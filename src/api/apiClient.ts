import { GLOBAL_CONFIG } from "@/global-config";
import { t } from "@/locales/i18n";
import userStore from "@/store/userStore";
import axios, { type AxiosRequestConfig, type AxiosError, type AxiosResponse } from "axios";
import { toast } from "sonner";

const axiosInstance = axios.create({
	baseURL: GLOBAL_CONFIG.apiBaseUrl,
	timeout: 50000,
});

axiosInstance.interceptors.request.use(
	(config) => {
		// Get the access token from userStore
		const userState = userStore.getState();
		const accessToken = userState.userToken?.access_token;

		// Reduced logging to minimize console noise

		// Add Authorization header if token exists
		if (accessToken) {
			// Check if token is expired before using it
			try {
				const payload = JSON.parse(atob(accessToken.split(".")[1]));
				const currentTime = Date.now() / 1000;

				if (payload.exp < currentTime) {
					// Token is expired, clear it and redirect
					console.log("🔒 Token expired, clearing storage and redirecting to login");
					userStore.getState().actions.clearUserInfoAndToken();
					localStorage.clear();
					sessionStorage.clear();
					window.location.href = "/auth/login";
					return config;
				}

				config.headers.Authorization = `Bearer ${accessToken}`;
			} catch (error) {
				// Invalid token format, clear it
				console.log("🔒 Invalid token format, clearing storage and redirecting to login");
				userStore.getState().actions.clearUserInfoAndToken();
				localStorage.clear();
				sessionStorage.clear();
				window.location.href = "/auth/login";
				return config;
			}
		}

		// Set Content-Type header only for non-FormData requests
		if (!(config.data instanceof FormData)) {
			config.headers["Content-Type"] = "application/json;charset=utf-8";
		}

		return config;
	},
	(error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
	(res: AxiosResponse<any>) => {
		// API response processed silently
		// Backend returns direct response format
		return res.data;
	},
	(error: AxiosError<any>) => {
		const { response, message } = error || {};
		const errMsg = response?.data?.error || message || t("sys.api.errorMessage");

		// Only log detailed errors in development mode
		if (import.meta.env.DEV) {
			console.log(`API Error: ${response?.status} - ${errMsg}`);
		}

		// Don't show toast for 401/403 errors to avoid multiple notifications
		if (response?.status !== 401 && response?.status !== 403) {
			toast.error(errMsg, { position: "top-center" });
		}

		// Handle both 401 (Unauthorized) and 403 (Forbidden/Invalid Token) errors
		if (response?.status === 401 || response?.status === 403) {
			if (import.meta.env.DEV) {
				console.log(
					`🔒 ${response?.status} ${response?.status === 401 ? "Unauthorized" : "Invalid/Expired Token"} - clearing user data and redirecting to login`,
				);
			}

			// Clear user token and info
			userStore.getState().actions.clearUserInfoAndToken();

			// Redirect to login page
			window.location.href = "/auth/login";
		}

		return Promise.reject(error);
	},
);

class APIClient {
	get<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return this.request<T>({ ...config, method: "GET" });
	}
	post<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return this.request<T>({ ...config, method: "POST" });
	}
	put<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return this.request<T>({ ...config, method: "PUT" });
	}
	delete<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return this.request<T>({ ...config, method: "DELETE" });
	}
	request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return axiosInstance.request<any, T>(config);
	}
}

export default new APIClient();
