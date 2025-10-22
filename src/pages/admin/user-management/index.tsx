import { useAuth } from "@/components/auth/use-auth";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

interface User {
	id: number;
	username: string;
	email: string;
	role: number; // 0=admin, 1=user, 2=caller
	is_active: boolean;
	created_at: string;
	last_login: string | null;
	total_applications: number;
	total_interviews: number;
}

const AdminUserManagementPage: React.FC = () => {
	const { user, access_token, isAuthenticated } = useAuth();
	const [loading, setLoading] = useState(true);
	const [users, setUsers] = useState<User[]>([]);
	const [fetchError, setFetchError] = useState<string | null>(null);
	const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

	const fetchUsers = useCallback(async () => {
		if (!access_token || !user || user.role !== 0) {
			setLoading(false);
			return;
		}

		try {
			const response = await fetch("/api/admin/users", {
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				const data = await response.json();
				setUsers(data.users || []);
				setFetchError(null);
			} else {
				const errorData = await response.json();
				setFetchError(errorData.error || "Failed to fetch users");
			}
		} catch (error) {
			console.error("Error fetching users:", error);
			setFetchError("Network error occurred");
		} finally {
			setLoading(false);
		}
	}, [access_token, user]);

	const toggleUserStatus = useCallback(
		async (userId: number, currentStatus: boolean) => {
			if (!access_token || !user || user.role !== 0) {
				return;
			}

			setUpdatingUserId(userId);
			try {
				const response = await fetch(`/api/admin/users/${userId}/toggle-status`, {
					method: "PUT",
					headers: {
						Authorization: `Bearer ${access_token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						is_active: !currentStatus,
					}),
				});

				if (response.ok) {
					// Update the user in the local state
					setUsers((prevUsers) => prevUsers.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u)));
				} else {
					const errorData = await response.json();
					alert(`Failed to update user status: ${errorData.error || "Unknown error"}`);
				}
			} catch (error) {
				console.error("Error toggling user status:", error);
				alert("Network error occurred while updating user status");
			} finally {
				setUpdatingUserId(null);
			}
		},
		[access_token, user],
	);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	if (loading) {
		return (
			<div className="p-6">
				<h1 className="text-2xl font-bold mb-4">User Management</h1>
				<div className="animate-pulse">
					<div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
					<div className="h-4 bg-gray-200 rounded w-1/2" />
				</div>
			</div>
		);
	}

	return (
		<div className="p-6">
			<h1 className="text-2xl font-bold mb-4">User Management</h1>

			<div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
				<h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
				<div className="space-y-1 text-sm">
					<p>
						<strong>User:</strong> {user ? `${user.username} (Role: ${user.role})` : "Not logged in"}
					</p>
					<p>
						<strong>Authenticated:</strong> {isAuthenticated ? "✅ Yes" : "❌ No"}
					</p>
					<p>
						<strong>Token:</strong> {access_token ? `✅ Present (${access_token.length} chars)` : "❌ Missing"}
					</p>
				</div>
			</div>

			{!user && (
				<div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
					<p>⚠️ Please log in to access user management features.</p>
				</div>
			)}

			{user && user.role !== 0 && (
				<div className="p-4 bg-red-50 border border-red-200 rounded">
					<p>🚫 Access denied. Admin role required. Your role: {user.role}</p>
				</div>
			)}

			{user && user.role === 0 && (
				<div className="space-y-6">
					<div className="p-4 bg-green-50 border border-green-200 rounded">
						<p>✅ Admin access confirmed! Manage user accounts and approvals.</p>
					</div>

					{fetchError && (
						<div className="p-4 bg-red-50 border border-red-200 rounded">
							<p>❌ Error: {fetchError}</p>
						</div>
					)}

					{users.length > 0 && (
						<>
							{/* Summary Cards */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
								<div className="bg-white p-4 rounded-lg border">
									<div className="text-2xl font-bold text-blue-600">{users.length}</div>
									<div className="text-sm text-gray-600">Total Users</div>
								</div>
								<div className="bg-white p-4 rounded-lg border">
									<div className="text-2xl font-bold text-green-600">{users.filter((u) => u.is_active).length}</div>
									<div className="text-sm text-gray-600">Active Users</div>
								</div>
								<div className="bg-white p-4 rounded-lg border">
									<div className="text-2xl font-bold text-yellow-600">{users.filter((u) => !u.is_active).length}</div>
									<div className="text-sm text-gray-600">Pending Approval</div>
								</div>
							</div>

							{/* Pending Approvals Alert */}
							{users.filter((u) => !u.is_active).length > 0 && (
								<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
									<div className="flex items-center">
										<div className="flex-shrink-0">
											<div className="w-5 h-5 text-yellow-400">⚠️</div>
										</div>
										<div className="ml-3">
											<h3 className="text-sm font-medium text-yellow-800">{users.filter((u) => !u.is_active).length} user(s) awaiting approval</h3>
											<div className="mt-1 text-sm text-yellow-700">New registrations require admin approval before users can login.</div>
										</div>
									</div>
								</div>
							)}

							<div className="bg-white border rounded-lg overflow-hidden">
								<div className="px-6 py-4 bg-gray-50 border-b">
									<h3 className="text-lg font-semibold">Users ({users.length})</h3>
								</div>
								<div className="overflow-x-auto">
									<table className="w-full">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applications</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interviews</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{users.map((userData) => (
												<tr key={userData.id} className="hover:bg-gray-50">
													<td className="px-6 py-4 whitespace-nowrap">
														<div>
															<div className="text-sm font-medium text-gray-900">{userData.username}</div>
															<div className="text-sm text-gray-500">{userData.email}</div>
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<span
															className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
																userData.role === 0
																	? "bg-purple-100 text-purple-800"
																	: userData.role === 1
																		? "bg-blue-100 text-blue-800"
																		: "bg-green-100 text-green-800"
															}`}
														>
															{userData.role === 0 ? "Admin" : userData.role === 1 ? "User" : "Caller"}
														</span>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<span
															className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
																userData.is_active ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
															}`}
														>
															{userData.is_active ? "Active" : "Pending Approval"}
														</span>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userData.total_applications || 0}</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userData.total_interviews || 0}</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
														{userData.last_login ? new Date(userData.last_login).toLocaleDateString() : "Never"}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
														<div className="flex items-center space-x-2">
															<button
																type="button"
																onClick={() => toggleUserStatus(userData.id, userData.is_active)}
																disabled={updatingUserId === userData.id || userData.id === user?.id}
																className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium transition-colors ${
																	updatingUserId === userData.id
																		? "bg-gray-100 text-gray-400 cursor-not-allowed"
																		: userData.is_active
																			? "bg-red-100 text-red-700 hover:bg-red-200"
																			: "bg-green-100 text-green-700 hover:bg-green-200"
																} ${userData.id === user?.id ? "opacity-50 cursor-not-allowed" : ""}`}
																title={
																	userData.id === user?.id
																		? "Cannot modify your own account"
																		: userData.is_active
																			? "Deactivate user account"
																			: "Approve and activate user account"
																}
															>
																{updatingUserId === userData.id ? (
																	<>
																		<div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1" />
																		Updating...
																	</>
																) : userData.is_active ? (
																	"Deactivate"
																) : (
																	"Approve"
																)}
															</button>
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						</>
					)}

					{users.length === 0 && !fetchError && (
						<div className="p-4 bg-gray-50 border border-gray-200 rounded text-center">
							<p>No users found.</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default AdminUserManagementPage;
