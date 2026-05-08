"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  CheckSquare,
  Square,
  MoreHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  STOCK_STATUS_LABELS,
  MEDUSA_STATUS_LABELS,
  type AdaptedProduct,
} from "@/lib/products/product-filters";

interface ProductsTableProps {
  products: AdaptedProduct[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onView: (product: AdaptedProduct) => void;
  onEdit: (product: AdaptedProduct) => void;
  onDelete: (productId: string) => void;
  onSync: (productId: string) => void;
}

export function ProductsTable({
  products,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onView,
  onEdit,
  onDelete,
  onSync,
}: ProductsTableProps) {
  const allSelected =
    products.length > 0 && products.every((p) => selectedIds.has(p.id));

  return (
    <div className="w-full overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="w-10 px-3 py-3 text-left">
              <button
                onClick={() =>
                  onSelectAll(
                    allSelected
                      ? []
                      : products.map((p) => p.id)
                  )
                }
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Chọn tất cả"
              >
                {allSelected ? (
                  <CheckSquare className="size-4 text-primary" />
                ) : (
                  <Square className="size-4" />
                )}
              </button>
            </th>
            <th className="px-3 py-3 text-left font-medium text-muted-foreground w-16">
              Ảnh
            </th>
            <th className="px-3 py-3 text-left font-medium text-muted-foreground min-w-[200px]">
              Sản phẩm
            </th>
            <th className="px-3 py-3 text-left font-medium text-muted-foreground w-28">
              SKU
            </th>
            <th className="px-3 py-3 text-left font-medium text-muted-foreground w-36">
              Danh mục
            </th>
            <th className="px-3 py-3 text-right font-medium text-muted-foreground w-28">
              Giá
            </th>
            <th className="px-3 py-3 text-center font-medium text-muted-foreground w-20">
              Tồn kho
            </th>
            <th className="px-3 py-3 text-center font-medium text-muted-foreground w-24">
              Trạng thái
            </th>
            <th className="px-3 py-3 text-center font-medium text-muted-foreground w-24">
              Đồng bộ
            </th>
            <th className="px-3 py-3 text-center font-medium text-muted-foreground w-14">
              Tác vụ
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const selected = selectedIds.has(product.id);
            const isOutOfStock =
              product.stockStatus === "outofstock" || product.stock === 0;

            return (
              <tr
                key={product.id}
                className={cn(
                  "border-b transition-colors hover:bg-muted/30",
                  selected && "bg-primary/5"
                )}
              >
                {/* Checkbox */}
                <td className="px-3 py-2">
                  <button
                    onClick={() => onToggleSelect(product.id)}
                    className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Chọn sản phẩm"
                  >
                    {selected ? (
                      <CheckSquare className="size-4 text-primary" />
                    ) : (
                      <Square className="size-4" />
                    )}
                  </button>
                </td>

                {/* Image */}
                <td className="px-3 py-2">
                  <div
                    className={cn(
                      "relative w-12 h-12 rounded overflow-hidden bg-muted shrink-0 cursor-pointer",
                      isOutOfStock && "grayscale"
                    )}
                    onClick={() => onView(product)}
                  >
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
                        <Eye className="size-6" />
                      </div>
                    )}
                  </div>
                </td>

                {/* Product name */}
                <td className="px-3 py-2">
                  <button
                    onClick={() => onView(product)}
                    className="text-left font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
                  >
                    {product.name}
                  </button>
                  {product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {product.tags.slice(0, 3).map((tag, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-[10px] px-1 py-0"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </td>

                {/* SKU */}
                <td className="px-3 py-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {product.sku || "—"}
                  </span>
                </td>

                {/* Category */}
                <td className="px-3 py-2">
                  <span className="text-xs truncate block max-w-[140px]">
                    {product.category || (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </span>
                </td>

                {/* Price */}
                <td className="px-3 py-2 text-right">
                  {product.price > 0 ? (
                    <div className="flex flex-col items-end">
                      <span className="font-semibold text-primary text-sm">
                        {formatCurrency(product.price)}
                      </span>
                      {product.compareAtPrice &&
                        product.compareAtPrice > product.price && (
                          <span className="text-[10px] text-muted-foreground line-through">
                            {formatCurrency(product.compareAtPrice)}
                          </span>
                        )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      Chưa có
                    </span>
                  )}
                </td>

                {/* Stock */}
                <td className="px-3 py-2 text-center">
                  <Badge
                    variant={getStockBadgeVariant(
                      product.stock,
                      product.stockStatus
                    )}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {product.stock > 0 && product.stock < 999
                      ? `Còn ${product.stock}`
                      : STOCK_STATUS_LABELS[product.stockStatus]}
                  </Badge>
                </td>

                {/* Status */}
                <td className="px-3 py-2 text-center">
                  <Badge
                    variant={getStatusVariant(product.status)}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {MEDUSA_STATUS_LABELS[product.status] || product.status}
                  </Badge>
                </td>

                {/* Sync status */}
                <td className="px-3 py-2 text-center">
                  {product.syncStatus && product.syncStatus !== "manual" ? (
                    <Badge
                      variant={getSyncStatusVariant(product.syncStatus)}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {SYNC_STATUS_LABELS[product.syncStatus]}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground/40 text-xs">—</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-3 py-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => onView(product)}
                      >
                        <Eye className="mr-2 size-3" />
                        Xem
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => onEdit(product)}
                      >
                        <Pencil className="mr-2 size-3" />
                        Sửa nhanh
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() =>
                          onEdit(product)
                        }
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
