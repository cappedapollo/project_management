import apiClient from "@/api/apiClient";
import { useAuth } from "@/components/auth/use-auth";
import { FileOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Card, DatePicker, Form, Input, Modal, Rate, Select, Tag, Upload, message } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import dayjs from "dayjs";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

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
	job_description?: string;
	resume_link?: string;
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
	interview_count?: number;
}

interface CalendarEvent {
	id: number;
	title: string;
	start: string;
	end: string;
	type: string;
	status: string;
	interviewer: string;
	location: string;
	meeting_link?: string;
	company_name: string;
	position_title: string;
	notes?: string;
	feedback?: string;
	rating?: number;
	job_description?: string;
	resume_link?: string;
	interviewer_email?: string;
	duration_minutes?: number;
}

interface InterviewModalProps {
	visible: boolean;
	onCancel: () => void;
	onSuccess: () => void;
	editingInterview?: any;
	initialDate?: dayjs.Dayjs;
}

const InterviewModal: React.FC<InterviewModalProps> = ({ visible, onCancel, onSuccess, editingInterview, initialDate }) => {
	const { user, access_token } = useAuth();
	const [form] = Form.useForm();
	const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
	const [loadingApplications, setLoadingApplications] = useState(false);
	const [selectedJobApplication, setSelectedJobApplication] = useState<JobApplication | null>(null);
	const [showOnlyWithInterviews, setShowOnlyWithInterviews] = useState(false);

	// Resume upload states
	const [uploadedFile, setUploadedFile] = useState<File | null>(null);
	const [uploadedFileName, setUploadedFileName] = useState("");
	const [fileList, setFileList] = useState<any[]>([]);

	// Fetch job applications
	const fetchJobApplications = useCallback(async () => {
		if (!access_token) return;

		setLoadingApplications(true);
		try {
			const response = await apiClient.get({
				url: "/job-applications",
			});

			if (import.meta.env.DEV) {
				console.log("🔍 Job Applications API Response:", response);
			}

			// The API returns job applications under the 'applications' property
			const applications = (response as any)?.applications || [];
			setJobApplications(applications);

			if (import.meta.env.DEV) {
				console.log("📋 Loaded job applications:", applications.length, "applications");
			}
		} catch (error) {
			console.error("Error fetching job applications:", error);
			// Set empty array on error to prevent infinite loading
			setJobApplications([]);
		} finally {
			setLoadingApplications(false);
		}
	}, [access_token]);

	// Filter job applications
	const filteredJobApplications = jobApplications.filter((app) => {
		if (showOnlyWithInterviews) {
			return app.interview_count && app.interview_count > 0;
		}
		return true;
	});

	// Handle job application selection
	const handleJobApplicationSelect = (jobAppId: number) => {
		const selectedApp = jobApplications.find((app) => app.id === jobAppId);
		setSelectedJobApplication(selectedApp || null);

		if (selectedApp) {
			// Auto-fill company and position from selected job application
			form.setFieldsValue({
				company_name: selectedApp.company_name,
				position_title: selectedApp.position_title,
				job_description: selectedApp.job_description,
				location: selectedApp.location,
			});
		}
	};

	// Handle file upload
	const handleFileUpload = ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
		setFileList(newFileList);
		if (newFileList.length > 0) {
			const file = newFileList[0];
			if (file.originFileObj) {
				setUploadedFile(file.originFileObj);
				setUploadedFileName(file.name);
			}
		} else {
			setUploadedFile(null);
			setUploadedFileName("");
		}
	};

	// Reset modal state
	const resetModal = () => {
		form.resetFields();
		setSelectedJobApplication(null);
		setUploadedFile(null);
		setUploadedFileName("");
		setFileList([]);
		onCancel();
	};

	// Handle form submission
	const handleSubmit = async (values: any) => {
		try {
			// Determine company name and position title
			const companyName = selectedJobApplication?.company_name || values.company_name;
			const positionTitle = selectedJobApplication?.position_title || values.position_title;

			if (!companyName || !positionTitle) {
				message.error("Company name and position title are required");
				return;
			}

			// Handle resume upload if there's a new file
			let resumeLink = editingInterview?.resume_link || "";
			if (uploadedFile) {
				try {
					const formData = new FormData();
					formData.append("resume", uploadedFile);
					formData.append("company", companyName);

					const uploadResponse = await fetch("/api/interviews/upload-resume", {
						method: "POST",
						headers: {
							Authorization: `Bearer ${access_token}`,
						},
						body: formData,
					});

					if (uploadResponse.ok) {
						const uploadResult = await uploadResponse.json();
						resumeLink = uploadResult.filePath;
						message.success("Resume uploaded successfully!");
					} else {
						message.warning("Resume upload failed, but interview will be saved without it.");
					}
				} catch (uploadError) {
					console.error("Resume upload error:", uploadError);
					message.warning("Resume upload failed, but interview will be saved without it.");
				}
			}

			// Copy job application resume if no interview resume and job application is selected
			if (!resumeLink && selectedJobApplication?.resume_file_path) {
				try {
					const copyResponse = await fetch("/api/interviews/copy-resume", {
						method: "POST",
						headers: {
							Authorization: `Bearer ${access_token}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							sourceResumePath: selectedJobApplication.resume_file_path,
							company: companyName,
						}),
					});

					if (copyResponse.ok) {
						const copyResult = await copyResponse.json();
						resumeLink = copyResult.filePath;
					}
				} catch (error) {
					console.error("Failed to copy job application resume:", error);
				}
			}

			// Use direct API call
			const method = editingInterview ? "put" : "post";
			const interviewId = editingInterview ? editingInterview.id : null;
			const url = editingInterview ? `/interviews/${interviewId}` : "/interviews";

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
			onSuccess();
		} catch (error) {
			console.error("Error saving interview:", error);
			message.error("Error saving interview");
		}
	};

	// Initialize form when modal opens
	useEffect(() => {
		if (visible) {
			fetchJobApplications();

			if (editingInterview) {
				// Check if it's a CalendarEvent or Interview
				const isCalendarEvent = "start" in editingInterview;

				if (isCalendarEvent) {
					// Handle CalendarEvent
					const event = editingInterview as CalendarEvent;
					form.setFieldsValue({
						interview_type: event.type,
						scheduled_date: event.start ? dayjs(event.start) : null,
						duration_minutes: event.duration_minutes || 60,
						interviewer_name: event.interviewer,
						interviewer_email: event.interviewer_email,
						location: event.location,
						meeting_link: event.meeting_link,
						status: event.status,
						notes: event.notes,
						feedback: event.feedback,
						rating: event.rating,
						job_description: event.job_description,
						company_name: event.company_name,
						position_title: event.position_title,
					});
				} else {
					// Handle Interview
					const interview = editingInterview as Interview;
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
						job_description: interview.job_description,
						company_name: interview.company_name,
						position_title: interview.position_title,
					});
				}

				// Handle resume upload states for editing
				if (editingInterview.resume_link) {
					const filename = editingInterview.resume_link.split("/").pop() || "resume.pdf";
					setUploadedFileName(filename);
					setUploadedFile(null);
					setFileList([
						{
							uid: "-1",
							name: filename,
							status: "done",
							url: editingInterview.resume_link,
						},
					]);
				}
			} else if (initialDate) {
				// Set initial date for new interviews
				form.setFieldsValue({
					scheduled_date: initialDate,
					interview_type: "video",
					status: "scheduled",
					duration_minutes: 60,
				});
			}
		}
	}, [visible, editingInterview, initialDate, form, fetchJobApplications]);

	return (
		<Modal title={editingInterview ? "Edit Interview" : "Schedule New Interview"} open={visible} onCancel={resetModal} footer={null} width={800}>
			<Form form={form} layout="vertical" onFinish={handleSubmit}>
				<div style={{ marginBottom: "16px" }}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
						<div style={{ fontWeight: "500", fontSize: "14px" }}>Job Application (Optional)</div>
						<div style={{ fontSize: "12px", color: "#666" }}>
							<label
								style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
								onClick={() => setShowOnlyWithInterviews(!showOnlyWithInterviews)}
							>
								<input type="checkbox" checked={showOnlyWithInterviews} onChange={(e) => setShowOnlyWithInterviews(e.target.checked)} style={{ margin: 0 }} />
								Show only applications with existing interviews ({filteredJobApplications.length})
							</label>
						</div>
					</div>
				</div>
				<Form.Item name="job_application_id">
					<Select
						placeholder={loadingApplications ? "Loading job applications..." : "Select a job application (optional)"}
						showSearch
						loading={loadingApplications}
						disabled={loadingApplications}
						onChange={handleJobApplicationSelect}
						popupMatchSelectWidth={false}
						dropdownStyle={{
							minWidth: "500px",
							maxWidth: "600px",
						}}
						virtual={false}
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
								{editingInterview?.resume_link && (
									<Button
										size="small"
										type="link"
										onClick={() => {
											const filename = editingInterview.resume_link?.split("/").pop();
											const finalUrl = `http://localhost:4000/api/public/interviews/resumes/${filename}`;
											window.open(finalUrl, "_blank");
										}}
									>
										📄 View Interview Resume
									</Button>
								)}
								{!editingInterview?.resume_link && selectedJobApplication?.resume_file_path && (
									<Button
										size="small"
										type="link"
										onClick={() => {
											const filename = selectedJobApplication.resume_file_path?.split("/").pop();
											const finalUrl = `http://localhost:4000/api/public/resumes/${filename}`;
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
						<Upload fileList={fileList} onChange={handleFileUpload} beforeUpload={() => false} accept=".pdf,.doc,.docx,.txt" maxCount={1}>
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
	);
};

export default InterviewModal;
