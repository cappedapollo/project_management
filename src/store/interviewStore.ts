import interviewService from "@/api/services/interviewService";
import userStore from "@/store/userStore";
import type { InterviewInfo } from "@/types/entity";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export const useUpdateInterview = () => {
	const updateInterviewMutation = useMutation({
		mutationFn: async (interview: Partial<InterviewInfo>) => {
			const userState = userStore.getState();
			const token = userState.userToken?.access_token;

			if (!token) {
				throw new Error("No access token available");
			}

			return await interviewService.createAndUpdateInterview(interview, token);
		},
		onSuccess: (res) => {
			toast.success("Interview updated successfully.", {
				closeButton: true,
			});
		},
		onError: (err) => {
			toast.error(`Error update interview: ${err.message}`, {
				position: "top-center",
			});
		},
	});

	const updateInterview = async (interview: Partial<InterviewInfo>) => await updateInterviewMutation.mutateAsync(interview);
	return { updateInterview, isLoading: updateInterviewMutation.isPending };
};

export const useGetScheduledResume = () => {
	const getScheduledResumeMutation = useMutation({
		mutationFn: async (interviewId: string) => {
			const userState = userStore.getState();
			const token = userState.userToken?.access_token;

			if (!token) {
				throw new Error("No access token available");
			}

			return await interviewService.getScheduledResume(interviewId, token);
		},
		onError: (err) => {
			toast.error(`Error fetching scheduled resume: ${err.message}`, {
				position: "top-center",
			});
		},
	});

	const getScheduledResume = async (interviewId: string) => await getScheduledResumeMutation.mutateAsync(interviewId);
	return { getScheduledResume, isLoading: getScheduledResumeMutation.isPending, data: getScheduledResumeMutation.data };
};

export const useGetInterviewList = () => {
	const getInterviewListMutation = useMutation({
		mutationFn: async (filters: { profile?: string; user?: string }) => {
			const userState = userStore.getState();
			const token = userState.userToken?.access_token;

			if (!token) {
				throw new Error("No access token available");
			}

			return await interviewService.getInterviewList(token, filters);
		},
		onSuccess: (res) => {},
		onError: (err) => {
			toast.error(`Error fetching interview: ${err.message}`, {
				position: "top-center",
			});
		},
	});

	const getInterviewList = async (profile?: string, user?: string) => await getInterviewListMutation.mutateAsync({ profile, user });
	return { getInterviewList, isLoading: getInterviewListMutation.isPending };
};

export const useDeleteInterview = () => {
	const deleteInterviewMutation = useMutation({
		mutationFn: async (interviewId: string) => {
			const userState = userStore.getState();
			const token = userState.userToken?.access_token;

			if (!token) {
				throw new Error("No access token available");
			}

			return await interviewService.deleteInterview(interviewId, token);
		},
		onSuccess: (res) => {
			toast.success("Interview deleted successfully.", {
				closeButton: true,
			});
		},
		onError: (err) => {
			toast.error(`Error deleting interview: ${err.message}`, {
				position: "top-center",
			});
		},
	});

	const deleteInterview = async (interviewId: string) => await deleteInterviewMutation.mutateAsync(interviewId);
	return { deleteInterview, isLoading: deleteInterviewMutation.isPending };
};
