"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  Star,
  Tag,
  Monitor,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Wifi,
  WifiOff,
  ExternalLink,
  Copy,
} from "lucide-react";
import type { AIProduct } from "@/types/content";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function StockBadge({ status, stock }: { status: string; stock: number }) {
  if (status === "out_of_stock") {
    return (
      <Badge variant="destructive" className="text-[10px] gap-1">
        <WifiOff className="size-2.5" />
        Hết hàng
      </Badge>
    );
  }
  if (stock > 0) {
    return (
      <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800">
        <Wifi className="size-2.5" />
        Còn {stock}
      </Badge>
    );
  }
  return null;
}

function HighlightItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <div className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
      <span className="text-xs text-muted-foreground leading-relaxed">{text}</span>
    </li>
  );
}

export function ProductDetailDrawer({
  product,
  open,
  onClose,
}: {
  product: AIProduct | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!product) return null;

  const description = stripHtml(product.description || "");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-0">
          {/* Hero image */}
          <div className="relative w-full h-40 bg-muted">
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="size-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                <Package className="size-12 text-muted-foreground/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <DialogTitle className="text-base font-bold text-white leading-tight line-clamp-2 drop-shadow-sm">
                {product.name}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* Quick stats */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <DollarSign className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Giá bán</p>
                <p className="text-sm font-bold text-primary">
                  {product.price > 0 ? formatCurrency(product.price) : "Chưa có giá"}
                </p>
              </div>
            </div>

            <div className="flex-1 flex items-center gap-2">
              <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                {product.stockStatus === "out_of_stock" ? (
                  <WifiOff className="size-4 text-red-500" />
                ) : (
                  <Wifi className="size-4 text-emerald-500" />
                )}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Tồn kho</p>
                <StockBadge status={product.stockStatus} stock={product.stock} />
              </div>
            </div>
          </div>

          {/* Meta badges */}
          <div className="flex flex-wrap gap-1.5">
            {product.brand && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Tag className="size-2.5" />
                {product.brand}
              </Badge>
            )}
            {product.category && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Monitor className="size-2.5" />
                {product.category}
              </Badge>
            )}
            {product.status === "published" && (
              <Badge variant="default" className="text-[10px] bg-emerald-500 gap-1">
                <TrendingUp className="size-2.5" />
                Published
              </Badge>
            )}
          </div>

          {/* Description */}
          {description && (
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Star className="size-3 text-primary" />
                Mô tả sản phẩm
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          )}

          {/* Key highlights */}
          {product.specs && product.specs.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Star className="size-3 text-primary" />
                Đặc điểm nổi bật
              </h3>
              <ul className="space-y-0">
                {product.specs.slice(0, 8).map((spec, i) => (
                  <HighlightItem key={i} text={spec} />
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Tag className="size-3 text-primary" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-[10px] cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(tag);
                      toast.success("Đã copy tag");
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* SEO info */}
          {(product.seoTitle || product.seoDescription) && (
            <div className="space-y-1.5 rounded-lg border border-dashed bg-muted/20 p-3">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                SEO
              </h3>
              {product.seoTitle && (
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium">Title: </span>
                  {product.seoTitle}
                </p>
              )}
              {product.seoDescription && (
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium">Meta: </span>
                  {product.seoDescription}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 p-4 border-t bg-muted/20">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 flex-1"
            onClick={() => {
              navigator.clipboard.writeText(product.name);
              toast.success("Đã copy tên sản phẩm");
            }}
          >
            <Copy className="size-3" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 flex-1"
            onClick={() => {
              const text = `${product.name}\n${product.price > 0 ? formatCurrency(product.price) : ""}\n${product.stock} trong kho\n${product.specs?.slice(0, 3).join("\n") || ""}`;
              navigator.clipboard.writeText(text);
              toast.success("Đã copy thông tin");
            }}
          >
            <ShoppingCart className="size-3" />
            Copy thông tin
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 flex-1">
            <ExternalLink className="size-3" />
            Chi tiết
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
