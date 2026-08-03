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
      {label && (
        <SidebarGroupLabel className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#191A23]/60">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarMenu className="gap-1.5">
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
                    className={cn(
                      "min-h-11 rounded-2xl border-2 px-3 text-xs font-bold transition-all cursor-pointer",
                      isItemActive
                        ? "border-[#191A23] bg-[#B9FF66] text-[#191A23] font-black shadow-[2px_2px_0px_#191A23]"
                        : "border-transparent text-[#191A23] hover:border-[#191A23] hover:bg-[#B9FF66]/20"
                    )}
                  >
                    {item.icon}
                    <span>{titleFor(item)}</span>
                    <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="border-l-2 border-[#191A23] pl-2 my-1 space-y-1">
                      {item.subItems.map((subItem) => {
                        const isSubActive = isPathActive(pathname, subItem.path);
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              isActive={isSubActive}
                              render={<Link href={subItem.path ?? "#"} />}
                              className={cn(
                                "min-h-9 rounded-xl border-2 px-3 text-xs transition-all cursor-pointer",
                                isSubActive
                                  ? "border-[#191A23] bg-[#B9FF66] text-[#191A23] font-black shadow-[1px_1px_0px_#191A23]"
                                  : "border-transparent text-[#191A23] font-bold hover:border-[#191A23] hover:bg-[#B9FF66]/20"
                              )}
                            >
                              {subItem.icon}
                              <span>{titleFor(subItem)}</span>
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
                  tooltip={titleFor(item)}
                  render={<Link href={item.path ?? "#"} />}
                  className={cn(
                    "min-h-11 rounded-2xl border-2 px-3 text-xs transition-all cursor-pointer",
                    isItemActive
                      ? "border-[#191A23] bg-[#B9FF66] text-[#191A23] font-black shadow-[2px_2px_0px_#191A23] hover:bg-[#B9FF66] hover:text-[#191A23]"
                      : "border-transparent text-[#191A23] font-bold hover:border-[#191A23] hover:bg-[#B9FF66]/20 hover:text-[#191A23]",
                  )}
                >
                  {item.icon}
                  <span className="font-bold">{titleFor(item)}</span>
                </SidebarMenuButton>
              )}
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
