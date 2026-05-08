"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  Package,
  Warehouse,
  ArrowUpDown,
  Eye,
  Pencil,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { MOCK_INVENTORY, MOCK_WAREHOUSES } from "@/lib/mock-data";
import type { InventoryItem, StockStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STOCK_STATUS_CONFIG: Record<StockStatus, { label: string; className: string; icon: React.ReactNode }> = {
  in_stock: { label: "Còn hàng", className: "bg-green-100 text-green-800 border-green-200", icon: <TrendingUp className="size-3" /> },
  low_stock: { label: "Sắp hết", className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <Minus className="size-3" /> },
  out_of_stock: { label: "Hết hàng", className: "bg-red-100 text-red-800 border-red-200", icon: <TrendingDown className="size-3" /> },
};

export default function InventoryPage() {
  const [inventory] = useState<InventoryItem[]>(MOCK_INVENTORY);
  const [warehouses] = useState(MOCK_WAREHOUSES);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");

  const filtered = inventory.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());
    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "in_stock" && item.stockStatus === "in_stock") ||
      (stockFilter === "low_stock" && item.stockStatus === "low_stock") ||
      (stockFilter === "out_of_stock" && item.stockStatus === "out_of_stock");
    const matchesWarehouse =
      warehouseFilter === "all" || item.warehouseId === warehouseFilter;
    return matchesSearch && matchesStock && matchesWarehouse;
  });

  const stats = {
    totalItems: inventory.length,
    totalStock: inventory.reduce((sum, i) => sum + i.stockQuantity, 0),
    totalReserved: inventory.reduce((sum, i) => sum + i.reservedQuantity, 0),
    totalAvailable: inventory.reduce((sum, i) => sum + i.availableQuantity, 0),
    inStock: inventory.filter((i) => i.stockStatus === "in_stock").length,
    lowStock: inventory.filter((i) => i.stockStatus === "low_stock").length,
    outOfStock: inventory.filter((i) => i.stockStatus === "out_of_stock").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kho hàng</h1>
          <p className="text-muted-foreground">Quản lý tồn kho sản phẩm</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="size-4 mr-2" />
            Cập nhật kho
          </Button>
          <Button size="sm">
            <Plus className="size-4 mr-2" />
            Nhập kho
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng sản phẩm</p>
                <div className="text-2xl font-bold">{stats.totalItems}</div>
              </div>
              <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="size-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Còn hàng</p>
                <div className="text-2xl font-bold text-green-600">{stats.inStock}</div>
              </div>
              <div className="size-10 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="size-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.lowStock > 0 ? "border-yellow-300" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sắp hết</p>
                <div className="text-2xl font-bold text-yellow-600">{stats.lowStock}</div>
              </div>
              <div className="size-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="size-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.outOfStock > 0 ? "border-red-300" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hết hàng</p>
                <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
              </div>
              <div className="size-10 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="size-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tồn kho tổng quan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
              <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalStock}</p>
                <p className="text-sm text-muted-foreground">Tổng tồn kho</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
              <div className="size-10 rounded-full bg-orange-100 flex items-center justify-center">
                <ArrowUpDown className="size-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalReserved}</p>
                <p className="text-sm text-muted-foreground">Đã đặt hàng</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
              <div className="size-10 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="size-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalAvailable}</p>
                <p className="text-sm text-muted-foreground">Còn trong kho</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm sản phẩm, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Trạng thái kho" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="in_stock">Còn hàng</SelectItem>
              <SelectItem value="low_stock">Sắp hết</SelectItem>
              <SelectItem value="out_of_stock">Hết hàng</SelectItem>
            </SelectContent>
          </Select>
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Kho hàng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả kho</SelectItem>
              {warehouses.map((wh) => (
                <SelectItem key={wh.id} value={wh.id}>
                  {wh.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chi tiết tồn kho</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Sản phẩm</th>
                  <th className="px-4 py-3 text-left font-medium">SKU</th>
                  <th className="px-4 py-3 text-left font-medium">Kho</th>
                  <th className="px-4 py-3 text-right font-medium">Tồn kho</th>
                  <th className="px-4 py-3 text-right font-medium">Đã đặt</th>
                  <th className="px-4 py-3 text-right font-medium">Còn lại</th>
                  <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const statusCfg = STOCK_STATUS_CONFIG[item.stockStatus];
                  return (
                    <tr
                      key={item.id}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-white border overflow-hidden shrink-0">
                            {item.productImage ? (
                              <Image
                                src={item.productImage}
                                alt={item.productName}
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="size-full flex items-center justify-center bg-muted">
                                <Package className="size-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{item.productName}</p>
                            {item.variantTitle && (
                              <p className="text-xs text-muted-foreground truncate">
                                {item.variantTitle}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {item.sku}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Warehouse className="size-3.5 text-muted-foreground" />
                          <span className="text-xs">{item.warehouseName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {item.stockQuantity}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {item.reservedQuantity}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {item.availableQuantity}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusCfg.className}>
                          {statusCfg.icon}
                          <span className="ml-1">{statusCfg.label}</span>
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toast.info("Xem chi tiết")}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toast.info("Điều chỉnh kho")}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Warehouse className="size-12 mb-4" />
                <p>Không tìm thấy sản phẩm nào</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
