import { Icon } from "@/components/icon";
import { useParams, useRouter } from "@/routes/hooks";
import { useDeleteInterview, useGetInterviewList } from "@/store/interviewStore";
import { useUserInfo } from "@/store/userStore";
import { InterviewProgress } from "@/types/enum";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { DatePicker, Space } from "antd";
import Table, { type ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { type Key, useEffect, useState } from "react";
import type { InterviewInfo } from "#/entity";
import InterviewModal, { Interview_Progress_Default, type InterviewModalProps } from "./interview-modal";

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

export default function InterviewPage() {
	// const permissions = useUserPermission();
	const { back } = useRouter();
	const { profileId } = useParams();
	const userInfo = useUserInfo();

	const { getInterviewList, isLoading: isGetInterviewLoading } = useGetInterviewList();
	const { deleteInterview, isLoading: isDeleteInterviewLoading } = useDeleteInterview();

	const [interviewModalProps, setInterviewModalProps] = useState<InterviewModalProps>({
		formValue: { ...defaultInterviewValue },
		title: "New Interview",
		show: false,
		onOk: () => {
			setInterviewModalProps((prev) => ({ ...prev, show: false }));
			fetchData();
		},
		onCancel: () => {
			setInterviewModalProps((prev) => ({ ...prev, show: false }));
		},
	});

	const [dataSource, setDataSource] = useState<InterviewInfo[]>([]);

	useEffect(() => {
		fetchData();
	}, []);

	const columns: ColumnsType<InterviewInfo> = [
		{
			title: "#",
			dataIndex: "id",
			width: 50,
			sorter: (a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime(),
			defaultSortOrder: "descend",
			render: (_, __, index) => index + 1,
		},
		{
			title: "Meeting Title",
			dataIndex: "meeting_title",
			width: 150,
			render: (_, record) => <div>{record.meeting_title}</div>,
		},
		{
			title: "Meeting Link",
			dataIndex: "meeting_link",
			width: 100,
			render: (_, record) => <div>{record.meeting_link}</div>,
		},
		{
			title: "Meeting Date",
			dataIndex: "meeting_date",
			width: 50,
			filterDropdown: ({
				setSelectedKeys,
				selectedKeys,
				confirm,
				clearFilters,
			}: {
				setSelectedKeys: (selectedKeys: Key[]) => void;
				selectedKeys: Key[];
				confirm: () => void;
				clearFilters?: () => void;
			}) => {
				// safely cast stored ISO strings back to Dayjs range
				const value = Array.isArray(selectedKeys[0]) ? (selectedKeys[0] as string[]) : [];

				const rangeValue: [Dayjs, Dayjs] | undefined = value.length === 2 ? [dayjs(value[0]), dayjs(value[1])] : undefined;

				return (
					<div style={{ padding: 8 }}>
						<DatePicker.RangePicker
							value={rangeValue}
							onChange={(dates) => {
								if (dates?.[0] && dates[1]) {
									const isoRange = [dates[0].toISOString(), dates[1].toISOString()];
									setSelectedKeys([isoRange as unknown as Key]);
								} else {
									setSelectedKeys([]);
								}
							}}
							style={{ marginBottom: 8, display: "block" }}
						/>
						<Space>
							<Button onClick={() => confirm()} className="w-20">
								Filter
							</Button>
							<Button
								onClick={() => {
									clearFilters?.();
									confirm();
								}}
								className="w-20"
							>
								Reset
							</Button>
						</Space>
					</div>
				);
			},
			onFilter: (value: Key | boolean, record: InterviewInfo) => {
				const [start, end] = value as unknown as string[];

				const dateValue = record.meeting_date;
				if (!dateValue) return false;

				const recordDate = dayjs(dateValue);
				return recordDate.isAfter(dayjs(start)) && recordDate.isBefore(dayjs(end));
			},
			// render: (_, record) => <div>{new Date(record.created_at!).toLocaleString()}</div>,
			render: (_, record) => {
				const utcDate = new Date(record.meeting_date || "");
				const estDate = new Date(utcDate.getTime() - 4 * 60 * 60 * 1000);
				const formatted = estDate.toISOString().slice(0, 16).replace("T", " ");

				return <Badge variant="info">{formatted}</Badge>;
			},
		},
		{
			title: "Job Description",
			dataIndex: "job_description",
			width: 200,
			render: (_, record) => (
				<div className="max-w-[200px]">
					<div className="text-sm line-clamp-2 text-gray-700">
						{record.job_description ? record.job_description.substring(0, 120) + (record.job_description.length > 120 ? "..." : "") : "No description"}
					</div>
				</div>
			),
		},
		{
			title: "Profile",
			dataIndex: "profile",
			width: 50,
			render: (_, record) => <div>{typeof record.profile === "object" && record.profile.email}</div>,
		},
		{
			title: "User",
			dataIndex: "user",
			width: 50,
			render: (_, record) => <div>{typeof record.user === "object" && record.user.email}</div>,
		},
		{
			title: "Interviewer",
			dataIndex: "interviewer",
			width: 50,
			render: (_, record) => <div>{record.interviewer}</div>,
		},
		{
			title: "Progress",
			dataIndex: "progress",
			width: 50,
			render: (_, record) => <Badge variant="info">{Interview_Progress_Default.find((item) => item.value === record.progress)?.label}</Badge>,
		},
		{
			title: "Action",
			key: "operation",
			align: "center",
			width: 100,
			render: (_, record) => (
				<div className="flex w-full justify-end text-gray">
					<Button variant="ghost" size="icon" onClick={() => onEdit(record)}>
						<Icon icon="solar:pen-bold-duotone" size={18} />
					</Button>
					<Button variant="ghost" size="icon" onClick={() => onDelete(record)}>
						<Icon icon="mingcute:delete-2-fill" size={18} className="text-error!" />
					</Button>
				</div>
			),
		},
	];

	const onCreate = () => {
		setInterviewModalProps((prev) => ({
			...prev,
			show: true,
			...defaultInterviewValue,
			title: "New Interview",
			formValue: { ...defaultInterviewValue, user: userInfo.id ?? "", profile: profileId ?? "" },
		}));
	};

	const onEdit = (formValue: InterviewInfo) => {
		setInterviewModalProps((prev) => ({
			...prev,
			show: true,
			title: "Edit Interview",
			formValue: {
				...formValue,
				user: typeof formValue.user === "object" ? (formValue.user.id ?? "") : formValue.user,
				profile: typeof formValue.profile === "object" ? (formValue.profile.id ?? "") : formValue.profile,
			},
		}));
	};

	const onDelete = async (formValue: InterviewInfo) => {
		await deleteInterview(formValue.id);
		fetchData();
	};

	const fetchData = async () => {
		const data = await getInterviewList(profileId, userInfo.id);
		setDataSource(data.interviews || []);
	};

	const isInterviewSuccess = (progress: InterviewProgress) => progress === InterviewProgress.SUCCESS;
	const isInterviewFail = (progress: InterviewProgress) => progress === InterviewProgress.FAIL;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<Button variant={"secondary"} onClick={() => back()}>
						{"<"}
					</Button>
					<div>Interview List</div>
					<Button onClick={() => onCreate()}>New Interview</Button>
				</div>
			</CardHeader>
			<CardContent>
				<Table
					rowKey="id"
					size="small"
					scroll={{ x: "max-content" }}
					loading={isGetInterviewLoading || isDeleteInterviewLoading}
					columns={columns}
					dataSource={dataSource}
					rowClassName={(record) => {
						if (record.progress && isInterviewSuccess(record.progress)) {
							return "bg-green-50 dark:bg-green-900/30";
						}
						if (record.progress && isInterviewFail(record.progress)) {
							return "bg-red-50 dark:bg-red-900/30";
						}
						return "";
					}}
				/>
			</CardContent>
			<InterviewModal {...interviewModalProps} />
		</Card>
	);
}
