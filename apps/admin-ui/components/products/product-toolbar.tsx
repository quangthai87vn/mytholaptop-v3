"use client";

import { Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCategoryTreeFilter } from "./product-category-tree-filter";
import { ProductGridSettings } from "./product-grid-settings";
import type { CategoryNode } from "@/components/categories/category-tree";
import type { StockStatus, ProductStatus } from "@/lib/products/product-filters";

interface ProductToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
  status: ProductStatus;
  onStatusChange: (value: ProductStatus) => void;
  stock: StockStatus;
  onStockChange: (value: StockStatus) => void;
  columns: number;
  onColumnsChange: (value: number) => void;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  onRefresh: () => void;
  categoryTree: CategoryNode[];
  hasActiveFilters: boolean;
  filterLabels: string[];
  onClearFilters: () => void;
}

export function ProductToolbar({
  search,
  onSearchChange,
  categoryId,
  onCategoryChange,
  status,
  onStatusChange,
  stock,
  onStockChange,
  columns,
  onColumnsChange,
  pageSize,
  onPageSizeChange,
  onRefresh,
  categoryTree,
  hasActiveFilters,
  filterLabels,
  onClearFilters,
}: ProductToolbarProps) {
  return (
    <div className="space-y-3">
      {/* Toolbar row */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm tên, SKU..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <ProductCategoryTreeFilter
          value={categoryId}
          onChange={onCategoryChange}
          categories={categoryTree}
        />

        <Select
          value={status}
          onValueChange={(v) => onStatusChange(v as ProductStatus)}
        >
          <SelectTrigger className="w-40 h-10">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="published">Hoạt động</SelectItem>
            <SelectItem value="draft">Nháp</SelectItem>
            <SelectItem value="proposed">Đề xuất</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={stock}
          onValueChange={(v) => onStockChange(v as StockStatus)}
        >
          <SelectTrigger className="w-40 h-10">
            <SelectValue placeholder="Tồn kho" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả tồn kho</SelectItem>
            <SelectItem value="instock">Còn hàng</SelectItem>
            <SelectItem value="outofstock">Hết hàng</SelectItem>
            <SelectItem value="onbackorder">Đang chờ hàng</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          className="size-10 shrink-0"
          title="Làm mới"
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {/* Active filters + settings */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {filterLabels.map((label, i) => (
            <Badge key={i} variant="secondary" className="gap-1 text-xs">
              {label}
            </Badge>
          ))}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
              Xoá bộ lọc
            </Button>
          )}
        </div>

        <ProductGridSettings
          columns={columns}
          pageSize={pageSize}
          onColumnsChange={onColumnsChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
}
