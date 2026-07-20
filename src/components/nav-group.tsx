"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { SidebarNavGroup } from "@/components/app-shared";
import { ChevronRightIcon } from "lucide-react";

export function NavGroup({ label, items }: SidebarNavGroup) {
	const pathname = usePathname();

	return (
		<SidebarGroup>
			{label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
			<SidebarMenu>
				{items.map((item) => {
					const isItemActive = item.path ? pathname.startsWith(item.path) : false;
					const hasActiveSubItem = item.subItems?.some((sub) => sub.path ? pathname.startsWith(sub.path) : false);
					const isOpen = isItemActive || hasActiveSubItem;

					return (
						<Collapsible 
							className="group/collapsible" 
							defaultOpen={isOpen} 
							key={item.title} 
							render={<SidebarMenuItem />}
						>
							{item.subItems?.length ? (
								<>
									<CollapsibleTrigger render={<SidebarMenuButton isActive={isItemActive} />}>
										{item.icon}
										<span>{item.title}</span>
										<ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
									</CollapsibleTrigger>
									<CollapsibleContent>
										<SidebarMenuSub>
											{item.subItems?.map((subItem) => {
												const isSubActive = subItem.path ? pathname.startsWith(subItem.path) : false;
												return (
													<SidebarMenuSubItem key={subItem.title}>
														<SidebarMenuSubButton isActive={isSubActive} render={<Link href={subItem.path ?? "#"} />}>
															{subItem.icon}
															<span>{subItem.title}</span>
														</SidebarMenuSubButton>
													</SidebarMenuSubItem>
												);
											})}
										</SidebarMenuSub>
									</CollapsibleContent>
								</>
							) : (
								<SidebarMenuButton 
									isActive={isItemActive} 
									render={<Link href={item.path ?? "#"} />}
									className={`font-semibold transition-all px-3 py-2 min-h-11 rounded-lg ${
										isItemActive 
											? "bg-prisma-blue text-white hover:bg-prisma-blue/90 hover:text-white" 
											: "text-[#7a7a7a] hover:bg-prisma-blue/10 hover:text-prisma-blue dark:text-[#cccccc]"
									}`}
								>
									{item.icon}
									<span>{item.title}</span>
								</SidebarMenuButton>
							)}
						</Collapsible>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
