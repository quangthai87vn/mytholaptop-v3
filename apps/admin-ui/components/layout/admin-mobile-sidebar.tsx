"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Laptop } from "lucide-react";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  NAV_ITEMS,
  isActivePath,
  isParentActive,
  isChildActive,
  type NavItem,
} from "@/lib/navigation";
import { useState } from "react";

interface AdminMobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AdminMobileSidebar({ open, onClose }: AdminMobileSidebarProps) {
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

  const toggleExpand = (title: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const handleNavClick = (item: NavItem) => {
    if (item.children) {
      toggleExpand(item.title);
    } else {
      onClose();
    }
  };

  const renderNavItem = (item: NavItem, depth: number = 0) => {
    const active = isActivePath(item.href || "", pathname);
    const hasChildren = !!item.children;
    const isExpanded = expandedParents.has(item.title);

    if (hasChildren) {
      const parentHasActiveChild = isParentActive(item, pathname);

      return (
        <div key={item.title}>
          <button
            onClick={() => toggleExpand(item.title)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              parentHasActiveChild && isExpanded
                ? "text-red-600 bg-transparent"
                : parentHasActiveChild
                ? "text-red-600 bg-transparent"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              depth > 0 && "pl-8"
            )}
          >
            <item.icon className="size-5 shrink-0" />
            <span className="flex-1 text-left">{item.title}</span>
            {isExpanded ? (
              <ChevronDown className="size-4 shrink-0" />
            ) : (
              <ChevronRight className="size-4 shrink-0" />
            )}
          </button>
          {isExpanded && (
            <div className="mt-1">
              {item.children!.map((child) => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const childActive = depth > 0 && isChildActive(item, pathname);

    return (
      <Link
        key={item.href}
        href={item.href!}
        onClick={() => onClose()}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          depth > 0 && "pl-8",
          active
            ? "bg-red-600 text-white"
            : childActive
            ? "bg-red-600 text-white"
            : depth > 0
            ? "text-slate-600 hover:bg-slate-100"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <item.icon className="size-5 shrink-0" />
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
            className="flex items-center gap-3"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Laptop className="size-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-primary">Mỹ Tho</span>
              <span className="text-xs font-medium text-foreground">
                Laptop
              </span>
            </div>
          </Link>
        </SheetHeader>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => renderNavItem(item))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
