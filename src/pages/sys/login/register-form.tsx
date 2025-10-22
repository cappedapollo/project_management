import userService from "@/api/services/userService";
import { Button } from "@/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ReturnButton } from "./components/ReturnButton";
import { LoginStateEnum, useLoginStateContext } from "./providers/login-provider";

function RegisterForm() {
	const { t } = useTranslation();
	const { loginState, backToLogin } = useLoginStateContext();

	const signUpMutation = useMutation({
		mutationFn: userService.signup,
		onError: (err) => {
			toast.error(`Sign up Error! ${err.message}`, {
				position: "top-center",
			});
		},
	});

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
			confirmPassword: "",
		},
	});

	const onFinish = async (values: any) => {
		const { confirmPassword, ...signUpData } = values;
		await signUpMutation.mutateAsync(signUpData);
		toast.success("Sign up success! You can now log in with your credentials.", {
			closeButton: true,
		});
		backToLogin();
	};

	if (loginState !== LoginStateEnum.REGISTER) return null;

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onFinish)} className="space-y-4">
				<div className="flex flex-col items-center gap-2 text-center">
					<h1 className="text-2xl font-bold">{t("sys.login.signUpFormTitle")}</h1>
				</div>

				{/* <FormField
					control={form.control}
					name="username"
					rules={{ required: t("sys.login.accountPlaceholder") }}
					render={({ field }) => (
						<FormItem>
							<FormControl>
								<Input placeholder={t("sys.login.userName")} {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/> */}

				<FormField
					control={form.control}
					name="email"
					rules={{ required: t("sys.login.emaildPlaceholder") }}
					render={({ field }) => (
						<FormItem>
							<FormControl>
								<Input placeholder={t("sys.login.email")} {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="password"
					rules={{ required: t("sys.login.passwordPlaceholder") }}
					render={({ field }) => (
						<FormItem>
							<FormControl>
								<Input type="password" placeholder={t("sys.login.password")} {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="confirmPassword"
					rules={{
						required: t("sys.login.confirmPasswordPlaceholder"),
						validate: (value) => value === form.getValues("password") || t("sys.login.diffPwd"),
					}}
					render={({ field }) => (
						<FormItem>
							<FormControl>
								<Input type="password" placeholder={t("sys.login.confirmPassword")} {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button type="submit" className="w-full">
					{signUpMutation.isPending && <Loader2 className="animate-spin mr-2" />}
					{t("sys.login.registerButton")}
				</Button>

				<ReturnButton onClick={backToLogin} />
			</form>
		</Form>
	);
}

export default RegisterForm;
