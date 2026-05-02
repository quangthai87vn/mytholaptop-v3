"use client";

import { Columns3, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

interface ProductGridSettingsProps {
  columns: number;
  pageSize: number;
  onColumnsChange: (columns: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const COLUMN_OPTIONS = [3, 4, 5, 6];
const PAGE_SIZE_OPTIONS = [20, 30, 50, 100];

export function ProductGridSettings({
  columns,
  pageSize,
  onColumnsChange,
  onPageSizeChange,
}: ProductGridSettingsProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Columns3 className="size-4 text-muted-foreground" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              {columns} cột
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {COLUMN_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt}
                onClick={() => onColumnsChange(opt)}
                className={columns === opt ? "bg-muted font-medium" : ""}
              >
                {opt} cột
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2">
        <Rows3 className="size-4 text-muted-foreground" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              {pageSize} / trang
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt}
                onClick={() => onPageSizeChange(opt)}
                className={pageSize === opt ? "bg-muted font-medium" : ""}
              >
                {opt} sản phẩm
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
