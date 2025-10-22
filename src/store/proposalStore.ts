// Temporary proposalStore replacement to maintain compatibility
// Components should migrate to use proposalService directly

import proposalService from "@/api/services/proposalService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useGetProposalList = (filters?: any) => {
	return useQuery({
		queryKey: ["proposals", filters],
		queryFn: () => proposalService.getProposalList(filters),
	});
};

export const useUpdateProposal = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (proposal: any) => proposalService.createAndUpdateProposal(proposal),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["proposals"] });
		},
	});
};

export const useDeleteProposal = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ proposalId, proposalIds }: { proposalId?: string; proposalIds?: string[] }) => proposalService.deleteProposal({ proposalId, proposalIds }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["proposals"] });
		},
	});
};
