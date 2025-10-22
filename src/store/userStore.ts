import { useMutation } from "@tanstack/react-query";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import userService, { type AuthReq, type SignInReq } from "@/api/services/userService";

import { GLOBAL_CONFIG } from "@/global-config";
import { useRouter } from "@/routes/hooks";
import type { UserInfo, UserToken } from "@/types/entity";
import { StorageEnum } from "@/types/enum";
import { faker } from "@faker-js/faker";
import { useNavigate } from "react-router";
import { toast } from "sonner";

type UserStore = {
	userInfo: Partial<UserInfo>;
	userToken: UserToken;

	actions: {
		setUserInfo: (userInfo: UserInfo) => void;
		setUserToken: (token: UserToken) => void;
		clearUserInfoAndToken: () => void;
	};
};

const useUserStore = create<UserStore>()(
	persist(
		(set) => ({
			userInfo: {},
			userToken: {},
			actions: {
				setUserInfo: (userInfo) => {
					set({ userInfo });
				},
				setUserToken: (userToken) => {
					set({ userToken });
				},
				clearUserInfoAndToken() {
					set({ userInfo: {}, userToken: {} });
				},
			},
		}),
		{
			name: "userStore", // name of the item in the storage (must be unique)
			storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
			partialize: (state) => ({
				[StorageEnum.UserInfo]: state.userInfo,
				[StorageEnum.UserToken]: state.userToken,
			}),
		},
	),
);

export const useUserInfo = () => useUserStore((state) => state.userInfo);
export const useUserToken = () => useUserStore((state) => state.userToken);
export const useUserPermissions = () => useUserStore((state) => state.userInfo.permissions || []);
export const useUserRoles = () => useUserStore((state) => state.userInfo.roles || []);
export const useUserActions = () => useUserStore((state) => state.actions);

export const useSignIn = () => {
	const { setUserToken, setUserInfo } = useUserActions();
	const navigate = useNavigate();

	const signInMutation = useMutation({
		mutationFn: userService.signin,
		onSuccess: (res) => {
			const { user, session } = res;

			if (!user || !session) {
				toast.error("Invalid sign-in response");
				return;
			}

			const { access_token, refresh_token } = session || {};

			// Login success - tokens set securely

			setUserToken({ access_token, refresh_token });

			// Store debug info
			localStorage.setItem(
				"loginDebug",
				JSON.stringify({
					timestamp: new Date().toISOString(),
					tokenSet: true,
					accessTokenPreview: access_token ? `${access_token.substring(0, 20)}...` : "No token",
					userId: user.id,
				}),
			);
			const userInfo: UserInfo = {
				id: user.id,
				email: user.email,
				username: user.username ?? "",
				country: user.country ?? "",
				summary: user.summary ?? "",
				avatar: faker.image.avatarGitHub(),
				role: user.role, // Set the role directly
				permissions: [
					{
						id: "role_permission",
						name: "role_permission",
						code: user.role === 0 ? "permission:admin" : user.role === 2 ? "permission:caller" : "permission:user",
					},
				],

				app_metadata: user.app_metadata,
				user_metadata: user.user_metadata,
				aud: user.aud,
				created_at: user.created_at,
			};
			setUserInfo(userInfo);

			toast.success("Sign in success!", {
				closeButton: true,
			});

			navigate(GLOBAL_CONFIG.defaultRoute, { replace: true });
		},
		onError: (err: any) => {
			toast.error(err.message, {
				position: "top-center",
			});
		},
	});

	const signIn = async (data: AuthReq) => await signInMutation.mutateAsync(data);

	return { signIn, isLoading: signInMutation.isPending };
};

export const useForgotPassword = () => {
	const forgotPasswordMutation = useMutation({
		mutationFn: userService.forgotPassword,
		onSuccess: (res) => {
			toast.success(res, {
				closeButton: true,
			});
		},
		onError: (err) => {
			toast.error(`Error sending reset link: ${err.message}`, {
				position: "top-center",
			});
		},
	});

	const forgotPassword = async (email: string) => await forgotPasswordMutation.mutateAsync(email);
	return { forgotPassword, isLoading: forgotPasswordMutation.isPending };
};

export const useUpdatePassword = () => {
	const navigate = useNavigate();

	const updatePasswordMutation = useMutation({
		mutationFn: ({ newPassword, userId, token }: { newPassword: string; userId: string; token: string }) => {
			return userService.updatePassword(newPassword, userId, token);
		},
		onSuccess: (res) => {
			toast.success(res, {
				closeButton: true,
			});
			navigate(GLOBAL_CONFIG.defaultRoute, { replace: true });
		},
		onError: (err) => {
			toast.error(`Error reset password: ${err.message}`, {
				position: "top-center",
			});
		},
	});

	const updatePassword = async (newPassword: string, userId: string, token: string) => await updatePasswordMutation.mutateAsync({ newPassword, userId, token });
	return { updatePassword, isLoading: updatePasswordMutation.isPending };
};

export const useUpdateUserProfile = () => {
	const { id } = useUserInfo();
	const { setUserInfo } = useUserActions();

	const updateProfileMutation = useMutation({
		mutationFn: ({ profile, userId, token }: { profile: Partial<UserInfo>; userId: string; token: string }) =>
			userService.updateProfile(profile, userId, token),
		onSuccess: (res) => {
			setUserInfo(res);
			toast.success("User profile updated successfully.", {
				closeButton: true,
			});
		},
		onError: (err) => {
			toast.error(`Error update user profile: ${err.message}`, {
				position: "top-center",
			});
		},
	});

	const updateProfile = async (profile: Partial<UserInfo>, userId: string, token: string) =>
		await updateProfileMutation.mutateAsync({ profile, userId, token });
	return { updateProfile, isLoading: updateProfileMutation.isPending };
};

export const useGetUserList = () => {
	const getUserListMutation = useMutation({
		mutationFn: userService.getUserList,
		onSuccess: (res) => {},
		onError: (err) => {
			toast.error(`Error fetching users: ${err.message}`, {
				position: "top-center",
			});
		},
	});

	const getUserList = async () => await getUserListMutation.mutateAsync("");
	return { getUserList, isLoading: getUserListMutation.isPending };
};

export const useDeleteUser = () => {
	const router = useRouter();

	const deleteUserMutation = useMutation({
		mutationFn: ({ userId, token }: { userId: string; token: string }) => userService.deleteUser(userId, token),
		onSuccess: (res) => {
			toast.success("User deleted successfully.", {
				closeButton: true,
			});
			router.reload();
		},
		onError: (err) => {
			toast.error(`Error delete user: ${err.message}`, {
				position: "top-center",
			});
		},
	});

	const deleteUser = async (userId: string, token: string) => await deleteUserMutation.mutateAsync({ userId, token });
	return { deleteUser, isLoading: deleteUserMutation.isPending };
};

export default useUserStore;
