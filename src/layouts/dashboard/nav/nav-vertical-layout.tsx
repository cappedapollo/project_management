import { Icon } from "@/components/icon";
import Logo from "@/components/logo";
import { NavMini, NavVertical } from "@/components/nav";
import type { NavProps } from "@/components/nav/types";
import { GLOBAL_CONFIG } from "@/global-config";
import { useSettingActions, useSettings } from "@/store/settingStore";
import { ThemeLayout } from "@/types/enum";
import { Button } from "@/ui/button";
import { ScrollArea } from "@/ui/scroll-area";
import { cn } from "@/utils";

type Props = {
	data: NavProps["data"];
	className?: string;
};

export function NavVerticalLayout({ data, className }: Props) {
	const settings = useSettings();
	const { themeLayout } = settings;
	const { setSettings } = useSettingActions();

	const navWidth = themeLayout === ThemeLayout.Vertical ? "var(--layout-nav-width)" : "var(--layout-nav-width-mini)";
	const handleToggle = () => {
		setSettings({
			...settings,
			themeLayout: themeLayout === ThemeLayout.Mini ? ThemeLayout.Vertical : ThemeLayout.Mini,
		});
	};
	return (
		<nav
			data-slot="slash-layout-nav"
			className={cn(
				"fixed inset-y-0 left-0 flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-nav transition-[width] duration-300 ease-in-out shadow-lg",
				className,
			)}
			style={{
				width: navWidth,
			}}
		>
			<div
				className={cn(
					"relative flex items-center py-6 px-4 h-[var(--layout-header-height)] border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900",
					{
						"justify-center px-2": themeLayout === ThemeLayout.Mini,
					},
				)}
			>
				<div className="flex items-center justify-center">
					<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
						<Logo />
					</div>
					<span
						className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent transition-all duration-300 ease-in-out"
						style={{
							opacity: themeLayout === ThemeLayout.Mini ? 0 : 1,
							maxWidth: themeLayout === ThemeLayout.Mini ? 0 : "auto",
							whiteSpace: "nowrap",
							marginLeft: themeLayout === ThemeLayout.Mini ? 0 : "12px",
						}}
					>
						{GLOBAL_CONFIG.appName}
					</span>
				</div>

				<Button
					variant="ghost"
					size="icon"
					onClick={handleToggle}
					className="h-8 w-8 absolute right-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg transition-all duration-200"
				>
					{themeLayout === ThemeLayout.Mini ? <Icon icon="lucide:chevron-right" size={14} /> : <Icon icon="lucide:chevron-left" size={14} />}
				</Button>
			</div>

			<ScrollArea
				className={cn("h-[calc(100vh-var(--layout-header-height))] px-4 py-4 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-900")}
			>
				{themeLayout === ThemeLayout.Mini ? <NavMini data={data} /> : <NavVertical data={data} />}
			</ScrollArea>
		</nav>
	);
}
