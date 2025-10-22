import { Icon } from "@/components/icon";
import Logo from "@/components/logo";
import { NavVertical } from "@/components/nav";
import type { NavProps } from "@/components/nav/types";
import { GLOBAL_CONFIG } from "@/global-config";
import { Button } from "@/ui/button";
import { ScrollArea } from "@/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/ui/sheet";

export function NavMobileLayout({ data }: NavProps) {
	return (
		<Sheet modal={false}>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon">
					<Icon icon="local:ic-menu" size={24} />
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="[&>button]:hidden px-0 w-[280px] bg-white dark:bg-gray-900">
				<div className="flex gap-3 px-4 py-6 h-[var(--layout-header-height)] items-center border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
					<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
						<Logo />
					</div>
					<span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
						{GLOBAL_CONFIG.appName}
					</span>
				</div>
				<ScrollArea className="h-full px-4 py-4 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-900">
					<NavVertical data={data} />
				</ScrollArea>
			</SheetContent>
		</Sheet>
	);
}
