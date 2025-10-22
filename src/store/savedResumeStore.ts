import savedResumeService, { type SavedResume } from "@/api/services/resumeService";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export const useUpdateSavedResume = () => {
	const updateSavedResumeMutation = useMutation({
		mutationFn: savedResumeService.createAndUpdateSavedResume,
		onSuccess: (res) => {
			toast.success("Resume saved successfully.", {
				closeButton: true,
			});
		},
		onError: (err) => {
			toast.error(`Error saving resume: ${err.message}`, {
				position: "top-center",
			});
		},
	});

	const updateSavedResume = async (resume: Partial<SavedResume>) => await updateSavedResumeMutation.mutateAsync(resume);
	return { updateSavedResume, isLoading: updateSavedResumeMutation.isPending };
};

export const useGetSavedResumeList = (filters?: {
	userId?: string;
	profileId?: string;
	page?: number;
	limit?: number;
	company?: string;
	jobDescription?: string;
	linkedToApplications?: boolean;
}) => {
	const query = useQuery({
		queryKey: ["saved-resumes", filters],
		queryFn: () => savedResumeService.getSavedResumeList(filters),
		enabled: !!filters?.userId, // Only enable when userId is available
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 5 * 60 * 1000, // 5 minutes
		refetchOnWindowFocus: false,
		// Error handling moved to component level
	});

	return {
		getSavedResumeList: query.refetch,
		isLoading: query.isLoading,
		data: query.data,
		error: query.error,
	};
};

export const useGetSavedResumeById = (resumeId: string) => {
	const query = useQuery({
		queryKey: ["saved-resume", resumeId],
		queryFn: () => savedResumeService.getSavedResumeById(resumeId),
		enabled: !!resumeId,
		staleTime: 2 * 60 * 1000,
		gcTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		// Error handling moved to component level
	});

	return {
		getSavedResumeById: query.refetch,
		isLoading: query.isLoading,
		data: query.data,
		error: query.error,
	};
};

export const useDeleteSavedResume = () => {
	const deleteSavedResumeMutation = useMutation({
		mutationFn: savedResumeService.deleteSavedResume,
		onSuccess: (res) => {
			toast.success("Saved resume deleted successfully.", {
				closeButton: true,
			});
		},
		onError: (err) => {
			toast.error(`Error deleting saved resume: ${err.message}`, {
				position: "top-center",
			});
		},
	});

	const deleteSavedResume = async (resumeId?: string, resumeIds?: string[]) => await deleteSavedResumeMutation.mutateAsync({ resumeId, resumeIds });

	return { deleteSavedResume, isLoading: deleteSavedResumeMutation.isPending };
};
