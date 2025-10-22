import { useParams, useRouter } from "@/routes/hooks";
import { useGetProposalList } from "@/store/proposalStore";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import Table, { type ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import type { ProposalInfo } from "#/entity";

export default function ProjectPage() {
	// const permissions = useUserPermission();
	const { back } = useRouter();
	const { userId } = useParams();

	const { getProposalList, isLoading: isGetProposalListLoading } = useGetProposalList();

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
			render: (_, record) => <div>{record.company}</div>,
		},
		{
			title: "Job Description",
			dataIndex: "job_description",
			width: 150,
			render: (_, record) => <div className="overflow-auto max-h-20">{record.job_description}</div>,
		},
		{
			title: "Resume",
			dataIndex: "resume",
			width: 50,
			render: (_, record) => <div>{record.resume}</div>,
		},
		{
			title: "Cover Letter",
			dataIndex: "cover_letter",
			width: 50,
			render: (_, record) => <div className="overflow-auto max-h-20">{record.cover_letter}</div>,
		},
		{
			title: "Time",
			dataIndex: "created_at",
			width: 50,
			render: (_, record) => <div>{new Date(record.created_at || "").toLocaleString()}</div>,
		},
	];

	const fetchData = async () => {
		const result = await getProposalList();
		if (result.data) {
			setDataSource(result.data.proposals || []);
		}
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
				<Table rowKey="id" size="small" scroll={{ x: "max-content" }} loading={isGetProposalListLoading} columns={columns} dataSource={dataSource} />
			</CardContent>
		</Card>
	);
}
