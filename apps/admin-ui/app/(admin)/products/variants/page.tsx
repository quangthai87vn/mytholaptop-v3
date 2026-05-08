"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Layers,
  MoreHorizontal,
  Eye,
  Pencil,
} from "lucide-react";
import { MOCK_VARIANTS } from "@/lib/mock-data";
import type { ProductVariant } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function VariantsPage() {
  const [variants] = useState<ProductVariant[]>(MOCK_VARIANTS);
  const [search, setSearch] = useState("");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  const filtered = variants.filter(
    (v) =>
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.sku.toLowerCase().includes(search.toLowerCase()) ||
      v.productName.toLowerCase().includes(search.toLowerCase())
  );

  // Group by product
  const groupedByProduct = filtered.reduce<Record<string, ProductVariant[]>>((acc, v) => {
    if (!acc[v.productName]) acc[v.productName] = [];
    acc[v.productName].push(v);
    return acc;
  }, {});

  const handleViewDetail = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setDetailDialogOpen(true);
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Biến thể</h1>
          <p className="text-muted-foreground">Quản lý biến thể sản phẩm</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="size-4 mr-2" />
            Đồng bộ
          </Button>
          <Button size="sm">
            <Plus className="size-4 mr-2" />
            Thêm biến thể
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{variants.length}</div>
            <p className="text-sm text-muted-foreground">Tổng biến thể</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {Object.keys(groupedByProduct).length}
            </div>
            <p className="text-sm text-muted-foreground">Sản phẩm có biến thể</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {variants.reduce((sum, v) => sum + v.stock, 0)}
            </div>
            <p className="text-sm text-muted-foreground">Tổng tồn kho</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatPrice(variants[0]?.prices[0]?.amount || 0)}
            </div>
            <p className="text-sm text-muted-foreground">Giá thấp nhất</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm biến thể..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Variants by Product */}
      <div className="space-y-6">
        {Object.entries(groupedByProduct).map(([productName, productVariants]) => (
          <Card key={productName}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{productName}</CardTitle>
                <Badge variant="outline">
                  {productVariants.length} biến thể
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">SKU</th>
                      <th className="px-4 py-3 text-left font-medium">Tên biến thể</th>
                      <th className="px-4 py-3 text-left font-medium">Tùy chọn</th>
                      <th className="px-4 py-3 text-left font-medium">Giá</th>
                      <th className="px-4 py-3 text-left font-medium">Tồn kho</th>
                      <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                      <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productVariants.map((variant) => (
                      <tr
                        key={variant.id}
                        className="border-b hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {variant.sku}
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-xs">
                            <p className="font-medium line-clamp-1">{variant.title}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {variant.options.map((opt, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {opt.value}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-red-600">
                          {formatPrice(variant.prices[0]?.amount || 0)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={
                              variant.stock > 10
                                ? "bg-green-50 text-green-700 border-green-200"
                                : variant.stock > 0
                                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }
                          >
                            {variant.stock}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={
                              variant.status === "active"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-gray-50 text-gray-600 border-gray-200"
                            }
                          >
                            {variant.status === "active" ? "Hoạt động" : "Ẩn"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetail(variant)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toast.info("Chỉnh sửa biến thể")}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
        {Object.keys(groupedByProduct).length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Layers className="size-12 mb-4" />
              <p>Không tìm thấy biến thể nào</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chi tiết biến thể</DialogTitle>
            <DialogDescription>{selectedVariant?.sku}</DialogDescription>
          </DialogHeader>
          {selectedVariant && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Sản phẩm</p>
                  <p className="font-medium">{selectedVariant.productName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SKU</p>
                  <p className="font-mono font-medium">{selectedVariant.sku}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Tùy chọn</p>
                <div className="flex flex-wrap gap-2">
                  {selectedVariant.options.map((opt, i) => (
                    <Badge key={i} variant="secondary">
                      {opt.optionName}: {opt.value}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Giá</p>
                  <p className="font-bold text-red-600">
                    {formatPrice(selectedVariant.prices[0]?.amount || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tồn kho</p>
                  <p className="font-semibold">{selectedVariant.stock}</p>
                </div>
              </div>
              {selectedVariant.weight && (
                <div>
                  <p className="text-sm text-muted-foreground">Trọng lượng</p>
                  <p>{selectedVariant.weight} kg</p>
                </div>
              )}
              {selectedVariant.dimensions && (
                <div>
                  <p className="text-sm text-muted-foreground">Kích thước</p>
                  <p>
                    {selectedVariant.dimensions.length} x {selectedVariant.dimensions.width} x{" "}
                    {selectedVariant.dimensions.height} cm
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Đóng
            </Button>
            <Button onClick={() => toast.info("Chỉnh sửa")}>Chỉnh sửa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
