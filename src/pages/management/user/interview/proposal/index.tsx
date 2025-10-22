import { useParams, usePathname, useRouter } from "@/routes/hooks";
import { useGetProposalList } from "@/store/proposalStore";
import { useUserInfo } from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import Table, { type ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import type { ProposalInfo } from "#/entity";

export default function InterviewProposalPage() {
	// const permissions = useUserPermission();
	const userInfo = useUserInfo();
	const { profileId } = useParams();
	const { push, back } = useRouter();
	const pathname = usePathname();

	const { getProposalList, isLoading } = useGetProposalList();

	const [dataSource, setDataSource] = useState<ProposalInfo[]>([]);

	useEffect(() => {
		fetchData();
	}, []);

	const columns: ColumnsType<ProposalInfo> = [
		{
			title: "Job Link",
			dataIndex: "job_link",
			width: 150,
			sorter: (a, b) => a.id.localeCompare(b.id),
			render: (_, record) => <div>{record.job_link}</div>,
		},
		{
			title: "Company",
			dataIndex: "company",
			width: 150,
			sorter: (a, b) => a.id.localeCompare(b.id),
			render: (_, record) => <div>{record.company}</div>,
		},
		{
			title: "Job Description",
			dataIndex: "job_description",
			width: 150,
			sorter: (a, b) => a.id.localeCompare(b.id),
			render: (_, record) => (
				<div className="max-w-[150px]">
					<div className="text-sm line-clamp-2 text-gray-700">
						{record.job_description ? record.job_description.substring(0, 100) + (record.job_description.length > 100 ? "..." : "") : "No description"}
					</div>
				</div>
			),
		},
		{
			title: "Resume",
			dataIndex: "resume",
			width: 50,
			render: (_, record) => <Badge variant="info">{record.resume}</Badge>,
		},
		{
			title: "Cover Letter",
			dataIndex: "cover_letter",
			width: 50,
			render: (_, record) => <div>{record.cover_letter}</div>,
		},
	];

	const fetchData = async () => {
		const result = await getProposalList();
		if (result.data) {
			setDataSource(result.data.proposals || []);
		}
	};

	const handleRowClick = (proposalId: string) => {
		push(`${pathname}/${proposalId}`);
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<Button variant={"secondary"} onClick={() => back()}>
						{"<"}
					</Button>
					<div>Proposal List</div>
					<div />
				</div>
			</CardHeader>
			<CardContent>
				<Table
					rowKey="id"
					size="small"
					scroll={{ x: "max-content" }}
					loading={isLoading}
					columns={columns}
					dataSource={dataSource}
					onRow={(record, rowIndex) => {
						return {
							onClick: () => handleRowClick(record.id),
							className: "cursor-pointer",
						};
					}}
				/>
			</CardContent>
		</Card>
	);
}
