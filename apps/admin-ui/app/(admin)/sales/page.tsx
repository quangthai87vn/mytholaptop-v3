"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ShoppingBag,
  Receipt,
  Clock,
  XCircle,
  TrendingUp,
  TrendingDown,
  Eye,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { MOCK_SALES_STATS, MOCK_SALES_ORDERS } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount);
}

const PAYMENT_CONFIG: Record<string, { label: string; variant: "warning" | "success" | "destructive" | "secondary" | "default" }> = {
  pending: { label: "Chờ thanh toán", variant: "warning" },
  paid: { label: "Đã thanh toán", variant: "success" },
  failed: { label: "Thất bại", variant: "destructive" },
  refunded: { label: "Hoàn tiền", variant: "secondary" },
  partial: { label: "Một phần", variant: "warning" },
};

const ORDER_STATUS_CONFIG: Record<string, any> = {
  pending: { label: "Chờ xử lý", variant: "warning" },
  processing: { label: "Đang xử lý", variant: "default" },
  shipped: { label: "Đã giao", variant: "default" },
  delivered: { label: "Hoàn thành", variant: "success" },
  cancelled: { label: "Đã hủy", variant: "destructive" },
  returned: { label: "Trả hàng", variant: "secondary" },
};

export default function SalesDashboardPage() {
  const stats = MOCK_SALES_STATS;
  const recentOrders = MOCK_SALES_ORDERS.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tổng quan bán hàng</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Theo dõi doanh số và đơn hàng của Mỹ Tho Laptop
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/sales/pos">
            <ShoppingBag className="size-4" />
            Tạo đơn hàng POS
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Doanh thu hôm nay</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(stats.todayRevenue)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {stats.revenueChange >= 0 ? (
                    <TrendingUp className="size-3 text-green-600" />
                  ) : (
                    <TrendingDown className="size-3 text-red-600" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      stats.revenueChange >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {Math.abs(stats.revenueChange)}%
                  </span>
                  <span className="text-xs text-muted-foreground">vs hôm qua</span>
                </div>
              </div>
              <ShoppingBag className="size-10 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đơn hàng hôm nay</p>
                <p className="text-2xl font-bold mt-1">{stats.todayOrders}</p>
                <div className="flex items-center gap-1 mt-1">
                  {stats.ordersChange >= 0 ? (
                    <TrendingUp className="size-3 text-green-600" />
                  ) : (
                    <TrendingDown className="size-3 text-red-600" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      stats.ordersChange >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {Math.abs(stats.ordersChange)}%
                  </span>
                </div>
              </div>
              <Receipt className="size-10 text-blue-600/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chờ xử lý</p>
                <p className="text-2xl font-bold mt-1 text-yellow-600">
                  {stats.pendingOrders}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="size-3 text-yellow-600" />
                  <span className="text-xs text-muted-foreground">Cần xử lý</span>
                </div>
              </div>
              <Clock className="size-10 text-yellow-600/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đã hủy hôm nay</p>
                <p className="text-2xl font-bold mt-1 text-red-600">
                  {stats.cancelledOrders}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <XCircle className="size-3 text-red-600" />
                  <span className="text-xs text-muted-foreground">
                    {stats.cancelledChange}% vs hôm qua
                  </span>
                </div>
              </div>
              <XCircle className="size-10 text-red-600/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/sales/orders?status=pending" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Tuần này</p>
              <p className="text-lg font-bold mt-1">
                {stats.thisWeekOrders} đơn hàng
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatCurrency(stats.thisWeekRevenue)} doanh thu
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/sales/payments" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Chờ thanh toán</p>
              <p className="text-lg font-bold mt-1 text-yellow-600">5 đơn</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tổng 52.3 triệu
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/sales/shipping" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Đang giao</p>
              <p className="text-lg font-bold mt-1 text-blue-600">3 đơn</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                1 đơn đang vận chuyển
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/sales/refunds" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Yêu cầu hoàn tiền</p>
              <p className="text-lg font-bold mt-1 text-orange-600">1 yêu cầu</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Đang chờ duyệt
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Đơn hàng gần đây</CardTitle>
          <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
            <Link href="/sales/orders">
              Xem tất cả
              <ChevronRight className="size-3" />
            </Link>
          </Button>
        </CardHeader>
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
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => {
                  const paymentConfig =
                    PAYMENT_CONFIG[order.paymentStatus] || PAYMENT_CONFIG.pending;
                  const orderConfig =
                    ORDER_STATUS_CONFIG[order.orderStatus] ||
                    ORDER_STATUS_CONFIG.pending;

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
                        <Badge variant={paymentConfig.variant}>
                          {paymentConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={orderConfig.variant}>
                          {orderConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="size-8" asChild>
                          <Link href={`/sales/orders`}>
                            <Eye className="size-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
