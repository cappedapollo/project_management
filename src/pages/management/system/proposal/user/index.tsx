// Mock data removed - using real database data only
import { usePathname, useRouter } from "@/routes/hooks";
import { useGetUserList } from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { faker } from "@faker-js/faker";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo } from "react";
import type { UserInfo } from "#/entity";
import { BasicStatus } from "#/enum";

// TODO: fix
// const USERS: UserInfo[] = USER_LIST as UserInfo[];
const USERS: Partial<UserInfo>[] = [];

export default function ProposalUserPage() {
	const { push } = useRouter();
	const pathname = usePathname();

	const { getUserList, isLoading } = useGetUserList();

	const onInitial = useCallback(async () => {
		USERS.length = 0;
		const users = await getUserList();
		USERS.push(...users);
		console.log(USERS);
	}, [getUserList]);

	useEffect(() => {
		onInitial();
	}, [onInitial]);

	const handleClickRow = (userId: string) => {
		push(`${pathname}/${userId}`);
	};

	const columns: ColumnsType<Partial<UserInfo>> = [
		{
			title: "Name",
			dataIndex: "username",
			width: 150,
			render: (_, record) => {
				return (
					<div className="flex">
						<img alt="" src={faker.image.avatarGitHub()} className="h-10 w-10 rounded-full" />
						<div className="ml-2 flex flex-col">
							<span className="text-sm">{record.username ?? "not specified"}</span>
							<span className="text-xs text-text-secondary">{record.email}</span>
						</div>
					</div>
				);
			},
		},
		{
			title: "Email",
			dataIndex: "email",
			align: "center",
			width: 120,
			render: (_, record) => <span className="text-sm">{record.email}</span>,
		},
		{
			title: "Country",
			dataIndex: "country",
			align: "center",
			width: 120,
			render: (_, record) => <Badge variant="default">{record.country ?? "not specified"}</Badge>,
		},
		{
			title: "Summary",
			dataIndex: "summary",
			align: "center",
			width: 120,
			render: (_, record) => <span className="text-sm">{record.summary}</span>,
		},
		{
			title: "Status",
			dataIndex: "status",
			align: "center",
			width: 120,
			render: (status) => <Badge variant={status === BasicStatus.DISABLE ? "error" : "success"}>{status === BasicStatus.DISABLE ? "Disable" : "Enable"}</Badge>,
		},
	];

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>User List</div>
				</div>
			</CardHeader>
			<CardContent>
				<Table
					rowKey="id"
					size="small"
					scroll={{ x: "max-content" }}
					loading={isLoading}
					columns={columns}
					dataSource={USERS}
					onRow={(record, index) => {
						return {
							onClick: () => handleClickRow(record.id || ""),
							className: "cursor-pointer",
						};
					}}
				/>
			</CardContent>
		</Card>
	);
}
