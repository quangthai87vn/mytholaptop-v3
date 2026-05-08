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
  Eye,
  MoreHorizontal,
  EyeIcon,
  Truck,
  XCircle,
  Printer,
} from "lucide-react";
import { MOCK_SALES_ORDERS } from "@/lib/mock-data";
import type { SalesOrder } from "@/types/sales";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount);
}

const PAYMENT_STATUS: Record<string, { label: string; variant: "warning" | "success" | "destructive" | "secondary" | "default" }> = {
  pending: { label: "Chờ", variant: "warning" },
  paid: { label: "Đã TT", variant: "success" },
  failed: { label: "Thất bại", variant: "destructive" },
  refunded: { label: "Hoàn", variant: "secondary" },
  partial: { label: "Một phần", variant: "warning" },
};

const ORDER_STATUS: Record<string, any> = {
  pending: { label: "Chờ xử lý", variant: "warning" },
  processing: { label: "Đang xử lý", variant: "default" },
  shipped: { label: "Đã giao", variant: "default" },
  delivered: { label: "Hoàn thành", variant: "success" },
  cancelled: { label: "Đã hủy", variant: "destructive" },
  returned: { label: "Trả hàng", variant: "secondary" },
};

const SHIPPING_STATUS = {
  not_shipped: "Chưa giao",
  picking: "Đang lấy",
  shipped: "Đã giao",
  in_transit: "Đang vận chuyển",
  delivered: "Đã nhận",
  failed: "Giao thất bại",
};

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [viewOrder, setViewOrder] = useState<SalesOrder | null>(null);

  const filteredOrders = MOCK_SALES_ORDERS.filter((order) => {
    const matchSearch =
      search === "" ||
      order.code.toLowerCase().includes(search.toLowerCase()) ||
      order.customer.toLowerCase().includes(search.toLowerCase()) ||
      order.customerPhone.includes(search) ||
      order.customerEmail.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "all" || order.orderStatus === statusFilter;

    const matchPayment =
      paymentFilter === "all" || order.paymentStatus === paymentFilter;

    return matchSearch && matchStatus && matchPayment;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Đơn hàng</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quản lý đơn hàng bán hàng
          </p>
        </div>
        <Button asChild className="gap-2">
          <a href="/sales/pos">
            <Plus className="size-4" />
            Tạo đơn hàng
          </a>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã đơn, khách hàng, SĐT..."
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
              <option value="pending">Chờ xử lý</option>
              <option value="processing">Đang xử lý</option>
              <option value="shipped">Đã giao</option>
              <option value="delivered">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
              <option value="returned">Trả hàng</option>
            </select>
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="all">Tất cả thanh toán</option>
              <option value="pending">Chờ thanh toán</option>
              <option value="paid">Đã thanh toán</option>
              <option value="failed">Thất bại</option>
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
                  <TableHead>Mã đơn</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead>Thanh toán</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-muted-foreground"
                    >
                      Không tìm thấy đơn hàng nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const pConfig =
                      PAYMENT_STATUS[order.paymentStatus] || PAYMENT_STATUS.pending;
                    const oConfig =
                      ORDER_STATUS[order.orderStatus] || ORDER_STATUS.pending;

                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          <span className="font-mono text-sm font-medium">
                            {order.code}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{order.customer}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.customerPhone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(order.total)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={pConfig.variant}>{pConfig.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={oConfig.variant}>{oConfig.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => setViewOrder(order)}
                            >
                              <EyeIcon className="size-3.5" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8">
                                  <MoreHorizontal className="size-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Printer className="mr-2 size-4" />
                                  In đơn
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Truck className="mr-2 size-4" />
                                  Cập nhật giao hàng
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Eye className="mr-2 size-4" />
                                  Xem chi tiết
                                </DropdownMenuItem>
                                {order.orderStatus !== "cancelled" &&
                                  order.orderStatus !== "delivered" && (
                                    <DropdownMenuItem className="text-destructive">
                                      <XCircle className="mr-2 size-4" />
                                      Hủy đơn
                                    </DropdownMenuItem>
                                  )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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

      {/* Order Detail Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-2xl">
          {viewOrder && (
            <>
              <DialogHeader>
                <DialogTitle>Chi tiết đơn hàng {viewOrder.code}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Khách hàng</p>
                    <p className="text-sm text-muted-foreground">
                      {viewOrder.customer}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {viewOrder.customerPhone}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Trạng thái</p>
                    <Badge
                      variant={
                        ORDER_STATUS[viewOrder.orderStatus]?.variant || "default"
                      }
                    >
                      {ORDER_STATUS[viewOrder.orderStatus]?.label}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Sản phẩm</p>
                  <div className="border rounded-lg divide-y">
                    {viewOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between px-3 py-2">
                        <div>
                          <p className="text-sm">
                            {item.productName} x{item.quantity}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.productSku}
                          </p>
                        </div>
                        <p className="text-sm font-medium">
                          {formatCurrency(item.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tạm tính</span>
                    <span>{formatCurrency(viewOrder.subtotal)}</span>
                  </div>
                  {viewOrder.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Giảm giá</span>
                      <span>-{formatCurrency(viewOrder.discount)}</span>
                    </div>
                  )}
                  {viewOrder.shipping > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Phí ship</span>
                      <span>{formatCurrency(viewOrder.shipping)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>Tổng cộng</span>
                    <span className="text-primary">
                      {formatCurrency(viewOrder.total)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setViewOrder(null)}>
                  Đóng
                </Button>
                <Button>
                  <Printer className="mr-2 size-4" />
                  In đơn hàng
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
