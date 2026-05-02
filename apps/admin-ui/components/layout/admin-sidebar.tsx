"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Laptop,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NAV_ITEMS,
  isActivePath,
  isParentActive,
  isChildActive,
  getActiveChild,
  type NavItem,
} from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onMobileOpen: () => void;
}

export function AdminSidebar({ collapsed, onToggle, onMobileOpen }: AdminSidebarProps) {
  const pathname = usePathname();
  const [expandedParents, setExpandedParents] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    NAV_ITEMS.forEach((item) => {
      if (item.children && isParentActive(item, pathname)) {
        initial.add(item.title);
      }
    });
    return initial;
  });

  useEffect(() => {
    const parents = new Set<string>();
    NAV_ITEMS.forEach((item) => {
      if (item.children && isParentActive(item, pathname)) {
        parents.add(item.title);
      }
    });
    setExpandedParents(parents);
  }, [pathname]);

  const toggleExpand = (title: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const renderNavItem = (item: NavItem, depth: number = 0): React.ReactNode => {
    const active = isActivePath(item.href || "", pathname);
    const hasChildren = !!item.children;
    const isExpanded = expandedParents.has(item.title);

    if (hasChildren) {
      const parentHasActiveChild = isParentActive(item, pathname);

      const triggerBtn = (
        <button
          key={item.title}
          onClick={() => toggleExpand(item.title)}
          className={cn(
            "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            parentHasActiveChild && isExpanded
              ? "text-red-600 bg-transparent"
              : parentHasActiveChild
              ? "text-red-600 bg-transparent"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            collapsed && "justify-center px-2"
          )}
        >
          <item.icon className="size-5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.title}</span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 transition-transform",
                  !isExpanded && "-rotate-90"
                )}
              />
            </>
          )}
        </button>
      );

      if (collapsed) {
        return (
          <div key={item.title}>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>{triggerBtn}</TooltipTrigger>
              <TooltipContent side="right" className="flex flex-col gap-1">
                <span className="font-medium">{item.title}</span>
                {item.children?.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href!}
                    className={cn(
                      "text-xs",
                      isActivePath(child.href || "", pathname)
                        ? "text-red-600 font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {child.title}
                  </Link>
                ))}
              </TooltipContent>
            </Tooltip>
          </div>
        );
      }

      return (
        <div key={item.title}>
          {triggerBtn}
          {isExpanded && (
            <div className="mt-1 space-y-0.5">
              {item.children!.map((child) => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const childActive = depth > 0 && isChildActive(item, pathname);

    const navLink = (
      <Link
        href={item.href!}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-red-600 text-white"
            : childActive
            ? "bg-red-600 text-white"
            : depth > 0
            ? "text-slate-600 hover:bg-slate-100"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        <item.icon className="size-5 shrink-0" />
        {!collapsed && <span>{item.title}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.href} delayDuration={0}>
          <TooltipTrigger asChild>{navLink}</TooltipTrigger>
          <TooltipContent side="right">{item.title}</TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.href}>{navLink}</div>;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-card transition-all duration-300 hidden md:flex",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Laptop className="size-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-primary">Mỹ Tho</span>
              <span className="text-xs font-medium text-foreground">Laptop</span>
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMobileOpen}
        >
          <Menu className="size-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => renderNavItem(item))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t p-3">
        <Button
          variant="ghost"
          size="sm"
          className={cn("w-full gap-3", collapsed && "justify-center px-2")}
          onClick={onToggle}
        >
          {collapsed ? (
            <ChevronRight className="size-5" />
          ) : (
            <>
              <ChevronLeft className="size-5" />
              <span>Thu gọn</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
