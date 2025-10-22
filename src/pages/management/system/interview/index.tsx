import { useGetInterviewList } from "@/store/interviewStore";
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardHeader } from "@/ui/card";
import Table, { type ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import type { InterviewInfo } from "#/entity";
import { Interview_Progress_Default } from "../../user/interview/detail/interview-modal";

// export interface InterviewInfoOverride extends Omit<InterviewInfo, 'proposal'> {
//   proposal: {
//     id: string,
//     user: {
//       email: string
//     },
//     profile: {
//       email: string
//     }
//   }
// }

export default function InterviewOverviewPage() {
	// const permissions = useUserPermission();
	const { getInterviewList, isLoading } = useGetInterviewList();

	const [dataSource, setDataSource] = useState<InterviewInfo[]>([]);

	useEffect(() => {
		fetchData();
	}, []);

	const columns: ColumnsType<InterviewInfo> = [
		{
			title: "Meeting Title",
			dataIndex: "meeting_title",
			width: 150,
			sorter: (a, b) => a.id.localeCompare(b.id),
			render: (_, record) => <div>{record.meeting_title}</div>,
		},
		{
			title: "Meeting Link",
			dataIndex: "meeting_link",
			width: 150,
			render: (_, record) => <div>{record.meeting_link}</div>,
		},
		{
			title: "Meeting Date",
			dataIndex: "meeting_date",
			width: 50,
			render: (_, record) => <Badge variant="info">{record.meeting_date}</Badge>,
		},
		{
			title: "Interviewer",
			dataIndex: "interviewer",
			width: 50,
			render: (_, record) => <div>{record.interviewer}</div>,
		},
		{
			title: "Profile",
			dataIndex: "profile",
			width: 50,
			render: (_, record) => <div>{typeof record.profile === "object" && record.profile?.email}</div>,
		},
		{
			title: "User",
			dataIndex: "user",
			width: 50,
			render: (_, record) => <div>{typeof record.user === "object" && record.user?.email}</div>,
		},
		{
			title: "Progress",
			dataIndex: "progress",
			width: 50,
			render: (_, record) => <Badge variant="info">{Interview_Progress_Default.find((item) => item.value === record.progress)?.label}</Badge>,
		},
	];

	const fetchData = async () => {
		const data = await getInterviewList();
		setDataSource(data.interviews || []);
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>Interview List</div>
				</div>
			</CardHeader>
			<CardContent>
				<Table rowKey="id" size="small" scroll={{ x: "max-content" }} loading={isLoading} columns={columns} dataSource={dataSource} />
			</CardContent>
		</Card>
	);
}
