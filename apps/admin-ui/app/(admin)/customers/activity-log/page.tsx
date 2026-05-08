"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Clock,
  User,
  FileText,
  ChevronRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

const MOCK_ACTIVITY = [
  {
    id: "act-1",
    customer: "Nguyễn Văn Minh",
    email: "minh.nv@mytholaptop.vn",
    action: "Đặt hàng",
    target: "Đơn hàng #MTL-001234",
    time: "2026-05-07T10:30:00Z",
    ip: "113.185.xx.xx",
  },
  {
    id: "act-2",
    customer: "Trần Thị Lan",
    email: "lan.tt@gmail.com",
    action: "Đăng ký tài khoản",
    target: "Tài khoản mới",
    time: "2026-05-07T09:15:00Z",
    ip: "14.241.xx.xx",
  },
  {
    id: "act-3",
    customer: "Lê Hoàng Nam",
    email: "nam.lh@mytholaptop.vn",
    action: "Bình luận sản phẩm",
    target: "Dell Inspiron 15",
    time: "2026-05-06T16:45:00Z",
    ip: "116.102.xx.xx",
  },
  {
    id: "act-4",
    customer: "Phạm Minh Tuấn",
    email: "tuan.pm@mytholaptop.vn",
    action: "Yêu cầu bảo hành",
    target: "Mã BH #W2026-0456",
    time: "2026-05-06T14:20:00Z",
    ip: "27.72.xx.xx",
  },
  {
    id: "act-5",
    customer: "Nguyễn Thị Hương",
    email: "huong.nt@gmail.com",
    action: "Đăng nhập",
    target: "Website",
    time: "2026-05-06T11:00:00Z",
    ip: "103.237.xx.xx",
  },
  {
    id: "act-6",
    customer: "Đặng Minh Khoa",
    email: "khoa.dm@mytholaptop.vn",
    action: "Thêm vào wishlist",
    target: "MacBook Air M3",
    time: "2026-05-05T20:30:00Z",
    ip: "42.112.xx.xx",
  },
  {
    id: "act-7",
    customer: "Hoàng Văn Thắng",
    email: "thang.hv@mytholaptop.vn",
    action: "Thanh toán thành công",
    target: "Đơn hàng #MTL-001230",
    time: "2026-05-05T15:10:00Z",
    ip: "14.160.xx.xx",
  },
  {
    id: "act-8",
    customer: "Vũ Thị Mai",
    email: "mai.vt@mytholaptop.vn",
    action: "Đăng ký bảo hành",
    target: "HP Pavilion 15",
    time: "2026-05-05T09:45:00Z",
    ip: "27.64.xx.xx",
  },
];

const ACTION_COLORS: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  "Đặt hàng": "success",
  "Thanh toán thành công": "success",
  "Đăng ký tài khoản": "secondary",
  "Đăng nhập": "default",
  "Bình luận sản phẩm": "default",
  "Yêu cầu bảo hành": "warning",
  "Thêm vào wishlist": "secondary",
  "Đăng ký bảo hành": "warning",
};

export default function ActivityLogPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const filteredActivity = MOCK_ACTIVITY.filter((item) => {
    const matchSearch =
      search === "" ||
      item.customer.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase()) ||
      item.action.toLowerCase().includes(search.toLowerCase());

    const matchAction =
      actionFilter === "all" || item.action === actionFilter;

    return matchSearch && matchAction;
  });

  const actions = [...new Set(MOCK_ACTIVITY.map((a) => a.action))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Nhật ký hoạt động</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Theo dõi các hoạt động của khách hàng trên website
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, email, hành động..."
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
              {actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
            <Button variant="outline" size="icon">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {filteredActivity.length} hoạt động
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Khách hàng</TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Đối tượng</TableHead>
                  <TableHead className="w-[160px]">Thời gian</TableHead>
                  <TableHead className="w-[120px]">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivity.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Không có hoạt động nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActivity.map((item) => (
                    <TableRow key={item.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="size-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {item.customer}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ACTION_COLORS[item.action] || "secondary"
                          }
                        >
                          {item.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="size-3.5 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[200px]">
                            {item.target}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="size-3.5" />
                          <span>{formatDate(item.time)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground">
                          {item.ip}
                        </code>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
