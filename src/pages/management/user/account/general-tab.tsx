import { useAuth } from "@/components/auth/use-auth";
import { UploadAvatar } from "@/components/upload";
import { useUpdateUserProfile, useUserInfo } from "@/store/userStore";
import type { UserInfo } from "@/types/entity";
import { BasicStatus } from "@/types/enum";
import { Button } from "@/ui/button";
import { Card, CardContent, CardFooter } from "@/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/ui/form";
import { Input } from "@/ui/input";
import { Switch } from "@/ui/switch";
import { Textarea } from "@/ui/textarea";
import { faker } from "@faker-js/faker";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type FieldType = {
	username?: string;
	email?: string;
	country?: string;
	status?: BasicStatus;
	summary?: string;
};

export default function GeneralTab() {
	const { updateProfile, isLoading } = useUpdateUserProfile();
	const { access_token } = useAuth();
	const { id, avatar, username, email, country, summary } = useUserInfo();
	console.log(avatar, username, email, country, summary);

	const form = useForm<FieldType>({
		defaultValues: {
			username: "",
			email: "",
			country: "",
			status: BasicStatus.ENABLE,
			summary: "",
		},
	});

	// Update form values when user data loads
	useEffect(() => {
		if (username !== undefined || email !== undefined || country !== undefined || summary !== undefined) {
			form.reset({
				username: username ?? "",
				email: email ?? "",
				country: country ?? "",
				status: BasicStatus.ENABLE,
				summary: summary ?? "",
			});
		}
	}, [username, email, country, summary, form]);

	const onSubmit = async (values: FieldType) => {
		const profile: Partial<UserInfo> = {
			username: values.username,
			country: values.country,
			status: values.status,
			summary: values.summary,
		};
		await updateProfile(profile, id || "", access_token || "");
	};

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<div className="flex-1">
				<Card className="flex-col px-6! pb-10! pt-20!">
					<UploadAvatar defaultAvatar={avatar} />

					<div className="flex items-center py-6 gap-2">
						<div>Active Profile</div>
						<Switch />
					</div>

					<Button variant="default">Upload Avatar</Button>
				</Card>
			</div>
			<div className="flex-2">
				<Card>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)}>
							<CardContent>
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<FormField
										control={form.control}
										name="username"
										rules={{ required: "Please input username." }}
										render={({ field }) => (
											<FormItem>
												<FormLabel>Username</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="email"
										disabled
										render={({ field }) => (
											<FormItem>
												<FormLabel>Email</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="country"
										rules={{ required: "Please input username." }}
										render={({ field }) => (
											<FormItem>
												<FormLabel>Country</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="status"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Status</FormLabel>
												<FormControl>
													<Switch
														{...field}
														checked={field.value === BasicStatus.ENABLE}
														onCheckedChange={(checked) => field.onChange(checked ? BasicStatus.ENABLE : BasicStatus.DISABLE)}
													/>
												</FormControl>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="summary"
										render={({ field }) => (
											<FormItem>
												<FormLabel>About</FormLabel>
												<FormControl>
													<Textarea {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
								</div>
							</CardContent>
							<CardFooter>
								<Button type="submit" className="mt-5">
									{isLoading && <Loader2 className="animate-spin mr-2" />}
									Save Changes
								</Button>
							</CardFooter>
						</form>
					</Form>
				</Card>
			</div>
		</div>
	);
}
