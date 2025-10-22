import { useUserInfo, useUserToken } from "@/store/userStore";

/**
 * Auth hook that provides user information and authentication status
 */
export const useAuth = () => {
	const userInfo = useUserInfo();
	const { access_token } = useUserToken();

	return {
		user: userInfo,
		isAuthenticated: !!access_token,
		access_token,
	};
};

/**
 * permission/role check hook
 * @param baseOn - check type: 'role' or 'permission'
 *
 * @example
 * // permission check
 * const { check, checkAny, checkAll } = useAuthCheck('permission');
 * check('user.create')
 * checkAny(['user.create', 'user.edit'])
 * checkAll(['user.create', 'user.edit'])
 *
 * @example
 * // role check
 * const { check, checkAny, checkAll } = useAuthCheck('role');
 * check('admin')
 * checkAny(['admin', 'editor'])
 * checkAll(['admin', 'editor'])
 */
export const useAuthCheck = (baseOn: "role" | "permission" = "permission") => {
	const { access_token } = useUserToken();
	const { permissions = [], roles = [] } = useUserInfo();

	// depends on baseOn to select resource pool
	const resourcePool = baseOn === "role" ? roles : permissions;

	// check if item exists
	const check = (item: string): boolean => {
		// if user is not logged in, return false
		if (!access_token) {
			return false;
		}
		return resourcePool.some((p) => p.code === item);
	};

	// check if any item exists
	const checkAny = (items: string[]) => {
		// Auth items processed silently
		if (items.length === 0) {
			return true;
		}
		return items.some((item) => check(item));
	};

	// check if all items exist
	const checkAll = (items: string[]) => {
		if (items.length === 0) {
			return true;
		}
		return items.every((item) => check(item));
	};

	return { check, checkAny, checkAll };
};
