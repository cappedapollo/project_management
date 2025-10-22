import userService from "@/api/services/userService";
import { useAuth } from "@/components/auth/use-auth";
import { Icon } from "@/components/icon";
import { useParams, useRouter } from "@/routes/hooks";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Separator } from "@/ui/separator";
import { Text, Title } from "@/ui/typography";
import { faker } from "@faker-js/faker";
import { useEffect, useState } from "react";
import type { UserInfo } from "#/entity";
import { BasicStatus } from "#/enum";

export default function UserDetail() {
	const { id } = useParams();
	const { user: currentUser } = useAuth();
	const router = useRouter();
	const [user, setUser] = useState<UserInfo | null>(null);
	const [loading, setLoading] = useState(true);
	const [updating, setUpdating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Fetch user data directly from the service
	useEffect(() => {
		const fetchUser = async () => {
			if (!id || !currentUser) return;

			setLoading(true);
			setError(null);

			try {
				// Fetch user data directly from the service instead of using getUserList
				const users = await userService.getUserList(currentUser.id || "");
				const foundUser = users.find((u) => u.id === id);

				if (foundUser) {
					setUser(foundUser as UserInfo);
				} else {
					setError("User not found");
				}
			} catch (err) {
				console.error("Failed to fetch user:", err);
				setError("Failed to load user data");
			} finally {
				setLoading(false);
			}
		};

		fetchUser();
	}, [id, currentUser]); // Only depend on id and currentUser, not the entire getUserList function

	// Handle user status update
	const handleStatusUpdate = async (newStatus: BasicStatus) => {
		if (!user || !currentUser) return;

		setUpdating(true);
		setError(null);

		try {
			const updatedUser = await userService.updateProfile({ status: newStatus }, user.id, currentUser.id || "");

			setUser((prev) => (prev ? { ...prev, status: updatedUser.status } : null));

			console.log(`User ${newStatus === BasicStatus.ENABLE ? "enabled" : "disabled"} successfully`);
		} catch (err) {
			console.error("Failed to update user status:", err);
			setError("Failed to update user status");
		} finally {
			setUpdating(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="text-center space-y-4">
					<div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto" />
					<Text className="text-muted-foreground">Loading user details...</Text>
				</div>
			</div>
		);
	}

	if (error || !user) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="text-center space-y-4">
					<Icon icon="mdi:alert-circle" className="h-16 w-16 text-red-500 mx-auto" />
					<Title as="h3">Error Loading User</Title>
					<Text className="text-muted-foreground">{error || "User not found"}</Text>
					<Button onClick={() => router.back()}>Go Back</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="sm" onClick={() => router.back()}>
						<Icon icon="mdi:arrow-left" className="mr-2" />
						Back to Users
					</Button>
					<Separator orientation="vertical" className="h-6" />
					<Title as="h2" className="text-2xl font-bold">
						User Details
					</Title>
				</div>

				{/* Status Actions */}
				<div className="flex items-center gap-3">
					{user.status === BasicStatus.ENABLE ? (
						<Button variant="destructive" size="sm" onClick={() => handleStatusUpdate(BasicStatus.DISABLE)} disabled={updating}>
							<Icon icon="mdi:block-helper" className="mr-2" />
							{updating ? "Disabling..." : "Disable User"}
						</Button>
					) : (
						<Button variant="default" size="sm" onClick={() => handleStatusUpdate(BasicStatus.ENABLE)} disabled={updating}>
							<Icon icon="mdi:check-circle" className="mr-2" />
							{updating ? "Enabling..." : "Enable User"}
						</Button>
					)}
				</div>
			</div>

			{/* User Information Cards */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Profile Card */}
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Icon icon="mdi:account" className="h-5 w-5" />
							Profile Information
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Avatar and Basic Info */}
						<div className="flex items-start gap-4">
							<img alt={user.username || "User"} src={faker.image.avatarGitHub()} className="h-20 w-20 rounded-full border-2 border-gray-200" />
							<div className="flex-1 space-y-2">
								<div>
									<Title as="h3" className="text-xl font-semibold">
										{user.username || "Not specified"}
									</Title>
									<Text className="text-muted-foreground">{user.email}</Text>
								</div>
								<div className="flex items-center gap-2">
									<Badge variant={user.status === BasicStatus.ENABLE ? "success" : "error"}>{user.status === BasicStatus.ENABLE ? "Active" : "Disabled"}</Badge>
									<Badge variant="outline">{user.role === 0 ? "Admin" : "User"}</Badge>
								</div>
							</div>
						</div>

						<Separator />

						{/* Detailed Information */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Text className="text-sm font-medium text-muted-foreground">Country</Text>
								<Text className="text-sm">{user.country || "Not specified"}</Text>
							</div>
							<div>
								<Text className="text-sm font-medium text-muted-foreground">User ID</Text>
								<Text className="text-sm font-mono">{user.id}</Text>
							</div>
							<div>
								<Text className="text-sm font-medium text-muted-foreground">Created</Text>
								<Text className="text-sm">{user.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}</Text>
							</div>
							<div>
								<Text className="text-sm font-medium text-muted-foreground">Last Updated</Text>
								<Text className="text-sm">Unknown</Text>
							</div>
						</div>

						{/* Summary */}
						{user.summary && (
							<>
								<Separator />
								<div>
									<Text className="text-sm font-medium text-muted-foreground mb-2">Summary</Text>
									<Text className="text-sm leading-relaxed">{user.summary}</Text>
								</div>
							</>
						)}
					</CardContent>
				</Card>

				{/* Status and Actions Card */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Icon icon="mdi:cog" className="h-5 w-5" />
							Account Status
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Current Status */}
						<div className="space-y-2">
							<Text className="text-sm font-medium text-muted-foreground">Current Status</Text>
							<Badge variant={user.status === BasicStatus.ENABLE ? "success" : "error"} className="text-sm px-3 py-1">
								{user.status === BasicStatus.ENABLE ? "Active" : "Disabled"}
							</Badge>
						</div>

						<Separator />

						{/* Status Actions */}
						<div className="space-y-3">
							<Text className="text-sm font-medium text-muted-foreground">Actions</Text>

							{user.status === BasicStatus.ENABLE ? (
								<Button variant="destructive" className="w-full" onClick={() => handleStatusUpdate(BasicStatus.DISABLE)} disabled={updating}>
									<Icon icon="mdi:block-helper" className="mr-2" />
									{updating ? "Disabling..." : "Disable User"}
								</Button>
							) : (
								<Button variant="default" className="w-full" onClick={() => handleStatusUpdate(BasicStatus.ENABLE)} disabled={updating}>
									<Icon icon="mdi:check-circle" className="mr-2" />
									{updating ? "Enabling..." : "Enable User"}
								</Button>
							)}

							<Button variant="outline" className="w-full" onClick={() => router.push(`/management/system/user/${user.id}/edit`)}>
								<Icon icon="mdi:pencil" className="mr-2" />
								Edit Profile
							</Button>
						</div>

						{/* Status Information */}
						<div className="space-y-2 pt-4">
							<Text className="text-sm font-medium text-muted-foreground">Status Information</Text>
							<div className="text-xs text-muted-foreground space-y-1">
								<p>
									<strong>Active:</strong> User can access the platform and all features
								</p>
								<p>
									<strong>Disabled:</strong> User cannot access the platform or any features
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Error Display */}
			{error && (
				<Card className="border-red-200 bg-red-50">
					<CardContent className="pt-6">
						<div className="flex items-center gap-2 text-red-700">
							<Icon icon="mdi:alert-circle" className="h-4 w-4" />
							<Text className="text-sm">{error}</Text>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
