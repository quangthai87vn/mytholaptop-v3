"use client";

import { useState } from "react";
import { Search, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCategoryTreeFilter } from "./product-category-tree-filter";
import { ProductGridSettings } from "./product-grid-settings";
import { Separator } from "@/components/ui/separator";
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
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  return (
    <div className="space-y-3 min-w-0">
      {/* Desktop/Tablet: Full toolbar */}
      <div className="hidden sm:block">
        {/* Search and filters in a flex wrap container */}
        <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center">
          {/* Search - full width on small screens, auto on xl */}
          <div className="relative w-full xl:flex-1 xl:max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm tên, SKU..."
              className="pl-9 h-10 w-full"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* Filters - wrap on overflow */}
          <div className="flex flex-wrap gap-2 items-center">
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
        </div>

        {/* Active filters + settings row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3">
          {/* Filter badges */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
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

          {/* Grid settings */}
          <ProductGridSettings
            columns={columns}
            pageSize={pageSize}
            onColumnsChange={onColumnsChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      </div>

      {/* Mobile: Search + Filter button */}
      <div className="flex sm:hidden gap-2">
        {/* Mobile search - full width */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm..."
            className="pl-9 h-10 w-full"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Mobile filter button */}
        <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
              <SlidersHorizontal className="size-4" />
              Lọc
              {hasActiveFilters && (
                <Badge variant="destructive" className="ml-1 size-5 p-0 justify-center">
                  {filterLabels.length}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
            <SheetHeader className="pb-4">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-lg">Bộ lọc</SheetTitle>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onClearFilters();
                      setFilterSheetOpen(false);
                    }}
                    className="text-destructive"
                  >
                    Xoá tất cả
                  </Button>
                )}
              </div>
            </SheetHeader>

            <div className="space-y-4 overflow-y-auto pb-6">
              {/* Category filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Danh mục</label>
                <ProductCategoryTreeFilter
                  value={categoryId}
                  onChange={onCategoryChange}
                  categories={categoryTree}
                />
              </div>

              <Separator />

              {/* Status filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Trạng thái</label>
                <Select
                  value={status}
                  onValueChange={(v) => onStatusChange(v as ProductStatus)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="published">Hoạt động</SelectItem>
                    <SelectItem value="draft">Nháp</SelectItem>
                    <SelectItem value="proposed">Đề xuất</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Stock filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tồn kho</label>
                <Select
                  value={stock}
                  onValueChange={(v) => onStockChange(v as StockStatus)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn tồn kho" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả tồn kho</SelectItem>
                    <SelectItem value="instock">Còn hàng</SelectItem>
                    <SelectItem value="outofstock">Hết hàng</SelectItem>
                    <SelectItem value="onbackorder">Đang chờ hàng</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Grid settings */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Hiển thị</label>
                <ProductGridSettings
                  columns={columns}
                  pageSize={pageSize}
                  onColumnsChange={onColumnsChange}
                  onPageSizeChange={onPageSizeChange}
                />
              </div>

              {/* Apply button */}
              <div className="pt-4 sticky bottom-0 bg-background">
                <Button
                  className="w-full"
                  onClick={() => setFilterSheetOpen(false)}
                >
                  Áp dụng
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Mobile: Active filter badges */}
      <div className="flex sm:hidden flex-wrap items-center gap-2">
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
            className="h-6 px-2 text-xs gap-1 text-muted-foreground"
          >
            <X className="size-3" />
            Xoá
          </Button>
        )}
      </div>
    </div>
  );
}
