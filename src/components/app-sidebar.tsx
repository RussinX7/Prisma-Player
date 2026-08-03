"use client";

import Link from "next/link";
import { footerNavLinks, navGroups } from "@/components/app-shared";
import { Logo } from "@/components/logo";
import { NavGroup } from "@/components/nav-group";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useI18n } from "@/i18n/I18nProvider";

export function AppSidebar() {
  const { t } = useI18n();

  return (
    <Sidebar
      data-i18n-managed
      collapsible="icon"
      variant="sidebar"
      className="border-r-2 border-[#191A23] bg-white text-[#191A23]"
    >
      <SidebarHeader className="h-16 justify-center border-b-2 border-[#191A23] px-4 bg-white">
        <Logo />
      </SidebarHeader>
      <SidebarContent className="py-3 px-1 bg-white">
        {navGroups.map((group, index) => (
          <NavGroup key={`sidebar-group-${index}`} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t-2 border-[#191A23] p-3 bg-white">
        <SidebarMenu className="gap-1">
          {footerNavLinks.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.messageKey ? t(item.messageKey) : item.title}
                className="min-h-11 rounded-2xl border-2 border-transparent px-3 text-xs font-bold text-[#191A23] hover:border-[#191A23] hover:bg-[#B9FF66]/20 transition-all cursor-pointer"
                render={<Link href={item.path ?? "#"} />}
              >
                {item.icon}
                <span className="font-bold text-[#191A23]">{item.messageKey ? t(item.messageKey) : item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
