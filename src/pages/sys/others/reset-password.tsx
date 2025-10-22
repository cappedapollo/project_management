import { useAuth } from "@/components/auth/use-auth";
import { GLOBAL_CONFIG } from "@/global-config";
import { useUpdatePassword, useUserInfo } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";

type PasswordResetType = {
	newPassword: string;
	confirmPassword: string;
};

export default function ResetPasswordPage() {
	const { updatePassword, isLoading } = useUpdatePassword();
	const { access_token } = useAuth();
	const { id } = useUserInfo();

	const form = useForm<PasswordResetType>({
		defaultValues: {
			newPassword: "",
			confirmPassword: "",
		},
	});

	const handleSubmit = (values: PasswordResetType) => {
		// Handle form submission to update password
		updatePassword(values.newPassword, id || "", access_token || "");
	};

	return (
		<div className="flex justify-center min-h-svh lg:grid-cols-2 bg-background">
			<Card className="gap-2 text-center w-1/2 self-center mt-8">
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="newPassword"
								rules={{ required: "New password is required" }}
								render={({ field }) => (
									<FormItem>
										<FormLabel>New Password</FormLabel>
										<FormControl>
											<Input type="password" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="confirmPassword"
								rules={{
									required: "Please confirm your new password",
									validate: (value) => value === form.getValues("newPassword") || "Passwords do not match",
								}}
								render={({ field }) => (
									<FormItem>
										<FormLabel>Confirm New Password</FormLabel>
										<FormControl>
											<Input type="password" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="flex w-full justify-end">
								<Button type="submit">
									{isLoading && <Loader2 className="animate-spin mr-2" />}
									Update Password
								</Button>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
