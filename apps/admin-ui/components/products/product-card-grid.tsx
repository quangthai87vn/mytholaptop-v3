"use client";

import { ProductCard } from "./product-card";
import type { AdaptedProduct } from "@/lib/products/product-filters";

interface ProductCardGridProps {
  products: AdaptedProduct[];
  columns: number;
  onView: (product: AdaptedProduct) => void;
  onDelete: (productId: string) => void;
}

// Auto-fill responsive grid that fills available width
// Min card width: 220px, max columns based on user preference
const GRID_CLASS = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4";

export function ProductCardGrid({
  products,
  onView,
  onDelete,
}: ProductCardGridProps) {
  return (
    <div className={`${GRID_CLASS} min-w-0`}>
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
