"use client";

import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface ProductFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  source: string;
  onSourceChange: (v: string) => void;
  syncStatus: string;
  onSyncStatusChange: (v: string) => void;
  categories: string[];
  tagOptions?: string[];
  selectedTags?: string[];
  onTagsChange?: (v: string[]) => void;
  stockFilter: string;
  onStockFilterChange: (v: string) => void;
  onClearFilters?: () => void;
  showSourceFilter?: boolean;
  showSyncStatusFilter?: boolean;
  showStockFilter?: boolean;
  showTagsFilter?: boolean;
}

export function ProductFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  source,
  onSourceChange,
  syncStatus,
  onSyncStatusChange,
  categories,
  tagOptions = [],
  selectedTags = [],
  onTagsChange,
  stockFilter,
  onStockFilterChange,
  onClearFilters,
  showSourceFilter = false,
  showSyncStatusFilter = false,
  showStockFilter = false,
  showTagsFilter = false,
}: ProductFiltersProps) {
  const hasActiveFilters =
    search ||
    category !== "all" ||
    status !== "all" ||
    source !== "all" ||
    syncStatus !== "all" ||
    stockFilter !== "all" ||
    selectedTags.length > 0;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Search row */}
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
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-full sm:w-48 h-10">
              <SelectValue placeholder="Danh mục" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả danh mục</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full sm:w-40 h-10">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Hoạt động</SelectItem>
              <SelectItem value="draft">Nháp</SelectItem>
              <SelectItem value="archived">Lưu trữ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Advanced filters row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2 sm:flex-1">
            {showSourceFilter && (
              <Select value={source} onValueChange={onSourceChange}>
                <SelectTrigger className="w-full sm:w-40 h-9">
                  <SelectValue placeholder="Nguồn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả nguồn</SelectItem>
                  <SelectItem value="manual">Thủ công</SelectItem>
                  <SelectItem value="woo">WooCommerce</SelectItem>
                  <SelectItem value="medusa">Medusa</SelectItem>
                </SelectContent>
              </Select>
            )}

            {showSyncStatusFilter && (
              <Select value={syncStatus} onValueChange={onSyncStatusChange}>
                <SelectTrigger className="w-full sm:w-44 h-9">
                  <SelectValue placeholder="Sync Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả sync</SelectItem>
                  <SelectItem value="synced">Đã đồng bộ</SelectItem>
                  <SelectItem value="pending">Chờ đồng bộ</SelectItem>
                  <SelectItem value="failed">Thất bại</SelectItem>
                  <SelectItem value="manual">Thủ công</SelectItem>
                </SelectContent>
              </Select>
            )}

            {showStockFilter && (
              <Select value={stockFilter} onValueChange={onStockFilterChange}>
                <SelectTrigger className="w-full sm:w-40 h-9">
                  <SelectValue placeholder="Tồn kho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả tồn kho</SelectItem>
                  <SelectItem value="in_stock">Còn hàng</SelectItem>
                  <SelectItem value="low_stock">Sắp hết</SelectItem>
                  <SelectItem value="out_of_stock">Hết hàng</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {onClearFilters && hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-9"
            >
              <X className="mr-1 size-4" />
              Xoá lọc
            </Button>
          )}
        </div>

        {/* Tags filter */}
        {showTagsFilter && tagOptions.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Thẻ</label>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Badge
                    key={tag}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (onTagsChange) {
                        if (isSelected) {
                          onTagsChange(selectedTags.filter((t) => t !== tag));
                        } else {
                          onTagsChange([...selectedTags, tag]);
                        }
                      }
                    }}
                  >
                    {tag}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
