import profileService from "@/api/services/profileService";
import type { ProfileInfo } from "@/types/entity";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export interface ProfileInfoRequest {
	id?: string;
	name: string;
	dob: string;
	gender: string;
	phone: string;
	email: string;
	job_sites: string;
	country: string;
	user?: string;
}

export const useUpdateProfile = () => {
	const updateProfileMutation = useMutation({
		mutationFn: ({ profile, token, userId }: { profile: Partial<ProfileInfo>; token: string; userId?: string }) =>
			profileService.createAndUpdateProfile(profile, token, userId),
		onSuccess: (res) => {
			toast.success("Profile updated successfully.", {
				closeButton: true,
			});
		},
		onError: (err) => {
			toast.error(`Error update profile: ${err.message}`, {
				position: "top-center",
			});
		},
	});

	const updateProfile = async (profile: Partial<ProfileInfo>, token: string, userId?: string) =>
		await updateProfileMutation.mutateAsync({ profile, token, userId });
	return { updateProfile, isLoading: updateProfileMutation.isPending };
};

export const useGetProfileList = () => {
	const getProfileListMutation = useMutation({
		mutationFn: ({ token, userId }: { token: string; userId?: string }) => profileService.getProfileList(token, userId),
		onSuccess: (res) => {},
		onError: (err) => {
			toast.error(`Error fetching profile: ${err.message}`, {
				position: "top-center",
			});
		},
	});

	const getProfileList = async (token: string, userId?: string) => await getProfileListMutation.mutateAsync({ token, userId });
	return { getProfileList, isLoading: getProfileListMutation.isPending };
};

export const useGetUserProfile = () => {
	const getUserProfileMutation = useMutation({
		mutationFn: ({ userId, token }: { userId: string; token: string }) => profileService.getUserProfile(userId, token),
		onSuccess: (res) => {},
		onError: (err) => {
			toast.error(`Error fetching user profile: ${err.message}`, {
				position: "top-center",
			});
		},
	});

	const getUserProfile = async (userId: string, token: string) => await getUserProfileMutation.mutateAsync({ userId, token });
	return { getUserProfile, isLoading: getUserProfileMutation.isPending };
};

export const useDeleteProfile = () => {
	const deleteProfileMutation = useMutation({
		mutationFn: ({ userId, token }: { userId: string; token: string }) => profileService.deleteProfile(userId, token),
		onSuccess: (res) => {
			toast.success("Profile deleted successfully.", {
				closeButton: true,
			});
		},
		onError: (err) => {
			toast.error(`Error deleting profile: ${err.message}`, {
				position: "top-center",
			});
		},
	});

	const deleteProfile = async (userId: string, token: string) => await deleteProfileMutation.mutateAsync({ userId, token });
	return { deleteProfile, isLoading: deleteProfileMutation.isPending };
};
