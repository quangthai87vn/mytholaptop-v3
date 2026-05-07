"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCheckSku } from "@/hooks/use-medusa";
import type { ProductEditFormData } from "./product-edit-form";

interface ProductPricingTabProps {
  form: ProductEditFormData;
  onChange: (form: ProductEditFormData) => void;
  excludeProductId?: string;
}

export function ProductPricingTab({
  form,
  onChange,
  excludeProductId,
}: ProductPricingTabProps) {
  const setField = <K extends keyof ProductEditFormData>(
    key: K,
    value: ProductEditFormData[K]
  ) => {
    onChange({ ...form, [key]: value });
  };

  // SKU validation
  const { data: skuCheck, isLoading: isCheckingSku } = useCheckSku(
    form.sku || "",
    excludeProductId
  );
  const skuExists = skuCheck?.exists && (skuCheck?.duplicates?.length ?? 0) > 0;
  const skuValid = form.sku && !skuExists;
  const showSkuWarning = form.sku && skuExists;

  const regularPrice = parseFloat(form.regular_price || "0");
  const salePrice = parseFloat(form.sale_price || "0");
  const discountPct =
    regularPrice > 0 && salePrice > 0 && salePrice < regularPrice
      ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="regular_price">Giá thông thường (VND)</Label>
          <Input
            id="regular_price"
            type="number"
            min="0"
            placeholder="0"
            value={form.regular_price || ""}
            onChange={(e) => setField("regular_price", e.target.value)}
          />
          {regularPrice > 0 && (
            <p className="text-sm text-muted-foreground">
              = {formatCurrency(regularPrice)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sale_price">Giá khuyến mãi (VND)</Label>
          <Input
            id="sale_price"
            type="number"
            min="0"
            placeholder="0"
            value={form.sale_price || ""}
            onChange={(e) => setField("sale_price", e.target.value)}
          />
          {salePrice > 0 && (
            <p className="text-sm text-muted-foreground">
              = {formatCurrency(salePrice)}
            </p>
          )}
        </div>
      </div>

      {discountPct > 0 && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <p className="text-sm text-green-800 font-medium">
            Giảm giá {discountPct}% so với giá gốc
          </p>
          <p className="text-xs text-green-700 mt-1">
            Tiết kiệm {formatCurrency(regularPrice - salePrice)}
          </p>
        </div>
      )}

      <Separator />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <div className="relative">
            <Input
              id="sku"
              placeholder="SKU-001"
              value={form.sku || ""}
              onChange={(e) => setField("sku", e.target.value)}
              className={
                showSkuWarning
                  ? "pr-10 border-destructive"
                  : skuValid
                    ? "pr-10 border-green-500"
                    : ""
              }
            />
            {form.sku && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {isCheckingSku ? (
                  <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
                ) : skuValid ? (
                  <CheckCircle2 className="size-4 text-green-500" />
                ) : showSkuWarning ? (
                  <AlertCircle className="size-4 text-destructive" />
                ) : null}
              </div>
            )}
          </div>
          {showSkuWarning && skuCheck?.duplicates && (
            <div className="flex items-start gap-1 rounded bg-destructive/10 border border-destructive/20 p-2">
              <AlertCircle className="size-3.5 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                SKU đã tồn tại:{" "}
                {skuCheck.duplicates.map((d) => d.title).join(", ")}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Đơn vị tiền tệ</Label>
          <Input value="VND" disabled className="bg-muted" />
        </div>
      </div>

      {form.woo_regular_price && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-muted-foreground">Giá từ WordPress</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {form.woo_regular_price && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Giá gốc WP</p>
                  <p className="font-medium text-sm">
                    {formatCurrency(parseFloat(form.woo_regular_price))}
                  </p>
                </div>
              )}
              {form.woo_sale_price && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Giá sale WP</p>
                  <p className="font-medium text-sm">
                    {formatCurrency(parseFloat(form.woo_sale_price))}
                  </p>
                </div>
              )}
              {form.woo_price && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Giá WP</p>
                  <p className="font-medium text-sm">
                    {formatCurrency(parseFloat(form.woo_price))}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
