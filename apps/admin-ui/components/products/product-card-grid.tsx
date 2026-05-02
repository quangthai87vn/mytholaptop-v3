"use client";

import { ProductCard } from "./product-card";
import type { AdaptedProduct } from "@/lib/products/product-filters";

interface ProductCardGridProps {
  products: AdaptedProduct[];
  columns: number;
  onView: (product: AdaptedProduct) => void;
  onDelete: (productId: string) => void;
}

const GRID_COLS: Record<number, string> = {
  3: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 2xl:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
};

export function ProductCardGrid({
  products,
  columns,
  onView,
  onDelete,
}: ProductCardGridProps) {
  const gridClass = GRID_COLS[columns] || GRID_COLS[5];

  return (
    <div className={`grid ${gridClass} gap-3`}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onView={onView}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
