import { useAuth } from "@/components/auth/use-auth";
import { useSignIn, useUpdatePassword, useUserInfo } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";

type FieldType = {
	newPassword: string;
	confirmPassword: string;
};

export default function SecurityTab() {
	const navigate = useNavigate();
	const { updatePassword, isLoading: isUpdatePasswordLoading } = useUpdatePassword();
	const { access_token } = useAuth();
	const { id } = useUserInfo();

	const form = useForm<FieldType>({
		defaultValues: {
			newPassword: "",
			confirmPassword: "",
		},
	});

	const handleSubmit = async (values: FieldType) => {
		// Handle form submission to update password
		try {
			await updatePassword(values.newPassword, id || "", access_token || "");
			navigate("/management/user/account", { replace: true });
		} catch (error) {
			toast.error(error, { position: "top-center" });
		}
	};

	return (
		<Card>
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
								{isUpdatePasswordLoading && <Loader2 className="animate-spin mr-2" />}
								Save Changes
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
