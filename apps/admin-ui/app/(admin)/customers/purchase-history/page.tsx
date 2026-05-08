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
  ShoppingBag,
  Package,
  ChevronRight,
  Eye,
  Clock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

const MOCK_PURCHASE_HISTORY = [
  {
    id: "cust-1",
    name: "Nguyễn Văn Minh",
    email: "minh.nv@mytholaptop.vn",
    phone: "0901 234 567",
    orders: 12,
    totalSpent: 98500000,
    lastOrder: "2026-05-05T14:30:00Z",
    avgOrderValue: 8208333,
  },
  {
    id: "cust-2",
    name: "Trần Thị Lan",
    email: "lan.tt@gmail.com",
    phone: "0912 345 678",
    orders: 5,
    totalSpent: 45000000,
    lastOrder: "2026-04-28T10:15:00Z",
    avgOrderValue: 9000000,
  },
  {
    id: "cust-3",
    name: "Lê Hoàng Nam",
    email: "nam.lh@mytholaptop.vn",
    phone: "0934 567 890",
    orders: 3,
    totalSpent: 32000000,
    lastOrder: "2026-05-02T16:45:00Z",
    avgOrderValue: 10666667,
  },
  {
    id: "cust-4",
    name: "Phạm Minh Tuấn",
    email: "tuan.pm@mytholaptop.vn",
    phone: "0945 678 901",
    orders: 8,
    totalSpent: 125000000,
    lastOrder: "2026-05-07T09:00:00Z",
    avgOrderValue: 15625000,
  },
  {
    id: "cust-5",
    name: "Nguyễn Thị Hương",
    email: "huong.nt@gmail.com",
    phone: "0956 789 012",
    orders: 2,
    totalSpent: 18500000,
    lastOrder: "2026-04-15T11:30:00Z",
    avgOrderValue: 9250000,
  },
  {
    id: "cust-6",
    name: "Đặng Minh Khoa",
    email: "khoa.dm@mytholaptop.vn",
    phone: "0967 890 123",
    orders: 6,
    totalSpent: 78000000,
    lastOrder: "2026-05-01T15:20:00Z",
    avgOrderValue: 13000000,
  },
  {
    id: "cust-7",
    name: "Hoàng Văn Thắng",
    email: "thang.hv@mytholaptop.vn",
    phone: "0978 901 234",
    orders: 1,
    totalSpent: 15900000,
    lastOrder: "2026-04-20T14:00:00Z",
    avgOrderValue: 15900000,
  },
  {
    id: "cust-8",
    name: "Vũ Thị Mai",
    email: "mai.vt@mytholaptop.vn",
    phone: "0989 012 345",
    orders: 4,
    totalSpent: 52000000,
    lastOrder: "2026-05-03T10:45:00Z",
    avgOrderValue: 13000000,
  },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function PurchaseHistoryPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"total" | "orders" | "recent">("recent");
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  const filteredCustomers = MOCK_PURCHASE_HISTORY.filter((customer) => {
    return (
      search === "" ||
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      customer.email.toLowerCase().includes(search.toLowerCase()) ||
      customer.phone.includes(search)
    );
  }).sort((a, b) => {
    if (sortBy === "total") return b.totalSpent - a.totalSpent;
    if (sortBy === "orders") return b.orders - a.orders;
    return new Date(b.lastOrder).getTime() - new Date(a.lastOrder).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Lịch sử mua hàng</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Theo dõi lịch sử mua hàng của khách hàng
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Tổng khách hàng
                </p>
                <p className="text-2xl font-bold mt-1">
                  {MOCK_PURCHASE_HISTORY.length}
                </p>
              </div>
              <ShoppingBag className="size-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Tổng đơn hàng
                </p>
                <p className="text-2xl font-bold mt-1">
                  {MOCK_PURCHASE_HISTORY.reduce((sum, c) => sum + c.orders, 0)}
                </p>
              </div>
              <Package className="size-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Tổng doanh thu
                </p>
                <p className="text-2xl font-bold mt-1 text-green-600">
                  {formatCurrency(
                    MOCK_PURCHASE_HISTORY.reduce((sum, c) => sum + c.totalSpent, 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  TB đơn hàng
                </p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(
                    MOCK_PURCHASE_HISTORY.reduce((sum, c) => sum + c.totalSpent, 0) /
                    MOCK_PURCHASE_HISTORY.reduce((sum, c) => sum + c.orders, 0)
                  )}
                </p>
              </div>
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
                placeholder="Tìm theo tên, email, số điện thoại..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="recent">Mới nhất</option>
              <option value="total">Tổng chi tiêu</option>
              <option value="orders">Số đơn hàng</option>
            </select>
            <Button variant="outline" size="icon">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {filteredCustomers.length} khách hàng
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Khách hàng</TableHead>
                <TableHead className="text-right">Đơn hàng</TableHead>
                <TableHead className="text-right">Tổng chi tiêu</TableHead>
                <TableHead className="text-right">TB/Đơn</TableHead>
                <TableHead className="w-[160px]">Đơn gần nhất</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer"
                  onClick={() =>
                    setSelectedCustomer(
                      selectedCustomer === customer.id ? null : customer.id
                    )
                  }
                >
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {customer.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{customer.orders} đơn</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-green-600">
                      {formatCurrency(customer.totalSpent)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {formatCurrency(customer.avgOrderValue)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5" />
                      <span>{formatDate(customer.lastOrder)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8">
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
