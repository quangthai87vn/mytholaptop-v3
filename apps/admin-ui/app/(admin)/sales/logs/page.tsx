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
  ClipboardList,
  Plus,
  Eye,
  Edit,
  Trash2,
  XCircle,
  RotateCcw,
  Truck,
  CreditCard,
  FileText,
  Tag,
  User,
} from "lucide-react";
import { MOCK_SALES_LOGS } from "@/lib/mock-data";
import type { SalesLog } from "@/types/sales";
import { formatDate } from "@/lib/utils";

const ACTION_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  create: { icon: Plus, color: "text-green-600", bg: "bg-green-100", label: "Tạo" },
  update: { icon: Edit, color: "text-blue-600", bg: "bg-blue-100", label: "Cập nhật" },
  cancel: { icon: XCircle, color: "text-red-600", bg: "bg-red-100", label: "Hủy" },
  refund: { icon: RotateCcw, color: "text-orange-600", bg: "bg-orange-100", label: "Hoàn tiền" },
  ship: { icon: Truck, color: "text-purple-600", bg: "bg-purple-100", label: "Giao hàng" },
  payment: { icon: CreditCard, color: "text-cyan-600", bg: "bg-cyan-100", label: "Thanh toán" },
  quote: { icon: FileText, color: "text-indigo-600", bg: "bg-indigo-100", label: "Báo giá" },
  promotion: { icon: Tag, color: "text-pink-600", bg: "bg-pink-100", label: "Khuyến mãi" },
};

export default function LogsPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [viewLog, setViewLog] = useState<SalesLog | null>(null);

  const filteredLogs = MOCK_SALES_LOGS.filter((log) => {
    const matchSearch =
      search === "" ||
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.orderCode?.toLowerCase().includes(search.toLowerCase()) ||
      log.details?.toLowerCase().includes(search.toLowerCase());

    const matchAction =
      actionFilter === "all" || log.actionType === actionFilter;

    return matchSearch && matchAction;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Nhật ký bán hàng</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Theo dõi lịch sử hoạt động bán hàng
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm nhân viên, hành động, mã đơn..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="all">Tất cả hành động</option>
              <option value="create">Tạo đơn</option>
              <option value="update">Cập nhật</option>
              <option value="cancel">Hủy đơn</option>
              <option value="refund">Hoàn tiền</option>
              <option value="ship">Giao hàng</option>
              <option value="payment">Thanh toán</option>
              <option value="quote">Báo giá</option>
              <option value="promotion">Khuyến mãi</option>
            </select>
            <Button variant="outline" size="icon">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: "create", label: "Đơn mới" },
          { key: "update", label: "Cập nhật" },
          { key: "cancel", label: "Hủy đơn" },
          { key: "refund", label: "Hoàn tiền" },
        ].map((item) => {
          const count = filteredLogs.filter(
            (l) => l.actionType === item.key
          ).length;
          const config = ACTION_CONFIG[item.key] || ACTION_CONFIG.update;
          const Icon = config.icon;

          return (
            <Card key={item.key}>
              <CardContent className="pt-6 text-center">
                <div className="flex justify-center mb-2">
                  <div
                    className={`size-8 rounded-full flex items-center justify-center ${config.bg}`}
                  >
                    <Icon className={`size-4 ${config.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Mã đơn</TableHead>
                  <TableHead>Chi tiết</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-muted-foreground"
                    >
                      Không tìm thấy nhật ký nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const actionConfig =
                      ACTION_CONFIG[log.actionType] || ACTION_CONFIG.update;
                    const ActionIcon = actionConfig.icon;

                    return (
                      <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">
                              {new Date(log.timestamp).toLocaleDateString("vi-VN")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(log.timestamp).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="size-7 rounded-full bg-muted flex items-center justify-center">
                              <User className="size-3.5 text-muted-foreground" />
                            </div>
                            <span className="text-sm font-medium">{log.userName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`gap-1 ${actionConfig.color} ${actionConfig.bg}`}
                          >
                            <ActionIcon className="size-3" />
                            {actionConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.orderCode ? (
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                              {log.orderCode}
                            </code>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground line-clamp-2 max-w-[300px]">
                            {log.details || log.action}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setViewLog(log)}
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
    </div>
  );
}
