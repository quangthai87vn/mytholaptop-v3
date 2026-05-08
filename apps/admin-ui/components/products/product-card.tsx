"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  XCircle,
  Eye,
  Pencil,
  Trash2,
  Copy,
  RefreshCw,
  MoreHorizontal,
  CheckSquare,
  Square,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, cn } from "@/lib/utils";
import {
  getStockBadgeVariant,
  getStatusVariant,
  getSyncStatusVariant,
  SYNC_STATUS_LABELS,
  type AdaptedProduct,
} from "@/lib/products/product-filters";
import {
  STOCK_STATUS_LABELS,
  MEDUSA_STATUS_LABELS,
} from "@/lib/products/product-filters";

interface ProductCardProps {
  product: AdaptedProduct;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onView: (product: AdaptedProduct) => void;
  onEdit: (product: AdaptedProduct) => void;
  onDelete: (productId: string) => void;
  onSync: (productId: string) => void;
}

export function ProductCard({
  product,
  selected,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  onSync,
}: ProductCardProps) {
  const router = useRouter();
  const isOutOfStock =
    product.stockStatus === "outofstock" || product.stock === 0;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect(product.id);
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/30 flex flex-col h-full min-w-0",
        selected && "ring-2 ring-primary ring-offset-1"
      )}
    >
      {/* Image — square 1:1 */}
      <div
        className={cn(
          "relative overflow-hidden bg-muted cursor-pointer shrink-0 aspect-square",
          isOutOfStock && "grayscale"
        )}
        onClick={() => onView(product)}
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className={cn(
              "object-cover transition-transform duration-300 group-hover:scale-105",
              isOutOfStock && "grayscale"
            )}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            loading="eager"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <XCircle className="size-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Hover actions overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onView(product);
            }}
            className="gap-1"
          >
            <Eye className="size-3" />
            Xem
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(product);
            }}
            className="gap-1"
          >
            <Pencil className="size-3" />
            Sửa
          </Button>
        </div>
      </div>

      {/* Info */}
      <CardContent className="p-3 flex flex-col flex-1 min-w-0">
        {/* Category badge */}
        {product.category && (
          <p className="text-xs text-primary font-medium bg-primary/5 px-1.5 py-0.5 rounded truncate mb-1">
            {product.category}
          </p>
        )}

        {/* Product name */}
        <h3
          className="line-clamp-2 text-sm font-semibold leading-snug text-foreground cursor-pointer hover:text-primary transition-colors"
          onClick={() => onView(product)}
        >
          {product.name}
        </h3>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price */}
        <div className="h-12 flex flex-col justify-end">
          {product.price > 0 ? (
            <div className="flex flex-col">
              <span className="text-base font-bold text-primary">
                {formatCurrency(product.price)}
              </span>
              {product.compareAtPrice &&
                product.compareAtPrice > product.price && (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatCurrency(product.compareAtPrice)}
                  </span>
                )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Chưa có giá</span>
          )}
        </div>

        {/* SKU + Tags row */}
        <div className="flex items-center justify-between mt-1.5 min-w-0">
          <span className="text-xs text-muted-foreground truncate font-mono max-w-[55%]">
            {product.sku || "—"}
          </span>
          {/* Sync status badge */}
          {product.syncStatus && product.syncStatus !== "manual" && (
            <Badge
              variant={getSyncStatusVariant(product.syncStatus)}
              className="text-[9px] px-1 py-0 shrink-0"
            >
              {SYNC_STATUS_LABELS[product.syncStatus]}
            </Badge>
          )}
        </div>

        {/* Tags */}
        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {product.tags.slice(0, 2).map((tag, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
              >
                {tag}
              </Badge>
            ))}
            {product.tags.length > 2 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                +{product.tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Bottom row — status badges + action menu */}
        <div className="flex items-center justify-between pt-2 mt-2 border-t min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            <Badge
              variant={getStockBadgeVariant(product.stock, product.stockStatus)}
              className="gap-0.5 text-[10px] px-1.5 py-0 shrink-0"
            >
              {product.stock > 0 && product.stock < 999
                ? `Còn ${product.stock}`
                : STOCK_STATUS_LABELS[product.stockStatus] || "Còn hàng"}
            </Badge>
            <Badge
              variant={getStatusVariant(product.status)}
              className="text-[10px] px-1.5 py-0 shrink-0"
            >
              {MEDUSA_STATUS_LABELS[product.status] || product.status}
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-6 shrink-0">
                <MoreHorizontal className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onView(product)}
              >
                <Eye className="mr-2 size-3" />
                Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onEdit(product)}
              >
                <Pencil className="mr-2 size-3" />
                Sửa
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => router.push(`/products/${product.id}/edit`)}
              >
                <Pencil className="mr-2 size-3" />
                Sửa nâng cao
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onSync(product.id)}
              >
                <RefreshCw className="mr-2 size-3" />
                Đồng bộ lại
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:text-red-600"
                onClick={() => onDelete(product.id)}
              >
                <Trash2 className="mr-2 size-3" />
                Xoá
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>

      {/* Checkbox — top-left, always visible, highlighted when selected */}
      <button
        onClick={handleCheckboxClick}
        className={cn(
          "absolute top-2 left-2 z-10 rounded transition-all p-0.5",
          "bg-white/70 backdrop-blur-sm",
          selected
            ? "text-primary"
            : "text-muted-foreground opacity-0 group-hover:opacity-100"
        )}
        aria-label="Chọn sản phẩm"
      >
        {selected ? (
          <CheckSquare className="size-4" />
        ) : (
          <Square className="size-4" />
        )}
      </button>
    </Card>
  );
}
