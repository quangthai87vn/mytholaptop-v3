"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WooProductEditForm } from "./woo-product-edit-form";
import type { AdaptedProduct } from "@/lib/products/product-filters";

interface WooProductEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: AdaptedProduct | null;
  onSuccess?: () => void;
}

export function WooProductEditDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: WooProductEditDialogProps) {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl max-h-[95vh] overflow-y-auto p-0"
        aria-describedby="woo-product-edit-desc"
      >
        <span id="woo-product-edit-desc" className="sr-only">Chỉnh sửa sản phẩm WooCommerce</span>
        <DialogHeader className="px-6 pt-4 pb-2 border-b shrink-0">
          <DialogTitle className="text-base">
            {product.name || "Sửa sản phẩm WooCommerce"}
          </DialogTitle>
        </DialogHeader>
        <WooProductEditForm
          product={product}
          onSuccess={() => {
            onSuccess?.();
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
