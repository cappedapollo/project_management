import type { AuthReq, SignInReq } from "@/api/services/userService";
// import { DB_USER } from "@/data/mock-replacements"; // Removed for production
const DB_USER: any[] = []; // Empty for production
import { useSignIn } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { cn } from "@/utils";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { LoginStateEnum, useLoginStateContext } from "./providers/login-provider";

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"form">) {
	const { t } = useTranslation();

	const { loginState, setLoginState } = useLoginStateContext();
	const { signIn, isLoading } = useSignIn();

	const form = useForm<AuthReq>({
		defaultValues: {
			email: "admin@projectmanagement.com",
			password: "password",
		},
	});

	if (loginState !== LoginStateEnum.LOGIN) return null;

	const handleFinish = async (values: AuthReq) => {
		try {
			await signIn(values);
		} catch (e) {
			console.log("login error =>", e);
		}
	};

	return (
		<div className={cn("flex flex-col gap-6", className)}>
			<Form {...form} {...props}>
				<form onSubmit={form.handleSubmit(handleFinish)} className="space-y-4">
					<div className="flex flex-col items-center gap-2 text-center">
						<h1 className="text-2xl font-bold">{t("sys.login.signInFormTitle")}</h1>
						<p className="text-balance text-sm text-muted-foreground">{t("sys.login.signInFormDescription")}</p>
					</div>

					<FormField
						control={form.control}
						name="email"
						rules={{ required: t("sys.login.accountPlaceholder") }}
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("sys.login.email")}</FormLabel>
								<FormControl>
									<Input placeholder="test@example.com" {...field} />
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
								<FormLabel>{t("sys.login.password")}</FormLabel>
								<FormControl>
									<Input type="password" placeholder="password123" {...field} suppressHydrationWarning />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Password reset functionality disabled */}
					{/* Email functionality has been removed - contact administrator for password reset */}

					{/* 登录按钮 */}
					<Button type="submit" className="w-full">
						{isLoading && <Loader2 className="animate-spin mr-2" />}
						{t("sys.login.loginButton")}
					</Button>

					{/* 注册 */}
					<div className="text-center text-sm">
						{t("sys.login.noAccount")}
						<Button variant="link" className="px-1" onClick={() => setLoginState(LoginStateEnum.REGISTER)}>
							{t("sys.login.signUpFormTitle")}
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
}

export default LoginForm;
