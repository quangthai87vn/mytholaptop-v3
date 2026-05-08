"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Laptop,
  Menu,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NAV_ITEMS,
  isExactMatch,
  isParentRoute,
  isChildActive,
  type NavItem,
} from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect, useCallback } from "react";
import { loadCompanySettings, DEFAULT_COMPANY } from "@/lib/company-settings";
import type { CompanySettings } from "@/lib/company-settings";

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
      if (item.children && isParentRoute(item, pathname)) {
        initial.add(item.title);
      }
    });
    return initial;
  });

  // ─── Company branding ───────────────────────────────────────────────
  const [company, setCompany] = useState<CompanySettings>(DEFAULT_COMPANY);
  const [logoError, setLogoError] = useState(false);

  const reloadCompany = useCallback(() => {
    setCompany(loadCompanySettings());
    setLogoError(false);
  }, []);

  useEffect(() => {
    reloadCompany();
    window.addEventListener("company-settings-changed", reloadCompany);
    return () => window.removeEventListener("company-settings-changed", reloadCompany);
  }, [reloadCompany]);

  useEffect(() => {
    const parents = new Set<string>();
    NAV_ITEMS.forEach((item) => {
      if (item.children && isParentRoute(item, pathname)) {
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
    const hasChildren = !!item.children;
    const isExpanded = expandedParents.has(item.title);

    if (hasChildren) {
      const parentIsOpen = isParentRoute(item, pathname);

      // Parent styles: open/active = red, default = dark grey
      const parentStyles = parentIsOpen
        ? "bg-red-50 text-red-600 border-l-2 border-red-600 font-semibold"
        : "text-slate-700 hover:bg-red-50 hover:text-red-600";

      const triggerBtn = (
        <button
          key={item.title}
          onClick={() => toggleExpand(item.title)}
          className={cn(
            "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            parentStyles,
            collapsed && "justify-center px-2"
          )}
        >
          <item.icon className={cn("shrink-0", depth === 0 ? "size-5" : "size-4")} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.title}</span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 transition-transform duration-200",
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
                <div className="border-l-2 border-primary/20 pl-2 space-y-1">
                  {item.children?.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href!}
                      className={cn(
                        "block text-xs",
                        isChildActive(child, pathname)
                          ? "text-red-600 font-semibold"
                          : "text-slate-700 hover:text-red-600"
                      )}
                    >
                      {child.title}
                    </Link>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        );
      }

      return (
        <div key={item.title} className="space-y-0.5">
          {triggerBtn}
          {isExpanded && (
            <div className="mt-1 ml-2 pl-3 border-l-2 border-slate-200 space-y-0.5">
              {item.children!.map((child) => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // Leaf item (no children)
    const isActive = isExactMatch(item.href || "", pathname);
    const isChildRoute = depth > 0;

    const leafStyles = isActive
      ? "bg-red-600 text-white font-semibold shadow-sm"
      : isChildRoute
      ? "text-slate-600 hover:bg-red-50 hover:text-red-600"
      : "text-slate-700 hover:bg-red-50 hover:text-red-600";

    const navLink = (
      <Link
        href={item.href!}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
          leafStyles,
          collapsed && "justify-center px-2"
        )}
      >
        <item.icon className={cn("shrink-0", isChildRoute ? "size-4" : "size-5")} />
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
        "sticky top-0 z-40 flex h-screen flex-col border-r bg-white text-black transition-all duration-300 hidden md:flex",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          {/* Logo image */}
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-primary/10">
            {company.logoUrl && !logoError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="h-full w-full object-contain"
                src={company.logoUrl}
                alt={company.name}
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Laptop className="size-5 text-primary" />
              </div>
            )}
          </div>
          {/* Company name */}
          {!collapsed && (
            <div className="min-w-0">
              <div
                className="truncate whitespace-nowrap text-sm font-bold text-primary leading-tight"
                title={company.name}
              >
                {company.name}
              </div>
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
