import { useAuth } from "@/components/auth/use-auth";
// Mock data removed - using real database data only
import { Icon } from "@/components/icon";
import { usePathname, useRouter } from "@/routes/hooks";
import { useDeleteUser, useGetUserList } from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { ModernButton } from "@/ui/modern-button";
import { ModernCard } from "@/ui/modern-card";
import { ModernStatsCard } from "@/ui/modern-stats-card";
import { Text, Title } from "@/ui/typography";
import { faker } from "@faker-js/faker";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Role_Old, UserInfo } from "#/entity";
import { BasicStatus } from "#/enum";

export default function UserPage() {
	const { push } = useRouter();
	const pathname = usePathname();
	const { access_token } = useAuth();
	const [users, setUsers] = useState<Partial<UserInfo>[]>([]);

	const { getUserList, isLoading } = useGetUserList();
	const { deleteUser, isLoading: isDeleteLoading } = useDeleteUser();

	const hasInitialized = useRef(false);

	// Fetch users only once on component mount
	useEffect(() => {
		if (hasInitialized.current) return;

		const fetchUsers = async () => {
			try {
				const userList = await getUserList();
				setUsers(userList);
				console.log("Users fetched:", userList.length);
			} catch (error) {
				console.error("Failed to fetch users:", error);
			}
		};

		fetchUsers();
		hasInitialized.current = true;
	}, [getUserList]);

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
		{
			title: "Action",
			key: "operation",
			align: "center",
			width: 100,
			render: (_, record) => (
				<div className="flex w-full justify-center text-gray-500">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => {
							push(`${pathname}/${record.id}`);
						}}
						title="View Details & Manage User"
					>
						<Icon icon="mdi:card-account-details" size={18} />
					</Button>
					{/* <Button variant="ghost" size="icon" onClick={() => {}}>
						<Icon icon="solar:pen-bold-duotone" size={18} />
					</Button> */}
					<Button
						variant="ghost"
						size="icon"
						onClick={async () => {
							if (record.id && window.confirm(`Are you sure you want to delete user "${record.username || record.email}"?`)) {
								await deleteUser(record.id, access_token || "");
								// Refresh the user list after deletion
								const updatedUsers = await getUserList();
								setUsers(updatedUsers);
							}
						}}
						title="Delete User"
					>
						<Icon icon="mingcute:delete-2-fill" size={18} className="text-error!" />
					</Button>
				</div>
			),
		},
	];

	return (
		<m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-8">
			{/* Header */}
			<m.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
				className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
			>
				<div className="space-y-2">
					<div className="flex items-center gap-3">
						<m.div
							initial={{ scale: 0, rotate: -180 }}
							animate={{ scale: 1, rotate: 0 }}
							transition={{ type: "spring", stiffness: 300, damping: 20 }}
							className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400"
						>
							<Icon icon="mdi:account-group" className="h-6 w-6" />
						</m.div>
						<div>
							<Title
								as="h1"
								className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent"
							>
								User Management
							</Title>
							<Text className="text-muted-foreground mt-1">Manage user accounts, roles, and permissions</Text>
						</div>
					</div>
				</div>
				<m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex items-center gap-3">
					<ModernButton glow className="gap-2">
						<Icon icon="mdi:plus" className="h-4 w-4" />
						Add User
					</ModernButton>
					<ModernButton variant="outline" className="gap-2">
						<Icon icon="mdi:download" className="h-4 w-4" />
						Export
					</ModernButton>
				</m.div>
			</m.div>

			{/* Stats Cards */}
			<m.div
				initial={{ opacity: 0, y: 30 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.3, duration: 0.5 }}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
			>
				<ModernStatsCard
					title="Total Users"
					value={users.length}
					icon={<Icon icon="mdi:account-group" className="h-6 w-6" />}
					colorScheme="blue"
					change={{
						value: 12,
						type: "increase",
					}}
				/>
				<ModernStatsCard
					title="Active Users"
					value={users.filter((u) => u.status === BasicStatus.ENABLE).length}
					icon={<Icon icon="mdi:account-check" className="h-6 w-6" />}
					colorScheme="green"
					change={{
						value: 8,
						type: "increase",
					}}
				/>
				<ModernStatsCard
					title="Admin Users"
					value={users.filter((u) => u.role === 0).length}
					icon={<Icon icon="mdi:shield-account" className="h-6 w-6" />}
					colorScheme="purple"
					change={{
						value: 2,
						type: "increase",
					}}
				/>
				<ModernStatsCard
					title="New This Month"
					value={5}
					icon={<Icon icon="mdi:account-plus" className="h-6 w-6" />}
					colorScheme="orange"
					change={{
						value: 25,
						type: "increase",
					}}
				/>
			</m.div>

			{/* Users Table */}
			<m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
				<ModernCard className="overflow-hidden">
					<div className="p-6 border-b border-gray-100 dark:border-gray-800">
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
							<div>
								<Title as="h3" className="text-xl font-semibold">
									All Users
								</Title>
								<Text className="text-muted-foreground text-sm mt-1">{users.length} total users</Text>
							</div>
						</div>
					</div>
					<div className="overflow-x-auto">
						<Table
							rowKey="id"
							size="small"
							scroll={{ x: "max-content" }}
							loading={isLoading || isDeleteLoading}
							columns={columns}
							dataSource={users}
							className="modern-table"
						/>
					</div>
				</ModernCard>
			</m.div>
		</m.div>
	);
}
