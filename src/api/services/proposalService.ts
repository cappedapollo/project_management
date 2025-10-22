import type { ProposalInfo } from "@/types/entity";
import apiClient from "../apiClient";

interface ApiResponse {
	success: boolean;
	error?: string;
	[key: string]: any;
}

const createAndUpdateProposal = async (proposal: Partial<ProposalInfo>) => {
	try {
		const method = proposal.id ? "put" : "post";
		const url = proposal.id ? `/proposals/${proposal.id}` : "/proposals";

		const data = {
			profile: proposal.profile,
			jobDescription: proposal.job_description,
			company: proposal.company,
			jobLink: proposal.job_link,
			coverLetter: proposal.cover_letter,
			resume: proposal.resume,
			resume_pdf_path: proposal.resume_pdf_path,
			status: proposal.status || "applied",
			saved_resume_id: proposal.saved_resume_id || null,
			// Only send appliedDate if it's provided, let the backend use default
			...(proposal.applied_date && { appliedDate: proposal.applied_date }),
		};

		// Removed console logging to reduce noise

		const response = await apiClient[method]<ApiResponse>({
			url,
			data,
		});

		if (response.success) {
			return { id: response.proposal.id };
		}

		throw new Error("Failed to save proposal");
	} catch (error: any) {
		console.error("Save proposal error:", error);
		throw new Error(error.response?.data?.error || error.message || "Failed to save proposal");
	}
};

const getProposalList = async (filters?: {
	userId?: string;
	profileId?: string;
	page?: number;
	limit?: number;
	status?: string;
	company?: string;
	startDate?: string;
	endDate?: string;
}) => {
	try {
		const params = new URLSearchParams();
		if (filters?.userId) params.append("userId", filters.userId);
		if (filters?.profileId) params.append("profileId", filters.profileId);
		if (filters?.page) params.append("page", filters.page.toString());
		if (filters?.limit) params.append("limit", filters.limit.toString());
		if (filters?.status) params.append("status", filters.status);
		if (filters?.company) params.append("company", filters.company);
		if (filters?.startDate) params.append("startDate", filters.startDate);
		if (filters?.endDate) params.append("endDate", filters.endDate);

		const url = `/proposals${params.toString() ? `?${params.toString()}` : ""}`;

		const response = await apiClient.get<ApiResponse>({
			url,
		});

		if (response.success) {
			// Transform backend response to match frontend format
			const transformedProposals = response.proposals.map((proposal: any) => ({
				id: proposal.id,
				profile: proposal.profile,
				user: proposal.user,
				job_description: proposal.jobDescription,
				company: proposal.company,
				job_link: proposal.jobLink,
				cover_letter: proposal.coverLetter,
				resume: proposal.resume,
				resume_pdf_path: proposal.resume_pdf_path,
				status: proposal.status,
				applied_date: proposal.appliedDate,
				created_at: proposal.createdAt,
				updated_at: proposal.updatedAt,
				userInfo: proposal.userInfo,
			}));

			// Removed console logging to reduce noise
			return {
				proposals: transformedProposals,
				pagination: response.pagination,
			};
		}

		throw new Error("Failed to fetch proposals");
	} catch (error: any) {
		console.error("Get proposals error:", error);
		throw new Error(error.response?.data?.error || error.message || "Failed to fetch proposals");
	}
};

const getProposalById = async (proposalId: string) => {
	try {
		const response = await apiClient.get<ApiResponse>({
			url: `/proposals/${proposalId}`,
		});

		if (response.success) {
			// Transform backend response to match frontend format
			const proposal = {
				id: response.proposal.id,
				profile: response.proposal.profile,
				user: response.proposal.user,
				job_description: response.proposal.jobDescription,
				company: response.proposal.company,
				job_link: response.proposal.jobLink,
				cover_letter: response.proposal.coverLetter,
				resume: response.proposal.resume,
				status: response.proposal.status,
				applied_date: response.proposal.appliedDate,
				created_at: response.proposal.createdAt,
				updated_at: response.proposal.updatedAt,
				userInfo: response.proposal.userInfo,
			};

			// Proposal fetched successfully
			return proposal;
		}

		throw new Error("Failed to fetch proposal");
	} catch (error: any) {
		console.error("Get proposal error:", error);
		throw new Error(error.response?.data?.error || error.message || "Failed to fetch proposal");
	}
};

const deleteProposal = async ({ proposalId, proposalIds }: { proposalId?: string; proposalIds?: string[] }) => {
	try {
		if (proposalId) {
			const response = await apiClient.delete<ApiResponse>({
				url: `/proposals/${proposalId}`,
			});

			if (response.success) {
				// Removed console logging to reduce noise
				return { deletedId: proposalId };
			}

			throw new Error("Failed to delete proposal");
		}

		if (proposalIds?.length) {
			// For bulk delete, we'll need to make multiple requests
			// Backend doesn't support bulk delete in single request
			const deletePromises = proposalIds.map((id) =>
				apiClient.delete<ApiResponse>({
					url: `/proposals/${id}`,
				}),
			);

			const results = await Promise.allSettled(deletePromises);
			const failedDeletes = results.filter((result) => result.status === "rejected");

			if (failedDeletes.length > 0) {
				console.warn(`Failed to delete ${failedDeletes.length} proposals`);
			}

			// Removed console logging to reduce noise
			return { deletedIds: proposalIds };
		}

		throw new Error("No proposal ID(s) provided");
	} catch (error: any) {
		console.error("Delete proposal error:", error);
		throw new Error(error.response?.data?.error || error.message || "Failed to delete proposal");
	}
};

export default {
	createAndUpdateProposal,
	getProposalList,
	getProposalById,
	deleteProposal,
};
