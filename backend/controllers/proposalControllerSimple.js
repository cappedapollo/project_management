const { query } = require("../db");

// Simplified get all proposals
async function getAllProposals(req, res) {
	try {
		console.log("getAllProposals called");
		console.log("User:", req.user);

		// Simple query for now
		let proposals;
		if (req.user.role === 0) {
			// Admin sees all
			proposals = await query(`
				SELECT p.*, u.username, u.email
				FROM proposals p
				JOIN users u ON p.user = u.id
				ORDER BY p.created_at DESC
				LIMIT 10
			`);
		} else {
			// User sees only their own
			proposals = await query(
				`
				SELECT p.*, u.username, u.email
				FROM proposals p
				JOIN users u ON p.user = u.id
				WHERE p.user = ?
				ORDER BY p.created_at DESC
				LIMIT 10
			`,
				[req.user.id],
			);
		}

		console.log("Proposals found:", proposals.length);

		res.json({
			success: true,
			proposals: proposals.map((proposal) => ({
				id: proposal.id,
				user: proposal.user,
				profile: proposal.profile,
				jobDescription: proposal.job_description,
				company: proposal.company,
				jobLink: proposal.job_link,
				coverLetter: proposal.cover_letter,
				resume: proposal.resume,
				status: proposal.status,
				appliedDate: proposal.applied_date,
				createdAt: proposal.created_at,
				updatedAt: proposal.updated_at,
				userInfo: {
					username: proposal.username,
					email: proposal.email,
				},
			})),
			pagination: {
				page: 1,
				limit: 10,
				total: proposals.length,
				pages: 1,
			},
		});
	} catch (error) {
		console.error("Get all proposals error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

module.exports = {
	getAllProposals,
	getProposalById: async (req, res) => res.status(501).json({ error: "Not implemented" }),
	createProposal: async (req, res) => res.status(501).json({ error: "Not implemented" }),
	updateProposal: async (req, res) => res.status(501).json({ error: "Not implemented" }),
	deleteProposal: async (req, res) => res.status(501).json({ error: "Not implemented" }),
};
