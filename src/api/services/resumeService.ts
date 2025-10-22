import apiClient from "../apiClient";

interface ApiResponse {
	success: boolean;
	error?: string;
	[key: string]: any;
}

export interface SavedResume {
	id: string;
	user: string;
	profile: string;
	original_resume: string;
	modified_resume: string;
	job_description: string;
	company?: string;
	job_link?: string;
	resume_json?: string; // Structured JSON data for the resume
	created_at: string;
	updated_at: string;
	// Job application info (when linked to applications)
	proposalId?: string;
	applicationStatus?: string;
	appliedDate?: string;
	proposalCompany?: string;
}

const createAndUpdateSavedResume = async (resume: Partial<SavedResume>) => {
	try {
		const method = resume.id ? "put" : "post";
		const url = resume.id ? `/saved-resumes/${resume.id}` : "/saved-resumes";

		const data = {
			user: resume.user,
			profile: resume.profile,
			originalResume: resume.original_resume,
			modifiedResume: resume.modified_resume,
			jobDescription: resume.job_description,
			company: resume.company,
			jobLink: resume.job_link,
			resumeJson: resume.resume_json, // Add JSON data to the request
		};

		// Remove undefined values to avoid sending them to the backend
		for (const key of Object.keys(data)) {
			if ((data as any)[key] === undefined) {
				delete (data as any)[key];
			}
		}

		// Sending resume data to API

		const response = await apiClient[method]<ApiResponse>({
			url,
			data,
		});

		if (response.success) {
			// Resume saved successfully
			return { id: response.savedResume.id };
		}

		throw new Error("Failed to save resume");
	} catch (error: any) {
		console.error("Save resume error:", error);
		throw new Error(error.response?.data?.error || error.message || "Failed to save resume");
	}
};

const getSavedResumeList = async (filters?: {
	userId?: string;
	profileId?: string;
	page?: number;
	limit?: number;
	company?: string;
	jobDescription?: string;
	linkedToApplications?: boolean;
}) => {
	try {
		const params = new URLSearchParams();
		if (filters?.userId) params.append("userId", filters.userId);
		if (filters?.profileId) params.append("profileId", filters.profileId);
		if (filters?.page) params.append("page", filters.page.toString());
		if (filters?.limit) params.append("limit", filters.limit.toString());
		if (filters?.company) params.append("company", filters.company);
		if (filters?.jobDescription) params.append("jobDescription", filters.jobDescription);
		if (filters?.linkedToApplications) params.append("linkedToApplications", filters.linkedToApplications.toString());

		const url = `/saved-resumes${params.toString() ? `?${params.toString()}` : ""}`;

		// Fetching saved resumes

		const response = await apiClient.get<ApiResponse>({
			url,
		});

		if (response.success) {
			// Transform backend response to match frontend format
			const transformedResumes = response.savedResumes.map((resume: any) => ({
				id: resume.id,
				user: resume.user,
				profile: resume.profile,
				original_resume: resume.originalResume,
				modified_resume: resume.modifiedResume,
				job_description: resume.jobDescription,
				company: resume.company,
				job_link: resume.jobLink,
				resume_json: resume.resumeJson, // Transform JSON data
				created_at: resume.createdAt,
				updated_at: resume.updatedAt,
				// Job application info
				proposalId: resume.proposalId,
				applicationStatus: resume.applicationStatus,
				appliedDate: resume.appliedDate,
				proposalCompany: resume.proposalCompany,
			}));

			// Resume data fetched successfully
			return {
				savedResumes: transformedResumes,
				pagination: response.pagination,
			};
		}

		throw new Error("Failed to fetch saved resumes");
	} catch (error: any) {
		console.error("Get saved resumes error:", error);
		throw new Error(error.response?.data?.error || error.message || "Failed to fetch saved resumes");
	}
};

const getSavedResumeById = async (resumeId: string) => {
	try {
		const response = await apiClient.get<ApiResponse>({
			url: `/saved-resumes/${resumeId}`,
		});

		if (response.success) {
			// Transform backend response to match frontend format
			const resume = {
				id: response.savedResume.id,
				user: response.savedResume.user,
				profile: response.savedResume.profile,
				original_resume: response.savedResume.originalResume,
				modified_resume: response.savedResume.modifiedResume,
				job_description: response.savedResume.jobDescription,
				company: response.savedResume.company,
				job_link: response.savedResume.jobLink,
				resume_json: response.savedResume.resumeJson, // Transform JSON data
				created_at: response.savedResume.createdAt,
				updated_at: response.savedResume.updatedAt,
			};

			// Resume fetched successfully
			return resume;
		}

		throw new Error("Failed to fetch saved resume");
	} catch (error: any) {
		console.error("Get saved resume error:", error);
		throw new Error(error.response?.data?.error || error.message || "Failed to fetch saved resume");
	}
};

const deleteSavedResume = async ({ resumeId, resumeIds }: { resumeId?: string; resumeIds?: string[] }) => {
	try {
		if (resumeId) {
			const response = await apiClient.delete<ApiResponse>({
				url: `/saved-resumes/${resumeId}`,
			});

			if (response.success) {
				// Resume deleted successfully
				return { deletedId: resumeId };
			}

			throw new Error("Failed to delete saved resume");
		}

		if (resumeIds?.length) {
			// For bulk delete, we'll need to make multiple requests
			const deletePromises = resumeIds.map((id) =>
				apiClient.delete<ApiResponse>({
					url: `/saved-resumes/${id}`,
				}),
			);

			const results = await Promise.allSettled(deletePromises);
			const failedDeletes = results.filter((result) => result.status === "rejected");

			if (failedDeletes.length > 0) {
				console.warn(`Failed to delete ${failedDeletes.length} saved resumes`);
			}

			// Resumes deleted successfully
			return { deletedIds: resumeIds };
		}

		throw new Error("No saved resume ID(s) provided");
	} catch (error: any) {
		console.error("Delete saved resume error:", error);
		throw new Error(error.response?.data?.error || error.message || "Failed to delete saved resume");
	}
};

const getResumeFileContent = async (filePath: string) => {
	try {
		const encodedPath = encodeURIComponent(filePath);
		const response = await apiClient.get<ApiResponse>({
			url: `/resume-files/${encodedPath}`,
		});

		if (response.success) {
			// Resume file content fetched successfully
			return response.content;
		}

		throw new Error("Failed to fetch resume file content");
	} catch (error: any) {
		console.error("Get resume file content error:", error);
		throw new Error(error.response?.data?.error || error.message || "Failed to fetch resume file content");
	}
};

const getResumeTemplates = async () => {
	// Mock implementation - replace with actual API call
	return [];
};

const getLocalResumeTemplates = async () => {
	// Mock implementation - replace with actual local storage logic
	return [];
};

export default {
	createAndUpdateSavedResume,
	getSavedResumeList,
	getSavedResumeById,
	deleteSavedResume,
	getResumeFileContent,
	getResumeTemplates,
	getLocalResumeTemplates,
};
