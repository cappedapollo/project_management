import { Icon } from "@/components/icon";
import { useForgotPassword } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ReturnButton } from "./components/ReturnButton";
import { LoginStateEnum, useLoginStateContext } from "./providers/login-provider";

function ResetForm() {
	const { t } = useTranslation();
	const { loginState, backToLogin } = useLoginStateContext();
	const form = useForm();
	const { forgotPassword, isLoading } = useForgotPassword();

	const onFinish = (values: any) => {
		forgotPassword(values.email);
	};

	if (loginState !== LoginStateEnum.RESET_PASSWORD) return null;

	return (
		<>
			<div className="mb-8 text-center">
				<Icon icon="local:ic-reset-password" size="100" className="text-primary!" />
			</div>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onFinish)} className="space-y-4">
					<div className="flex flex-col items-center gap-2 text-center">
						<h1 className="text-2xl font-bold">{t("sys.login.forgetFormTitle")}</h1>
						<p className="text-balance text-sm text-muted-foreground">
							Email functionality is disabled. Contact an administrator for password reset assistance.
						</p>
					</div>

					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Input placeholder={t("sys.login.email")} {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button type="submit" className="w-full">
						{isLoading && <Loader2 className="animate-spin mr-2" />}
						Request Password Reset
					</Button>
					<ReturnButton onClick={backToLogin} />
				</form>
			</Form>
		</>
	);
}

export default ResetForm;
