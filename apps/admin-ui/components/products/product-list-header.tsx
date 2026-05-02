"use client";

import { Plus, Upload, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ProductListHeaderProps {
  title?: string;
  subtitle?: string;
  onAddProduct?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  totalCount: number;
  selectedCount: number;
  onClearSelection?: () => void;
  addButtonText?: string;
}

export function ProductListHeader({
  title = "Quản lý sản phẩm",
  subtitle = "Quản lý danh sách sản phẩm trong cửa hàng.",
  onAddProduct,
  onImport,
  onExport,
  totalCount,
  selectedCount,
  onClearSelection,
  addButtonText = "Thêm sản phẩm",
}: ProductListHeaderProps) {
  if (selectedCount > 0) {
    return (
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
              {selectedCount}
            </div>
            <div>
              <p className="font-medium">
                Đã chọn {selectedCount} sản phẩm
              </p>
              <p className="text-sm text-muted-foreground">
                Chọn thao tác hàng loạt hoặc bỏ chọn
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onClearSelection}>
              <X className="mr-2 size-4" />
              Bỏ chọn
            </Button>
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="mr-2 size-4" />
              Xuất file
            </Button>
            <Button variant="destructive" size="sm">
              Xoá đã chọn
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {onImport && (
          <Button variant="outline" onClick={onImport}>
            <Upload className="mr-2 size-4" />
            Nhập file
          </Button>
        )}
        {onExport && (
          <Button variant="outline" onClick={onExport}>
            <Download className="mr-2 size-4" />
            Xuất file
          </Button>
        )}
        {onAddProduct && (
          <Button onClick={onAddProduct}>
            <Plus className="mr-2 size-4" />
            {addButtonText}
          </Button>
        )}
      </div>
    </div>
  );
}
