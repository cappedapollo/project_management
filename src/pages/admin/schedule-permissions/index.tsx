import { useAuth } from "@/components/auth/use-auth";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Text, Title } from "@/ui/typography";
import { Badge, Button, Modal, Select, Space, Switch, Table, Tag, Tooltip, message } from "antd";
import dayjs from "dayjs";
import React from "react";
import { useCallback, useEffect, useState } from "react";

const { Option } = Select;

interface User {
	id: number;
	username: string;
	email: string;
	full_name: string | null;
	role: number; // 0=admin, 1=user, 2=caller
	is_active: boolean;
	created_at: string;
}

interface SchedulePermission {
	id: number;
	user_id: number;
	target_user_id: number;
	granted_by: number;
	granted_at: string;
	is_active: boolean;
	user: {
		username: string;
		email: string;
		full_name: string | null;
		role: number;
	};
	target_user: {
		username: string;
		email: string;
		full_name: string | null;
	};
	granted_by_user: {
		username: string;
		email: string;
	};
}

const AdminSchedulePermissionsPage: React.FC = () => {
	const { user, access_token } = useAuth();
	const [users, setUsers] = useState<User[]>([]);
	const [permissions, setPermissions] = useState<SchedulePermission[]>([]);
	const [loading, setLoading] = useState(true);
	const [addModalVisible, setAddModalVisible] = useState(false);
	const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
	const [selectedTargetUserIds, setSelectedTargetUserIds] = useState<number[]>([]);
	const [updating, setUpdating] = useState<number | null>(null);

	// Fetch users and permissions
	const fetchData = useCallback(async () => {
		if (!access_token || !user || user.role !== 0) {
			setLoading(false);
			return;
		}

		try {
			setLoading(true);

			// Fetch users with permission status
			const usersResponse = await fetch("/api/admin/schedule-permissions/users", {
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
			});

			// Fetch existing permissions
			const permissionsResponse = await fetch("/api/admin/schedule-permissions", {
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
			});

			if (usersResponse.ok && permissionsResponse.ok) {
				const usersData = await usersResponse.json();
				const permissionsData = await permissionsResponse.json();

				// Force re-render by creating new array references
				setUsers([...(usersData.users || [])]);
				setPermissions([...(permissionsData.permissions || [])]);

				// Permissions loaded successfully
			} else {
				if (!usersResponse.ok) {
					const usersError = await usersResponse.json();
					console.error("❌ Users API failed:", usersError);
				}
				if (!permissionsResponse.ok) {
					const permissionsError = await permissionsResponse.json();
					console.error("❌ Permissions API failed:", permissionsError);
				}
				console.error("Failed to fetch schedule permissions data");
				message.error("Failed to load data");
			}
		} catch (error) {
			console.error("❌ Error fetching schedule permissions:", error);
			message.error("Error loading data");
		} finally {
			setLoading(false);
		}
	}, [access_token, user]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Grant permission to user (supports both single and multiple target users)
	const grantPermission = async (userId: number, targetUserIds: number | number[]) => {
		if (!access_token) {
			console.error("No access token available");
			message.error("Authentication required");
			return;
		}

		try {
			setUpdating(userId);
			const targetIds = Array.isArray(targetUserIds) ? targetUserIds : [targetUserIds];

			const response = await fetch("/api/admin/schedule-permissions/grant", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ user_id: userId, target_user_ids: targetIds }),
			});

			if (response.ok) {
				const result = await response.json();
				// Don't show individual success messages or refresh data here
				// The parent function will handle summary messages and data refresh
				return result;
			}

			const error = await response.json();
			console.error("❌ Grant permission failed:", error);
			// Throw error so parent function can handle it
			throw new Error(error.error || "Failed to grant permission");
		} catch (error) {
			console.error("❌ Error granting permission:", error);
			// Re-throw error so parent function can handle it
			throw error;
		} finally {
			setUpdating(null);
		}
	};

	// Revoke permission from user
	const revokePermission = async (permissionId: number) => {
		if (!access_token) return;

		try {
			setUpdating(permissionId);
			const response = await fetch("/api/admin/schedule-permissions/revoke", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ permission_id: permissionId }),
			});

			if (response.ok) {
				message.success("Permission revoked successfully");
				// Force refresh data and re-render with a slight delay
				await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay
				await fetchData();
			} else {
				const error = await response.json();
				message.error(error.error || "Failed to revoke permission");
			}
		} catch (error) {
			console.error("Error revoking permission:", error);
			message.error("Error revoking permission");
		} finally {
			setUpdating(null);
		}
	};

	// Add permission from modal
	const handleAddPermission = async () => {
		if (!selectedUserId || selectedTargetUserIds.length === 0) {
			message.error("Please select both user and at least one target user");
			return;
		}

		try {
			// Grant all permissions in a single API call
			const result = await grantPermission(selectedUserId, selectedTargetUserIds);

			// Show appropriate message based on the result
			if (result?.success) {
				const { successful = [], failed = [], alreadyExists = [] } = result.results || {};

				if (failed.length > 0) {
					// Some permissions failed
					message.error(result.message);
				} else if (alreadyExists.length > 0 && successful.length === 0) {
					// All permissions already existed
					message.warning(result.message);
				} else if (alreadyExists.length > 0 && successful.length > 0) {
					// Mixed results - some new, some already existed
					message.info(result.message);
				} else {
					// All permissions granted successfully
					message.success(result.message);
				}
			} else {
				message.error("Failed to grant permissions");
			}
		} catch (error) {
			console.error("Error granting permissions:", error);
			message.error(error.message || "Failed to grant permissions");
		}

		// Refresh data after processing with a slight delay to ensure backend completion
		await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay
		await fetchData();

		// Close modal and reset state
		setAddModalVisible(false);
		setSelectedUserId(null);
		setSelectedTargetUserIds([]);
	};

	const getRoleColor = (role: number) => {
		switch (role) {
			case 0:
				return "red";
			case 1:
				return "blue";
			case 2:
				return "green";
			default:
				return "default";
		}
	};

	const getRoleText = (role: number) => {
		switch (role) {
			case 0:
				return "Admin";
			case 1:
				return "User";
			case 2:
				return "Caller";
			default:
				return "Unknown";
		}
	};

	// Users table columns - simplified to show basic user info
	const userColumns = [
		{
			title: "User",
			key: "user",
			render: (record: User) => (
				<div>
					<div className="font-medium">{record.username}</div>
					<div className="text-sm text-gray-500">{record.email}</div>
					{record.full_name && <div className="text-sm text-gray-400">{record.full_name}</div>}
				</div>
			),
			sorter: (a: User, b: User) => a.username.localeCompare(b.username),
		},
		{
			title: "Role",
			dataIndex: "role",
			key: "role",
			render: (role: number) => <Tag color={getRoleColor(role)}>{getRoleText(role)}</Tag>,
			filters: [
				{ text: "Admin", value: 0 },
				{ text: "User", value: 1 },
				{ text: "Caller", value: 2 },
			],
			onFilter: (value: any, record: User) => record.role === value,
		},
		{
			title: "Status",
			dataIndex: "is_active",
			key: "is_active",
			render: (isActive: boolean) => <Tag color={isActive ? "green" : "red"}>{isActive ? "Active" : "Inactive"}</Tag>,
			filters: [
				{ text: "Active", value: true },
				{ text: "Inactive", value: false },
			],
			onFilter: (value: any, record: User) => record.is_active === value,
		},
		{
			title: "Permissions Granted",
			key: "permissions_count",
			render: (record: User) => {
				const userPermissions = permissions.filter((p) => {
					const permissionUserId = Number(p.user_id);
					const recordId = Number(record.id);
					const isActive = Boolean(p.is_active);

					// Permission filtering logic - no debug output

					return permissionUserId === recordId && isActive;
				});

				// Count permissions for this user

				return (
					<div className="text-center">
						<Badge count={userPermissions.length} showZero />
						<div className="text-xs text-gray-500">Can view schedules</div>
					</div>
				);
			},
		},
		{
			title: "Joined",
			dataIndex: "created_at",
			key: "created_at",
			render: (date: string) => dayjs(date).format("MMM DD, YYYY"),
			sorter: (a: User, b: User) => (dayjs(a.created_at).isBefore(dayjs(b.created_at)) ? -1 : 1),
		},
		{
			title: "Actions",
			key: "actions",
			render: (record: User) => {
				// Don't show permission button for admins
				if (record.role === 0) {
					return <span className="text-gray-400">-</span>;
				}

				// Count existing permissions for this user
				const existingPermissionsCount = permissions.filter((p) => Number(p.user_id) === Number(record.id) && p.is_active).length;

				return (
					<Space>
						<Button
							size="small"
							type="primary"
							icon={<Icon icon="solar:user-plus-bold" size={14} />}
							onClick={() => {
								setSelectedUserId(record.id);
								setSelectedTargetUserIds([]);
								setAddModalVisible(true);
							}}
							loading={updating === record.id}
						>
							{existingPermissionsCount > 0 ? `Add Permission (${existingPermissionsCount})` : "Grant Permission"}
						</Button>
					</Space>
				);
			},
		},
	];

	// Permissions table columns
	const permissionColumns = [
		{
			title: "User (Viewer)",
			key: "user",
			render: (record: SchedulePermission) => (
				<div>
					<div className="font-medium">{record.user.username}</div>
					<div className="text-sm text-gray-500">{record.user.email}</div>
					{record.user.full_name && <div className="text-sm text-gray-400">{record.user.full_name}</div>}
					<Tag color={getRoleColor(record.user.role)} size="small">
						{getRoleText(record.user.role)}
					</Tag>
				</div>
			),
		},
		{
			title: "Can View Schedules Of",
			key: "target_user",
			render: (record: SchedulePermission) => (
				<div>
					<div className="font-medium">{record.target_user.username}</div>
					<div className="text-sm text-gray-500">{record.target_user.email}</div>
					{record.target_user.full_name && <div className="text-sm text-gray-400">{record.target_user.full_name}</div>}
				</div>
			),
		},
		{
			title: "Granted By",
			key: "granted_by",
			render: (record: SchedulePermission) => (
				<div>
					<div className="text-sm">{record.granted_by_user.username}</div>
					<div className="text-xs text-gray-500">{record.granted_by_user.email}</div>
				</div>
			),
		},
		{
			title: "Granted Date",
			dataIndex: "granted_at",
			key: "granted_at",
			render: (date: string) => dayjs(date).format("MMM DD, YYYY HH:mm"),
			sorter: (a: SchedulePermission, b: SchedulePermission) => (dayjs(a.granted_at).isBefore(dayjs(b.granted_at)) ? -1 : 1),
		},
		{
			title: "Status",
			dataIndex: "is_active",
			key: "is_active",
			render: (isActive: boolean) => <Tag color={isActive ? "green" : "red"}>{isActive ? "Active" : "Revoked"}</Tag>,
		},
		{
			title: "Actions",
			key: "actions",
			render: (record: SchedulePermission) => (
				<Space>
					{record.is_active ? (
						<Button size="small" danger loading={updating === record.id} onClick={() => revokePermission(record.id)}>
							Revoke
						</Button>
					) : (
						<Button
							size="small"
							type="primary"
							loading={updating === record.id}
							onClick={async () => {
								try {
									await grantPermission(record.user_id, record.target_user_id);
									message.success("Permission restored successfully");
									await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay
									await fetchData(); // Refresh data after restore
								} catch (error) {
									message.error("Failed to restore permission");
								}
							}}
						>
							Restore
						</Button>
					)}
				</Space>
			),
		},
	];

	// Filter users for the add modal (exclude admins, include all users regardless of status)
	// Filter available users to show users and callers (not admin=0)
	const availableUsers = users.filter((u) => u.role !== 0); // Include users (role=1) and callers (role=2)

	// Filter out users who already have ACTIVE permissions for the specific selected user (prevents duplicates)
	// Use useMemo to ensure this recalculates when dependencies change
	const availableTargetUsers = React.useMemo(() => {
		if (!selectedUserId) return users.filter((u) => u.role === 1); // Only show regular users as targets

		return users.filter((u) => {
			// First filter: Only show regular users (role === 1)
			if (u.role !== 1) {
				return false;
			}

			// Second filter: Check if this specific user-target pair already has an ACTIVE permission
			const matchingPermissions = permissions.filter(
				(permission) => Number(permission.user_id) === Number(selectedUserId) && Number(permission.target_user_id) === Number(u.id),
			);

			const hasActivePermission = matchingPermissions.some((p) => p.is_active);

			// Only show users who don't already have ACTIVE permissions for this specific user-target pair
			// This allows selecting users with revoked permissions (they can be re-granted)
			return !hasActivePermission;
		});
	}, [users, permissions, selectedUserId]);

	if (user?.role !== 0) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="text-center">
						<Icon icon="solar:shield-cross-bold" size={48} className="mx-auto mb-4 text-red-500" />
						<Title level={3}>Access Denied</Title>
						<Text>You don't have permission to access this page.</Text>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (loading) {
		return (
			<div className="p-6">
				<div className="animate-pulse">
					<div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
					<div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
					<div className="h-64 bg-gray-200 rounded" />
				</div>
			</div>
		);
	}

	const activePermissions = permissions.filter((p) => p.is_active);
	const uniqueUsersWithPermission = new Set(activePermissions.map((p) => p.user_id)).size;

	// Basic stats logging
	console.log(`📊 Stats: ${permissions.length} total, ${activePermissions.length} active, ${uniqueUsersWithPermission} users with permissions`);

	return (
		<div className="p-6">
			<div className="flex justify-between items-center mb-6">
				<div>
					<Title level={2} className="flex items-center gap-2">
						<Icon icon="solar:shield-user-bold" size={24} />
						Schedule Permissions Management
					</Title>
					<Text className="text-gray-600">Grant users permission to view specific other users' scheduled interviews and calls</Text>
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
				<Card>
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-blue-600">{users.length}</div>
						<div className="text-sm text-gray-600">Total Users</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-green-600">{uniqueUsersWithPermission}</div>
						<div className="text-sm text-gray-600">Users With Permissions</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-orange-600">{activePermissions.length}</div>
						<div className="text-sm text-gray-600">Active Permissions</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-purple-600">{permissions.length - activePermissions.length}</div>
						<div className="text-sm text-gray-600">Revoked Permissions</div>
					</CardContent>
				</Card>
			</div>

			{/* Actions */}
			<div className="flex justify-between items-center mb-6">
				<div>
					<Text className="text-lg font-medium">Schedule Viewing Permissions</Text>
					<Text className="text-gray-600">Grant users access to view specific other users' interview schedules</Text>
				</div>
				<Space>
					<Button
						type="primary"
						icon={<Icon icon="solar:user-plus-bold" size={16} />}
						onClick={() => {
							setSelectedUserId(null);
							setSelectedTargetUserIds([]);
							setAddModalVisible(true);
						}}
					>
						Grant Permission
					</Button>
					<Button icon={<Icon icon="solar:refresh-bold" size={16} />} onClick={fetchData} loading={loading}>
						Refresh
					</Button>
				</Space>
			</div>

			{/* Users Table */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle>All Users</CardTitle>
				</CardHeader>
				<CardContent>
					<Table
						columns={userColumns}
						dataSource={users}
						rowKey="id"
						pagination={{
							pageSize: 10,
							showSizeChanger: true,
							showQuickJumper: true,
							showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`,
						}}
						scroll={{ x: 800 }}
					/>
				</CardContent>
			</Card>

			{/* Permissions History */}
			<Card>
				<CardHeader>
					<CardTitle>
						Permission History
						<Badge count={activePermissions.length} className="ml-2" />
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Table
						columns={permissionColumns}
						dataSource={permissions}
						rowKey="id"
						pagination={{
							pageSize: 10,
							showSizeChanger: true,
							showQuickJumper: true,
							showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} permissions`,
						}}
						scroll={{ x: 800 }}
					/>
				</CardContent>
			</Card>

			{/* Add Permission Modal */}
			<Modal
				title={`Grant Schedule Permission${selectedUserId ? ` for ${users.find((u) => u.id === selectedUserId)?.username}` : ""}`}
				open={addModalVisible}
				onOk={handleAddPermission}
				onCancel={() => {
					setAddModalVisible(false);
					setSelectedUserId(null);
					setSelectedTargetUserIds([]);
				}}
				okText="Grant Permission"
				cancelText="Cancel"
				width={600}
			>
				<div className="py-4 space-y-4">
					{selectedUserId ? (
						<div className="bg-blue-50 p-3 rounded border">
							<Text className="text-sm">
								<strong>Selected User:</strong> {users.find((u) => u.id === selectedUserId)?.username} ({users.find((u) => u.id === selectedUserId)?.email})
							</Text>
						</div>
					) : (
						<div>
							<Text className="block mb-2 font-medium">Select user who will be granted permission:</Text>
							<Select
								style={{ width: "100%" }}
								placeholder="Select user to grant permission to"
								value={selectedUserId}
								onChange={(value) => {
									setSelectedUserId(value);
									// Clear target user selections when user changes to avoid stale data
									setSelectedTargetUserIds([]);
								}}
								showSearch
								filterOption={(input, option) => (option?.children as string)?.toLowerCase().includes(input.toLowerCase())}
							>
								{availableUsers.map((user) => {
									// Count existing permissions for this user
									const existingPermissionsCount = permissions.filter((p) => Number(p.user_id) === Number(user.id) && p.is_active).length;

									return (
										<Option key={user.id} value={user.id}>
											<div className="flex justify-between items-center">
												<div>
													<div className="flex items-center gap-2">
														<span>{user.username}</span>
														<Tag color={user.is_active ? "green" : "red"} size="small">
															{user.is_active ? "Active" : "Inactive"}
														</Tag>
													</div>
													<div className="text-sm text-gray-500">{user.email}</div>
													<Tag color={getRoleColor(user.role)} size="small">
														{getRoleText(user.role)}
													</Tag>
												</div>
												{existingPermissionsCount > 0 && (
													<Badge
														count={existingPermissionsCount}
														size="small"
														color="blue"
														title={`Already has ${existingPermissionsCount} permission${existingPermissionsCount > 1 ? "s" : ""}`}
													/>
												)}
											</div>
										</Option>
									);
								})}
							</Select>
						</div>
					)}

					<div>
						<Text className="block mb-2 font-medium">Select whose schedules they can view (multiple selection allowed):</Text>
						{selectedUserId && availableTargetUsers.filter((u) => u.id !== selectedUserId).length === 0 ? (
							<div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
								<Text className="text-yellow-800 text-sm">
									<strong>All available permissions already granted!</strong>
									<br />
									This user already has permission to view all other users' schedules. No new permissions can be granted.
								</Text>
							</div>
						) : (
							<Select
								mode="multiple"
								style={{ width: "100%" }}
								placeholder={selectedUserId ? "Select target users whose schedules can be viewed" : "First select a user above"}
								value={selectedTargetUserIds}
								onChange={(value) => {
									setSelectedTargetUserIds(value);
								}}
								showSearch
								filterOption={(input, option) => (option?.children as string)?.toLowerCase().includes(input.toLowerCase())}
								disabled={!selectedUserId}
							>
								{availableTargetUsers
									.filter((u) => u.id !== selectedUserId) // Can't grant permission to view own schedule
									.map((user) => {
										// Check if there's a revoked permission that can be restored
										const hasRevokedPermission = permissions.some(
											(p) => Number(p.user_id) === Number(selectedUserId) && Number(p.target_user_id) === Number(user.id) && !p.is_active,
										);

										return (
											<Option key={user.id} value={user.id}>
												<div className="flex justify-between items-center">
													<div>
														<div className="flex items-center gap-2">
															<span>{user.username}</span>
															<Tag color={user.is_active ? "green" : "red"} size="small">
																{user.is_active ? "Active" : "Inactive"}
															</Tag>
															{hasRevokedPermission && (
																<Tag color="orange" size="small">
																	Can Restore
																</Tag>
															)}
														</div>
														<div className="text-sm text-gray-500">{user.email}</div>
														<Tag color={getRoleColor(user.role)} size="small">
															{getRoleText(user.role)}
														</Tag>
													</div>
												</div>
											</Option>
										);
									})}
							</Select>
						)}
					</div>

					{selectedUserId && selectedTargetUserIds.length > 0 && (
						<div className="bg-blue-50 p-3 rounded border">
							<Text className="text-sm">
								<strong>Permission Summary:</strong> User "{users.find((u) => u.id === selectedUserId)?.username}" will be able to view the interview schedules
								of {selectedTargetUserIds.length === 1 ? "user" : "users"}:{" "}
								{selectedTargetUserIds
									.map((id) => {
										const user = users.find((u) => u.id === id);
										const hasRevokedPermission = permissions.some(
											(p) => Number(p.user_id) === Number(selectedUserId) && Number(p.target_user_id) === Number(id) && !p.is_active,
										);
										return `${user?.username}${hasRevokedPermission ? " (restore)" : " (new)"}`;
									})
									.join(", ")}
								. This helps avoid scheduling conflicts.
							</Text>
						</div>
					)}
				</div>
			</Modal>
		</div>
	);
};

export default AdminSchedulePermissionsPage;
