"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SidebarNavGroup, SidebarNavItem } from "@/components/app-shared";
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
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

function isPathActive(pathname: string, itemPath?: string) {
  return Boolean(itemPath && (pathname === itemPath || pathname.startsWith(`${itemPath}/`)));
}

export function NavGroup({ label, items }: SidebarNavGroup) {
  const pathname = usePathname();
  const { t } = useI18n();
  const titleFor = (item: SidebarNavItem) =>
    item.messageKey ? t(item.messageKey) : item.title;

  return (
    <SidebarGroup className="px-2 py-2">
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu className="gap-1">
        {items.map((item) => {
          const isItemActive = isPathActive(pathname, item.path);
          const hasActiveSubItem = item.subItems?.some((sub) =>
            isPathActive(pathname, sub.path),
          );

          return (
            <Collapsible
              className="group/collapsible"
              defaultOpen={isItemActive || hasActiveSubItem}
              key={item.title}
              render={<SidebarMenuItem />}
            >
              {item.subItems?.length ? (
                <>
                  <CollapsibleTrigger
                    render={<SidebarMenuButton isActive={isItemActive} />}
                  >
                    {item.icon}
                    <span>{titleFor(item)}</span>
                    <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.subItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            isActive={isPathActive(pathname, subItem.path)}
                            render={<Link href={subItem.path ?? "#"} />}
                          >
                            {subItem.icon}
                            <span>{titleFor(subItem)}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : (
                <SidebarMenuButton
                  isActive={isItemActive}
                  tooltip={titleFor(item)}
                  render={<Link href={item.path ?? "#"} />}
                  className={cn(
                    "min-h-10 rounded-xl px-3 font-medium text-muted-foreground transition-colors",
                    "hover:bg-[#B9FF66]/20 hover:text-[#191A23]",
                    isItemActive &&
                      "bg-[#191A23] text-[#B9FF66] font-extrabold border-2 border-[#191A23] shadow-[2px_2px_0px_#191A23] hover:bg-[#191A23] hover:text-[#B9FF66]",
                  )}
                >
                  {item.icon}
                  <span>{titleFor(item)}</span>
                </SidebarMenuButton>
              )}
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
