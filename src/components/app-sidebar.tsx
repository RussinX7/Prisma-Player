import { Logo } from "@/components/logo";
import Link from "next/link";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavGroup } from "@/components/nav-group";
import { footerNavLinks, navGroups } from "@/components/app-shared";

export function AppSidebar() {
	return (
		<Sidebar collapsible="icon" variant="inset" className="border-r border-[#e0e0e0] dark:border-white/5 bg-white dark:bg-[#1d1d1f]">
			<SidebarHeader className="h-14 justify-center px-4">
				<Logo />
			</SidebarHeader>
			<SidebarContent className="px-2">
				{navGroups.map((group, index) => (
					<NavGroup key={`sidebar-group-${index}`} {...group} />
				))}
			</SidebarContent>
			<SidebarFooter className="p-3">
				<SidebarMenu>
					{footerNavLinks.map((item) => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton 
								className="text-[#7a7a7a] hover:bg-prisma-blue/10 hover:text-prisma-blue dark:text-[#cccccc] dark:hover:text-white transition-all" 
								isActive={item.isActive} 
								size="sm" 
								render={<Link href={item.path ?? "#"} />}
							>
								{item.icon}
								<span className="font-semibold">{item.title}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
