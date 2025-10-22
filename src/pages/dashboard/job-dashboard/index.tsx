import dashboardService, { type DashboardStats } from "@/api/services/dashboardService";
import { useAuth } from "@/components/auth/use-auth";
import Icon from "@/components/icon/icon";
import SimpleJobApplicationModal, { type SimpleJobApplicationModalProps } from "@/components/simple-job-application-modal";
import InterviewModal, { type InterviewModalProps } from "@/pages/management/user/interview/detail/interview-modal";
import { useRouter } from "@/routes/hooks";
import userStore from "@/store/userStore";
import type { InterviewInfo, ProposalInfo } from "@/types/entity";
import { InterviewProgress } from "@/types/enum";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { ModernButton } from "@/ui/modern-button";
import { ModernCard } from "@/ui/modern-card";
import { ModernStatsCard } from "@/ui/modern-stats-card";
import { Text, Title } from "@/ui/typography";
import { CalendarOutlined, ClockCircleOutlined, FallOutlined, FileTextOutlined, PercentageOutlined, RiseOutlined } from "@ant-design/icons";
import { Card as AntCard, Avatar, Badge, Col, Divider, Progress, Row, Space, Spin, Statistic, Typography } from "antd";
import { m } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import PersonalTrendsChart from "./personal-trends-chart";

// Modern Ant Design Statistic Card Component
function ModernAntStatCard({
	title,
	value,
	trend,
	icon,
	colorScheme = "blue",
	onClick,
	suffix,
}: {
	title: string;
	value: number;
	trend?: { value: number; type: "increase" | "decrease" };
	icon: React.ReactNode;
	colorScheme?: "blue" | "green" | "orange" | "purple" | "red" | "gray";
	onClick?: () => void;
	suffix?: string;
}) {
	const colorConfig = {
		blue: { bg: "#e6f4ff", border: "#91caff", iconColor: "#1677ff" },
		green: { bg: "#f6ffed", border: "#b7eb8f", iconColor: "#52c41a" },
		orange: { bg: "#fff7e6", border: "#ffd591", iconColor: "#fa8c16" },
		purple: { bg: "#f9f0ff", border: "#d3adf7", iconColor: "#722ed1" },
		red: { bg: "#fff1f0", border: "#ffb3b3", iconColor: "#ff4d4f" },
		gray: { bg: "#fafafa", border: "#d9d9d9", iconColor: "#8c8c8c" },
	};

	const config = colorConfig[colorScheme];

	return (
		<m.div
			whileHover={{
				scale: 1.02,
				boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
			}}
			transition={{ type: "spring", stiffness: 400, damping: 10 }}
		>
			<AntCard
				hoverable={!!onClick}
				onClick={onClick}
				className="h-full"
				style={{
					background: `linear-gradient(135deg, ${config.bg} 0%, rgba(255,255,255,0.9) 100%)`,
					border: `1px solid ${config.border}`,
					borderRadius: "16px",
					boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
				}}
				bodyStyle={{ padding: "24px" }}
			>
				<Space direction="vertical" size="small" style={{ width: "100%" }}>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
						<Avatar
							size={48}
							style={{
								backgroundColor: config.iconColor,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
							icon={icon}
						/>
						{trend && (
							<Badge
								count={
									<Space size={4}>
										{trend.type === "increase" ? (
											<RiseOutlined style={{ color: "#52c41a", fontSize: "12px" }} />
										) : (
											<FallOutlined style={{ color: "#ff4d4f", fontSize: "12px" }} />
										)}
										<span
											style={{
												color: trend.type === "increase" ? "#52c41a" : "#ff4d4f",
												fontSize: "12px",
												fontWeight: 500,
											}}
										>
											{Math.abs(trend.value)}%
										</span>
									</Space>
								}
								style={{
									backgroundColor: trend.type === "increase" ? "#f6ffed" : "#fff1f0",
									border: `1px solid ${trend.type === "increase" ? "#b7eb8f" : "#ffb3b3"}`,
									borderRadius: "12px",
								}}
							/>
						)}
					</div>
					<div>
						<div
							style={{
								color: "#8c8c8c",
								fontSize: "14px",
								fontWeight: 500,
								marginBottom: "8px",
							}}
						>
							{title}
						</div>
						<Statistic
							value={value}
							suffix={suffix}
							valueStyle={{
								color: config.iconColor,
								fontSize: "28px",
								fontWeight: "bold",
								fontFamily: "system-ui, -apple-system, sans-serif",
							}}
						/>
					</div>
				</Space>
			</AntCard>
		</m.div>
	);
}

// Modern Ant Design Quick Action Card Component
function ModernAntQuickActionCard({
	title,
	description,
	icon,
	onClick,
	colorScheme = "blue",
}: {
	title: string;
	description: string;
	icon: React.ReactNode;
	onClick: () => void;
	colorScheme?: "blue" | "green" | "orange" | "purple" | "red" | "gray";
}) {
	const colorConfig = {
		blue: { bg: "#e6f4ff", border: "#91caff", iconColor: "#1677ff" },
		green: { bg: "#f6ffed", border: "#b7eb8f", iconColor: "#52c41a" },
		orange: { bg: "#fff7e6", border: "#ffd591", iconColor: "#fa8c16" },
		purple: { bg: "#f9f0ff", border: "#d3adf7", iconColor: "#722ed1" },
		red: { bg: "#fff1f0", border: "#ffb3b3", iconColor: "#ff4d4f" },
		gray: { bg: "#fafafa", border: "#d9d9d9", iconColor: "#8c8c8c" },
	};

	const config = colorConfig[colorScheme];

	return (
		<m.div
			whileHover={{
				scale: 1.03,
				boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
			}}
			whileTap={{ scale: 0.98 }}
			transition={{ type: "spring", stiffness: 400, damping: 10 }}
		>
			<AntCard
				hoverable
				onClick={onClick}
				className="h-full cursor-pointer"
				style={{
					background: `linear-gradient(135deg, ${config.bg} 0%, rgba(255,255,255,0.95) 100%)`,
					border: `1px solid ${config.border}`,
					borderRadius: "16px",
					boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
				}}
				bodyStyle={{ padding: "20px" }}
			>
				<Space direction="vertical" size={16} style={{ width: "100%" }}>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
						<Avatar
							size={40}
							style={{
								backgroundColor: config.iconColor,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
							icon={icon}
						/>
						<m.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
							<Icon icon="mdi:arrow-right" size={16} className="text-gray-400" />
						</m.div>
					</div>
					<div>
						<Typography.Title level={5} style={{ margin: 0, color: config.iconColor, fontWeight: 600 }}>
							{title}
						</Typography.Title>
						<Typography.Text type="secondary" style={{ fontSize: "13px", lineHeight: "1.4" }}>
							{description}
						</Typography.Text>
					</div>
				</Space>
			</AntCard>
		</m.div>
	);
}

const defaultProposalValue: ProposalInfo = {
	id: "",
	user: "",
	profile: "",
	job_description: "",
	company: "",
	job_link: "",
	cover_letter: "",
	status: "applied",
};

const defaultInterviewValue: InterviewInfo = {
	id: "",
	user: "",
	profile: "",
	meeting_title: "",
	meeting_date: "",
	meeting_link: "",
	job_description: "",
	interviewer: "",
	progress: InterviewProgress.PENDING,
};

export default function JobDashboard() {
	const { user } = useAuth();
	const { push } = useRouter();
	const [stats, setStats] = useState<DashboardStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [timePeriod, setTimePeriod] = useState<string>("month");
	const [simpleModalProps, setSimpleModalProps] = useState<SimpleJobApplicationModalProps>({
		formValue: { ...defaultProposalValue },
		title: "New Job Application",
		show: false,
		onOk: (values) => {
			setSimpleModalProps((prev) => ({ ...prev, show: false }));
			// Refresh the dashboard data
			fetchDashboardData();
		},
		onCancel: () => {
			setSimpleModalProps((prev) => ({ ...prev, show: false }));
		},
	});
	const [interviewModalProps, setInterviewModalProps] = useState<InterviewModalProps>({
		formValue: { ...defaultInterviewValue },
		title: "Schedule Interview",
		show: false,
		onOk: (values) => {
			setInterviewModalProps((prev) => ({ ...prev, show: false }));
			// Refresh the dashboard data
			fetchDashboardData();
		},
		onCancel: () => {
			setInterviewModalProps((prev) => ({ ...prev, show: false }));
		},
	});

	const fetchDashboardData = useCallback(async () => {
		if (!user?.id) return;

		try {
			setLoading(true);
			// Get the auth token from the store
			const userState = userStore.getState();
			const token = userState.userToken?.access_token;

			if (import.meta.env.DEV) {
				console.log("🔍 Dashboard fetch - User ID:", user.id);
				console.log("🔍 Dashboard fetch - Token present:", !!token);
				console.log("🔍 Dashboard fetch - Token preview:", token ? `${token.substring(0, 20)}...` : "No token");
			}

			if (!token) {
				console.error("❌ No access token available for dashboard API call");
				return;
			}

			const dashboardData = await dashboardService.getDashboardStats(user.id, token, timePeriod);
			setStats(dashboardData);
		} catch (error) {
			console.error("Failed to fetch dashboard data:", error);
			// Don't throw the error to prevent redirect
		} finally {
			setLoading(false);
		}
	}, [user?.id, timePeriod]);

	useEffect(() => {
		// Add a small delay to ensure token is stored after login
		const timer = setTimeout(() => {
			fetchDashboardData();
		}, 100);

		return () => clearTimeout(timer);
	}, [fetchDashboardData]);

	const handleTimePeriodChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		setTimePeriod(event.target.value);
	};

	const handleNewJobApplication = () => {
		setSimpleModalProps((prev) => ({
			...prev,
			formValue: {
				...defaultProposalValue,
				user: user?.id || "",
				profile: user?.id || "", // Assuming profile is same as user for now
			},
			title: "New Job Application",
			show: true,
		}));
	};

	const handleScheduleInterview = () => {
		setInterviewModalProps((prev) => ({
			...prev,
			formValue: {
				...defaultInterviewValue,
				user: user?.id || "",
				profile: user?.id || "", // Assuming profile is same as user for now
			},
			title: "Schedule Interview",
			show: true,
		}));
	};

	if (loading) {
		return (
			<m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-64">
				<AntCard
					style={{
						background: "linear-gradient(135deg, #f0f9ff 0%, rgba(255,255,255,0.95) 100%)",
						border: "1px solid #91caff",
						borderRadius: "20px",
						boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
						textAlign: "center",
						minWidth: "300px",
					}}
					bodyStyle={{ padding: "40px" }}
				>
					<Space direction="vertical" size="large" style={{ width: "100%" }}>
						<Spin size="large" />
						<div>
							<Typography.Title level={4} style={{ margin: 0, color: "#1677ff" }}>
								Loading Dashboard
							</Typography.Title>
							<Typography.Text type="secondary">Fetching your latest data...</Typography.Text>
						</div>
					</Space>
				</AntCard>
			</m.div>
		);
	}

	const currentDate = new Date();
	const formattedDate = currentDate.toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});
	const formattedTime = currentDate.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
	});

	return (
		<m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-8">
			{/* Header */}
			<m.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
				<AntCard
					style={{
						background: "linear-gradient(135deg, #f0f9ff 0%, rgba(255,255,255,0.95) 100%)",
						border: "1px solid #91caff",
						borderRadius: "20px",
						boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
					}}
					bodyStyle={{ padding: "32px" }}
				>
					<Row justify="space-between" align="middle" gutter={[24, 24]}>
						<Col xs={24} lg={16}>
							<Space size="large">
								<m.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
									<Avatar
										size={64}
										style={{
											background: "linear-gradient(135deg, #1677ff 0%, #722ed1 100%)",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
										}}
										icon={<FileTextOutlined style={{ fontSize: "28px" }} />}
									/>
								</m.div>
								<div>
									<Typography.Title
										level={1}
										style={{
											margin: 0,
											background: "linear-gradient(135deg, #1677ff 0%, #722ed1 100%)",
											WebkitBackgroundClip: "text",
											WebkitTextFillColor: "transparent",
											backgroundClip: "text",
											fontSize: "32px",
											fontWeight: "bold",
										}}
									>
										My Job Dashboard
									</Typography.Title>
									<Typography.Text type="secondary" style={{ fontSize: "16px" }}>
										Track your job applications and interview progress
									</Typography.Text>
								</div>
							</Space>
						</Col>
						<Col xs={24} lg={8}>
							<m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
								<Space>
									<Typography.Text type="secondary">Time Period:</Typography.Text>
									<select
										value={timePeriod}
										onChange={handleTimePeriodChange}
										style={{
											border: "2px solid #d9d9d9",
											borderRadius: "8px",
											padding: "8px 12px",
											backgroundColor: "white",
											fontSize: "14px",
											cursor: "pointer",
											transition: "border-color 0.3s",
										}}
										onMouseEnter={(e) => {
											const target = e.target as HTMLSelectElement;
											target.style.borderColor = "#91caff";
										}}
										onMouseLeave={(e) => {
											const target = e.target as HTMLSelectElement;
											target.style.borderColor = "#d9d9d9";
										}}
									>
										<option value="today">Today</option>
										<option value="week">This Week</option>
										<option value="month">This Month</option>
										<option value="all">All Time</option>
									</select>
								</Space>
							</m.div>
						</Col>
					</Row>
				</AntCard>
			</m.div>

			{/* Key Statistics */}
			<m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
				<Row gutter={[24, 24]}>
					<Col xs={24} sm={12} lg={6}>
						<ModernAntStatCard
							title="My Applications"
							value={stats?.totalApplications || 0}
							icon={<FileTextOutlined />}
							colorScheme="blue"
							trend={{
								value: Math.abs(stats?.applicationsThisMonth || 0),
								type: (stats?.applicationsThisMonth || 0) >= 0 ? "increase" : "decrease",
							}}
						/>
					</Col>
					<Col xs={24} sm={12} lg={6}>
						<ModernAntStatCard
							title="My Interviews"
							value={stats?.totalInterviews || 0}
							icon={<CalendarOutlined />}
							colorScheme="green"
							trend={{
								value: Math.abs(stats?.interviewsThisMonth || 0),
								type: (stats?.interviewsThisMonth || 0) >= 0 ? "increase" : "decrease",
							}}
						/>
					</Col>
					<Col xs={24} sm={12} lg={6}>
						<ModernAntStatCard
							title="Interview Rate"
							value={stats?.totalApplications ? Math.round((stats?.totalInterviews / stats?.totalApplications) * 100) : 0}
							icon={<PercentageOutlined />}
							colorScheme="purple"
							suffix="%"
							trend={{
								value: stats?.totalApplications ? Math.round((stats?.totalInterviews / stats?.totalApplications) * 100) : 0,
								type: "increase",
							}}
						/>
					</Col>
					<Col xs={24} sm={12} lg={6}>
						<ModernAntStatCard
							title="Offer Rate"
							value={stats?.applicationsByStatus?.offered || 0}
							icon={<ClockCircleOutlined />}
							colorScheme="orange"
							trend={{
								value: stats?.applicationsByStatus?.offered || 0,
								type: (stats?.applicationsByStatus?.offered || 0) > 0 ? "increase" : "decrease",
							}}
						/>
					</Col>
				</Row>
			</m.div>

			{/* Charts Row */}
			<m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
				<Row gutter={[24, 24]}>
					<Col xs={24} lg={12}>
						<PersonalTrendsChart monthlyTrends={stats?.monthlyTrends || []} loading={loading} timePeriod={timePeriod} />
					</Col>
					<Col xs={24} lg={12}>
						<AntCard
							title={
								<Space>
									<Icon icon="mdi:chart-donut" className="h-5 w-5" />
									Application Status
								</Space>
							}
							style={{
								background: "linear-gradient(135deg, #f0f9ff 0%, rgba(255,255,255,0.95) 100%)",
								border: "1px solid #91caff",
								borderRadius: "16px",
								boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
								height: "100%",
							}}
							bodyStyle={{ padding: "24px" }}
						>
							<Space direction="vertical" size="large" style={{ width: "100%" }}>
								<div style={{ textAlign: "center" }}>
									<Typography.Title level={3} style={{ margin: 0, color: "#1677ff" }}>
										Total {stats?.totalApplications || 0}
									</Typography.Title>
								</div>
								<Space direction="vertical" size={16} style={{ width: "100%" }}>
									{[
										{ label: "Applied", count: stats?.applicationsByStatus?.applied || 0, color: "#52c41a" },
										{ label: "Interviewing", count: stats?.applicationsByStatus?.interviewing || 0, color: "#1677ff" },
										{ label: "Offered", count: stats?.applicationsByStatus?.offered || 0, color: "#faad14" },
										{ label: "Rejected", count: stats?.applicationsByStatus?.rejected || 0, color: "#ff4d4f" },
									].map((item, index) => (
										<m.div
											key={item.label}
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: 0.5 + index * 0.1 }}
											style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
										>
											<Space>
												<div
													style={{
														width: 12,
														height: 12,
														borderRadius: "50%",
														backgroundColor: item.color,
													}}
												/>
												<Typography.Text style={{ fontWeight: 500 }}>{item.label}</Typography.Text>
											</Space>
											<Badge
												count={item.count}
												style={{
													backgroundColor: item.color,
													fontWeight: "bold",
												}}
											/>
										</m.div>
									))}
								</Space>
							</Space>
						</AntCard>
					</Col>
				</Row>
			</m.div>

			{/* Interview Progress */}
			<m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
				<AntCard
					title={
						<Space>
							<Icon icon="mdi:progress-clock" className="h-5 w-5" />
							Interview Progress
						</Space>
					}
					style={{
						background: "linear-gradient(135deg, #f6ffed 0%, rgba(255,255,255,0.95) 100%)",
						border: "1px solid #b7eb8f",
						borderRadius: "16px",
						boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
					}}
					bodyStyle={{ padding: "24px" }}
				>
					<Space direction="vertical" size="large" style={{ width: "100%" }}>
						{[
							{ label: "Scheduled", count: stats?.interviewsByProgress?.scheduled || 0, color: "#1677ff" },
							{ label: "Completed", count: stats?.interviewsByProgress?.completed || 0, color: "#52c41a" },
							{ label: "Cancelled", count: stats?.interviewsByProgress?.cancelled || 0, color: "#ff4d4f" },
						].map((item, index) => (
							<m.div
								key={item.label}
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.6 + index * 0.1 }}
								style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
							>
								<Space>
									<div
										style={{
											width: 12,
											height: 12,
											borderRadius: "50%",
											backgroundColor: item.color,
										}}
									/>
									<Typography.Text style={{ fontWeight: 500 }}>{item.label}</Typography.Text>
								</Space>
								<Space size="large">
									<Badge
										count={item.count}
										style={{
											backgroundColor: item.color,
											fontWeight: "bold",
										}}
									/>
									<div style={{ width: "100px" }}>
										<Progress percent={(item.count / Math.max(1, stats?.totalInterviews || 1)) * 100} strokeColor={item.color} showInfo={false} size="small" />
									</div>
								</Space>
							</m.div>
						))}
					</Space>
				</AntCard>
			</m.div>

			{/* Quick Actions */}
			<m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}>
				<AntCard
					title={
						<Space>
							<Icon icon="mdi:lightning-bolt" className="h-5 w-5" />
							Quick Actions
						</Space>
					}
					style={{
						background: "linear-gradient(135deg, #fff7e6 0%, rgba(255,255,255,0.95) 100%)",
						border: "1px solid #ffd591",
						borderRadius: "16px",
						boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
					}}
					bodyStyle={{ padding: "24px" }}
				>
					<Row gutter={[16, 16]}>
						<Col xs={24} sm={12} lg={6}>
							<ModernAntQuickActionCard
								title="Resume Workshop"
								description="Optimize resumes for specific jobs"
								icon={<Icon icon="mdi:file-document-edit" />}
								colorScheme="purple"
								onClick={() => push("/resume-workshop")}
							/>
						</Col>
						<Col xs={24} sm={12} lg={6}>
							<ModernAntQuickActionCard
								title="New Application"
								description="Create a new job application"
								icon={<Icon icon="mdi:plus" />}
								colorScheme="blue"
								onClick={handleNewJobApplication}
							/>
						</Col>
						<Col xs={24} sm={12} lg={6}>
							<ModernAntQuickActionCard
								title="Schedule Interview"
								description="Book a new interview session"
								icon={<Icon icon="mdi:calendar-plus" />}
								colorScheme="green"
								onClick={handleScheduleInterview}
							/>
						</Col>
						<Col xs={24} sm={12} lg={6}>
							<ModernAntQuickActionCard
								title="View Applications"
								description="See all your job applications"
								icon={<Icon icon="mdi:briefcase-variant" />}
								colorScheme="orange"
								onClick={() => push("/dashboard/job-applications")}
							/>
						</Col>
					</Row>
				</AntCard>
			</m.div>

			{/* Modals */}
			<SimpleJobApplicationModal {...simpleModalProps} />
			<InterviewModal {...interviewModalProps} />
		</m.div>
	);
}
