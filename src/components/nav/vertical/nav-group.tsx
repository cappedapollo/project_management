import { Icon } from "@/components/icon";
import useLocale from "@/locales/use-locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/collapsible";
import { cn } from "@/utils";
import { useToggle } from "react-use";
import type { NavGroupProps } from "../types";
import { NavList } from "./nav-list";

export function NavGroup({ name, items }: NavGroupProps) {
	const [open, toggleOpen] = useToggle(true);

	return (
		<Collapsible open={open}>
			<CollapsibleTrigger asChild>
				<Group name={name} open={open} onClick={toggleOpen} />
			</CollapsibleTrigger>
			<CollapsibleContent>
				<ul className="flex w-full flex-col gap-1 mt-2">
					{items.map((item, index) => (
						<NavList key={item.title || index} data={item} depth={1} />
					))}
				</ul>
			</CollapsibleContent>
		</Collapsible>
	);
}

function Group({ name, open, onClick }: { name?: string; open: boolean; onClick: (nextValue: boolean) => void }) {
	const { t } = useLocale();
	return (
		name && (
			<div
				className={cn(
					"group w-full inline-flex items-center justify-start relative gap-2 cursor-pointer px-3 py-2 mb-1 transition-all duration-200 ease-out rounded-lg",
					"hover:bg-gray-50 dark:hover:bg-gray-800/30",
				)}
				onClick={() => onClick(!open)}
			>
				<Icon
					icon="lucide:chevron-right"
					className={cn("h-3 w-3 inline-flex shrink-0 transition-all duration-200 ease-out text-gray-400 dark:text-gray-500", {
						"rotate-90": open,
					})}
				/>

				<span
					className={cn(
						"text-xs font-semibold uppercase tracking-wider transition-all duration-200 ease-out text-gray-500 dark:text-gray-400",
						"group-hover:text-gray-700 dark:group-hover:text-gray-300",
					)}
				>
					{t(name)}
				</span>
			</div>
		)
	);
}
