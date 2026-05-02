"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Eye,
  MoreHorizontal,
  Download,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrders } from "@/hooks/use-medusa";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { MedusaOrder } from "@/services/medusa-types";

const PAGE_SIZE = 20;

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  completed: "Hoàn thành",
  archived: "Lưu trữ",
  canceled: "Đã huỷ",
  requires_action: "Cần thao tác",
};

const FULFILL_STATUS_LABELS: Record<string, string> = {
  not_fulfilled: "Chưa giao",
  partially_fulfilled: "Giao một phần",
  fulfilled: "Đã giao",
  partially_returned: "Trả một phần",
  returned: "Đã trả",
  requires_action: "Cần thao tác",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  not_paid: "Chưa thanh toán",
  awaiting: "Đang chờ",
  captured: "Đã thanh toán",
  partially_refunded: "Hoàn một phần",
  refunded: "Đã hoàn",
  canceled: "Đã huỷ",
  requires_action: "Cần thao tác",
};

const getOrderVariant = (status: string): "success" | "warning" | "destructive" | "secondary" | "outline" => {
  switch (status) {
    case "completed": return "success";
    case "pending": return "warning";
    case "canceled": return "destructive";
    case "requires_action": return "secondary";
    default: return "outline";
  }
};

const getPaymentVariant = (status: string): "success" | "warning" | "destructive" | "secondary" => {
  switch (status) {
    case "captured": return "success";
    case "awaiting": return "warning";
    case "not_paid": return "destructive";
    default: return "secondary";
  }
};

// Adapter: Medusa order → UI shape
function adaptOrder(o: MedusaOrder) {
  const customerName = o.customer
    ? [o.customer.first_name, o.customer.last_name].filter(Boolean).join(" ") || o.email || "Khách hàng"
    : o.email || "Khách hàng";
  const phone = o.shipping_address?.phone || o.billing_address?.phone || "";
  const lineCount = o.line_items?.length || o.items?.length || 0;

  return {
    id: o.id,
    displayId: o.display_id || o.order_number || o.id.slice(-8).toUpperCase(),
    customer: customerName,
    email: o.email || "",
    phone,
    total: o.total ? o.total / 100 : 0,
    currency: o.currency_code || "vnd",
    status: o.status || "pending",
    fulfillStatus: o.fulfill_status || "not_fulfilled",
    paymentStatus: o.payment_status || "not_paid",
    createdAt: o.created_at || new Date().toISOString(),
    lineCount,
  };
}

export default function OrdersPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");

  const { data, isLoading, isError, error, refetch } = useOrders({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    q: search || undefined,
    status: orderStatus !== "all" ? [orderStatus] : undefined,
    expand: "items,customers,shipping_address",
  });

  const orders = data?.data?.orders ?? [];
  const total = data?.data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const adaptedOrders = useMemo(() => orders.map(adaptOrder), [orders]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Hoá đơn bán hàng
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Quản lý đơn hàng và hoá đơn bán hàng.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 size-4" />
            Xuất Excel
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            className="size-10"
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm mã đơn, tên, email..."
                className="pl-9 h-10"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <Select value={orderStatus} onValueChange={(v) => { setOrderStatus(v); setPage(0); }}>
              <SelectTrigger className="w-44 h-10">
                <SelectValue placeholder="Trạng thái đơn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="pending">Chờ xử lý</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
                <SelectItem value="canceled">Đã huỷ</SelectItem>
                <SelectItem value="archived">Lưu trữ</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentStatus} onValueChange={(v) => { setPaymentStatus(v); setPage(0); }}>
              <SelectTrigger className="w-44 h-10">
                <SelectValue placeholder="Thanh toán" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="captured">Đã thanh toán</SelectItem>
                <SelectItem value="awaiting">Đang chờ</SelectItem>
                <SelectItem value="not_paid">Chưa thanh toán</SelectItem>
                <SelectItem value="refunded">Đã hoàn</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            {adaptedOrders.length} / {total} đơn hàng
          </p>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Đang tải đơn hàng...</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="size-10 text-destructive mb-3" />
            <p className="text-base font-medium text-destructive">
              Không thể kết nối Medusa
            </p>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
              {(error as Error)?.message || "Vui lòng kiểm tra cấu hình Medusa."}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Thử lại
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <>
          {/* Desktop Table */}
          <Card className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã đơn</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead className="text-right">Tổng tiền</TableHead>
                    <TableHead>Thanh toán</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="hidden lg:table-cell">Ngày đặt</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adaptedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        Không tìm thấy đơn hàng nào.
                      </TableCell>
                    </TableRow>
                  ) : (
                    adaptedOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">{order.displayId}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.customer}</p>
                            <p className="text-xs text-muted-foreground">{order.phone || order.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(order.total)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPaymentVariant(order.paymentStatus)}>
                            {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getOrderVariant(order.status)}>
                            {ORDER_STATUS_LABELS[order.status] || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden lg:table-cell">
                          {formatDateTime(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 size-4" />
                                Xem chi tiết
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  {(page) * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, total)} / {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-sm">Trang {page + 1} / {totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Mobile: Order Cards */}
          <div className="space-y-3 md:hidden">
            {adaptedOrders.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Receipt className="size-12 mb-3" />
                  <p>Không tìm thấy đơn hàng nào.</p>
                </CardContent>
              </Card>
            )}
            {adaptedOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm">{order.displayId}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <Badge variant={getPaymentVariant(order.paymentStatus)} className="text-xs shrink-0">
                      {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{order.customer}</p>
                      <p className="text-xs text-muted-foreground">{order.phone || order.email}</p>
                    </div>
                    <Badge variant={getOrderVariant(order.status)} className="text-xs shrink-0">
                      {ORDER_STATUS_LABELS[order.status] || order.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <p className="text-xs text-muted-foreground">{order.lineCount} sản phẩm</p>
                    <p className="font-bold text-primary">{formatCurrency(order.total)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-8">
                      <Eye className="mr-1 size-3" />
                      Chi tiết
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 size-4" />
                          Xem chi tiết
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
