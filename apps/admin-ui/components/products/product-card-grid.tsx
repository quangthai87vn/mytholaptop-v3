"use client";

import { ProductCard } from "./product-card";
import type { AdaptedProduct } from "@/lib/products/product-filters";
import { cn } from "@/lib/utils";

interface ProductCardGridProps {
  products: AdaptedProduct[];
  columns: number;
  selectedIds: Set<string>;
  activeSource?: "woocommerce" | "medusa";
  onToggleSelect: (id: string) => void;
  onView: (product: AdaptedProduct) => void;
  onEdit: (product: AdaptedProduct) => void;
  onDelete: (productId: string) => void;
  onSync: (productId: string) => void;
}

const COLUMN_CLASSES: Record<number, string> = {
  4: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  6: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
};

export function ProductCardGrid({
  products,
  columns,
  selectedIds,
  activeSource,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  onSync,
}: ProductCardGridProps) {
  const gridClass = COLUMN_CLASSES[columns] || COLUMN_CLASSES[5];

  return (
    <div className={cn("grid gap-4 min-w-0", gridClass)}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          selected={selectedIds.has(product.id)}
          activeSource={activeSource}
          onToggleSelect={onToggleSelect}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onSync={onSync}
        />
      ))}
    </div>
  );
}
