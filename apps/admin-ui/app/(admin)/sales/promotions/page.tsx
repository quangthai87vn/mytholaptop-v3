"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  RefreshCw,
  Plus,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Tag,
  Percent,
} from "lucide-react";
import { MOCK_PROMOTIONS } from "@/lib/mock-data";
import type { Promotion } from "@/types/sales";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount);
}

const STATUS_CONFIG: Record<string, any> = {
  active: { label: "Hoạt động", variant: "success" },
  inactive: { label: "Tắt", variant: "secondary" },
  expired: { label: "Hết hạn", variant: "destructive" },
};

const DISCOUNT_TYPE_CONFIG: Record<string, string> = {
  percent: "Phần trăm (%)",
  fixed: "Cố định (VND)",
  shipping: "Miễn phí ship",
};

export default function PromotionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewPromo, setViewPromo] = useState<Promotion | null>(null);

  const filteredPromotions = MOCK_PROMOTIONS.filter((promo) => {
    const matchSearch =
      search === "" ||
      promo.code.toLowerCase().includes(search.toLowerCase()) ||
      promo.name.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === "all" || promo.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Đã copy mã: ${code}`);
  };

  const getUsagePercent = (promo: Promotion) => {
    if (!promo.usageLimit) return 0;
    return Math.round((promo.usedCount / promo.usageLimit) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Khuyến mãi</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quản lý mã giảm giá và khuyến mãi
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Tạo khuyến mãi
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã, tên khuyến mãi..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Tắt</option>
              <option value="expired">Hết hạn</option>
            </select>
            <Button variant="outline" size="icon">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên khuyến mãi</TableHead>
                  <TableHead>Loại giảm</TableHead>
                  <TableHead className="text-right">Giá trị</TableHead>
                  <TableHead>Đã dùng</TableHead>
                  <TableHead>Hết hạn</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPromotions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      Không tìm thấy khuyến mãi nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPromotions.map((promo) => {
                    const statusConfig =
                      STATUS_CONFIG[promo.status] || STATUS_CONFIG.inactive;
                    const usagePercent = getUsagePercent(promo);

                    return (
                      <TableRow key={promo.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono font-medium">
                              {promo.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6"
                              onClick={() => handleCopyCode(promo.code)}
                            >
                              <Copy className="size-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{promo.name}</p>
                          {promo.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                              {promo.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {DISCOUNT_TYPE_CONFIG[promo.discountType]}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {promo.discountType === "percent"
                            ? `${promo.discountValue}%`
                            : promo.discountType === "shipping"
                            ? "Miễn phí"
                            : formatCurrency(promo.discountValue)}
                          {promo.maxDiscountAmount && (
                            <span className="text-xs text-muted-foreground block">
                              Tối đa {formatCurrency(promo.maxDiscountAmount)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 min-w-[80px]">
                            <div className="flex justify-between text-xs">
                              <span>
                                {promo.usedCount}
                                {promo.usageLimit ? `/${promo.usageLimit}` : ""}
                              </span>
                              <span className="text-muted-foreground">
                                {usagePercent}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  usagePercent >= 80
                                    ? "bg-red-500"
                                    : usagePercent >= 50
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(promo.endDate)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant}>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewPromo(promo)}>
                                <Pencil className="mr-2 size-4" />
                                Xem chi tiết
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyCode(promo.code)}>
                                <Copy className="mr-2 size-4" />
                                Copy mã
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Pencil className="mr-2 size-4" />
                                Chỉnh sửa
                              </DropdownMenuItem>
                              {promo.status === "active" && (
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="mr-2 size-4" />
                                  Xóa
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tạo khuyến mãi mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Mã giảm giá</label>
                <Input placeholder="VD: SUMMER2026" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tên khuyến mãi</label>
                <Input placeholder="VD: Summer Sale 2026" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Loại giảm</label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="percent">Phần trăm (%)</option>
                  <option value="fixed">Cố định (VND)</option>
                  <option value="shipping">Miễn phí ship</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Giá trị</label>
                <Input placeholder="VD: 10" type="number" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ngày bắt đầu</label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ngày kết thúc</label>
                <Input type="date" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={() => {
              toast.success("Đã tạo khuyến mãi!");
              setCreateOpen(false);
            }}>
              Tạo khuyến mãi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!viewPromo} onOpenChange={() => setViewPromo(null)}>
        <DialogContent className="max-w-lg">
          {viewPromo && (
            <>
              <DialogHeader>
                <DialogTitle>{viewPromo.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3">
                  <code className="bg-muted px-3 py-1.5 rounded font-mono font-bold text-lg">
                    {viewPromo.code}
                  </code>
                  <Button variant="outline" size="sm" onClick={() => handleCopyCode(viewPromo.code)}>
                    <Copy className="mr-2 size-4" />
                    Copy
                  </Button>
                </div>
                {viewPromo.description && (
                  <p className="text-sm text-muted-foreground">{viewPromo.description}</p>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Loại giảm</p>
                    <p className="font-medium">{DISCOUNT_TYPE_CONFIG[viewPromo.discountType]}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Giá trị</p>
                    <p className="font-bold text-primary">
                      {viewPromo.discountType === "percent"
                        ? `${viewPromo.discountValue}%`
                        : viewPromo.discountType === "shipping"
                        ? "Miễn phí ship"
                        : formatCurrency(viewPromo.discountValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Đơn hàng tối thiểu</p>
                    <p>
                      {viewPromo.minOrderAmount
                        ? formatCurrency(viewPromo.minOrderAmount)
                        : "Không có"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Giảm tối đa</p>
                    <p>
                      {viewPromo.maxDiscountAmount
                        ? formatCurrency(viewPromo.maxDiscountAmount)
                        : "Không có"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Số lần dùng</p>
                    <p>
                      {viewPromo.usedCount}
                      {viewPromo.usageLimit ? ` / ${viewPromo.usageLimit}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Trạng thái</p>
                    <Badge variant={STATUS_CONFIG[viewPromo.status]?.variant}>
                      {STATUS_CONFIG[viewPromo.status]?.label}
                    </Badge>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewPromo(null)}>
                  Đóng
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
