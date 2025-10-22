import proposalService from "@/api/services/proposalService";
import { Chart } from "@/components/chart/chart";
import { useChart } from "@/components/chart/useChart";
import Icon from "@/components/icon/icon";
import type { ProposalInfo } from "@/types/entity";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Text, Title } from "@/ui/typography";
import { cn } from "@/utils";
import { useEffect, useState } from "react";

interface ApplicationsOverviewProps {
	timeFilter: string;
}

export default function ApplicationsOverview({ timeFilter }: ApplicationsOverviewProps) {
	const [applications, setApplications] = useState<ProposalInfo[]>([]);
	const [filteredApplications, setFilteredApplications] = useState<ProposalInfo[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// Fetch applications data
	useEffect(() => {
		const fetchApplications = async () => {
			setLoading(true);
			try {
				const response = await proposalService.getProposalList({
					limit: 1000, // Get all for admin overview
				});
				setApplications(response.proposals);
				setFilteredApplications(response.proposals);
			} catch (error) {
				console.error("Failed to fetch applications:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchApplications();
	}, []);

	// Filter applications based on search and status
	useEffect(() => {
		let filtered = applications;

		// Apply search filter
		if (searchTerm) {
			filtered = filtered.filter(
				(app) =>
					app.company?.toLowerCase().includes(searchTerm.toLowerCase()) || (app as any).userInfo?.email?.toLowerCase().includes(searchTerm.toLowerCase()),
			);
		}

		// Apply status filter
		if (statusFilter !== "all") {
			filtered = filtered.filter((app) => app.status === statusFilter);
		}

		// Apply time filter
		if (timeFilter !== "all") {
			const now = new Date();
			const filterDate = new Date();

			switch (timeFilter) {
				case "today":
					filterDate.setHours(0, 0, 0, 0);
					break;
				case "week":
					filterDate.setDate(now.getDate() - 7);
					break;
				case "month":
					filterDate.setMonth(now.getMonth() - 1);
					break;
			}

			if (timeFilter !== "all") {
				filtered = filtered.filter((app) => new Date(app.applied_date || "") >= filterDate);
			}
		}

		setFilteredApplications(filtered);
		setCurrentPage(1);
	}, [applications, searchTerm, statusFilter, timeFilter]);

	// Calculate statistics
	const stats = {
		total: filteredApplications.length,
		applied: filteredApplications.filter((app) => app.status === "applied").length,
		interviewing: filteredApplications.filter((app) => app.status === "interviewing").length,
		offered: filteredApplications.filter((app) => app.status === "offered").length,
		rejected: filteredApplications.filter((app) => app.status === "rejected").length,
	};

	// Chart data for status distribution
	const statusChart = useChart({
		series: [stats.applied, stats.interviewing, stats.offered, stats.rejected],
		labels: ["Applied", "Interviewing", "Offered", "Rejected"],
		colors: ["#3b82f6", "#f59e0b", "#10b981", "#ef4444"],
	});

	// Pagination
	const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedApplications = filteredApplications.slice(startIndex, startIndex + itemsPerPage);

	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
			case "offered":
				return "default";
			case "interviewing":
				return "secondary";
			case "rejected":
				return "destructive";
			default:
				return "outline";
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Statistics Cards */}
			<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Total</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.total}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Applied</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-blue-600">{stats.applied}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Interviewing</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-amber-600">{stats.interviewing}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Offered</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">{stats.offered}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Rejected</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
					</CardContent>
				</Card>
			</div>

			{/* Charts */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Application Status Distribution</CardTitle>
					</CardHeader>
					<CardContent>
						<Chart type="donut" series={statusChart.series || []} height={300} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Top Companies</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{Object.entries(
								filteredApplications.reduce(
									(acc, app) => {
										const company = app.company || "Unknown";
										acc[company] = (acc[company] || 0) + 1;
										return acc;
									},
									{} as Record<string, number>,
								),
							)
								.sort(([, a], [, b]) => b - a)
								.slice(0, 5)
								.map(([company, count], index) => (
									<div key={company} className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">{index + 1}</div>
											<span className="font-medium">{company}</span>
										</div>
										<Badge variant="secondary">{count}</Badge>
									</div>
								))}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters and Search */}
			<Card>
				<CardHeader>
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
						<CardTitle>All Applications</CardTitle>
						<div className="flex items-center gap-3">
							<Input placeholder="Search by company or user..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-64" />
							<Select value={statusFilter} onValueChange={setStatusFilter}>
								<SelectTrigger className="w-40">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="applied">Applied</SelectItem>
									<SelectItem value="interviewing">Interviewing</SelectItem>
									<SelectItem value="offered">Offered</SelectItem>
									<SelectItem value="rejected">Rejected</SelectItem>
								</SelectContent>
							</Select>
							<Button variant="outline" size="sm">
								<Icon icon="mdi:download" className="mr-2" />
								Export
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{/* Applications Table */}
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>User</TableHead>
									<TableHead>Company</TableHead>
									<TableHead>Applied Date</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{paginatedApplications.map((application) => (
									<TableRow key={application.id}>
										<TableCell>
											<div className="font-medium">{(application as any).userInfo?.email || "Unknown User"}</div>
										</TableCell>
										<TableCell>
											<div className="font-medium">{application.company}</div>
											{application.job_link && (
												<a href={application.job_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
													View Job
												</a>
											)}
										</TableCell>
										<TableCell>{application.applied_date && new Date(application.applied_date).toLocaleDateString()}</TableCell>
										<TableCell>
											<Badge variant={getStatusBadgeVariant(application.status || "")}>{application.status}</Badge>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<Button variant="ghost" size="sm">
													<Icon icon="mdi:eye" className="h-4 w-4" />
												</Button>
												<Button variant="ghost" size="sm">
													<Icon icon="mdi:edit" className="h-4 w-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between pt-4">
							<Text className="text-sm text-muted-foreground">
								Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredApplications.length)} of {filteredApplications.length} results
							</Text>
							<div className="flex items-center gap-2">
								<Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
									Previous
								</Button>
								<span className="text-sm">
									Page {currentPage} of {totalPages}
								</span>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
									disabled={currentPage === totalPages}
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
