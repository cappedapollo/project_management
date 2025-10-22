import { useAuth } from "@/components/auth/use-auth";
import Icon from "@/components/icon/icon";
import { usePathname, useRouter } from "@/routes/hooks";
import { useGetUserProfile } from "@/store/profileStore";
import { useUserInfo } from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { Text, Title } from "@/ui/typography";
import { useCallback, useEffect, useState } from "react";
import type { ProfileInfo } from "#/entity";

export default function ProjectProfilePage() {
	const currentUser = useUserInfo();
	const { access_token } = useAuth();
	const { push } = useRouter();
	const pathname = usePathname();

	const { getUserProfile, isLoading } = useGetUserProfile();

	const [userProfile, setUserProfile] = useState<ProfileInfo | null>(null);

	const fetchData = useCallback(async () => {
		try {
			if (!currentUser.id) {
				setUserProfile(null);
				return;
			}
			const profile = await getUserProfile(currentUser.id, access_token || "");
			setUserProfile(profile);
		} catch (error) {
			console.log("User profile not found - user needs to create one");
			setUserProfile(null);
		}
	}, [currentUser.id, getUserProfile, access_token]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const handleEditProfile = () => {
		if (userProfile) {
			push(`${pathname}/${userProfile.id}`);
		}
	};

	const handleCreateProfile = () => {
		push(`${pathname}/new`);
	};

	if (isLoading) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="flex items-center justify-center">
						<Text>Loading profile...</Text>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!userProfile) {
		return (
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<Title as="h3">Your Profile</Title>
					</div>
				</CardHeader>
				<CardContent className="p-6">
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
							<Icon icon="mdi:account-plus" size={32} color="#6b7280" />
						</div>
						<Title as="h4" className="mb-2">
							No Profile Found
						</Title>
						<Text variant="body2" className="text-muted-foreground mb-6 max-w-md">
							You need to create a profile before you can apply for jobs. Your profile contains your personal information and job preferences.
						</Text>
						<Button onClick={handleCreateProfile} className="bg-blue-600 hover:bg-blue-700">
							<Icon icon="mdi:plus" className="mr-2" />
							Create Profile
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<Title as="h3">Your Profile</Title>
					<Button onClick={handleEditProfile} variant="outline">
						<Icon icon="mdi:pencil" className="mr-2" />
						Edit Profile
					</Button>
				</div>
			</CardHeader>
			<CardContent className="p-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="space-y-4">
						<div>
							<Text variant="body2" className="text-muted-foreground font-medium">
								Name
							</Text>
							<Text variant="body1">{userProfile.name}</Text>
						</div>
						<div>
							<Text variant="body2" className="text-muted-foreground font-medium">
								Date of Birth
							</Text>
							<Badge variant="info">{userProfile.dob}</Badge>
						</div>
						<div>
							<Text variant="body2" className="text-muted-foreground font-medium">
								Gender
							</Text>
							<Text variant="body1">{userProfile.gender}</Text>
						</div>
					</div>
					<div className="space-y-4">
						<div>
							<Text variant="body2" className="text-muted-foreground font-medium">
								Phone
							</Text>
							<Text variant="body1">{userProfile.phone}</Text>
						</div>
						<div>
							<Text variant="body2" className="text-muted-foreground font-medium">
								Email
							</Text>
							<Text variant="body1">{userProfile.email}</Text>
						</div>
						<div>
							<Text variant="body2" className="text-muted-foreground font-medium">
								Job Sites
							</Text>
							<Text variant="body1">{userProfile.job_sites}</Text>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
