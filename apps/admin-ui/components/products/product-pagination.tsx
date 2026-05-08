"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductPaginationProps {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

const PAGE_SIZE_OPTIONS = [30, 60, 90, 120];

export function ProductPagination({
  page,
  totalPages,
  pageSize,
  total,
  onPageChange,
}: ProductPaginationProps) {
  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;
  const start = total > 0 ? page * pageSize + 1 : 0;
  const end = Math.min((page + 1) * pageSize, total);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: info */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          Hiển thị {start}–{end} / {total} sản phẩm
        </span>
      </div>

      {/* Right: page controls */}
      <div className="flex items-center gap-2">
        {/* Prev */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev}
          className="gap-1 h-8 px-2"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Trước</span>
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers(page, totalPages).map((p, i) =>
            p === "..." ? (
              <span
                key={`ellipsis-${i}`}
                className="px-1 text-muted-foreground text-sm select-none"
              >
                ...
              </span>
            ) : (
              <Button
                key={p}
                variant={page === p ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(p as number)}
                className="size-8"
              >
                {(p as number) + 1}
              </Button>
            )
          )}
        </div>

        {/* Next */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          className="gap-1 h-8 px-2"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function getPageNumbers(
  current: number,
  total: number
): (number | "...")[] {
  if (total <= 1) return [];
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i);
  }

  const pages: (number | "...")[] = [];

  if (current < 4) {
    for (let i = 0; i < 5; i++) pages.push(i);
    pages.push("...");
    pages.push(total - 1);
  } else if (current >= total - 4) {
    pages.push(0);
    pages.push("...");
    for (let i = total - 5; i < total; i++) pages.push(i);
  } else {
    pages.push(0);
    pages.push("...");
    pages.push(current - 1);
    pages.push(current);
    pages.push(current + 1);
    pages.push("...");
    pages.push(total - 1);
  }

  return pages;
}
