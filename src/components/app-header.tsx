"use client";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { CustomSidebarTrigger } from "@/components/custom-sidebar-trigger";
import { navLinks } from "@/components/app-shared";
import ThemeToggle from "@/components/ThemeToggle";
import InboxButton from "@/features/inbox/components/InboxButton";
import AccountMenu from "@/components/dashboard/AccountMenu";

const activeItem = navLinks.find((item) => item.isActive);

export function AppHeader() {
	return (
		<header
			className={cn(
				"sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 md:px-6 bg-white dark:bg-[#1d1d1f] border-[#e0e0e0] dark:border-white/5"
			)}
		>
			<div className="flex items-center gap-3">
				<CustomSidebarTrigger />
				<Separator
					className="mr-2 h-4 data-[orientation=vertical]:self-center bg-black/10 dark:bg-white/10"
					orientation="vertical"
				/>
				<AppBreadcrumbs page={activeItem} />
			</div>
			<div className="flex items-center gap-3">
				<ThemeToggle />
				<InboxButton />
				<Separator
					className="h-4 data-[orientation=vertical]:self-center bg-black/10 dark:bg-white/10"
					orientation="vertical"
				/>
				<AccountMenu />
			</div>
		</header>
	);
}
