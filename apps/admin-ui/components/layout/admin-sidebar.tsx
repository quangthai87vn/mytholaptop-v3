"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Laptop,
  Menu,
  ImageIcon,
  Search,
  X,
  CheckSquare,
  FolderKanban,
  Megaphone,
  MessageSquare,
  User,
  Activity,
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
import { useState, useEffect, useCallback, useMemo } from "react";
import { loadCompanySettings, DEFAULT_COMPANY } from "@/lib/company-settings";
import { useAuthStore } from "@/lib/auth/store";
import { type Permission } from "@/lib/auth/permissions";
import type { CompanySettings } from "@/lib/company-settings";
import { adminFetch } from "@/lib/api/admin-fetch";
import type { SearchResultItem } from "@/app/api/search/route";

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onMobileOpen: () => void;
}

/**
 * Filter nav items based on user permissions from auth store.
 * Permissions come from /api/auth/me (resolved from DB for custom roles).
 * Rules:
 * - Items with requiredPermission are hidden unless user has that permission (or is super_admin).
 * - If a parent group has no visible children, the entire group is hidden.
 * - super_admin always sees everything.
 */
function filterNavItems(items: typeof NAV_ITEMS, user: ReturnType<typeof useAuthStore.getState>["user"]): typeof NAV_ITEMS {
  const userRole = user?.role as "super_admin" | "admin" | "editor" | "viewer" | undefined;
  const userPermissions = new Set<string>(user?.permissions ?? []);

  function hasPerm(perm: string): boolean {
    if (userRole === "super_admin") return true;
    return userPermissions.has(perm);
  }

  return items.reduce<typeof NAV_ITEMS>((acc, item) => {
    if (item.requiredPermission && !hasPerm(item.requiredPermission)) {
      return acc;
    }

    if (!item.children) {
      acc.push(item);
      return acc;
    }

    const filteredChildren = filterNavItems(item.children as typeof NAV_ITEMS, user);

    if (filteredChildren.length === 0) return acc;

    acc.push({ ...item, children: filteredChildren });
    return acc;
  }, []);
}

export function AdminSidebar({ collapsed, onToggle, onMobileOpen }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const filteredNavItems = useMemo(() => {
    return filterNavItems(NAV_ITEMS, user);
  }, [user]);

  const [expandedParents, setExpandedParents] = useState<Set<string>>(() => {
    // Restore from localStorage if available
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("sidebar_expanded");
        if (stored) {
          const parsed = JSON.parse(stored) as string[];
          return new Set(parsed);
        }
      } catch {
        // ignore
      }
    }
    // Fallback: expand based on current route
    const initial = new Set<string>();
    filteredNavItems.forEach((item) => {
      if (item.children && isParentRoute(item, pathname)) {
        initial.add(item.title);
      }
    });
    return initial;
  });

  // Persist expanded state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("sidebar_expanded", JSON.stringify([...expandedParents]));
    } catch {
      // ignore
    }
  }, [expandedParents]);

  // ─── Company branding ───────────────────────────────────────────────
  const [company, setCompany] = useState<CompanySettings>(DEFAULT_COMPANY);
  const [logoError, setLogoError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();

  const reloadCompany = useCallback(() => {
    setCompany(loadCompanySettings());
    setLogoError(false);
  }, []);

  useEffect(() => {
    reloadCompany();
    window.addEventListener("company-settings-changed", reloadCompany);
    return () => window.removeEventListener("company-settings-changed", reloadCompany);
  }, [reloadCompany]);

  // Sync active route parents (merge with existing state to preserve manual toggles)
  useEffect(() => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      filteredNavItems.forEach((item) => {
        if (item.children && isParentRoute(item, pathname)) {
          next.add(item.title);
        }
      });
      return next;
    });
  }, [pathname, filteredNavItems]);

  // ─── Global Search ─────────────────────────────────────────────────
  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await adminFetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults((data.results ?? []).slice(0, 8));
      }
    } catch {
      // silent
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, doSearch]);

  useEffect(() => {
    if (!searchOpen) {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [searchOpen]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const ENTITY_ICONS: Record<string, React.ElementType> = {
    task: CheckSquare,
    project: FolderKanban,
    campaign: Megaphone,
    comment: MessageSquare,
    user: User,
    activity: Activity,
  };

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

      {/* Search bar */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              className="w-full h-8 pl-8 pr-7 rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
            {isSearching && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <div className="size-3 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
              </div>
            )}
            {/* Search results dropdown */}
            {searchOpen && searchQuery.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                {searchResults.length > 0 ? (
                  <div className="py-1">
                    <div className="px-3 py-1 text-xs font-medium text-slate-400 uppercase tracking-wide">
                      {searchResults.length} kết quả
                    </div>
                    {searchResults.map((result) => {
                      const Icon = ENTITY_ICONS[result.type] || Activity;
                      return (
                        <button
                          key={result.id}
                          onClick={() => {
                            router.push(result.href);
                            setSearchOpen(false);
                            setSearchQuery("");
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                        >
                          <Icon className="size-4 shrink-0 text-slate-400" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-slate-800 truncate">{result.title}</div>
                            <div className="text-xs text-slate-400 truncate">{result.subtitle}</div>
                          </div>
                          <span className="text-xs text-slate-400 shrink-0 capitalize">{result.type}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : !isSearching ? (
                  <div className="px-3 py-4 text-center text-xs text-slate-400">
                    Không có kết quả cho "{searchQuery}"
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {filteredNavItems.map((item) => renderNavItem(item))}
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
