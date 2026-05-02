"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductEditFormData } from "./product-edit-form";

interface ProductInventoryTabProps {
  form: ProductEditFormData;
  onChange: (form: ProductEditFormData) => void;
}

type StockStatus = "instock" | "outofstock" | "onbackorder";

const STOCK_STATUS_CONFIG: Record<StockStatus, { label: string; variant: "success" | "destructive" | "warning"; description: string }> = {
  instock: {
    label: "Còn hàng",
    variant: "success",
    description: "Sản phẩm sẵn sàng bán.",
  },
  outofstock: {
    label: "Hết hàng",
    variant: "destructive",
    description: "Sản phẩm tạm hết hàng.",
  },
  onbackorder: {
    label: "Đang chờ hàng",
    variant: "warning",
    description: "Sản phẩm đang được đặt hàng trước.",
  },
};

export function ProductInventoryTab({ form, onChange }: ProductInventoryTabProps) {
  const setField = <K extends keyof ProductEditFormData>(
    key: K,
    value: ProductEditFormData[K]
  ) => {
    onChange({ ...form, [key]: value });
  };

  const wooManageStock = form.woo_manage_stock === "true";
  const wooStockStatus = form.woo_stock_status as StockStatus;
  const wooStockQty = form.woo_stock_quantity
    ? parseInt(form.woo_stock_quantity)
    : null;

  const isUsingWooData = wooManageStock && wooStockStatus;
  const effectiveStatus = form.stock_status_override || wooStockStatus || "instock";

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Quản lý số lượng</Label>
            <p className="text-sm text-muted-foreground">
              Theo dõi số lượng tồn kho của sản phẩm.
            </p>
          </div>
          <Switch
            checked={form.manage_inventory}
            onCheckedChange={(checked) =>
              setField("manage_inventory", checked)
            }
          />
        </div>

        {form.manage_inventory && (
          <>
            <Separator />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="inventory_quantity">Số lượng tồn kho</Label>
                <Input
                  id="inventory_quantity"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.inventory_quantity || ""}
                  onChange={(e) =>
                    setField("inventory_quantity", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock_status">Trạng thái kho hàng</Label>
                <Select
                  value={effectiveStatus}
                  onValueChange={(v) =>
                    setField("stock_status_override", v as StockStatus)
                  }
                >
                  <SelectTrigger id="stock_status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instock">Còn hàng</SelectItem>
                    <SelectItem value="outofstock">Hết hàng</SelectItem>
                    <SelectItem value="onbackorder">Đang chờ hàng</SelectItem>
                  </SelectContent>
                </Select>
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">
                    {STOCK_STATUS_CONFIG[effectiveStatus as StockStatus]?.description}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {isUsingWooData && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-muted-foreground">
              Dữ liệu tồn kho từ WordPress
            </Label>

            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Quản lý tồn kho
                </span>
                <Badge
                  variant={wooManageStock ? "success" : "secondary"}
                  className="text-xs"
                >
                  {wooManageStock ? "Có" : "Không"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Trạng thái kho
                </span>
                <Badge
                  variant={
                    STOCK_STATUS_CONFIG[wooStockStatus]?.variant || "secondary"
                  }
                  className="text-xs"
                >
                  {STOCK_STATUS_CONFIG[wooStockStatus]?.label ||
                    wooStockStatus ||
                    "—"}
                </Badge>
              </div>

              {wooStockQty !== null && !isNaN(wooStockQty) && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Số lượng tồn kho
                  </span>
                  <span className="text-sm font-medium">{wooStockQty}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!form.manage_inventory && !isUsingWooData && (
        <div className="rounded-lg border border-dashed p-4">
          <p className="text-sm text-muted-foreground">
            Sản phẩm này không quản lý số lượng. Trạ thái kho mặc định là{" "}
            <strong className="text-foreground">Còn hàng</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
