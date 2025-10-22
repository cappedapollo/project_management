import { cn } from "@/utils";
import type { ReactNode } from "react";
import AccountDropdown from "../components/account-dropdown";
import SettingButton from "../components/setting-button";

interface HeaderProps {
	leftSlot?: ReactNode;
}

export default function Header({ leftSlot }: HeaderProps) {
	return (
		<header
			data-slot="slash-layout-header"
			className={cn(
				"sticky z-app-bar top-0 right-0 left-0 flex items-center justify-between px-2 bg-background/80 backdrop-blur-xl",
				"h-[var(--layout-header-height)] grow-0 shrink-0",
			)}
		>
			<div className="flex items-center" />
			<div className="flex items-center gap-1">
				<SettingButton />
				<AccountDropdown />
			</div>
		</header>
	);
}
