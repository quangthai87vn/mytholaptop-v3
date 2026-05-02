"use client";

import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useDashboardStats, useOrders, useProducts } from "@/hooks/use-medusa";
import type { MedusaOrder, MedusaProduct } from "@/services/medusa-types";

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  isLoading?: boolean;
}

function StatCard({ title, value, change, icon: Icon, isLoading }: StatCardProps) {
  const isPositive = change >= 0;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
            {isLoading ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : (
              <Icon className="size-6 text-primary" />
            )}
          </div>
          {!isLoading && change !== 0 && (
            <div
              className={`flex items-center gap-1 text-sm font-medium ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="size-4" />
              ) : (
                <TrendingDown className="size-4" />
              )}
              {Math.abs(change)}%
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">
            {isLoading ? (
              <span className="text-muted-foreground">...</span>
            ) : (
              value
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  completed: "Hoàn thành",
  archived: "Lưu trữ",
  canceled: "Đã huỷ",
  requires_action: "Cần thao tác",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  not_paid: "Chưa TT",
  awaiting: "Đang chờ",
  captured: "Đã TT",
  partially_refunded: "Hoàn một phần",
  refunded: "Đã hoàn",
  canceled: "Đã huỷ",
  requires_action: "Cần TT",
};

const getStatusVariant = (
  status: string
): "success" | "warning" | "destructive" | "secondary" | "outline" => {
  switch (status) {
    case "completed":
    case "captured":
      return "success";
    case "pending":
    case "awaiting":
      return "warning";
    case "canceled":
    case "refunded":
      return "destructive";
    default:
      return "secondary";
  }
};

function adaptOrder(o: MedusaOrder) {
  const customerName = o.customer
    ? [o.customer.first_name, o.customer.last_name].filter(Boolean).join(" ") || o.email || "Khách hàng"
    : o.email || "Khách hàng";
  const phone = o.shipping_address?.phone || "";
  return {
    id: o.id,
    displayId: o.display_id || o.order_number || o.id.slice(-8).toUpperCase(),
    customer: customerName,
    phone,
    total: o.total ? o.total / 100 : 0,
    status: o.status || "pending",
    paymentStatus: o.payment_status || "not_paid",
    createdAt: o.created_at || new Date().toISOString(),
  };
}

function adaptProduct(p: MedusaProduct) {
  const firstVariant = p.variants?.[0];
  return {
    id: p.id,
    title: p.title,
    sku: firstVariant?.sku || "",
    stock: firstVariant?.inventory_quantity ?? 0,
  };
}

export default function DashboardPage() {
  const { data: statsData, isLoading: statsLoading, isError: statsError } = useDashboardStats();
  const { data: ordersData, isLoading: ordersLoading } = useOrders({ limit: 5, expand: "customers" });
  const { data: productsData, isLoading: productsLoading } = useProducts({ limit: 100, expand: "variants" });

  const stats = statsData?.data;
  const recentOrders = (ordersData?.data?.orders || []).map(adaptOrder);
  const allProducts = productsData?.data?.products || [];

  const lowStockProducts = allProducts
    .map(adaptProduct)
    .filter((p) => p.stock > 0 && p.stock <= 5)
    .slice(0, 5);

  const outOfStockProducts = allProducts
    .map(adaptProduct)
    .filter((p) => p.stock === 0)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Chào mừng bạn quay trở lại, đây là tổng quan hệ thống.
        </p>
      </div>

      {/* Stats Error */}
      {statsError && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="size-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">
              Không thể kết nối Medusa. Vui lòng kiểm tra cấu hình.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Doanh thu hôm nay"
          value={stats ? formatCurrency(stats.todayRevenue) : "—"}
          change={12}
          icon={DollarSign}
          isLoading={statsLoading}
        />
        <StatCard
          title="Đơn hàng mới"
          value={stats ? stats.todayOrders.toString() : "—"}
          change={8}
          icon={ShoppingCart}
          isLoading={statsLoading}
        />
        <StatCard
          title="Tổng sản phẩm"
          value={stats ? stats.totalProducts.toString() : "—"}
          change={0}
          icon={Package}
          isLoading={statsLoading}
        />
        <StatCard
          title="Khách hàng mới"
          value={stats ? stats.totalCustomers.toString() : "—"}
          change={-3}
          icon={Users}
          isLoading={statsLoading}
        />
      </div>

      {/* Charts + Low stock */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tổng quan tháng</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : stats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Doanh thu tháng</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(stats.monthRevenue)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Đơn hàng tháng</p>
                    <p className="text-2xl font-bold">{stats.monthOrders}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>Không có dữ liệu</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cảnh báo tồn kho</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {productsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : outOfStockProducts.length === 0 && lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Không có cảnh báo tồn kho
              </p>
            ) : (
              <>
                {outOfStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground">SKU: {p.sku || "—"}</p>
                    </div>
                    <Badge variant="destructive" className="shrink-0 ml-2">
                      Hết hàng
                    </Badge>
                  </div>
                ))}
                {lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground">SKU: {p.sku || "—"}</p>
                    </div>
                    <Badge variant="warning" className="shrink-0 ml-2">
                      Còn {p.stock}
                    </Badge>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Đơn hàng gần đây</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <a href="/orders">
              Xem tất cả
              <ArrowRight className="ml-2 size-4" />
            </a>
          </Button>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : recentOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Chưa có đơn hàng nào.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã đơn</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead>Thanh toán</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày đặt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.displayId}</TableCell>
                    <TableCell>
                      <div>
                        <p>{order.customer}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.phone || "—"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(order.paymentStatus)}>
                        {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(order.status)}>
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
