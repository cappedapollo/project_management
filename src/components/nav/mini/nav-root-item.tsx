import Icon from "@/components/icon/icon";
import useLocale from "@/locales/use-locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/utils";
import { NavItemRenderer } from "../components";
import { navItemClasses, navItemStyles } from "../styles";
import type { NavItemProps } from "../types";

export const NavRootItem = (item: NavItemProps) => {
	const { t } = useLocale();
	const content = (
		<>
			{/* Caption */}
			{item.caption && (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger>
							<Icon icon="solar:info-circle-linear" size={16} className="absolute left-1 top-2" />
						</TooltipTrigger>
						<TooltipContent side="right">{t(item.caption)}</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)}

			{/* Icon */}
			<span className="flex items-center justify-center w-6 h-6">
				{item.icon && typeof item.icon === "string" ? <Icon icon={item.icon} size={20} /> : item.icon}
			</span>

			{/* Arrow */}
			{item.hasChild && <Icon icon="eva:arrow-ios-forward-fill" className="absolute right-1 top-2" style={navItemStyles.arrow} />}

			{/* Title */}
			<span className="text-center text-[10px] font-medium leading-tight mt-1 px-1 truncate max-w-full">{t(item.title)}</span>
		</>
	);

	const itemClassName = cn(
		"group relative flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 text-xs font-medium transition-all duration-200 ease-out cursor-pointer text-gray-600 dark:text-gray-300 min-h-[52px]",
		"hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100 hover:shadow-sm hover:scale-105",
		item.active &&
			"bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 shadow-sm border-2 border-blue-200 dark:border-blue-700",
		item.disabled && "cursor-not-allowed hover:bg-transparent text-gray-400 dark:text-gray-600 opacity-50",
	);

	return (
		<NavItemRenderer item={item} className={itemClassName}>
			{content}
		</NavItemRenderer>
	);
};
