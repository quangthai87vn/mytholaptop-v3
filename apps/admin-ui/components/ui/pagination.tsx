"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 30, 50],
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const go = React.useCallback(
    (p: number) => {
      const clamped = Math.max(1, Math.min(p, totalPages));
      onPageChange(clamped);
    },
    [onPageChange, totalPages]
  );

  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - delta && i <= page + delta)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-4 px-1 py-3", className)}>
      {/* Left: page size + count */}
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Hiển thị</span>
            <select
              className="h-8 w-16 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
        <span className="text-xs text-slate-500">
          {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {total}
        </span>
      </div>

      {/* Right: page nav */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          onClick={() => go(1)}
          disabled={!hasPrev}
          title="Trang đầu"
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          onClick={() => go(page - 1)}
          disabled={!hasPrev}
          title="Trang trước"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="flex items-center gap-0.5 px-1">
          {pages.map((p, i) =>
            p === "..." ? (
              <span
                key={"ellipsis-" + i}
                className="px-2 py-1 text-xs text-slate-400"
              >
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "default" : "ghost"}
                size="sm"
                className="size-8 p-0 text-xs"
                onClick={() => go(p as number)}
              >
                {p}
              </Button>
            )
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          onClick={() => go(page + 1)}
          disabled={!hasNext}
          title="Trang sau"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          onClick={() => go(totalPages)}
          disabled={!hasNext}
          title="Trang cuối"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
