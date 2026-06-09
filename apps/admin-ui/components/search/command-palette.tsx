"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  CheckSquare,
  FolderKanban,
  Clapperboard,
  MessageSquare,
  Users,
  Activity,
  Plus,
  Calendar,
  Bell,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { SearchEntityType } from "@/app/api/search/route";

// ─── Types ────────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle: string;
  href: string;
  icon: string;
  status?: string;
  updatedAt?: string;
}

// ─── Icon Mapping ────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  "check-square": CheckSquare,
  folder: FolderKanban,
  clapperboard: Clapperboard,
  "message-square": MessageSquare,
  user: Users,
  activity: Activity,
};

// ─── Entity Label ───────────────────────────────────────────────────

const ENTITY_LABELS: Record<SearchEntityType, string> = {
  task: "Công việc",
  project: "Dự án",
  campaign: "Chiến dịch",
  comment: "Bình luận",
  user: "Nhân viên",
  activity: "Hoạt động",
};

// ─── Quick Actions ──────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { id: "create-task", title: "Tạo công việc mới", href: "/tasks/new", icon: CheckSquare },
  { id: "create-campaign", title: "Tạo chiến dịch", href: "/campaigns/new", icon: Clapperboard },
  { id: "calendar", title: "Lịch nội dung", href: "/workspace/calendar", icon: Calendar },
  { id: "notifications", title: "Thông báo", href: "/notifications", icon: Bell },
  { id: "activity", title: "Hoạt động workspace", href: "/workspace/activity", icon: Activity },
  { id: "dashboard", title: "Dashboard", href: "/dashboard", icon: BarChart3 },
];

// ─── Command Palette ─────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Search effect
  React.useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsSearching(true);

    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) {
          setResults([]);
          return;
        }

        const data = await res.json();
        setResults(data.results ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 250); // debounce 250ms

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  // Group results by type
  const grouped = React.useMemo(() => {
    const groups: Partial<Record<SearchEntityType, SearchResult[]>> = {};
    for (const r of results) {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type]!.push(r);
    }
    return groups;
  }, [results]);

  const hasResults = Object.keys(grouped).length > 0;

  function handleSelect(href: string) {
    onOpenChange(false);
    setQuery("");
    setResults([]);
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Tìm kiếm công việc, dự án, chiến dịch, nhân viên..."
        value={query}
        onValueChange={setQuery}
      />

      <CommandList>
        {/* Empty state */}
        {query.length === 0 && (
          <>
            <div className="py-3 px-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">
                Thao tác nhanh
              </p>
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <CommandItem
                    key={action.id}
                    value={action.id}
                    onSelect={() => handleSelect(action.href)}
                    className="flex items-center gap-3 px-2 py-2.5 cursor-pointer"
                  >
                    <Icon className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-[13px]">{action.title}</span>
                  </CommandItem>
                );
              })}
            </div>
            <CommandSeparator />
            <div className="py-6 text-center">
              <Search className="size-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-[13px] text-muted-foreground">
                Nhập từ khóa để tìm kiếm
              </p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">
                Công việc · Dự án · Chiến dịch · Bình luận · Nhân viên
              </p>
            </div>
          </>
        )}

        {/* No results */}
        {query.length >= 2 && !isSearching && !hasResults && (
          <CommandEmpty className="py-8">
            <Search className="size-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground">
              Không tìm thấy kết quả cho &ldquo;{query}&rdquo;
            </p>
          </CommandEmpty>
        )}

        {/* Loading */}
        {isSearching && query.length >= 2 && (
          <div className="py-8 text-center">
            <div className="size-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
            <p className="text-[12px] text-muted-foreground">Đang tìm kiếm...</p>
          </div>
        )}

        {/* Results by group */}
        {!isSearching &&
          (["task", "project", "campaign", "comment", "user", "activity"] as SearchEntityType[]).map(
            (type) => {
              const items = grouped[type];
              if (!items?.length) return null;

              return (
                <CommandGroup key={type} heading={ENTITY_LABELS[type]} className="px-2">
                  {items.map((item) => {
                    const Icon = ICON_MAP[item.icon] ?? Search;
                    return (
                      <CommandItem
                        key={item.id}
                        value={`${item.type}-${item.id}`}
                        onSelect={() => handleSelect(item.href)}
                        className="flex items-start gap-3 px-2 py-2.5 cursor-pointer"
                      >
                        <Icon className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <span className="text-[13px] truncate">{item.title}</span>
                          {item.subtitle && (
                            <span className="text-[11px] text-muted-foreground truncate">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                        {item.status && (
                          <span className="text-[10px] text-muted-foreground/60 shrink-0 capitalize">
                            {item.status}
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            }
          )}
      </CommandList>

      {/* Footer */}
      <div className="flex items-center gap-4 px-4 py-2 border-t text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-border bg-muted px-1 font-mono text-[9px]">↑↓</kbd>
          di chuyển
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-border bg-muted px-1 font-mono text-[9px]">Enter</kbd>
          chọn
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-border bg-muted px-1 font-mono text-[9px]">ESC</kbd>
          đóng
        </span>
        <span className="ml-auto">P6.9 · Global Search</span>
      </div>
    </CommandDialog>
  );
}
