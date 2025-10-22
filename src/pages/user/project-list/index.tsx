import proposalService from "@/api/services/proposalService";
import { useAuth } from "@/components/auth/use-auth";
import { useGetProposalList } from "@/store/proposalStore";
import { useUserToken } from "@/store/userStore";
import type { ProposalInfo } from "@/types/entity";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { ModernButton } from "@/ui/modern-button";
import { ModernCard } from "@/ui/modern-card";
import { ModernStatsCard } from "@/ui/modern-stats-card";
import { ModernTable, ModernTableBody, ModernTableCell, ModernTableHead, ModernTableHeader, ModernTableRow } from "@/ui/modern-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Text, Title } from "@/ui/typography";
import { Building, Calendar, Edit, ExternalLink, FileText, Filter, Link, Plus, Search } from "lucide-react";
import { m } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import JobApplicationModal from "./job-application-modal";
import SimpleJobApplicationModal from "./simple-job-application-modal";

const defaultProposalValue: ProposalInfo = {
	id: "",
	profile: "",
	user: "",
	job_description: "",
	resume: "",
	job_link: "",
	company: "",
	cover_letter: "",
};

export default function ProjectList() {
	const { user } = useAuth();
	const { access_token } = useUserToken();
	const { getProposalList, isLoading, data, error } = useGetProposalList();
	const [proposals, setProposals] = useState<ProposalInfo[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [filteredProposals, setFilteredProposals] = useState<ProposalInfo[]>([]);

	// Update proposals when data changes
	useEffect(() => {
		if (data) {
			const responseData = data as any;
			if (responseData.proposals && Array.isArray(responseData.proposals)) {
				setProposals(responseData.proposals);
			}
		}
	}, [data]);

	// Simple modal state (replaces the enhanced modal)
	const [simpleModalProps, setSimpleModalProps] = useState({
		formValue: { ...defaultProposalValue },
		title: "New Job Application",
		show: false,
		onOk: async (values: ProposalInfo) => {
			setSimpleModalProps((prev) => ({ ...prev, show: false }));
			// Reload proposals after successful creation/update
			await getProposalList();
			toast.success("Job application created successfully!");
		},
		onCancel: () => {
			setSimpleModalProps((prev) => ({ ...prev, show: false }));
		},
	});

	useEffect(() => {
		if (proposals) {
			let filtered = proposals;

			// Apply search filter
			if (searchQuery) {
				filtered = filtered.filter(
					(proposal) =>
						proposal.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
						proposal.job_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
						proposal.job_link?.toLowerCase().includes(searchQuery.toLowerCase()),
				);
			}

			// Apply status filter
			if (statusFilter !== "all") {
				filtered = filtered.filter((proposal) => proposal.status === statusFilter);
			}

			setFilteredProposals(filtered);
		}
	}, [proposals, searchQuery, statusFilter]);

	const handleCreateNew = () => {
		setSimpleModalProps((prev) => ({
			...prev,
			formValue: {
				...defaultProposalValue,
				id: "", // Ensure no ID for new applications
				user: user?.id || "",
				profile: "6fe1b1c0-8c61-45b8-afe3-cffa60816b16", // Use the actual profile ID from database
			},
			title: "New Job Application",
			show: true,
		}));
	};

	const handleEditJob = (proposal: ProposalInfo) => {
		setSimpleModalProps((prev) => ({
			...prev,
			formValue: proposal,
			title: "Edit Job Application",
			show: true,
		}));
	};

	const handleViewResume = (resumePath: string) => {
		// Get the auth token from the store
		console.log("🔐 Auth token check:", { hasToken: !!access_token, tokenLength: access_token?.length });

		if (!access_token) {
			toast.error("Authentication required to view resume");
			return;
		}

		// Construct the full URL to the resume PDF with auth token as query parameter
		const baseUrl = window.location.origin;
		const fullUrl = `${baseUrl}/api/${resumePath}?token=${encodeURIComponent(access_token)}`;

		console.log("🔗 Opening PDF URL:", fullUrl);

		// Open in new tab
		window.open(fullUrl, "_blank");
	};

	const getStatusBadge = (status: string) => {
		const statusConfig = {
			applied: { label: "Applied", variant: "default" as const },
			interviewing: { label: "Interviewing", variant: "secondary" as const },
			offered: { label: "Offered", variant: "default" as const },
			rejected: { label: "Rejected", variant: "destructive" as const },
		};

		const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.applied;
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString();
	};

	// Calculate statistics
	const stats = {
		total: proposals.length,
		applied: proposals.filter((p) => p.status === "applied").length,
		interviewing: proposals.filter((p) => p.status === "interviewing").length,
		offered: proposals.filter((p) => p.status === "offered").length,
		rejected: proposals.filter((p) => p.status === "rejected").length,
	};

	return (
		<m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-8">
			{/* Header */}
			<m.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
				className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
			>
				<div className="space-y-2">
					<div className="flex items-center gap-3">
						<m.div
							initial={{ scale: 0, rotate: -180 }}
							animate={{ scale: 1, rotate: 0 }}
							transition={{ type: "spring", stiffness: 300, damping: 20 }}
							className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-blue-600 dark:text-blue-400"
						>
							<Building className="h-6 w-6" />
						</m.div>
						<div>
							<Title
								as="h1"
								className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent"
							>
								My Job Applications
							</Title>
							<Text className="text-muted-foreground mt-1">Manage and track your job applications with AI-powered resume optimization</Text>
						</div>
					</div>
				</div>
				<m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
					<ModernButton onClick={handleCreateNew} className="flex items-center gap-2" glow>
						<Plus className="h-4 w-4" />
						New Application
					</ModernButton>
				</m.div>
			</m.div>

			{/* Stats Cards */}
			<m.div
				initial={{ opacity: 0, y: 30 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.3, duration: 0.5 }}
				className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
			>
				<ModernStatsCard
					title="Total Applications"
					value={stats.total}
					icon={<Building className="h-6 w-6" />}
					colorScheme="gray"
					change={{
						value: 12,
						type: "increase",
					}}
				/>
				<ModernStatsCard
					title="Applied"
					value={stats.applied}
					icon={<Building className="h-6 w-6" />}
					colorScheme="blue"
					change={{
						value: 8,
						type: "increase",
					}}
				/>
				<ModernStatsCard
					title="Interviewing"
					value={stats.interviewing}
					icon={<Calendar className="h-6 w-6" />}
					colorScheme="orange"
					change={{
						value: 3,
						type: "increase",
					}}
				/>
				<ModernStatsCard
					title="Offered"
					value={stats.offered}
					icon={<Building className="h-6 w-6" />}
					colorScheme="green"
					change={{
						value: 1,
						type: "increase",
					}}
				/>
			</m.div>

			{/* Filters */}
			<m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
				<ModernCard>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Filter className="h-5 w-5" />
							Filters
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex gap-4">
							<div className="flex-1">
								<div className="relative">
									<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
									<Input
										placeholder="Search by company, job description, or job link..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="pl-10 border-2 hover:border-primary/20 transition-colors"
									/>
								</div>
							</div>
							<Select value={statusFilter} onValueChange={setStatusFilter}>
								<SelectTrigger className="w-[180px] border-2 hover:border-primary/20 transition-colors">
									<SelectValue placeholder="Filter by status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="applied">Applied</SelectItem>
									<SelectItem value="interviewing">Interviewing</SelectItem>
									<SelectItem value="offered">Offered</SelectItem>
									<SelectItem value="rejected">Rejected</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</CardContent>
				</ModernCard>
			</m.div>

			{/* Applications Table */}
			<m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
				<ModernCard className="overflow-hidden">
					<div className="p-6 border-b border-gray-100 dark:border-gray-800">
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
							<div>
								<Title as="h3" className="text-xl font-semibold">
									Job Applications
								</Title>
								<Text className="text-muted-foreground text-sm mt-1">{filteredProposals.length} total applications</Text>
							</div>
						</div>
					</div>
					<div className="overflow-x-auto">
						<ModernTable>
							<ModernTableHeader>
								<ModernTableRow>
									<ModernTableHead>Company</ModernTableHead>
									<ModernTableHead>Job Description</ModernTableHead>
									<ModernTableHead>Status</ModernTableHead>
									<ModernTableHead>Applied Date</ModernTableHead>
									<ModernTableHead>Resume</ModernTableHead>
									<ModernTableHead>Actions</ModernTableHead>
								</ModernTableRow>
							</ModernTableHeader>
							<ModernTableBody>
								{filteredProposals.length === 0 ? (
									<ModernTableRow>
										<ModernTableCell colSpan={6} className="text-center py-12">
											<div className="space-y-3">
												<Building className="h-12 w-12 text-gray-300 mx-auto" />
												<Text className="text-gray-500 font-medium">No job applications found</Text>
												{searchQuery && <Text className="text-sm text-gray-400">Try adjusting your search criteria</Text>}
											</div>
										</ModernTableCell>
									</ModernTableRow>
								) : (
									filteredProposals.map((proposal, index) => (
										<m.tr
											key={proposal.id}
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: index * 0.05 }}
											className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
										>
											<ModernTableCell>
												<div className="flex items-center gap-2">
													<div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
														{(proposal.company || "C")[0].toUpperCase()}
													</div>
													<div className="font-medium">{proposal.company}</div>
												</div>
											</ModernTableCell>
											<ModernTableCell>
												<div className="max-w-xs" title={proposal.job_description}>
													<div className="font-semibold text-gray-900 dark:text-white line-clamp-2 text-sm">
														{proposal.job_description
															? proposal.job_description.substring(0, 120) + (proposal.job_description.length > 120 ? "..." : "")
															: "No description"}
													</div>
													{proposal.job_link && (
														<a
															href={proposal.job_link}
															target="_blank"
															rel="noopener noreferrer"
															className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
														>
															<Link className="h-3 w-3" />
															View Job
														</a>
													)}
												</div>
											</ModernTableCell>
											<ModernTableCell>{getStatusBadge(proposal.status || "applied")}</ModernTableCell>
											<ModernTableCell>
												<div className="flex items-center gap-2">
													<Calendar className="h-4 w-4 text-gray-400" />
													{proposal.created_at ? formatDate(proposal.created_at) : "N/A"}
												</div>
											</ModernTableCell>
											<ModernTableCell>
												{proposal.resume_pdf_path ? (
													<ModernButton
														variant="ghost"
														size="sm"
														onClick={() => handleViewResume(proposal.resume_pdf_path || "")}
														className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
													>
														<FileText className="h-4 w-4" />
														View Resume
													</ModernButton>
												) : (
													<span className="text-gray-400 text-sm">No resume</span>
												)}
											</ModernTableCell>
											<ModernTableCell>
												<ModernButton variant="ghost" size="sm" onClick={() => handleEditJob(proposal)} className="flex items-center gap-1">
													<Edit className="h-4 w-4" />
													Edit
												</ModernButton>
											</ModernTableCell>
										</m.tr>
									))
								)}
							</ModernTableBody>
						</ModernTable>
					</div>
				</ModernCard>
			</m.div>

			{/* Simple Job Application Modal */}
			<SimpleJobApplicationModal {...simpleModalProps} />
		</m.div>
	);
}
