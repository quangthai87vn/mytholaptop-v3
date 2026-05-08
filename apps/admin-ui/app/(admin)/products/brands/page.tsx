"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Plus,
  Search,
  RefreshCw,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { MOCK_BRANDS } from "@/lib/mock-data";
import type { Brand, SyncStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const SYNC_STATUS_CONFIG: Record<SyncStatus, { label: string; className: string; icon: React.ReactNode }> = {
  synced: { label: "Đã đồng bộ", className: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle className="size-3" /> },
  pending: { label: "Chờ đồng bộ", className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <Clock className="size-3" /> },
  failed: { label: "Lỗi", className: "bg-red-100 text-red-800 border-red-200", icon: <XCircle className="size-3" /> },
  manual: { label: "Thủ công", className: "bg-gray-100 text-gray-800 border-gray-200", icon: <AlertCircle className="size-3" /> },
};

export default function BrandsPage() {
  const [brands] = useState<Brand[]>(MOCK_BRANDS);
  const [search, setSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newBrand, setNewBrand] = useState({ name: "", slug: "", description: "" });

  const filtered = brands.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddBrand = () => {
    if (!newBrand.name.trim()) {
      toast.error("Vui lòng nhập tên thương hiệu");
      return;
    }
    toast.success(`Đã thêm thương hiệu "${newBrand.name}"`);
    setAddDialogOpen(false);
    setNewBrand({ name: "", slug: "", description: "" });
  };

  const handleDelete = (brand: Brand) => {
    toast.success(`Đã xóa thương hiệu "${brand.name}"`);
  };

  const handleSync = (brand: Brand) => {
    toast.info(`Bắt đầu đồng bộ "${brand.name}"...`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Thương hiệu</h1>
          <p className="text-muted-foreground">Quản lý thương hiệu sản phẩm</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="size-4 mr-2" />
            Đồng bộ
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="size-4 mr-2" />
            Thêm thương hiệu
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{brands.length}</div>
            <p className="text-sm text-muted-foreground">Tổng thương hiệu</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {brands.filter((b) => b.syncStatus === "synced").length}
            </div>
            <p className="text-sm text-muted-foreground">Đã đồng bộ</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {brands.filter((b) => b.syncStatus === "pending").length}
            </div>
            <p className="text-sm text-muted-foreground">Chờ đồng bộ</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {brands.reduce((sum, b) => sum + b.productCount, 0)}
            </div>
            <p className="text-sm text-muted-foreground">Tổng sản phẩm</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm thương hiệu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Danh sách thương hiệu</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Logo</th>
                  <th className="px-4 py-3 text-left font-medium">Tên thương hiệu</th>
                  <th className="px-4 py-3 text-left font-medium">Slug</th>
                  <th className="px-4 py-3 text-left font-medium">Sản phẩm</th>
                  <th className="px-4 py-3 text-left font-medium">Nguồn</th>
                  <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((brand) => {
                  const syncCfg = SYNC_STATUS_CONFIG[brand.syncStatus];
                  return (
                    <tr key={brand.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="size-10 rounded-lg bg-white border overflow-hidden flex items-center justify-center">
                          {brand.logo ? (
                            <Image
                              src={brand.logo}
                              alt={brand.name}
                              width={36}
                              height={36}
                              className="object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground font-semibold">
                              {brand.name.charAt(0)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{brand.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{brand.slug}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-semibold">
                          {brand.productCount}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            brand.source === "woo"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-gray-50 text-gray-600 border-gray-200"
                          }
                        >
                          {brand.source === "woo" ? "WooCommerce" : brand.source}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={syncCfg.className}>
                          {syncCfg.icon}
                          <span className="ml-1">{syncCfg.label}</span>
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSync(brand)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <RefreshCw className="size-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => toast.info("Chỉnh sửa")}>
                                <Pencil className="size-4 mr-2" />
                                Chỉnh sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(brand)}
                                className="text-red-600"
                              >
                                <Trash2 className="size-4 mr-2" />
                                Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertCircle className="size-12 mb-4" />
                <p>Không tìm thấy thương hiệu nào</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm thương hiệu mới</DialogTitle>
            <DialogDescription>
              Nhập thông tin thương hiệu sản phẩm
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên thương hiệu</label>
              <Input
                placeholder="Ví dụ: Dell, HP, Lenovo..."
                value={newBrand.name}
                onChange={(e) =>
                  setNewBrand({ ...newBrand, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Slug</label>
              <Input
                placeholder="dell, hp, lenovo..."
                value={newBrand.slug}
                onChange={(e) =>
                  setNewBrand({ ...newBrand, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mô tả</label>
              <Input
                placeholder="Mô tả ngắn..."
                value={newBrand.description}
                onChange={(e) =>
                  setNewBrand({ ...newBrand, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleAddBrand}>Thêm thương hiệu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
