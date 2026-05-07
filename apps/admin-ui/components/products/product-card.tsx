"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  XCircle,
  Eye,
  Pencil,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, cn } from "@/lib/utils";
import {
  getStockBadgeVariant,
  getStatusVariant,
  type AdaptedProduct,
} from "@/lib/products/product-filters";
import {
  STOCK_STATUS_LABELS,
  MEDUSA_STATUS_LABELS,
} from "@/lib/products/product-filters";

interface ProductCardProps {
  product: AdaptedProduct;
  onView: (product: AdaptedProduct) => void;
  onDelete: (productId: string) => void;
}

export function ProductCard({ product, onView, onDelete }: ProductCardProps) {
  const router = useRouter();
  const isOutOfStock = product.stockStatus === "outofstock" || product.stock === 0;

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/30 flex flex-col h-full min-w-0">
      {/* Image */}
      <div
        className={cn(
          "relative overflow-hidden bg-muted cursor-pointer shrink-0",
          "aspect-[4/3]",
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

        {/* Top badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <Badge
            variant={getStockBadgeVariant(product.stock, product.stockStatus)}
            className="gap-0.5 text-[10px] px-1.5 py-0 shadow-sm backdrop-blur-sm bg-background/80"
          >
            {product.stock > 0 && product.stock < 999
              ? `Còn ${product.stock}`
              : STOCK_STATUS_LABELS[product.stockStatus] || "Còn hàng"}
          </Badge>
        </div>

        <div className="absolute top-2 right-2">
          <Badge
            variant={getStatusVariant(product.status)}
            className="gap-0.5 text-[10px] px-1.5 py-0 shadow-sm backdrop-blur-sm bg-background/80"
          >
            {MEDUSA_STATUS_LABELS[product.status] || product.status}
          </Badge>
        </div>

        {/* Hover actions overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
              router.push(`/products/${product.id}/edit`);
            }}
            className="gap-1"
          >
            <Pencil className="size-3" />
            Sửa
          </Button>
        </div>
      </div>

      {/* Info - flexible height, content at bottom */}
      <CardContent className="p-3 flex flex-col flex-1 min-w-0">
        {/* Category */}
        {product.category && (
          <p className="text-xs text-primary font-medium bg-primary/5 px-1.5 py-0.5 rounded truncate mb-1">
            {product.category}
          </p>
        )}

        {/* Name */}
        <h3
          className="line-clamp-2 text-sm font-semibold leading-snug text-foreground cursor-pointer hover:text-primary transition-colors"
          onClick={() => onView(product)}
        >
          {product.name}
        </h3>

        {/* Spacer pushes content to bottom */}
        <div className="flex-1" />

        {/* Price - fixed height to prevent layout shift */}
        <div className="h-12 flex flex-col justify-end">
          {product.price > 0 ? (
            <div className="flex flex-col">
              <span className="text-base font-bold text-primary">
                {formatCurrency(product.price)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatCurrency(product.compareAtPrice)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Chưa có giá</span>
          )}
        </div>

        {/* Tags */}
        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {product.tags.slice(0, 2).map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
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

        {/* Bottom row - always at bottom */}
        <div className="flex items-center justify-between pt-2 mt-2 border-t">
          <span className="text-xs text-muted-foreground truncate font-mono max-w-[60%]">
            {product.sku || "—"}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-6">
                <MoreHorizontal className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onView(product)}
              >
                <Eye className="mr-2 size-3" />
                Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => router.push(`/products/${product.id}/edit`)}
              >
                <Pencil className="mr-2 size-3" />
                Sửa
              </DropdownMenuItem>
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
    </Card>
  );
}
