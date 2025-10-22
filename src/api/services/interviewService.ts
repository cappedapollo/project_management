import type { InterviewInfo } from "@/types/entity";
import apiClient from "../apiClient";

interface ApiResponse {
	success: boolean;
	error?: string;
	[key: string]: any;
}

const createAndUpdateInterview = async (interview: Partial<InterviewInfo>, token: string) => {
	try {
		const method = interview.id ? "put" : "post";
		const url = interview.id ? `/interviews/${interview.id}` : "/interviews";

		const data = {
			job_application_id: typeof interview.proposal === "string" ? interview.proposal : interview.proposal?.id,
			company_name: (interview.proposal as any)?.company_name || "",
			position_title: (interview.proposal as any)?.position_title || "",
			interview_type: "video", // Default to video
			scheduled_date: interview.meeting_date,
			duration_minutes: 60, // Default duration
			interviewer_name: interview.interviewer,
			interviewer_email: "", // Will be filled from form
			location: "Online", // Default location
			meeting_link: interview.meeting_link,
			status: interview.progress === 1 ? "completed" : interview.progress === 2 ? "cancelled" : "scheduled",
			notes: interview.notes,
			feedback: interview.feedback,
			rating: null, // Will be filled from form
		};

		const response = await apiClient[method]<any>({
			url,
			headers: {
				Authorization: `Bearer ${token}`,
			},
			data,
		});

		return { id: response.id };
	} catch (error: any) {
		console.error("Save interview error:", error);
		throw new Error(error.response?.data?.error || error.message || "Failed to save interview");
	}
};

const getInterviewList = async (
	token: string,
	filters?: { profile?: string; user?: string; proposal?: string; page?: number; limit?: number; startDate?: string; endDate?: string },
	userRole?: number,
) => {
	try {
		// Determine API endpoint based on user role
		let url: string;
		let isCallerAPI = false;

		if (userRole === 2) {
			// Callers use their special endpoint that respects schedule permissions
			url = "/caller/calls";
			isCallerAPI = true;
		} else {
			// Regular users and admins use the interviews endpoint
			const params = new URLSearchParams();
			if (filters?.page) params.append("page", filters.page.toString());
			if (filters?.limit) params.append("limit", filters.limit.toString());
			if (filters?.profile) params.append("profile", filters.profile);
			if (filters?.user) params.append("user", filters.user);
			if (filters?.proposal) params.append("proposal", filters.proposal);
			if (filters?.startDate) params.append("startDate", filters.startDate);
			if (filters?.endDate) params.append("endDate", filters.endDate);

			url = `/interviews${params.toString() ? `?${params.toString()}` : ""}`;
		}

		const response = await apiClient.get<ApiResponse>({
			url,
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (response.success || response.calls) {
			let rawInterviews: any[];

			if (isCallerAPI) {
				// Caller API returns { calls: [...] }
				rawInterviews = response.calls || [];
			} else {
				// Regular API returns { interviews: [...] }
				rawInterviews = response.interviews || [];
			}

			// Transform backend response to match frontend format
			const transformedInterviews = rawInterviews.map((interview: any) => ({
				id: interview.id,
				proposal: interview.proposal || interview.job_application_id,
				user: interview.user || interview.user_id,
				profile: interview.profile,
				meeting_title: interview.meetingTitle || interview.meeting_title,
				meeting_date: interview.meetingDate || interview.scheduled_date,
				meeting_link: interview.meetingLink || interview.meeting_link,
				interviewer: interview.interviewer || interview.interviewer_name,
				progress: interview.progress,
				job_description: interview.jobDescription || interview.job_description,
				notes: interview.notes,
				feedback: interview.feedback,
				selected_resume_id: interview.selectedResumeId || interview.selected_resume_id,
				resume_link: interview.resumeLink || interview.resume_link,
				created_at: interview.createdAt || interview.created_at,
				updated_at: interview.updatedAt || interview.updated_at,
				userInfo: interview.userInfo,
				proposalInfo: interview.proposalInfo,
				// Additional fields from caller API
				company_name: interview.company_name,
				position_title: interview.position_title,
				username: interview.username,
				full_name: interview.full_name,
				user_email: interview.user_email,
			}));

			// Interview data fetched silently
			return {
				interviews: transformedInterviews,
				pagination: response.pagination,
			};
		}

		throw new Error("Failed to fetch interviews");
	} catch (error: any) {
		console.error("Get interviews error:", error);
		throw new Error(error.response?.data?.error || error.message || "Failed to fetch interviews");
	}
};

const getScheduledResume = async (interviewId: string, token: string) => {
	try {
		const response = await apiClient.get<ApiResponse>({
			url: `/interviews/${interviewId}/scheduled-resume`,
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (response.success) {
			return response.scheduledResume;
		}

		throw new Error("Failed to fetch scheduled resume");
	} catch (error: any) {
		console.error("Get scheduled resume error:", error);
		throw new Error(error.response?.data?.error || error.message || "Failed to fetch scheduled resume");
	}
};

const getInterviewById = async (interviewId: string, token: string) => {
	try {
		const response = await apiClient.get<ApiResponse>({
			url: `/interviews/${interviewId}`,
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (response.success) {
			// Transform backend response to match frontend format
			const interview = {
				id: response.interview.id,
				proposal: response.interview.proposal,
				user: response.interview.user,
				profile: response.interview.profile,
				meeting_title: response.interview.meetingTitle,
				meeting_date: response.interview.meetingDate,
				meeting_link: response.interview.meetingLink,
				interviewer: response.interview.interviewer,
				progress: response.interview.progress,
				job_description: response.interview.jobDescription,
				notes: response.interview.notes,
				feedback: response.interview.feedback,
				created_at: response.interview.createdAt,
				updated_at: response.interview.updatedAt,
				userInfo: response.interview.userInfo,
				proposalInfo: response.interview.proposalInfo,
			};

			// Interview fetched silently
			return interview;
		}

		throw new Error("Failed to fetch interview");
	} catch (error: any) {
		console.error("Get interview error:", error);
		throw new Error(error.response?.data?.error || error.message || "Failed to fetch interview");
	}
};

const deleteInterview = async (interviewId: string, token: string) => {
	try {
		const response = await apiClient.delete<ApiResponse>({
			url: `/interviews/${interviewId}`,
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (response.success !== false) {
			return { deletedId: interviewId };
		}

		throw new Error("Failed to delete interview");
	} catch (error: any) {
		console.error("Delete interview error:", error);
		throw new Error(error.response?.data?.error || error.message || "Failed to delete interview");
	}
};

const updateInterview = async (interviewId: string, updateData: Partial<InterviewInfo>, token: string) => {
	try {
		const data = {
			meetingTitle: updateData.meeting_title,
			meetingDate: updateData.meeting_date,
			meetingLink: updateData.meeting_link,
			interviewer: updateData.interviewer,
			progress: updateData.progress,
			notes: updateData.notes,
			feedback: updateData.feedback,
		};

		const response = await apiClient.put<ApiResponse>({
			url: `/interviews/${interviewId}`,
			headers: {
				Authorization: `Bearer ${token}`,
			},
			data,
		});

		if (response.success) {
			return response.interview;
		}

		throw new Error("Failed to update interview");
	} catch (error: any) {
		console.error("Update interview error:", error);
		throw new Error(error.response?.data?.error || error.message || "Failed to update interview");
	}
};

export default {
	createAndUpdateInterview,
	getInterviewList,
	getInterviewById,
	deleteInterview,
	getScheduledResume,
	updateInterview,
};
