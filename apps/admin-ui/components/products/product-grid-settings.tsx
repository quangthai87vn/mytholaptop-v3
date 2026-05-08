"use client";

import {
  Columns3,
  Rows3,
  ArrowUpDown,
  LayoutGrid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { SortOption } from "@/lib/products/product-filters";
import { SORT_LABELS } from "@/lib/products/product-filters";

const COLUMN_OPTIONS = [4, 5, 6];
const PAGE_SIZE_OPTIONS = [30, 60, 90, 120];

interface ProductGridSettingsProps {
  columns: number;
  pageSize: number;
  sort: SortOption;
  viewMode: "grid" | "list";
  onColumnsChange: (columns: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (sort: SortOption) => void;
  onViewModeChange: (mode: "grid" | "list") => void;
}

export function ProductGridSettings({
  columns,
  pageSize,
  sort,
  viewMode,
  onColumnsChange,
  onPageSizeChange,
  onSortChange,
  onViewModeChange,
}: ProductGridSettingsProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Sort */}
      <div className="flex items-center gap-1.5">
        <ArrowUpDown className="size-4 text-muted-foreground shrink-0" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 min-w-[200px] max-w-[240px] justify-between gap-2 pl-2 pr-3">
              <span className="truncate text-xs">{SORT_LABELS[sort]}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
              <DropdownMenuItem
                key={opt}
                onClick={() => onSortChange(opt)}
                className={cn(
                  "cursor-pointer text-sm",
                  sort === opt && "bg-muted font-medium"
                )}
              >
                {SORT_LABELS[opt]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* View mode toggle */}
      <div className="flex items-center border rounded-md overflow-hidden">
        <button
          onClick={() => onViewModeChange("grid")}
          className={cn(
            "flex items-center justify-center size-8 transition-colors",
            viewMode === "grid"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title="Lưới"
        >
          <LayoutGrid className="size-4" />
        </button>
        <div className="w-px h-4 bg-border" />
        <button
          onClick={() => onViewModeChange("list")}
          className={cn(
            "flex items-center justify-center size-8 transition-colors",
            viewMode === "list"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title="Danh sách"
        >
          <List className="size-4" />
        </button>
      </div>

      {/* Columns — only shown in grid mode */}
      {viewMode === "grid" && (
        <div className="flex items-center gap-1.5">
          <Columns3 className="size-4 text-muted-foreground" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 pl-2 pr-3">
                <span className="hidden xl:inline text-xs">{columns} cột</span>
                <span className="xl:hidden text-xs">Cột</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {COLUMN_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt}
                  onClick={() => onColumnsChange(opt)}
                  className={cn(
                    "cursor-pointer text-sm",
                    columns === opt && "bg-muted font-medium"
                  )}
                >
                  {opt} cột
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Page size */}
      <div className="hidden sm:flex items-center gap-1.5">
        <Rows3 className="size-4 text-muted-foreground" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 pl-2 pr-3">
              <span className="hidden xl:inline text-xs">{pageSize} / trang</span>
              <span className="xl:hidden text-xs">Kích thước</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt}
                onClick={() => onPageSizeChange(opt)}
                className={cn(
                  "cursor-pointer text-sm",
                  pageSize === opt && "bg-muted font-medium"
                )}
              >
                {opt} sản phẩm / trang
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
