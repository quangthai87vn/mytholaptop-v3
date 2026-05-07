"use client";

import Image from "next/image";
import { Copy, ExternalLink, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { ProductEditFormData } from "./product-edit-form";

interface ProductEditSidebarProps {
  form: ProductEditFormData;
  productId: string;
  isDirty: boolean;
}

const STATUS_CONFIG = {
  published: { label: "Hoạt động", variant: "success" as const, icon: CheckCircle2 },
  draft: { label: "Nháp", variant: "secondary" as const, icon: Clock },
  proposed: { label: "Đề xuất", variant: "warning" as const, icon: Clock },
};

const STOCK_STATUS_CONFIG = {
  instock: { label: "Còn hàng", variant: "success" as const },
  outofstock: { label: "Hết hàng", variant: "destructive" as const },
  onbackorder: { label: "Đang chờ", variant: "warning" as const },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProductEditSidebar({ form, productId, isDirty }: ProductEditSidebarProps) {
  const extractRelativePath = (url: string | undefined | null): string => {
    if (!url) return "";
    const trimmed = url.trim();
    if (!trimmed || trimmed.length < 5) return "";
    if (trimmed.startsWith("/")) return trimmed;
    const match = trimmed.match(/\/wp-content\/uploads\/[^\s?#]+/);
    if (match) return match[0];
    try {
      return new URL(trimmed).pathname;
    } catch {
      return trimmed;
    }
  };

  const thumbnailDisplay = extractRelativePath(form.thumbnail);
  const thumbnailSrc = thumbnailDisplay || form.thumbnail || "";

  const price = parseFloat(form.regular_price || "0");
  const salePrice = parseFloat(form.sale_price || "0");
  const hasDiscount = salePrice > 0 && salePrice < price;
  const discountPct = hasDiscount
    ? Math.round(((price - salePrice) / price) * 100)
    : 0;

  const status = STATUS_CONFIG[form.status] || STATUS_CONFIG.draft;
  const StatusIcon = status.icon;

  const effectiveStockStatus = form.stock_status_override || form.woo_stock_status || "instock";
  const stockStatusConfig = STOCK_STATUS_CONFIG[effectiveStockStatus as keyof typeof STOCK_STATUS_CONFIG] || STOCK_STATUS_CONFIG.instock;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã copy ${label}`);
  };

  return (
    <div className="space-y-4 min-w-0">
      {/* Preview Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Xem trước</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Thumbnail Preview */}
          <div className="relative w-full aspect-square rounded-xl border bg-muted overflow-hidden">
            {thumbnailSrc ? (
              <Image
                src={thumbnailDisplay ? thumbnailDisplay : form.thumbnail!}
                alt={form.title}
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <svg className="size-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">Chưa có ảnh</span>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-3 min-w-0">
            {/* Title */}
            <div>
              <h3 className="font-semibold text-lg leading-tight line-clamp-2 break-words">
                {form.title || "Chưa có tên sản phẩm"}
              </h3>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <Badge variant={status.variant} className="gap-1.5">
                <StatusIcon className="size-3" />
                {status.label}
              </Badge>
              {isDirty && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                  Có thay đổi
                </Badge>
              )}
            </div>

            {/* Price */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">
                  {price > 0 ? formatCurrency(salePrice > 0 ? salePrice : price) : "Liên hệ"}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatCurrency(price)}
                  </span>
                )}
              </div>
              {hasDiscount && (
                <Badge variant="destructive" className="text-xs">
                  Giảm {discountPct}%
                </Badge>
              )}
            </div>

            <Separator />

            {/* SKU */}
            {form.sku && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">SKU</span>
                <div className="flex items-center gap-1">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[120px]">
                    {form.sku}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-6 p-0"
                    onClick={() => copyToClipboard(form.sku!, "SKU")}
                  >
                    <Copy className="size-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Stock */}
            {form.manage_inventory && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Tồn kho</span>
                <Badge variant={stockStatusConfig.variant} className="text-xs">
                  {form.inventory_quantity
                    ? `${form.inventory_quantity} cái`
                    : stockStatusConfig.label}
                </Badge>
              </div>
            )}

            {/* Categories */}
            {form.woo_category_names && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Danh mục</span>
                <div className="flex flex-wrap gap-1">
                  {form.woo_category_names.split(",").filter(Boolean).slice(0, 3).map((cat, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {cat.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* WP Info */}
            {form.woo_product_id && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">WordPress</span>
                <div className="flex items-center gap-1">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[120px]">
                    WP#{form.woo_product_id}
                  </code>
                </div>
              </div>
            )}

            {/* Handle */}
            {form.handle && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Slug</span>
                <div className="flex items-center gap-1">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[120px]">
                    {form.handle}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-6 p-0"
                    onClick={() => copyToClipboard(form.handle, "slug")}
                  >
                    <Copy className="size-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Hành động nhanh</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => window.open(`/products/${form.handle || productId}`, "_blank")}
          >
            <ExternalLink className="size-4" />
            Xem sản phẩm
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => copyToClipboard(`/products/${form.handle || productId}`, "URL")}
          >
            <Copy className="size-4" />
            Copy đường dẫn
          </Button>
          {form.thumbnail && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => copyToClipboard(form.thumbnail!, "image path")}
            >
              <Copy className="size-4" />
              Copy đường dẫn ảnh
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
