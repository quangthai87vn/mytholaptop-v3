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
  Search,
  RefreshCw,
  Eye,
  RotateCcw,
  CheckCircle,
  Clock,
  XCircle,
  Banknote,
} from "lucide-react";
import { MOCK_REFUNDS } from "@/lib/mock-data";
import type { Refund } from "@/types/sales";
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
  pending: { label: "Chờ duyệt", variant: "warning", icon: Clock },
  approved: { label: "Đã duyệt", variant: "default", icon: CheckCircle },
  processing: { label: "Đang xử lý", variant: "default", icon: RotateCcw },
  completed: { label: "Hoàn thành", variant: "success", icon: CheckCircle },
  rejected: { label: "Từ chối", variant: "destructive", icon: XCircle },
};

const METHOD_LABEL: Record<string, string> = {
  bank_transfer: "Chuyển khoản",
  cash: "Tiền mặt",
  original_payment: "Hoàn qua thanh toán gốc",
};

export default function RefundsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewRefund, setViewRefund] = useState<Refund | null>(null);

  const filteredRefunds = MOCK_REFUNDS.filter((ref) => {
    const matchSearch =
      search === "" ||
      ref.orderCode.toLowerCase().includes(search.toLowerCase()) ||
      ref.customerName.toLowerCase().includes(search.toLowerCase()) ||
      ref.productName.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === "all" || ref.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const handleApprove = (refund: Refund) => {
    toast.success(`Đã duyệt yêu cầu hoàn tiền ${refund.orderCode}`);
    setViewRefund(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Trả hàng & hoàn tiền</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Quản lý yêu cầu trả hàng và hoàn tiền
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{MOCK_REFUNDS.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Tổng yêu cầu</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {MOCK_REFUNDS.filter((r) => r.status === "pending").length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Chờ duyệt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-600">
              {MOCK_REFUNDS.filter((r) => r.status === "completed").length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Hoàn thành</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(
                MOCK_REFUNDS.reduce((sum, r) => sum + r.refundAmount, 0)
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Tổng hoàn tiền</p>
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
                placeholder="Tìm mã đơn, khách hàng, sản phẩm..."
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
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="processing">Đang xử lý</option>
              <option value="completed">Hoàn thành</option>
              <option value="rejected">Từ chối</option>
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
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Lý do</TableHead>
                  <TableHead className="text-right">Số tiền hoàn</TableHead>
                  <TableHead>Phương thức</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRefunds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      Không tìm thấy yêu cầu nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRefunds.map((ref) => {
                    const statusConfig =
                      STATUS_CONFIG[ref.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;

                    return (
                      <TableRow key={ref.id}>
                        <TableCell>
                          <span className="font-mono text-sm font-medium">
                            {ref.orderCode}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{ref.customerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {ref.customerPhone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm truncate max-w-[180px]">
                              {ref.productName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ref.productSku}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground line-clamp-2 max-w-[200px] block">
                            {ref.reason}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-orange-600">
                          {formatCurrency(ref.refundAmount)}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {METHOD_LABEL[ref.refundMethod] || ref.refundMethod}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant} className="gap-1">
                            <StatusIcon className="size-3" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setViewRefund(ref)}
                          >
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

      {/* Detail Dialog */}
      <Dialog open={!!viewRefund} onOpenChange={() => setViewRefund(null)}>
        <DialogContent className="max-w-lg">
          {viewRefund && (
            <>
              <DialogHeader>
                <DialogTitle>Chi tiết hoàn tiền</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Mã đơn</p>
                    <p className="font-mono font-medium">{viewRefund.orderCode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Số tiền hoàn</p>
                    <p className="font-bold text-orange-600">
                      {formatCurrency(viewRefund.refundAmount)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Khách hàng</p>
                  <p className="font-medium">
                    {viewRefund.customerName} - {viewRefund.customerPhone}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sản phẩm</p>
                  <p>
                    {viewRefund.productName} ({viewRefund.productSku})
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lý do</p>
                  <p className="text-sm bg-muted/50 rounded p-2">
                    {viewRefund.reason}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Phương thức hoàn</p>
                    <p>{METHOD_LABEL[viewRefund.refundMethod] || viewRefund.refundMethod}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Trạng thái</p>
                    <Badge
                      variant={STATUS_CONFIG[viewRefund.status]?.variant || "default"}
                    >
                      {STATUS_CONFIG[viewRefund.status]?.label}
                    </Badge>
                  </div>
                </div>
                {viewRefund.processedBy && (
                  <div>
                    <p className="text-xs text-muted-foreground">Người xử lý</p>
                    <p>{viewRefund.processedBy}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewRefund(null)}>
                  Đóng
                </Button>
                {viewRefund.status === "pending" && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        toast.info("Đã từ chối yêu cầu");
                        setViewRefund(null);
                      }}
                    >
                      Từ chối
                    </Button>
                    <Button onClick={() => handleApprove(viewRefund)}>
                      <CheckCircle className="mr-2 size-4" />
                      Duyệt hoàn tiền
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
