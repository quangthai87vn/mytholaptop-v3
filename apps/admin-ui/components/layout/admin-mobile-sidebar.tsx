"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Laptop } from "lucide-react";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  NAV_ITEMS,
  isExactMatch,
  isParentRoute,
  isChildActive,
  type NavItem,
} from "@/lib/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import { loadCompanySettings, DEFAULT_COMPANY } from "@/lib/company-settings";
import { useAuthStore } from "@/lib/auth/store";
import { hasPermission } from "@/lib/auth/permissions";
import type { Permission } from "@/lib/auth/permissions";
import type { AdminUser } from "@/lib/auth/session";
import type { CompanySettings } from "@/lib/company-settings";

interface AdminMobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AdminMobileSidebar({ open, onClose }: AdminMobileSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const filteredNavItems = useMemo(() => {
    function filterItems(items: typeof NAV_ITEMS): typeof NAV_ITEMS {
      return items.filter((item) => {
        if (!item.requiredPermission) return true;
        if (user?.role === "super_admin") return true;
        if (!user) return false;
        return hasPermission(user as AdminUser, item.requiredPermission as Permission);
      }).map((item) => {
        if (!item.children) return item;
        return { ...item, children: filterItems(item.children as typeof NAV_ITEMS) };
      });
    }
    return filterItems(NAV_ITEMS);
  }, [user]);

  const [expandedParents, setExpandedParents] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    filteredNavItems.forEach((item) => {
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

      return (
        <div key={item.title} className="space-y-0.5">
          <button
            onClick={() => toggleExpand(item.title)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              parentStyles,
              depth > 0 && "pl-8"
            )}
          >
            <item.icon className={cn("shrink-0", depth === 0 ? "size-5" : "size-4")} />
            <span className="flex-1 text-left">{item.title}</span>
            {isExpanded ? (
              <ChevronDown className="size-4 shrink-0" />
            ) : (
              <ChevronRight className="size-4 shrink-0" />
            )}
          </button>
          {isExpanded && (
            <div className="mt-1 ml-2 pl-3 border-l-2 border-slate-200">
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

    return (
      <Link
        key={item.href}
        href={item.href!}
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
          leafStyles,
          depth > 0 && "pl-8"
        )}
      >
        <item.icon className={cn("shrink-0", isChildRoute ? "size-4" : "size-5")} />
        <span>{item.title}</span>
      </Link>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="border-b p-4">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 min-w-0"
          >
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
            <div className="min-w-0">
              <div
                className="truncate whitespace-nowrap text-sm font-bold text-primary leading-tight"
                title={company.name}
              >
                {company.name}
              </div>
            </div>
          </Link>
        </SheetHeader>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredNavItems.map((item) => renderNavItem(item))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
