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
    <SidebarGroup className="px-1 py-2">
      {label && (
        <SidebarGroupLabel className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </SidebarGroupLabel>
      )}
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
                    className={cn(
                      "min-h-10 rounded-xl px-3 text-xs font-semibold transition-all cursor-pointer border",
                      isItemActive
                        ? "border-black/5 bg-[#B9FF66] text-[#191A23] font-bold shadow-xs"
                        : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-[#B9FF66]/15 hover:text-[#191A23]"
                    )}
                  >
                    {item.icon}
                    <span>{titleFor(item)}</span>
                    <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="border-l border-slate-200 pl-2 my-1 space-y-1">
                      {item.subItems.map((subItem) => {
                        const isSubActive = isPathActive(pathname, subItem.path);
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              isActive={isSubActive}
                              render={<Link href={subItem.path ?? "#"} />}
                              className={cn(
                                "min-h-9 rounded-lg border px-3 text-xs transition-all cursor-pointer",
                                isSubActive
                                  ? "border-black/5 bg-[#B9FF66] text-[#191A23] font-bold shadow-xs"
                                  : "border-transparent text-slate-600 font-medium hover:bg-[#B9FF66]/15 hover:text-[#191A23]"
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
                    "min-h-10 rounded-xl px-3 text-xs transition-all cursor-pointer border",
                    isItemActive
                      ? "border-black/5 bg-[#B9FF66] text-[#191A23] font-bold shadow-xs hover:bg-[#a6ee50]"
                      : "border-transparent text-slate-600 font-semibold hover:border-slate-200 hover:bg-[#B9FF66]/15 hover:text-[#191A23]",
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
