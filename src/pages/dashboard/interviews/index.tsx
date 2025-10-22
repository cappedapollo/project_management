import apiClient from "@/api/apiClient";
import interviewService from "@/api/services/interviewService";
import proposalService from "@/api/services/proposalService";
import { useAuth } from "@/components/auth/use-auth";
import {
	CalendarOutlined,
	DeleteOutlined,
	EditOutlined,
	ExclamationCircleOutlined,
	FileOutlined,
	LinkOutlined,
	PlusOutlined,
	UploadOutlined,
	VideoCameraOutlined,
} from "@ant-design/icons";
import { Button, Card, DatePicker, Form, Input, Modal, Rate, Select, Space, Table, Tabs, Tag, Tooltip, Upload, message } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import dayjs from "dayjs";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const { TextArea } = Input;
const { Option } = Select;

interface Interview {
	id: number;
	job_application_id: number;
	user_id: number;
	interview_type: "phone" | "video" | "in_person" | "technical" | "behavioral";
	scheduled_date: string;
	duration_minutes: number;
	interviewer_name: string;
	interviewer_email: string;
	location: string;
	meeting_link: string;
	status: "scheduled" | "completed" | "cancelled" | "rescheduled";
	notes: string;
	feedback: string;
	rating: number;
	company_name: string;
	position_title: string;
	username: string;
	full_name: string;
	created_at: string;
	updated_at: string;
	job_description?: string; // Add job description field
	resume_link?: string; // Add resume link field
}

interface JobApplication {
	id: number;
	company_name: string;
	position_title: string;
	job_description?: string;
	application_url?: string;
	salary_range?: string;
	location?: string;
	notes?: string;
	resume_file_path?: string;
	application_date?: string;
	status?: string;
	interview_count?: number; // Number of interviews scheduled for this application
}

const InterviewsPage: React.FC = () => {
	const { user, access_token } = useAuth();
	const [interviews, setInterviews] = useState<Interview[]>([]);
	const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
	const [loading, setLoading] = useState(true);
	const [modalVisible, setModalVisible] = useState(false);
	const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
	const [activeTab, setActiveTab] = useState("all");
	const [form] = Form.useForm();
	const mountedRef = useRef(true);
	const [loadingApplications, setLoadingApplications] = useState(false);
	const [selectedJobApplication, setSelectedJobApplication] = useState<JobApplication | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [showOnlyWithInterviews, setShowOnlyWithInterviews] = useState(false); // Default to showing all applications for better UX

	// Resume upload states
	const [uploadedFile, setUploadedFile] = useState<File | null>(null);
	const [uploadedFileName, setUploadedFileName] = useState("");
	const [fileList, setFileList] = useState<any[]>([]);

	// Handle URL parameters for opening modal
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const action = urlParams.get("action");
		const interviewId = urlParams.get("id");

		if (action === "create") {
			// Open modal for creating new interview
			setModalVisible(true);
			// Clear URL parameters
			window.history.replaceState({}, document.title, window.location.pathname);
		} else if (action === "edit" && interviewId && interviews.length > 0) {
			// Find and edit specific interview
			const interview = interviews.find((i) => i.id === Number.parseInt(interviewId));
			if (interview) {
				// Set editing interview and form values directly
				setEditingInterview(interview);
				form.setFieldsValue({
					job_application_id: interview.job_application_id,
					interview_type: interview.interview_type,
					scheduled_date: interview.scheduled_date ? dayjs(interview.scheduled_date) : null,
					duration_minutes: interview.duration_minutes,
					interviewer_name: interview.interviewer_name,
					interviewer_email: interview.interviewer_email,
					location: interview.location,
					meeting_link: interview.meeting_link,
					status: interview.status,
					notes: interview.notes,
					feedback: interview.feedback,
					rating: interview.rating,
					company_name: interview.company_name,
					position_title: interview.position_title,
					job_description: interview.job_description,
				});
				setModalVisible(true);
			}
			// Clear URL parameters
			window.history.replaceState({}, document.title, window.location.pathname);
		}
	}, [interviews, form]);

	// Filter interviews based on search term
	const filteredInterviews = interviews.filter((interview) => {
		if (!searchTerm) return true;
		const searchLower = searchTerm.toLowerCase();
		return (
			interview.company_name?.toLowerCase().includes(searchLower) ||
			interview.position_title?.toLowerCase().includes(searchLower) ||
			interview.interviewer_name?.toLowerCase().includes(searchLower) ||
			interview.location?.toLowerCase().includes(searchLower) ||
			interview.notes?.toLowerCase().includes(searchLower)
		);
	});

	// Filter job applications based on interview count
	const filteredJobApplications = jobApplications.filter((app) => {
		if (showOnlyWithInterviews) {
			return (app.interview_count || 0) > 0;
		}
		return true;
	});

	// Debug logging for job applications
	if (import.meta.env.DEV && jobApplications.length > 0) {
		console.log("Job Applications Debug:", {
			totalApplications: jobApplications.length,
			filteredApplications: filteredJobApplications.length,
			showOnlyWithInterviews,
			sampleApplication: jobApplications[0],
		});
	}

	// Fetch interviews
	const fetchInterviews = useCallback(
		async (status?: string, upcoming?: boolean) => {
			if (!mountedRef.current || !access_token) return;

			try {
				setLoading(true);

				// Use direct API call to new backend
				const params: any = {};
				if (status && status !== "all") {
					params.status = status;
				}
				if (upcoming) {
					params.upcoming = "true";
				}

				if (import.meta.env.DEV) {
					console.log("🔍 Fetching interviews from:", "/interviews", "with params:", params);
				}
				const interviews = await apiClient.get({
					url: "/interviews",
					params,
				});
				if (import.meta.env.DEV) {
					console.log("📥 Received response from /interviews:", interviews);
				}

				if (!mountedRef.current) return;

				if (import.meta.env.DEV) {
					console.log("Raw interviews data:", interviews);
					console.log("Processed interviews:", (interviews as any) || []);
					console.log("First interview record:", ((interviews as any) || [])[0]);
					console.log("Data type check - has interview_type?", ((interviews as any) || [])[0]?.interview_type);
					console.log("Data type check - has status?", ((interviews as any) || [])[0]?.status);
				}

				setInterviews((interviews as any) || []);
			} catch (error) {
				if (!mountedRef.current) return;

				if (import.meta.env.DEV) {
					console.error("Error fetching interviews:", error);
				}
				message.error("Error fetching interviews");
			} finally {
				if (mountedRef.current) {
					setLoading(false);
				}
			}
		},
		[access_token],
	);

	// Fetch job applications for dropdown (only when modal opens)
	const fetchJobApplications = async () => {
		if (!user?.id || !access_token) {
			if (import.meta.env.DEV) {
				console.warn("Cannot fetch job applications: missing user or token");
			}
			return;
		}

		setLoadingApplications(true);
		try {
			// Use the job applications API that includes interview_count
			const response = await apiClient.get({
				url: "/job-applications",
			});

			if (import.meta.env.DEV) {
				console.log("Job Applications API Response:", response);
				console.log("📋 First job application:", ((response as any)?.applications || [])[0]);
				console.log(
					"📝 Job descriptions in apps:",
					((response as any)?.applications || []).map((app: any) => ({
						id: app.id,
						company: app.company_name,
						job_description: app.job_description,
					})),
				);
			}

			const applications = (response as any)?.applications || [];
			setJobApplications(applications);
		} catch (error) {
			if (import.meta.env.DEV) {
				console.error("Error fetching job applications:", error);
			}
			// Set empty array on error to prevent infinite loading
			setJobApplications([]);
		} finally {
			setLoadingApplications(false);
		}
	};

	useEffect(() => {
		if (!access_token) return;

		const isUpcoming = activeTab === "upcoming";
		const status = activeTab === "upcoming" || activeTab === "all" ? undefined : activeTab;
		fetchInterviews(status, isUpcoming);
		// Only fetch job applications when needed (removed from here)
	}, [activeTab, fetchInterviews, access_token]);

	// Handle job application selection
	const handleJobApplicationSelect = (applicationId: number | undefined) => {
		const selectedApp = applicationId ? jobApplications.find((app) => app.id === applicationId) : null;
		setSelectedJobApplication(selectedApp || null);

		if (import.meta.env.DEV) {
			console.log("🔍 Selected job application:", selectedApp);
			console.log("📝 Job description from app:", selectedApp?.job_description);
		}

		// Auto-populate some fields based on the selected job application
		if (selectedApp) {
			form.setFieldsValue({
				location: selectedApp.location || "Online",
				job_description: selectedApp.job_description || "",
				notes: `Interview for ${selectedApp.position_title} at ${selectedApp.company_name}${selectedApp.salary_range ? `\n\nSalary Range: ${selectedApp.salary_range}` : ""}${selectedApp.application_url ? `\n\nJob Posting: ${selectedApp.application_url}` : ""}`,
			});
		} else {
			// Clear manual fields when job application is cleared
			form.setFieldsValue({
				company_name: "",
				position_title: "",
				location: "Online",
				job_description: "",
				notes: "",
			});
		}
	};

	// Reset selected job application when modal closes
	// Resume upload handlers
	const handleFileUpload = (info: any) => {
		const { fileList } = info;
		setFileList(fileList);

		if (import.meta.env.DEV) {
			console.log("📁 File upload info:", {
				status: info.file.status,
				name: info.file.name,
				hasOriginFileObj: !!info.file.originFileObj,
				fileListLength: fileList.length,
			});
		}

		// Since we use beforeUpload={() => false}, the file won't have "done" status
		// We need to check for the file object directly
		if (info.file && (info.file.originFileObj || info.file instanceof File)) {
			const file = info.file.originFileObj || info.file;
			setUploadedFile(file);
			setUploadedFileName(file.name);
			console.log("✅ File set:", file.name);
		}
	};

	const saveUploadedPDF = async (file: File, companyName: string, jobDescription: string): Promise<string> => {
		try {
			const formData = new FormData();
			formData.append("resume", file);
			formData.append("company_name", companyName);
			formData.append("job_description", jobDescription);

			const response = await apiClient.post({
				url: "/interviews/upload-resume",
				data: formData,
				headers: {
					"Content-Type": "multipart/form-data",
				},
			});

			return (response as any)?.filePath;
		} catch (error) {
			if (import.meta.env.DEV) {
				console.error("Error uploading resume:", error);
			}
			throw new Error("Failed to upload resume");
		}
	};

	const resetModal = () => {
		setModalVisible(false);
		setEditingInterview(null);
		setSelectedJobApplication(null);
		form.resetFields();
		// Reset resume upload state
		setUploadedFile(null);
		setUploadedFileName("");
		setFileList([]);
	};

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			mountedRef.current = false;
		};
	}, []);

	// Handle create/update interview
	const handleSubmit = async (values: any) => {
		try {
			// Get company and position from either job application or manual input
			const selectedApp = values.job_application_id ? jobApplications.find((app) => app.id === values.job_application_id) : null;
			const companyName = selectedApp?.company_name || values.company_name;
			const positionTitle = selectedApp?.position_title || values.position_title;

			// Handle resume upload if file is provided
			let resumeLink = null;
			if (import.meta.env.DEV) {
				console.log("🔍 Resume upload check:", {
					uploadedFile: uploadedFile ? uploadedFile.name : "No file",
					fileList: fileList.length,
					companyName,
					positionTitle,
				});
			}

			if (uploadedFile) {
				try {
					// Use job description or company/position as fallback for filename
					const description = values.job_description || `${companyName} - ${positionTitle}`;
					console.log("📤 Uploading resume:", uploadedFile.name);
					resumeLink = await saveUploadedPDF(uploadedFile, companyName, description);
					console.log("✅ Resume uploaded successfully:", resumeLink);
					message.success("Resume uploaded successfully!");
				} catch (error) {
					console.error("❌ Resume upload failed:", error);
					message.warning("Failed to save resume file. Interview will be created without resume.");
				}
			} else if (selectedApp?.resume_file_path && !editingInterview?.resume_link) {
				// Copy job application's resume to interview folder if no manual upload and no existing interview resume
				try {
					console.log("📋 Copying job application resume to interview folder");
					const copyResponse = await apiClient.post({
						url: "/interviews/copy-resume",
						data: {
							source_resume_path: selectedApp.resume_file_path,
							company_name: companyName,
							job_description: values.job_description || `${companyName} - ${positionTitle}`,
						},
					});
					resumeLink = (copyResponse as any)?.filePath;
					console.log("✅ Job application resume copied:", resumeLink);
					message.success("Job application resume copied to interview!");
				} catch (error) {
					console.error("❌ Failed to copy job application resume:", error);
					message.warning("Failed to copy job application resume. Interview will be created without resume.");
				}
			}

			const interviewData = {
				id: editingInterview?.id,
				proposal: values.job_application_id || null, // Can be null for standalone interviews
				meeting_title: `Interview for ${positionTitle} at ${companyName}`,
				meeting_date: values.scheduled_date ? values.scheduled_date.toISOString() : null,
				meeting_link: values.meeting_link,
				interviewer: values.interviewer_name,
				progress: values.status === "completed" ? 3 : values.status === "cancelled" ? 4 : 1, // Map status to progress
				job_description: values.job_description || positionTitle,
				notes: values.notes,
				feedback: values.feedback,
				resume_link: resumeLink,
				// Add company and position for standalone interviews
				company_name: companyName,
				position_title: positionTitle,
			};

			// Use direct API call instead of interview service
			const method = editingInterview ? "put" : "post";
			const url = editingInterview ? `/interviews/${editingInterview.id}` : "/interviews";

			await apiClient[method]({
				url,
				data: {
					job_application_id: values.job_application_id || null,
					company_name: companyName,
					position_title: positionTitle,
					interview_type: values.interview_type || "video",
					scheduled_date: values.scheduled_date ? values.scheduled_date.toISOString() : null,
					duration_minutes: values.duration_minutes || 60,
					interviewer_name: values.interviewer_name,
					interviewer_email: values.interviewer_email,
					location: values.location,
					meeting_link: values.meeting_link,
					status: values.status || "scheduled",
					notes: values.notes,
					feedback: values.feedback,
					rating: values.rating,
					job_description: values.job_description,
					resume_link: resumeLink,
				},
			});

			message.success(`Interview ${editingInterview ? "updated" : "created"} successfully`);
			resetModal();
			// Small delay to ensure backend has processed the request
			setTimeout(() => {
				fetchInterviews(activeTab === "all" ? undefined : activeTab, activeTab === "upcoming");
			}, 100);
		} catch (error) {
			if (import.meta.env.DEV) {
				console.error("Error saving interview:", error);
			}
			message.error("Error saving interview");
		}
	};

	// Handle delete interview
	const handleDelete = useCallback(
		(interviewId: number) => {
			// Use a simple confirm dialog to avoid React warnings
			if (window.confirm("Are you sure you want to delete this interview? This action cannot be undone.")) {
				const performDelete = async () => {
					try {
						await interviewService.deleteInterview(interviewId.toString(), access_token || "");
						message.success("Interview deleted successfully");
						fetchInterviews(activeTab === "all" ? undefined : activeTab, activeTab === "upcoming");
					} catch (error) {
						console.error("Error deleting interview:", error);
						message.error(`Error deleting interview: ${error.message || error}`);
					}
				};
				performDelete();
			}
		},
		[access_token, activeTab, fetchInterviews],
	);

	// Handle edit interview
	const handleEdit = (interview: Interview) => {
		setEditingInterview(interview);

		// Set form values with all available interview data
		form.setFieldsValue({
			job_application_id: interview.job_application_id,
			interview_type: interview.interview_type,
			scheduled_date: interview.scheduled_date ? dayjs(interview.scheduled_date) : null,
			duration_minutes: interview.duration_minutes,
			interviewer_name: interview.interviewer_name,
			interviewer_email: interview.interviewer_email,
			location: interview.location,
			meeting_link: interview.meeting_link,
			status: interview.status,
			notes: interview.notes,
			feedback: interview.feedback,
			rating: interview.rating,
			// Add the new fields
			job_description: interview.job_description,
			company_name: interview.company_name,
			position_title: interview.position_title,
		});

		// If there's a job application linked, find and set it
		if (interview.job_application_id) {
			// Find the job application from the current list
			const linkedJobApp = jobApplications.find((app) => app.id === interview.job_application_id);
			if (linkedJobApp) {
				setSelectedJobApplication(linkedJobApp);
			}
		} else {
			// Clear selected job application for standalone interviews
			setSelectedJobApplication(null);
		}

		// Handle resume upload states - show existing resume if available
		if (interview.resume_link) {
			// Extract filename from resume_link for display
			const filename = interview.resume_link.split("/").pop() || "resume.pdf";
			setUploadedFileName(filename);
			setUploadedFile(null); // No file object for existing resume
			setFileList([
				{
					uid: "-1",
					name: filename,
					status: "done",
					url: interview.resume_link,
				},
			]);
		} else {
			// Reset resume upload states if no existing resume
			setUploadedFile(null);
			setUploadedFileName("");
			setFileList([]);
		}

		setModalVisible(true);
		// Fetch job applications when modal opens
		fetchJobApplications();
	};

	// Status color mapping
	const getStatusColor = (status: string) => {
		const colors = {
			scheduled: "blue",
			completed: "green",
			cancelled: "red",
			rescheduled: "orange",
		};
		return colors[status as keyof typeof colors] || "default";
	};

	// Interview type color mapping
	const getTypeColor = (type: string) => {
		const colors = {
			phone: "cyan",
			video: "blue",
			in_person: "green",
			technical: "purple",
			behavioral: "orange",
		};
		return colors[type as keyof typeof colors] || "default";
	};

	// Check if interview is upcoming
	const isUpcoming = (scheduledDate: string) => {
		return dayjs(scheduledDate).isAfter(dayjs());
	};

	// Check if interview is today
	const isToday = (scheduledDate: string) => {
		return dayjs(scheduledDate).isSame(dayjs(), "day");
	};

	const columns = [
		{
			title: "Interview Details",
			key: "details",
			render: (record: Interview) => (
				<div>
					<div style={{ fontWeight: "bold", fontSize: "14px" }}>
						{record.company_name} - {record.position_title}
					</div>
					<div style={{ color: "#666", marginBottom: "4px" }}>
						{record.interviewer_name}
						{record.interviewer_email && ` (${record.interviewer_email})`}
					</div>
					<div style={{ fontSize: "12px", color: "#999" }}>
						{record.location && `📍 ${record.location}`}
						{record.meeting_link && " 🔗 Online"}
					</div>
				</div>
			),
		},
		{
			title: "Type & Status",
			key: "type_status",
			render: (record: Interview) => (
				<div>
					<Tag color={getTypeColor(record.interview_type)}>{record.interview_type?.replace("_", " ").toUpperCase() || "N/A"}</Tag>
					<br />
					<Tag color={getStatusColor(record.status)} style={{ marginTop: "4px" }}>
						{record.status?.toUpperCase() || "N/A"}
					</Tag>
				</div>
			),
		},
		{
			title: "Scheduled Date",
			dataIndex: "scheduled_date",
			key: "scheduled_date",
			render: (date: string) => {
				if (!date) return "Not scheduled";

				const isUpcomingInterview = isUpcoming(date);
				const isTodayInterview = isToday(date);

				return (
					<div>
						<div
							style={{
								color: isTodayInterview ? "#ff4d4f" : isUpcomingInterview ? "#1890ff" : "inherit",
								fontWeight: isTodayInterview ? "bold" : "normal",
							}}
						>
							{dayjs(date).format("MMM DD, YYYY")}
						</div>
						<div style={{ fontSize: "12px", color: "#666" }}>
							{dayjs(date).format("HH:mm")}
							{isTodayInterview && " (Today)"}
						</div>
					</div>
				);
			},
		},
		{
			title: "Duration",
			dataIndex: "duration_minutes",
			key: "duration",
			render: (minutes: number) => (
				<div style={{ textAlign: "center" }}>
					<div style={{ fontSize: "16px", fontWeight: "bold" }}>{minutes || 60}</div>
					<div style={{ fontSize: "12px", color: "#666" }}>minutes</div>
				</div>
			),
		},
		{
			title: "Rating",
			dataIndex: "rating",
			key: "rating",
			render: (rating: number, record: Interview) =>
				record.status === "completed" ? (
					<div>
						<Rate disabled value={rating} style={{ fontSize: "14px" }} />
						<div style={{ fontSize: "12px", color: "#666" }}>{rating ? `${rating}/5` : "Not rated"}</div>
					</div>
				) : (
					<div style={{ color: "#999", fontSize: "12px" }}>Pending</div>
				),
		},
		{
			title: "Resume",
			key: "resume",
			render: (record: Interview) => (
				<div style={{ textAlign: "center" }}>
					{record.resume_link ? (
						<Tooltip title={`View Resume: ${record.resume_link.split("/").pop()}`}>
							<Button
								type="text"
								icon={<FileOutlined />}
								onClick={() => {
									// Extract just the filename from the resume_link
									const filename = record.resume_link?.split("/").pop();
									// Use full localhost URL like job applications
									const finalUrl = `http://localhost:4000/api/public/interviews/resumes/${filename}`;

									console.log("🔍 Interview Resume click debug:", {
										resume_link: record.resume_link,
										filename,
										finalUrl,
									});

									window.open(finalUrl, "_blank");
								}}
								style={{ color: "#1890ff" }}
							>
								📄
							</Button>
						</Tooltip>
					) : (
						<span style={{ color: "#ccc", fontSize: "12px" }}>No resume</span>
					)}
				</div>
			),
		},
		{
			title: "Actions",
			key: "actions",
			render: (record: Interview) => (
				<Space>
					{record.meeting_link && (
						<Tooltip title="Join Meeting">
							<Button type="text" icon={<VideoCameraOutlined />} onClick={() => window.open(record.meeting_link, "_blank")} />
						</Tooltip>
					)}
					<Tooltip title="Edit Interview">
						<Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
					</Tooltip>
					{(user?.role === 0 || record.user_id === Number(user?.id)) && (
						<Tooltip title="Delete Interview">
							<Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
						</Tooltip>
					)}
				</Space>
			),
		},
	];

	// Filter interviews by status for tabs
	const getInterviewsByStatus = (status: string) => {
		if (status === "all") return filteredInterviews;
		if (status === "upcoming") return filteredInterviews.filter((interview) => isUpcoming(interview.scheduled_date));
		return filteredInterviews.filter((interview) => interview.status === status);
	};

	// Get interview counts for tabs (using filtered interviews)
	const getInterviewCount = (status: string) => {
		if (status === "all") return filteredInterviews.length;
		if (status === "upcoming") return filteredInterviews.filter((interview) => isUpcoming(interview.scheduled_date)).length;
		return filteredInterviews.filter((interview) => interview.status === status).length;
	};

	return (
		<div style={{ padding: "24px" }}>
			<Card>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
					<div>
						<h2 style={{ margin: 0, display: "flex", alignItems: "center" }}>
							<CalendarOutlined style={{ marginRight: "8px" }} />
							Interviews Management
						</h2>
						<p style={{ margin: "4px 0 0 0", color: "#666" }}>Schedule, track, and manage your job interviews</p>
					</div>
					<Button
						type="primary"
						icon={<PlusOutlined />}
						onClick={() => {
							resetModal(); // This properly clears all state including selectedJobApplication
							setModalVisible(true);
							// Fetch job applications when modal opens
							fetchJobApplications();
						}}
					>
						Schedule Interview
					</Button>
				</div>

				{/* Search Field */}
				<div style={{ marginBottom: "16px" }}>
					<Input.Search
						placeholder="Search by company, position, interviewer, location, or notes..."
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
						{ label: `All (${getInterviewCount("all")})`, key: "all" },
						{ label: `Upcoming (${getInterviewCount("upcoming")})`, key: "upcoming" },
						{ label: `Scheduled (${getInterviewCount("scheduled")})`, key: "scheduled" },
						{ label: `Completed (${getInterviewCount("completed")})`, key: "completed" },
						{ label: `Cancelled (${getInterviewCount("cancelled")})`, key: "cancelled" },
					]}
				/>

				<Table
					columns={columns}
					dataSource={getInterviewsByStatus(activeTab)}
					rowKey="id"
					loading={loading}
					pagination={{
						pageSize: 10,
						showSizeChanger: true,
						showQuickJumper: true,
						showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} interviews`,
					}}
					rowClassName={(record) => (isToday(record.scheduled_date) ? "today-interview-row" : "")}
				/>
			</Card>

			<Modal
				title={editingInterview ? "Edit Interview" : "Schedule New Interview"}
				open={modalVisible}
				onCancel={() => {
					setModalVisible(false);
					setEditingInterview(null);
					form.resetFields();
				}}
				footer={null}
				width={800}
			>
				<Form form={form} layout="vertical" onFinish={handleSubmit}>
					<Form.Item
						name="job_application_id"
						label={
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<span>Job Application (Optional)</span>
								<div style={{ fontSize: "12px", color: "#666" }}>
									<label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
										<input
											type="checkbox"
											checked={showOnlyWithInterviews}
											onChange={(e) => setShowOnlyWithInterviews(e.target.checked)}
											style={{ margin: 0 }}
										/>
										Show only applications with existing interviews ({filteredJobApplications.length})
									</label>
								</div>
							</div>
						}
					>
						<Select
							placeholder={loadingApplications ? "Loading job applications..." : "Select a job application (optional)"}
							showSearch
							loading={loadingApplications}
							disabled={loadingApplications}
							onChange={handleJobApplicationSelect}
							dropdownStyle={{
								minWidth: "500px",
								maxWidth: "600px",
							}}
							listHeight={300}
							filterOption={(input, option) => {
								if (!input || !option) return true;
								const searchText = input.toLowerCase();
								const app = filteredJobApplications.find((a) => a.id === option.value);
								if (!app) return false;

								return Boolean(
									app.company_name?.toLowerCase().includes(searchText) ||
										app.position_title?.toLowerCase().includes(searchText) ||
										app.status?.toLowerCase().includes(searchText),
								);
							}}
							notFoundContent={
								loadingApplications
									? "Loading..."
									: filteredJobApplications.length === 0
										? showOnlyWithInterviews
											? "No applications with interviews found - uncheck filter to see all applications"
											: "No job applications found - you can still schedule an interview manually"
										: "No matching applications"
							}
							allowClear
						>
							{filteredJobApplications.map((app) => (
								<Option key={app.id} value={app.id}>
									<div style={{ padding: "4px 0", lineHeight: "1.4" }}>
										<div style={{ fontWeight: "600", color: "#262626", marginBottom: "2px" }}>
											{app.company_name} - {app.position_title}
										</div>
										<div style={{ fontSize: "12px", color: "#8c8c8c", display: "flex", alignItems: "center", gap: "8px" }}>
											{app.status && (
												<span
													style={{
														textTransform: "capitalize",
														backgroundColor: "#f0f0f0",
														padding: "2px 6px",
														borderRadius: "4px",
														fontSize: "11px",
													}}
												>
													{app.status}
												</span>
											)}
											{app.application_date && <span>Applied: {dayjs(app.application_date).format("MMM DD, YYYY")}</span>}
											{app.salary_range && <span>Salary: {app.salary_range}</span>}
											{app.interview_count && (
												<span
													style={{
														color: "#1890ff",
														fontWeight: "500",
													}}
												>
													{app.interview_count} interview{app.interview_count > 1 ? "s" : ""}
												</span>
											)}
										</div>
									</div>
								</Option>
							))}
						</Select>
					</Form.Item>

					{/* Manual Company/Position Fields (when no job application selected) */}
					{!selectedJobApplication && (
						<div style={{ marginBottom: "16px" }}>
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
								<Form.Item name="company_name" label="Company Name" rules={[{ required: true, message: "Please enter company name" }]}>
									<Input placeholder="Enter company name" />
								</Form.Item>
								<Form.Item name="position_title" label="Position Title" rules={[{ required: true, message: "Please enter position title" }]}>
									<Input placeholder="Enter position title" />
								</Form.Item>
							</div>
						</div>
					)}

					{/* Job Application Details Card */}
					{selectedJobApplication && (
						<Card
							size="small"
							title={
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<span>📋 Application Details</span>
									{/* Show interview's resume if available */}
									{editingInterview?.resume_link && (
										<Button
											size="small"
											type="link"
											onClick={() => {
												// Extract just the filename from the interview's resume_link
												const filename = editingInterview.resume_link?.split("/").pop();
												// Use full localhost URL like job applications
												const finalUrl = `http://localhost:4000/api/public/interviews/resumes/${filename}`;

												console.log("🔍 Interview Resume click debug:", {
													resume_link: editingInterview.resume_link,
													filename,
													finalUrl,
												});

												window.open(finalUrl, "_blank");
											}}
										>
											📄 View Interview Resume
										</Button>
									)}
									{/* Show job application's resume if available and no interview resume */}
									{!editingInterview?.resume_link && selectedJobApplication?.resume_file_path && (
										<Button
											size="small"
											type="link"
											onClick={() => {
												// Extract just the filename from the job application's resume
												const filename = selectedJobApplication.resume_file_path?.split("/").pop();
												// Use job application's public endpoint
												const finalUrl = `http://localhost:4000/api/public/resumes/${filename}`;

												console.log("🔍 Job Application Resume click debug:", {
													resume_file_path: selectedJobApplication.resume_file_path,
													filename,
													finalUrl,
												});

												window.open(finalUrl, "_blank");
											}}
										>
											📄 View Job Application Resume
										</Button>
									)}
								</div>
							}
							style={{ marginBottom: "16px", backgroundColor: "#f8f9fa" }}
						>
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "14px" }}>
								<div>
									<strong>Company:</strong> {selectedJobApplication.company_name}
								</div>
								<div>
									<strong>Position:</strong> {selectedJobApplication.position_title}
								</div>
								{selectedJobApplication.status && (
									<div>
										<strong>Status:</strong>
										<Tag
											color={selectedJobApplication.status === "applied" ? "blue" : selectedJobApplication.status === "interviewing" ? "orange" : "green"}
											style={{ marginLeft: "8px" }}
										>
											{selectedJobApplication.status}
										</Tag>
									</div>
								)}
								{selectedJobApplication.application_date && (
									<div>
										<strong>Applied:</strong> {dayjs(selectedJobApplication.application_date).format("MMM DD, YYYY")}
									</div>
								)}
								{selectedJobApplication.salary_range && (
									<div>
										<strong>Salary:</strong> {selectedJobApplication.salary_range}
									</div>
								)}
								{selectedJobApplication.location && (
									<div>
										<strong>Location:</strong> {selectedJobApplication.location}
									</div>
								)}
							</div>
							{selectedJobApplication.application_url && (
								<div style={{ marginTop: "8px" }}>
									<Button size="small" type="link" onClick={() => window.open(selectedJobApplication.application_url, "_blank")} style={{ padding: 0 }}>
										🔗 View Job Posting
									</Button>
								</div>
							)}
						</Card>
					)}

					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
						<Form.Item name="interview_type" label="Interview Type" initialValue="video">
							<Select>
								<Option value="phone">Phone</Option>
								<Option value="video">Video</Option>
								<Option value="in_person">In Person</Option>
								<Option value="technical">Technical</Option>
								<Option value="behavioral">Behavioral</Option>
							</Select>
						</Form.Item>

						<Form.Item name="status" label="Status" initialValue="scheduled">
							<Select>
								<Option value="scheduled">Scheduled</Option>
								<Option value="completed">Completed</Option>
								<Option value="cancelled">Cancelled</Option>
								<Option value="rescheduled">Rescheduled</Option>
							</Select>
						</Form.Item>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
						<Form.Item name="scheduled_date" label="Scheduled Date & Time" rules={[{ required: true, message: "Please select date and time" }]}>
							<DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: "100%" }} />
						</Form.Item>

						<Form.Item name="duration_minutes" label="Duration (minutes)" initialValue={60}>
							<Select>
								<Option value={30}>30 minutes</Option>
								<Option value={45}>45 minutes</Option>
								<Option value={60}>1 hour</Option>
								<Option value={90}>1.5 hours</Option>
								<Option value={120}>2 hours</Option>
							</Select>
						</Form.Item>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
						<Form.Item name="interviewer_name" label="Interviewer Name">
							<Input placeholder="Enter interviewer name" />
						</Form.Item>

						<Form.Item name="interviewer_email" label="Interviewer Email">
							<Input placeholder="Enter interviewer email" />
						</Form.Item>
					</div>

					<Form.Item name="location" label="Location">
						<Input placeholder="Enter location or 'Online' for virtual interviews" />
					</Form.Item>

					<Form.Item name="meeting_link" label="Meeting Link">
						<Input placeholder="Enter Zoom, Teams, or other meeting link" />
					</Form.Item>

					<Form.Item name="job_description" label="Job Description">
						<TextArea rows={4} placeholder="Enter or paste the job description here..." style={{ resize: "vertical" }} />
					</Form.Item>

					<Form.Item name="resume_upload" label="Resume Upload (Optional)">
						<div style={{ marginBottom: "8px" }}>
							<Upload
								fileList={fileList}
								onChange={handleFileUpload}
								beforeUpload={() => false} // Prevent auto upload
								accept=".pdf,.doc,.docx,.txt"
								maxCount={1}
							>
								<Button icon={<UploadOutlined />}>{uploadedFileName ? `Replace: ${uploadedFileName}` : "Select Resume File"}</Button>
							</Upload>
							{uploadedFileName && (
								<div style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>
									<FileOutlined style={{ marginRight: "4px" }} />
									Selected: {uploadedFileName}
								</div>
							)}
						</div>
						<div style={{ fontSize: "12px", color: "#999" }}>Supported formats: PDF, DOC, DOCX, TXT (Max 5MB)</div>
					</Form.Item>

					<Form.Item name="notes" label="Notes">
						<TextArea rows={3} placeholder="Add any notes or preparation details" />
					</Form.Item>

					{editingInterview?.status === "completed" && (
						<>
							<Form.Item name="feedback" label="Interview Feedback">
								<TextArea rows={4} placeholder="Add your feedback about the interview" />
							</Form.Item>

							<Form.Item name="rating" label="Overall Rating">
								<Rate />
							</Form.Item>
						</>
					)}

					<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px" }}>
						<Button onClick={resetModal}>Cancel</Button>
						<Button type="primary" htmlType="submit">
							{editingInterview ? "Update Interview" : "Schedule Interview"}
						</Button>
					</div>
				</Form>
			</Modal>

			<style>{`
				.today-interview-row {
					background-color: #fff7e6 !important;
					border-left: 4px solid #faad14 !important;
				}
				
				.ant-select-dropdown .ant-select-item-option-content {
					white-space: normal !important;
					padding: 8px 12px !important;
				}
				
				.ant-select-dropdown .ant-select-item {
					padding: 0 !important;
				}
				
				.ant-select-dropdown {
					min-width: 500px !important;
					max-width: 600px !important;
				}
				
				.ant-modal-body {
					max-height: 80vh;
					overflow-y: auto;
				}
				
				.ant-form-item {
					margin-bottom: 16px;
				}
				
				.ant-form-item-label > label {
					font-weight: 500;
				}
				
				.ant-select-selector {
					min-height: 40px !important;
				}
			`}</style>
		</div>
	);
};

export default InterviewsPage;
