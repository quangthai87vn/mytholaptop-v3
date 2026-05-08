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
  Search,
  RefreshCw,
  Eye,
  Banknote,
  CreditCard,
  Smartphone,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
} from "lucide-react";
import { MOCK_PAYMENTS } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount);
}

const METHOD_CONFIG: Record<string, any> = {
  cod: { label: "COD", icon: Banknote, color: "text-orange-600" },
  bank_transfer: { label: "Chuyển khoản", icon: CreditCard, color: "text-blue-600" },
  installment: { label: "Trả góp", icon: DollarSign, color: "text-purple-600" },
  momo: { label: "MoMo", icon: Smartphone, color: "text-pink-600" },
  vnpay: { label: "VNPay", icon: CreditCard, color: "text-indigo-600" },
  cash: { label: "Tiền mặt", icon: Banknote, color: "text-green-600" },
};

const STATUS_CONFIG: Record<string, any> = {
  pending: { label: "Chờ", variant: "warning", icon: Clock },
  paid: { label: "Đã thanh toán", variant: "success", icon: CheckCircle },
  failed: { label: "Thất bại", variant: "destructive", icon: XCircle },
  refunded: { label: "Hoàn tiền", variant: "secondary", icon: DollarSign },
};

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  const filteredPayments = MOCK_PAYMENTS.filter((pay) => {
    const matchSearch =
      search === "" ||
      pay.orderCode.toLowerCase().includes(search.toLowerCase()) ||
      pay.customerName.toLowerCase().includes(search.toLowerCase()) ||
      pay.transactionId?.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === "all" || pay.status === statusFilter;
    const matchMethod = methodFilter === "all" || pay.method === methodFilter;

    return matchSearch && matchStatus && matchMethod;
  });

  // Summary stats
  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = filteredPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = filteredPayments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Thanh toán</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Theo dõi và quản lý thanh toán
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng tiền</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
              <DollarSign className="size-10 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đã thanh toán</p>
                <p className="text-2xl font-bold mt-1 text-green-600">
                  {formatCurrency(paidAmount)}
                </p>
              </div>
              <CheckCircle className="size-10 text-green-600/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chờ thanh toán</p>
                <p className="text-2xl font-bold mt-1 text-yellow-600">
                  {formatCurrency(pendingAmount)}
                </p>
              </div>
              <Clock className="size-10 text-yellow-600/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã đơn, khách hàng, mã giao dịch..."
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
              <option value="pending">Chờ thanh toán</option>
              <option value="paid">Đã thanh toán</option>
              <option value="failed">Thất bại</option>
              <option value="refunded">Hoàn tiền</option>
            </select>
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="all">Tất cả phương thức</option>
              <option value="cod">COD</option>
              <option value="bank_transfer">Chuyển khoản</option>
              <option value="cash">Tiền mặt</option>
              <option value="momo">MoMo</option>
              <option value="vnpay">VNPay</option>
              <option value="installment">Trả góp</option>
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
                  <TableHead>Mã giao dịch</TableHead>
                  <TableHead>Mã đơn</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Phương thức</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      Không tìm thấy thanh toán nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((pay) => {
                    const methodConfig = METHOD_CONFIG[pay.method] || METHOD_CONFIG.cod;
                    const MethodIcon = methodConfig.icon;
                    const statusConfig = STATUS_CONFIG[pay.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;

                    return (
                      <TableRow key={pay.id}>
                        <TableCell>
                          <span className="font-mono text-xs">
                            {pay.transactionId || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm font-medium">
                            {pay.orderCode}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{pay.customerName}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <MethodIcon className={`size-4 ${methodConfig.color}`} />
                            <span className={`text-sm ${methodConfig.color}`}>
                              {methodConfig.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(pay.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant} className="gap-1">
                            <StatusIcon className="size-3" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(pay.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="size-8">
                            <Eye className="size-3.5" />
                          </Button>
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
    </div>
  );
}
