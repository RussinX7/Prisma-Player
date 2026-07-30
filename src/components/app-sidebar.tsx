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
      variant="inset"
      className="border-r border-border/70 bg-background"
    >
      <SidebarHeader className="h-16 justify-center border-b border-border/60 px-4">
        <Logo />
      </SidebarHeader>
      <SidebarContent className="py-2">
        {navGroups.map((group, index) => (
          <NavGroup key={`sidebar-group-${index}`} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-border/60 p-3">
        <SidebarMenu>
          {footerNavLinks.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.messageKey ? t(item.messageKey) : item.title}
                className="min-h-10 rounded-xl px-3 font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                render={<Link href={item.path ?? "#"} />}
              >
                {item.icon}
                <span>{item.messageKey ? t(item.messageKey) : item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
