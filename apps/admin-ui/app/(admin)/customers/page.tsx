"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Eye,
  MoreHorizontal,
  UserPlus,
  Download,
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
import { useCustomers } from "@/hooks/use-medusa";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { MedusaCustomer } from "@/services/medusa-types";

const PAGE_SIZE = 20;

function adaptCustomer(c: MedusaCustomer) {
  const orders = c.orders || [];
  const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0) / 100;
  const hasAccount = c.has_account !== false;

  return {
    id: c.id,
    name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "—",
    email: c.email || "",
    phone: c.phone || "",
    address: c.shipping_addresses?.[0]
      ? [
          c.shipping_addresses[0].address_1,
          c.shipping_addresses[0].city,
          c.shipping_addresses[0].country_code,
        ]
          .filter(Boolean)
          .join(", ")
      : c.billing_address?.address_1 || "—",
    hasAccount,
    totalOrders: orders.length,
    totalSpent,
    createdAt: c.created_at || new Date().toISOString(),
  };
}

export default function CustomersPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");

  const { data, isLoading, isError, error, refetch } = useCustomers({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    q: search || undefined,
    expand: "orders",
  });

  const customers = data?.data?.customers ?? [];
  const total = data?.data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const adaptedCustomers = useMemo(
    () => customers.map(adaptCustomer),
    [customers]
  );

  const filteredCustomers = useMemo(() => {
    return adaptedCustomers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search);
      const matchesAccount =
        accountFilter === "all" ||
        (accountFilter === "has_account" && c.hasAccount) ||
        (accountFilter === "guest" && !c.hasAccount);
      return matchesSearch && matchesAccount;
    });
  }, [adaptedCustomers, search, accountFilter]);

  const stats = useMemo(() => {
    const totalCustomers = adaptedCustomers.length;
    const vipCustomers = adaptedCustomers.filter((c) => c.totalSpent > 10000000).length;
    const regularCustomers = adaptedCustomers.filter((c) => c.totalSpent > 0 && c.totalSpent <= 10000000).length;
    const newCustomers = adaptedCustomers.filter((c) => {
      const created = new Date(c.createdAt);
      const now = new Date();
      const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 30;
    }).length;
    return { totalCustomers, vipCustomers, regularCustomers, newCustomers };
  }, [adaptedCustomers]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Khách hàng</h1>
          <p className="text-muted-foreground">
            Quản lý thông tin và lịch sử khách hàng.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 size-4" />
            Xuất Excel
          </Button>
          <Button>
            <UserPlus className="mr-2 size-4" />
            Thêm khách hàng
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
                placeholder="Tìm kiếm tên, email, SĐT..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              />
            </div>
            <Select value={accountFilter} onValueChange={(v) => { setAccountFilter(v); setPage(0); }}>
              <SelectTrigger className="w-44 h-10">
                <SelectValue placeholder="Loại tài khoản" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="has_account">Có tài khoản</SelectItem>
                <SelectItem value="guest">Khách vãng lai</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              className="size-10"
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            {filteredCustomers.length} / {total} khách hàng
          </p>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Đang tải khách hàng...</p>
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

      {/* Stats */}
      {!isLoading && !isError && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Tổng khách hàng</p>
              <p className="text-2xl font-bold">{stats.totalCustomers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Khách VIP</p>
              <p className="text-2xl font-bold">{stats.vipCustomers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Khách thường</p>
              <p className="text-2xl font-bold">{stats.regularCustomers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Khách mới (30 ngày)</p>
              <p className="text-2xl font-bold">{stats.newCustomers}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead className="hidden sm:table-cell">Liên hệ</TableHead>
                  <TableHead className="text-center hidden lg:table-cell">Loại</TableHead>
                  <TableHead className="text-right">Tổng đơn</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Tổng chi tiêu</TableHead>
                  <TableHead className="hidden md:table-cell">Ngày tạo</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      Không tìm thấy khách hàng nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-xs text-muted-foreground hidden sm:block">
                            {customer.address}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="text-sm">
                          <p>{customer.email}</p>
                          <p className="text-muted-foreground">{customer.phone || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        <Badge variant={customer.hasAccount ? "success" : "secondary"}>
                          {customer.hasAccount ? "Có tài khoản" : "Khách"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {customer.totalOrders}
                      </TableCell>
                      <TableCell className="text-right font-medium hidden md:table-cell">
                        {formatCurrency(customer.totalSpent)}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">
                        {formatDate(customer.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, total)} / {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    Trước
                  </Button>
                  <span className="text-sm py-2">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(page + 1)}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
