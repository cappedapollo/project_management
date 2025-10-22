import Icon from "@/components/icon/icon";
import useLocale from "@/locales/use-locale";
import { TooltipContent } from "@/ui/tooltip";
import { Tooltip } from "@/ui/tooltip";
import { TooltipTrigger } from "@/ui/tooltip";
import { TooltipProvider } from "@/ui/tooltip";
import { cn } from "@/utils";
import { NavItemRenderer } from "../components";
import { navItemClasses, navItemStyles } from "../styles";
import type { NavItemProps } from "../types";

export function NavItem(item: NavItemProps) {
	const { title, icon, info, caption, open, active, disabled, depth, hasChild } = item;
	const { t } = useLocale();

	const content = (
		<>
			{/* Icon */}
			<span style={navItemStyles.icon} className="items-center justify-center">
				{icon && typeof icon === "string" ? <Icon icon={icon} size={18} /> : icon}
			</span>

			{/* Texts */}
			<span style={navItemStyles.texts} className="min-h-[20px]">
				{/* Title */}
				<span style={navItemStyles.title}>{t(title)}</span>

				{/* Caption */}
				{caption && (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<span style={navItemStyles.caption}>{t(caption)}</span>
							</TooltipTrigger>
							<TooltipContent side="top" align="start">
								{t(caption)}
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}
			</span>

			{/* Info */}
			{info && <span style={navItemStyles.info}>{info}</span>}

			{/* Arrow */}
			{hasChild && (
				<Icon
					icon="eva:arrow-ios-forward-fill"
					style={{
						...navItemStyles.arrow,
						transform: open ? "rotate(90deg)" : "rotate(0deg)",
					}}
				/>
			)}
		</>
	);

	const itemClassName = cn(
		navItemClasses.base,
		navItemClasses.hover,
		"min-h-[48px]",
		active && navItemClasses.active,
		disabled && navItemClasses.disabled,
		depth && depth > 1 && "ml-2 pl-6", // Indent for nested items
	);

	return (
		<NavItemRenderer item={item} className={itemClassName}>
			{content}
		</NavItemRenderer>
	);
}
