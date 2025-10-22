import apiClient from "@/api/apiClient";
import proposalService from "@/api/services/proposalService";
import { useAuth } from "@/components/auth/use-auth";
import { CalendarOutlined, DeleteOutlined, EditOutlined, FileOutlined, LinkOutlined, PlusOutlined, UploadOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, DatePicker, Form, Input, Modal, Progress, Select, Space, Table, Tabs, Tag, Tooltip, Upload, message } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

// Initialize dayjs plugins
dayjs.extend(isSameOrBefore);

const { TextArea } = Input;
const { Option } = Select;

interface JobApplication {
	id: number;
	user_id: number;
	company_name: string;
	position_title: string;
	application_date: string;
	status: "applied" | "interview_scheduled" | "interviewed" | "offer_received" | "rejected" | "withdrawn";
	job_description: string;
	salary_range: string;
	location: string;
	application_url: string;
	notes: string;
	follow_up_date: string;
	resume_file_path?: string;
	has_resume?: boolean;
	username: string;
	full_name: string;
	interview_count: number;
	created_at: string;
	updated_at: string;
}

const JobApplicationsPage: React.FC = () => {
	const { user, access_token } = useAuth();
	const [applications, setApplications] = useState<JobApplication[]>([]);
	const [loading, setLoading] = useState(true);
	const [modalVisible, setModalVisible] = useState(false);
	const [editingApplication, setEditingApplication] = useState<JobApplication | null>(null);
	const [activeTab, setActiveTab] = useState("all");
	const [form] = Form.useForm();
	const mountedRef = useRef(true);
	const [uploadedFile, setUploadedFile] = useState<File | null>(null);
	const [uploadedFileName, setUploadedFileName] = useState("");
	const [isUploading, setIsUploading] = useState(false);
	const [fileList, setFileList] = useState<UploadFile[]>([]);
	const [searchTerm, setSearchTerm] = useState("");

	// Filter applications based on search term
	const filteredApplications = applications.filter((app) => {
		if (!searchTerm) return true;
		const searchLower = searchTerm.toLowerCase();
		return (
			app.company_name?.toLowerCase().includes(searchLower) ||
			app.position_title?.toLowerCase().includes(searchLower) ||
			app.location?.toLowerCase().includes(searchLower) ||
			app.job_description?.toLowerCase().includes(searchLower)
		);
	});

	// Fetch job applications using job applications API
	const fetchApplications = useCallback(
		async (status?: string) => {
			if (!mountedRef.current || !user?.id) return;

			try {
				setLoading(true);
				const queryParams = status && status !== "all" ? `?status=${status}` : "";
				const response = await apiClient.get({
					url: `/job-applications${queryParams}`,
				});

				if (!mountedRef.current) return;

				// The API returns applications in the correct format
				setApplications((response as any).applications || []);
			} catch (error) {
				if (!mountedRef.current) return;

				if (import.meta.env.DEV) {
					console.error("Error fetching job applications:", error);
				}
				message.error("Error fetching job applications");
			} finally {
				if (mountedRef.current) {
					setLoading(false);
				}
			}
		},
		[user?.id],
	);

	useEffect(() => {
		if (!user?.id) return;
		fetchApplications(activeTab);
	}, [activeTab, fetchApplications, user?.id]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			mountedRef.current = false;
		};
	}, []);

	// Handle resume file upload
	const handleResumeUpload = async (file: File) => {
		// Validate file size (10MB limit)
		if (file.size > 10 * 1024 * 1024) {
			message.error("File size must be less than 10MB");
			return false;
		}

		// Validate file type - accept PDF and DOC files
		const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
		if (!allowedTypes.includes(file.type)) {
			message.error("Please upload a PDF or Word document only");
			return false;
		}

		setIsUploading(true);
		setUploadedFileName(file.name);
		setUploadedFile(file);

		try {
			message.success("Resume uploaded successfully!");
			return false; // Prevent default upload behavior
		} catch (error) {
			message.error("Failed to upload resume. Please try again.");
			setUploadedFileName("");
			setUploadedFile(null);
			return false;
		} finally {
			setIsUploading(false);
		}
	};

	// Save uploaded PDF file to backend
	const saveUploadedPDF = async (file: File, company: string, jobDescription: string): Promise<string> => {
		try {
			// Create form data to send to backend
			const formData = new FormData();
			formData.append("resume", file);
			formData.append("company", company);
			formData.append("jobDescription", jobDescription);

			// Use API client with proper authentication
			const result = await apiClient.post({
				url: "/job-applications/upload-resume",
				data: formData,
			});

			return (result as any).filePath; // Return the saved file path
		} catch (error) {
			console.error("Error saving PDF:", error);
			throw new Error("Failed to save PDF file");
		}
	};

	// Handle create/update application
	const handleSubmit = async (values: any) => {
		try {
			// Save uploaded PDF file if it exists
			let pdfFilePath = null;
			if (uploadedFile && values.company_name && values.job_description) {
				try {
					pdfFilePath = await saveUploadedPDF(uploadedFile, values.company_name, values.job_description);
					message.success("Resume uploaded successfully!");
				} catch (error) {
					message.warning("Failed to save resume file. Application will be created without resume.");
				}
			}

			const applicationData = {
				company_name: values.company_name,
				position_title: values.position_title || values.company_name, // Fallback if position not provided
				application_date: values.application_date ? values.application_date.format("YYYY-MM-DD") : null,
				status: values.status || "applied",
				job_description: values.job_description,
				salary_range: values.salary_range,
				location: values.location,
				application_url: values.application_url,
				notes: values.notes,
				follow_up_date: values.follow_up_date ? values.follow_up_date.format("YYYY-MM-DD") : null,
				// Add resume info if uploaded
				...(pdfFilePath && {
					resume_file_path: pdfFilePath,
					has_resume: true,
				}),
			};

			let response: any;
			if (editingApplication) {
				// Update existing application
				response = await apiClient.put({
					url: `/job-applications/${editingApplication.id}`,
					data: applicationData,
				});
			} else {
				// Create new application
				response = await apiClient.post({
					url: "/job-applications",
					data: applicationData,
				});
			}

			message.success(`Application ${editingApplication ? "updated" : "created"} successfully`);

			// Reset form and upload state
			setModalVisible(false);
			setEditingApplication(null);
			form.resetFields();
			setUploadedFile(null);
			setUploadedFileName("");
			setFileList([]);

			fetchApplications(activeTab);
		} catch (error) {
			if (import.meta.env.DEV) {
				console.error("Error saving application:", error);
			}
			message.error("Error saving application");
		}
	};

	// Handle delete application
	const handleDelete = async (applicationId: number) => {
		Modal.confirm({
			title: "Delete Job Application",
			content: "Are you sure you want to delete this job application? This will also delete all associated interviews.",
			okText: "Delete",
			okType: "danger",
			cancelText: "Cancel",
			onOk: async () => {
				try {
					await apiClient.delete({
						url: `/job-applications/${applicationId}`,
					});
					message.success("Job application deleted successfully");
					fetchApplications(activeTab);
				} catch (error) {
					if (import.meta.env.DEV) {
						console.error("Error deleting application:", error);
					}
					message.error("Error deleting application");
				}
			},
		});
	};

	// Handle edit application
	const handleEdit = (application: JobApplication) => {
		try {
			setEditingApplication(application);
			form.setFieldsValue({
				company_name: application.company_name || "",
				position_title: application.position_title || "",
				application_date: application.application_date ? dayjs(application.application_date) : null,
				status: application.status || "applied",
				job_description: application.job_description || "",
				salary_range: application.salary_range || "",
				location: application.location || "",
				application_url: application.application_url || "",
				notes: application.notes || "",
				follow_up_date: application.follow_up_date ? dayjs(application.follow_up_date) : null,
			});

			// Handle existing resume data when editing
			if (application.has_resume && application.resume_file_path) {
				setUploadedFileName(application.resume_file_path.split("/").pop() || "Resume");
				setFileList([
					{
						uid: "1",
						name: application.resume_file_path.split("/").pop() || "Resume",
						status: "done",
						url: `/api/uploads/resumes/${application.resume_file_path}`,
					},
				]);
			} else {
				// Reset upload state when no resume exists
				setUploadedFile(null);
				setUploadedFileName("");
				setFileList([]);
			}

			setModalVisible(true);
		} catch (error) {
			if (import.meta.env.DEV) {
				console.error("Error editing application:", error);
			}
			message.error("Error loading application data");
		}
	};

	// Status color mapping
	const getStatusColor = (status: string) => {
		const colors = {
			applied: "blue",
			interview_scheduled: "orange",
			interviewed: "purple",
			offer_received: "green",
			rejected: "red",
			withdrawn: "default",
		};
		return colors[status as keyof typeof colors] || "default";
	};

	// Get status progress
	const getStatusProgress = (status: string) => {
		const progressMap = {
			applied: 20,
			interview_scheduled: 40,
			interviewed: 60,
			offer_received: 100,
			rejected: 0,
			withdrawn: 0,
		};
		return progressMap[status as keyof typeof progressMap] || 0;
	};

	// Check if follow-up is due
	const isFollowUpDue = (followUpDate: string, status: string) => {
		try {
			if (!followUpDate || status === "offer_received" || status === "rejected" || status === "withdrawn") return false;
			return dayjs(followUpDate).isSameOrBefore(dayjs(), "day");
		} catch (error) {
			if (import.meta.env.DEV) {
				console.error("Error checking follow-up date:", error);
			}
			return false;
		}
	};

	const columns = [
		{
			title: "Company & Position",
			key: "company_position",
			render: (record: JobApplication) => (
				<div>
					<div style={{ fontWeight: "bold", fontSize: "14px" }}>{record.company_name}</div>
					<div style={{ color: "#666", marginBottom: "4px" }}>{record.position_title}</div>
					<div style={{ fontSize: "12px", color: "#999" }}>{record.location && `📍 ${record.location}`}</div>
					{record.salary_range && <div style={{ fontSize: "12px", color: "#999" }}>💰 {record.salary_range}</div>}
				</div>
			),
		},
		{
			title: "Status",
			dataIndex: "status",
			key: "status",
			render: (status: string) => (
				<div>
					<Tag color={getStatusColor(status)}>{status.replace("_", " ").toUpperCase()}</Tag>
					<Progress percent={getStatusProgress(status)} size="small" showInfo={false} strokeColor={getStatusColor(status)} />
				</div>
			),
		},
		{
			title: "Application Date",
			dataIndex: "application_date",
			key: "application_date",
			render: (date: string) => (date ? dayjs(date).format("MMM DD, YYYY") : "Not set"),
		},
		{
			title: "Interviews",
			dataIndex: "interview_count",
			key: "interview_count",
			render: (count: number) => (
				<div style={{ textAlign: "center" }}>
					<div style={{ fontSize: "18px", fontWeight: "bold" }}>{count}</div>
					<div style={{ fontSize: "12px", color: "#666" }}>interviews</div>
				</div>
			),
		},
		{
			title: "Follow Up",
			dataIndex: "follow_up_date",
			key: "follow_up_date",
			render: (date: string, record: JobApplication) => {
				if (!date) return "No follow-up set";

				const isDue = isFollowUpDue(date, record.status);
				return (
					<div style={{ color: isDue ? "#ff4d4f" : "inherit" }}>
						{dayjs(date).format("MMM DD, YYYY")}
						{isDue && <div style={{ fontSize: "12px", color: "#ff4d4f" }}>Due for follow-up</div>}
					</div>
				);
			},
		},
		{
			title: "Resume",
			key: "resume",
			render: (record: JobApplication) => (
				<div style={{ textAlign: "center" }}>
					{record.has_resume && record.resume_file_path ? (
						<div>
							<Tooltip title={`View Resume: ${record.resume_file_path.split("/").pop()}`}>
								<Button
									type="text"
									icon={<FileOutlined />}
									onClick={() => {
										// Extract just the filename from the path
										const resumePath = record.resume_file_path;
										const filename = resumePath?.split("/").pop(); // Always get the last part
										// Try public endpoint first as workaround
										const finalUrl = `http://localhost:4000/api/public/resumes/${filename}`;

										console.log("🔍 Resume click debug:", {
											resumePath,
											filename,
											finalUrl,
										});

										window.open(finalUrl, "_blank");
									}}
									style={{ color: "#52c41a" }}
								>
									📄
								</Button>
							</Tooltip>
							<div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>{record.resume_file_path.split("/").pop()?.substring(0, 15)}...</div>
						</div>
					) : (
						<div>
							<span style={{ color: "#999", fontSize: "12px" }}>No resume</span>
							<div style={{ fontSize: "10px", color: "#ccc" }}>📄</div>
						</div>
					)}
				</div>
			),
		},
		{
			title: "Actions",
			key: "actions",
			render: (record: JobApplication) => (
				<Space>
					{record.application_url && (
						<Tooltip title="View Job Posting">
							<Button type="text" icon={<LinkOutlined />} onClick={() => window.open(record.application_url, "_blank")} />
						</Tooltip>
					)}
					<Tooltip title="Schedule Interview">
						<Button
							type="text"
							icon={<CalendarOutlined />}
							onClick={() => {
								// Navigate to interviews page with this application pre-selected
								// This would be implemented based on your routing structure
								message.info("Interview scheduling feature coming soon");
							}}
						/>
					</Tooltip>
					<Tooltip title="Edit Application">
						<Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
					</Tooltip>
					{(user?.role === 0 || String(record.user_id) === user?.id) && (
						<Tooltip title="Delete Application">
							<Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
						</Tooltip>
					)}
				</Space>
			),
		},
	];

	// Filter applications by status for tabs
	const getApplicationsByStatus = (status: string) => {
		if (status === "all") return filteredApplications;
		return filteredApplications.filter((app) => app.status === status);
	};

	// Get application counts for tabs (using filtered applications)
	const getApplicationCount = (status: string) => {
		if (status === "all") return filteredApplications.length;
		return filteredApplications.filter((app) => app.status === status).length;
	};

	return (
		<div style={{ padding: "24px" }}>
			<Card>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
					<div>
						<h2 style={{ margin: 0, display: "flex", alignItems: "center" }}>
							<UserOutlined style={{ marginRight: "8px" }} />
							Job Applications
						</h2>
						<p style={{ margin: "4px 0 0 0", color: "#666" }}>Track your job applications, interviews, and follow-ups</p>
					</div>
					<Button
						type="primary"
						icon={<PlusOutlined />}
						onClick={() => {
							try {
								setEditingApplication(null);
								form.resetFields();
								setUploadedFile(null);
								setUploadedFileName("");
								setFileList([]);

								// Set default values for new application
								form.setFieldsValue({
									application_date: dayjs(), // Today's date
									location: "Remote", // Default location
								});

								setModalVisible(true);
							} catch (error) {
								if (import.meta.env.DEV) {
									console.error("Error opening new application modal:", error);
								}
								message.error("Error opening form");
							}
						}}
					>
						New Application
					</Button>
				</div>

				{/* Search Field */}
				<div style={{ marginBottom: "16px" }}>
					<Input.Search
						placeholder="Search by company, position, location, or description..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						onSearch={(value) => setSearchTerm(value)}
						style={{ maxWidth: "400px" }}
						allowClear
					/>
				</div>

				<Tabs
					activeKey={activeTab}
					onChange={setActiveTab}
					style={{ marginBottom: "16px" }}
					items={[
						{ label: `All (${getApplicationCount("all")})`, key: "all" },
						{ label: `Applied (${getApplicationCount("applied")})`, key: "applied" },
						{ label: `Interview Scheduled (${getApplicationCount("interview_scheduled")})`, key: "interview_scheduled" },
						{ label: `Interviewed (${getApplicationCount("interviewed")})`, key: "interviewed" },
						{ label: `Offers (${getApplicationCount("offer_received")})`, key: "offer_received" },
						{ label: `Rejected (${getApplicationCount("rejected")})`, key: "rejected" },
					]}
				/>

				<Table
					columns={columns}
					dataSource={getApplicationsByStatus(activeTab)}
					rowKey="id"
					loading={loading}
					pagination={{
						pageSize: 10,
						showSizeChanger: true,
						showQuickJumper: true,
						showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} applications`,
					}}
					rowClassName={(record) => (isFollowUpDue(record.follow_up_date, record.status) ? "follow-up-due-row" : "")}
				/>
			</Card>

			<Modal
				title={editingApplication ? "Edit Job Application" : "Create New Job Application"}
				open={modalVisible}
				onCancel={() => {
					setModalVisible(false);
					setEditingApplication(null);
					form.resetFields();
				}}
				footer={null}
				width={800}
			>
				<Form form={form} layout="vertical" onFinish={handleSubmit}>
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
						<Form.Item name="company_name" label="Company Name" rules={[{ required: true, message: "Please enter company name" }]}>
							<Input placeholder="Enter company name" />
						</Form.Item>

						<Form.Item name="position_title" label="Position Title" rules={[{ required: true, message: "Please enter position title" }]}>
							<Input placeholder="Enter position title" />
						</Form.Item>
					</div>

					<Form.Item name="job_description" label="Job Description">
						<TextArea rows={4} placeholder="Enter job description or key requirements" />
					</Form.Item>

					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
						<Form.Item name="application_date" label="Application Date">
							<DatePicker style={{ width: "100%" }} />
						</Form.Item>

						<Form.Item name="status" label="Status" initialValue="applied">
							<Select>
								<Option value="applied">Applied</Option>
								<Option value="interview_scheduled">Interview Scheduled</Option>
								<Option value="interviewed">Interviewed</Option>
								<Option value="offer_received">Offer Received</Option>
								<Option value="rejected">Rejected</Option>
								<Option value="withdrawn">Withdrawn</Option>
							</Select>
						</Form.Item>

						<Form.Item name="follow_up_date" label="Follow-up Date">
							<DatePicker style={{ width: "100%" }} />
						</Form.Item>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
						<Form.Item name="salary_range" label="Salary Range">
							<Input placeholder="e.g., $80,000 - $100,000" />
						</Form.Item>

						<Form.Item name="location" label="Location">
							<Input placeholder="e.g., New York, NY or Remote" />
						</Form.Item>
					</div>

					<Form.Item name="application_url" label="Job Posting URL">
						<Input placeholder="https://..." />
					</Form.Item>

					<Form.Item label="Resume Upload">
						<Upload
							beforeUpload={handleResumeUpload}
							fileList={fileList}
							onRemove={() => {
								setUploadedFile(null);
								setUploadedFileName("");
								setFileList([]);
							}}
							accept=".pdf,.doc,.docx"
							maxCount={1}
						>
							<Button icon={<UploadOutlined />} loading={isUploading} disabled={fileList.length >= 1}>
								{isUploading ? "Uploading..." : "Upload Resume"}
							</Button>
						</Upload>
						{uploadedFileName && (
							<div style={{ marginTop: "8px", color: "#52c41a", fontSize: "14px" }}>
								<FileOutlined style={{ marginRight: "8px" }} />
								{uploadedFileName}
								{editingApplication?.has_resume && <span style={{ marginLeft: "8px", color: "#1890ff", fontSize: "12px" }}>(Existing resume)</span>}
							</div>
						)}

						{/* Show existing resume info when editing */}
						{editingApplication?.has_resume && editingApplication?.resume_file_path && !uploadedFileName && (
							<div style={{ marginTop: "8px", padding: "8px", backgroundColor: "#f0f8ff", borderRadius: "4px", border: "1px solid #d9d9d9" }}>
								<div style={{ color: "#1890ff", fontSize: "14px", marginBottom: "4px" }}>
									<FileOutlined style={{ marginRight: "8px" }} />
									Current Resume: {editingApplication.resume_file_path.split("/").pop()}
								</div>
								<Button
									size="small"
									type="link"
									onClick={() => {
										// Extract just the filename from the path
										const resumePath = editingApplication.resume_file_path;
										const filename = resumePath?.split("/").pop(); // Always get the last part
										// Try public endpoint first as workaround
										const finalUrl = `http://localhost:4000/api/public/resumes/${filename}`;

										console.log("🔍 Modal Resume click debug - UPDATED VERSION:", {
											resumePath,
											filename,
											finalUrl,
											access_token: access_token ? "present" : "missing",
											timestamp: new Date().toISOString(),
										});

										window.open(finalUrl, "_blank");
									}}
									style={{ padding: 0, height: "auto" }}
								>
									📄 View Current Resume
								</Button>
							</div>
						)}
						<div style={{ marginTop: "4px", color: "#666", fontSize: "12px" }}>Supported formats: PDF, DOC, DOCX (Max 10MB)</div>
					</Form.Item>

					<Form.Item name="notes" label="Notes">
						<TextArea rows={3} placeholder="Add any notes, contacts, or additional information" />
					</Form.Item>

					<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px" }}>
						<Button
							onClick={() => {
								setModalVisible(false);
								setEditingApplication(null);
								form.resetFields();
								setUploadedFile(null);
								setUploadedFileName("");
								setFileList([]);
							}}
						>
							Cancel
						</Button>
						<Button type="primary" htmlType="submit">
							{editingApplication ? "Update Application" : "Create Application"}
						</Button>
					</div>
				</Form>
			</Modal>

			<style>{`
        .follow-up-due-row {
          background-color: #fff7e6 !important;
        }
      `}</style>
		</div>
	);
};

export default JobApplicationsPage;
