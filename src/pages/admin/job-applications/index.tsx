import { useAuth } from "@/components/auth/use-auth";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Text, Title } from "@/ui/typography";
import { DatePicker, Input, Modal, Select, Space, Table, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Search } = Input;

interface JobApplication {
	id: number;
	user_id: number;
	username: string;
	email: string;
	company_name: string;
	position_title: string;
	application_date: string;
	status: string;
	salary_range: string;
	job_posting_url: string;
	job_description: string;
	location: string;
	application_url: string;
	notes: string;
	follow_up_date: string;
	resume_file_path: string;
	has_resume: boolean;
	created_at: string;
	updated_at: string;
}

interface Filters {
	user: string;
	status: string;
	company: string;
	dateRange: [dayjs.Dayjs, dayjs.Dayjs] | null;
	search: string;
}

const AdminJobApplicationsPage: React.FC = () => {
	const { user, access_token } = useAuth();
	const [applications, setApplications] = useState<JobApplication[]>([]);
	const [filteredApplications, setFilteredApplications] = useState<JobApplication[]>([]);
	const [loading, setLoading] = useState(true);
	const [users, setUsers] = useState<Array<{ id: number; username: string; email: string }>>([]);
	const [companies, setCompanies] = useState<string[]>([]);
	const [filters, setFilters] = useState<Filters>({
		user: "",
		status: "",
		company: "",
		dateRange: null,
		search: "",
	});
	const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
	const [detailsModalVisible, setDetailsModalVisible] = useState(false);

	const fetchApplications = useCallback(async () => {
		if (!access_token || !user || user.role !== 0) {
			setLoading(false);
			return;
		}

		try {
			const response = await fetch("/api/admin/job-applications", {
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				const data = await response.json();
				setApplications(data.applications || []);
				setFilteredApplications(data.applications || []);

				// Extract unique users and companies for filters
				const uniqueUsers = Array.from(
					new Map(data.applications?.map((app: JobApplication) => [app.user_id, { id: app.user_id, username: app.username, email: app.email }]) || []).values(),
				);
				const uniqueCompanies = Array.from(new Set(data.applications?.map((app: JobApplication) => app.company_name).filter(Boolean)));

				setUsers(uniqueUsers);
				setCompanies(uniqueCompanies);
			} else {
				console.error("Failed to fetch applications");
			}
		} catch (error) {
			console.error("Error fetching applications:", error);
		} finally {
			setLoading(false);
		}
	}, [access_token, user]);

	const applyFilters = useCallback(() => {
		let filtered = [...applications];

		// Filter by user
		if (filters.user) {
			filtered = filtered.filter((app) => app.user_id.toString() === filters.user);
		}

		// Filter by status
		if (filters.status) {
			filtered = filtered.filter((app) => app.status === filters.status);
		}

		// Filter by company
		if (filters.company) {
			filtered = filtered.filter((app) => app.company_name === filters.company);
		}

		// Filter by date range
		if (filters.dateRange?.[0] && filters.dateRange?.[1]) {
			const startDate = filters.dateRange[0].startOf("day");
			const endDate = filters.dateRange[1].endOf("day");
			filtered = filtered.filter((app) => {
				const appDate = dayjs(app.application_date || app.created_at);
				return appDate.isAfter(startDate) && appDate.isBefore(endDate);
			});
		}

		// Filter by search term (company, position, or notes)
		if (filters.search) {
			const searchTerm = filters.search.toLowerCase();
			filtered = filtered.filter(
				(app) =>
					app.company_name?.toLowerCase().includes(searchTerm) ||
					app.position_title?.toLowerCase().includes(searchTerm) ||
					app.notes?.toLowerCase().includes(searchTerm) ||
					app.username?.toLowerCase().includes(searchTerm),
			);
		}

		setFilteredApplications(filtered);
	}, [applications, filters]);

	useEffect(() => {
		fetchApplications();
	}, [fetchApplications]);

	useEffect(() => {
		applyFilters();
	}, [applyFilters]);

	const clearFilters = () => {
		setFilters({
			user: "",
			status: "",
			company: "",
			dateRange: null,
			search: "",
		});
	};

	const getStatusColor = (status: string) => {
		switch (status?.toLowerCase()) {
			case "applied":
				return "blue";
			case "interview":
				return "orange";
			case "offer":
				return "green";
			case "rejected":
				return "red";
			case "withdrawn":
				return "gray";
			default:
				return "default";
		}
	};

	const showApplicationDetails = (application: JobApplication) => {
		setSelectedApplication(application);
		setDetailsModalVisible(true);
	};

	const viewResume = (resumePath: string, companyName: string, positionTitle: string) => {
		if (!resumePath) {
			console.error("No resume path provided");
			return;
		}

		// Construct the resume URL based on the file path structure
		let resumeUrl = "";

		if (resumePath.startsWith("interviews/resumes/")) {
			// For interview resumes, they're in public/interviews/resumes/
			resumeUrl = `/${resumePath}`;
		} else if (resumePath.startsWith("resumes/")) {
			// For regular resumes, they're in public/resumes/
			resumeUrl = `/${resumePath}`;
		} else {
			// Fallback - assume it's in the resumes directory
			resumeUrl = `/resumes/${resumePath}`;
		}

		console.log("Opening resume:", resumeUrl, "for", companyName, "-", positionTitle);

		// Open resume in new tab only - don't change original tab
		window.open(resumeUrl, "_blank", "noopener,noreferrer");
	};

	const columns = [
		{
			title: "User",
			key: "user",
			render: (record: JobApplication) => (
				<div>
					<div className="font-medium">{record.username}</div>
					<div className="text-sm text-gray-500">{record.email}</div>
				</div>
			),
			sorter: (a: JobApplication, b: JobApplication) => a.username.localeCompare(b.username),
		},
		{
			title: "Company",
			dataIndex: "company_name",
			key: "company_name",
			sorter: (a: JobApplication, b: JobApplication) => a.company_name.localeCompare(b.company_name),
		},
		{
			title: "Position",
			dataIndex: "position_title",
			key: "position_title",
			sorter: (a: JobApplication, b: JobApplication) => a.position_title.localeCompare(b.position_title),
		},
		{
			title: "Status",
			dataIndex: "status",
			key: "status",
			render: (status: string) => <Tag color={getStatusColor(status)}>{status?.toUpperCase() || "UNKNOWN"}</Tag>,
			sorter: (a: JobApplication, b: JobApplication) => a.status.localeCompare(b.status),
		},
		{
			title: "Application Date",
			dataIndex: "application_date",
			key: "application_date",
			render: (date: string, record: JobApplication) => {
				const displayDate = date || record.created_at;
				return displayDate ? dayjs(displayDate).format("MMM DD, YYYY") : "-";
			},
			sorter: (a: JobApplication, b: JobApplication) => {
				const dateA = dayjs(a.application_date || a.created_at);
				const dateB = dayjs(b.application_date || b.created_at);
				return dateA.isBefore(dateB) ? -1 : 1;
			},
		},
		{
			title: "Salary Range",
			dataIndex: "salary_range",
			key: "salary_range",
			render: (salary: string) => salary || "-",
		},
		{
			title: "Resume",
			key: "resume",
			render: (record: JobApplication) =>
				record.has_resume ? (
					<Tooltip title="Click to view resume">
						<Tag
							color="green"
							className="cursor-pointer hover:bg-green-600 transition-colors"
							onClick={() => viewResume(record.resume_file_path, record.company_name, record.position_title)}
						>
							<Icon icon="solar:document-text-bold" size={12} className="mr-1" />
							Available
						</Tag>
					</Tooltip>
				) : (
					<Tag color="gray">No Resume</Tag>
				),
		},
		{
			title: "Actions",
			key: "actions",
			render: (record: JobApplication) => (
				<Space>
					<Tooltip title="View Details">
						<Button type="text" size="small" icon={<Icon icon="solar:eye-bold" size={16} />} onClick={() => showApplicationDetails(record)} />
					</Tooltip>
					{record.has_resume && (
						<Tooltip title="View Resume">
							<Button
								type="text"
								size="small"
								icon={<Icon icon="solar:document-text-bold" size={16} />}
								onClick={() => viewResume(record.resume_file_path, record.company_name, record.position_title)}
							/>
						</Tooltip>
					)}
					{record.job_posting_url && (
						<Tooltip title="View Job Posting">
							<Button type="text" size="small" icon={<Icon icon="solar:link-bold" size={16} />} onClick={() => window.open(record.job_posting_url, "_blank")} />
						</Tooltip>
					)}
				</Space>
			),
		},
	];

	if (user?.role !== 0) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="text-center">
						<Icon icon="solar:shield-cross-bold" size={48} className="mx-auto mb-4 text-red-500" />
						<Title level={3}>Access Denied</Title>
						<Text>You don't have permission to access this page.</Text>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (loading) {
		return (
			<div className="p-6">
				<div className="animate-pulse">
					<div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
					<div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
					<div className="h-64 bg-gray-200 rounded" />
				</div>
			</div>
		);
	}

	return (
		<div className="p-6">
			<div className="flex justify-between items-center mb-6">
				<div>
					<Title level={2} className="flex items-center gap-2">
						<Icon icon="solar:briefcase-bold" size={24} />
						Job Applications Management
					</Title>
					<Text className="text-gray-600">View and manage all job applications from users</Text>
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
				<Card>
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-blue-600">{applications.length}</div>
						<div className="text-sm text-gray-600">Total Applications</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-green-600">{applications.filter((app) => app.status?.toLowerCase() === "applied").length}</div>
						<div className="text-sm text-gray-600">Applied</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-orange-600">{applications.filter((app) => app.status?.toLowerCase() === "interview").length}</div>
						<div className="text-sm text-gray-600">In Interview</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-purple-600">{applications.filter((app) => app.has_resume).length}</div>
						<div className="text-sm text-gray-600">With Resume</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle>Filters</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
						<div>
							<div className="block text-sm font-medium mb-1">Search</div>
							<Search
								placeholder="Search applications..."
								value={filters.search}
								onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
								allowClear
							/>
						</div>
						<div>
							<div className="block text-sm font-medium mb-1">User</div>
							<Select
								style={{ width: "100%" }}
								placeholder="Select user"
								value={filters.user || undefined}
								onChange={(value) => setFilters((prev) => ({ ...prev, user: value || "" }))}
								allowClear
							>
								{users.map((user) => (
									<Option key={user.id} value={user.id.toString()}>
										{user.username}
									</Option>
								))}
							</Select>
						</div>
						<div>
							<div className="block text-sm font-medium mb-1">Status</div>
							<Select
								style={{ width: "100%" }}
								placeholder="Select status"
								value={filters.status || undefined}
								onChange={(value) => setFilters((prev) => ({ ...prev, status: value || "" }))}
								allowClear
							>
								<Option value="applied">Applied</Option>
								<Option value="interview">Interview</Option>
								<Option value="offer">Offer</Option>
								<Option value="rejected">Rejected</Option>
								<Option value="withdrawn">Withdrawn</Option>
							</Select>
						</div>
						<div>
							<div className="block text-sm font-medium mb-1">Company</div>
							<Select
								style={{ width: "100%" }}
								placeholder="Select company"
								value={filters.company || undefined}
								onChange={(value) => setFilters((prev) => ({ ...prev, company: value || "" }))}
								allowClear
							>
								{companies.map((company) => (
									<Option key={company} value={company}>
										{company}
									</Option>
								))}
							</Select>
						</div>
						<div>
							<div className="block text-sm font-medium mb-1">Date Range</div>
							<RangePicker style={{ width: "100%" }} value={filters.dateRange} onChange={(dates) => setFilters((prev) => ({ ...prev, dateRange: dates }))} />
						</div>
						<div className="flex items-end">
							<Button onClick={clearFilters} type="default">
								<Icon icon="solar:refresh-bold" size={16} className="mr-1" />
								Clear Filters
							</Button>
						</div>
					</div>
					<div className="mt-4 text-sm text-gray-600">
						Showing {filteredApplications.length} of {applications.length} applications
					</div>
				</CardContent>
			</Card>

			{/* Applications Table */}
			<Card>
				<CardContent>
					<Table
						columns={columns}
						dataSource={filteredApplications}
						rowKey="id"
						pagination={{
							pageSize: 20,
							showSizeChanger: true,
							showQuickJumper: true,
							showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} applications`,
						}}
						scroll={{ x: 1200 }}
					/>
				</CardContent>
			</Card>

			{/* Application Details Modal */}
			<Modal title="Application Details" open={detailsModalVisible} onCancel={() => setDetailsModalVisible(false)} footer={null} width={800}>
				{selectedApplication && (
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<div className="block text-sm font-medium text-gray-700">User</div>
								<div className="mt-1">
									<div className="font-medium">{selectedApplication.username}</div>
									<div className="text-sm text-gray-500">{selectedApplication.email}</div>
								</div>
							</div>
							<div>
								<div className="block text-sm font-medium text-gray-700">Status</div>
								<div className="mt-1">
									<Tag color={getStatusColor(selectedApplication.status)}>{selectedApplication.status?.toUpperCase() || "UNKNOWN"}</Tag>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<div className="block text-sm font-medium text-gray-700">Company</div>
								<div className="mt-1 text-sm">{selectedApplication.company_name}</div>
							</div>
							<div>
								<div className="block text-sm font-medium text-gray-700">Position</div>
								<div className="mt-1 text-sm">{selectedApplication.position_title}</div>
							</div>
						</div>

						{selectedApplication.location && (
							<div className="grid grid-cols-2 gap-4">
								<div>
									<div className="block text-sm font-medium text-gray-700">Location</div>
									<div className="mt-1 text-sm">{selectedApplication.location}</div>
								</div>
								<div>
									<div className="block text-sm font-medium text-gray-700">Salary Range</div>
									<div className="mt-1 text-sm">{selectedApplication.salary_range || "-"}</div>
								</div>
							</div>
						)}

						{selectedApplication.job_description && (
							<div>
								<div className="block text-sm font-medium text-gray-700">Job Description</div>
								<div className="mt-1 text-sm bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">{selectedApplication.job_description}</div>
							</div>
						)}

						<div>
							<div className="block text-sm font-medium text-gray-700">Application Date</div>
							<div className="mt-1 text-sm">
								{selectedApplication.application_date
									? dayjs(selectedApplication.application_date).format("MMMM DD, YYYY")
									: dayjs(selectedApplication.created_at).format("MMMM DD, YYYY")}
							</div>
						</div>

						{selectedApplication.job_posting_url && (
							<div>
								<div className="block text-sm font-medium text-gray-700">Job Posting URL</div>
								<div className="mt-1">
									<a
										href={selectedApplication.job_posting_url}
										target="_blank"
										rel="noopener noreferrer"
										className="text-blue-600 hover:text-blue-800 text-sm break-all"
									>
										{selectedApplication.job_posting_url}
									</a>
								</div>
							</div>
						)}

						{selectedApplication.notes && (
							<div>
								<div className="block text-sm font-medium text-gray-700">Notes</div>
								<div className="mt-1 text-sm bg-gray-50 p-3 rounded">{selectedApplication.notes}</div>
							</div>
						)}

						{selectedApplication.follow_up_date && (
							<div>
								<div className="block text-sm font-medium text-gray-700">Follow-up Date</div>
								<div className="mt-1 text-sm">{dayjs(selectedApplication.follow_up_date).format("MMMM DD, YYYY")}</div>
							</div>
						)}

						<div className="grid grid-cols-2 gap-4">
							<div>
								<div className="block text-sm font-medium text-gray-700">Resume</div>
								<div className="mt-1">
									{selectedApplication.has_resume ? (
										<Tooltip title="Click to view resume">
											<Tag
												color="green"
												className="cursor-pointer hover:bg-green-600 transition-colors"
												onClick={() => viewResume(selectedApplication.resume_file_path, selectedApplication.company_name, selectedApplication.position_title)}
											>
												<Icon icon="solar:document-text-bold" size={12} className="mr-1" />
												Resume Available
											</Tag>
										</Tooltip>
									) : (
										<Tag color="gray">No Resume</Tag>
									)}
								</div>
							</div>
							<div>
								<div className="block text-sm font-medium text-gray-700">Last Updated</div>
								<div className="mt-1 text-sm">{dayjs(selectedApplication.updated_at).format("MMMM DD, YYYY HH:mm")}</div>
							</div>
						</div>
					</div>
				)}
			</Modal>
		</div>
	);
};

export default AdminJobApplicationsPage;
