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
  Shield,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Plus,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

const MOCK_WARRANTIES = [
  {
    id: "warr-1",
    code: "W2026-001234",
    product: "Dell Inspiron 15 5510",
    serial: "SN-DL-2024-5678",
    customer: "Nguyễn Văn Minh",
    phone: "0901 234 567",
    purchaseDate: "2024-05-15T00:00:00Z",
    warrantyEnd: "2027-05-15T00:00:00Z",
    status: "active",
    type: "official",
  },
  {
    id: "warr-2",
    code: "W2026-001233",
    product: "MacBook Air M2 13 inch",
    serial: "SN-AP-2025-1234",
    customer: "Trần Thị Lan",
    phone: "0912 345 678",
    purchaseDate: "2025-03-20T00:00:00Z",
    warrantyEnd: "2027-03-20T00:00:00Z",
    status: "active",
    type: "official",
  },
  {
    id: "warr-3",
    code: "W2026-001232",
    product: "HP Pavilion 15-eg0542TU",
    serial: "SN-HP-2024-8901",
    customer: "Lê Hoàng Nam",
    phone: "0934 567 890",
    purchaseDate: "2024-02-10T00:00:00Z",
    warrantyEnd: "2026-02-10T00:00:00Z",
    status: "expired",
    type: "official",
  },
  {
    id: "warr-4",
    code: "W2026-001231",
    product: "Lenovo ThinkPad E14",
    serial: "SN-LV-2025-3456",
    customer: "Phạm Minh Tuấn",
    phone: "0945 678 901",
    purchaseDate: "2025-01-05T00:00:00Z",
    warrantyEnd: "2028-01-05T00:00:00Z",
    status: "active",
    type: "extended",
  },
  {
    id: "warr-5",
    code: "W2026-001230",
    product: "ASUS VivoBook 15 X515EA",
    serial: "SN-AS-2024-7890",
    customer: "Nguyễn Thị Hương",
    phone: "0956 789 012",
    purchaseDate: "2024-04-25T00:00:00Z",
    warrantyEnd: "2025-10-25T00:00:00Z",
    status: "pending",
    type: "official",
  },
];

const MOCK_DEBTS = [
  {
    id: "debt-1",
    customer: "Công ty TNHH ABC",
    phone: "0273 381 234",
    totalDebt: 85000000,
    oldestDebt: 45000000,
    lastPayment: "2026-04-15T00:00:00Z",
    overdueDays: 45,
    status: "overdue",
  },
  {
    id: "debt-2",
    customer: "Trường ĐH Mỹ Tho",
    phone: "0273 382 345",
    totalDebt: 120000000,
    oldestDebt: 120000000,
    lastPayment: null,
    overdueDays: 90,
    status: "overdue",
  },
  {
    id: "debt-3",
    customer: "Cửa hàng Laptop Gia Lai",
    phone: "0269 123 456",
    totalDebt: 35000000,
    oldestDebt: 15000000,
    lastPayment: "2026-05-01T00:00:00Z",
    overdueDays: 0,
    status: "normal",
  },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount);
}

const STATUS_CONFIG = {
  active: { label: "Còn hạn", variant: "success" as const, icon: CheckCircle },
  expired: { label: "Hết hạn", variant: "secondary" as const, icon: XCircle },
  pending: { label: "Đang xử lý", variant: "warning" as const, icon: Clock },
};

const DEBT_STATUS_CONFIG = {
  normal: { label: "Bình thường", variant: "success" as const },
  overdue: { label: "Quá hạn", variant: "destructive" as const },
};

export default function WarrantyDebtPage() {
  const [activeTab, setActiveTab] = useState<"warranty" | "debt">("warranty");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredWarranties = MOCK_WARRANTIES.filter((w) => {
    const matchSearch =
      search === "" ||
      w.code.toLowerCase().includes(search.toLowerCase()) ||
      w.product.toLowerCase().includes(search.toLowerCase()) ||
      w.customer.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "all" || w.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const filteredDebts = MOCK_DEBTS.filter((d) => {
    return (
      search === "" ||
      d.customer.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bảo hành & Công nợ</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quản lý bảo hành sản phẩm và công nợ khách hàng
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab("warranty")}
          className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "warranty"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Shield className="size-4 inline mr-2" />
          Bảo hành ({MOCK_WARRANTIES.length})
        </button>
        <button
          onClick={() => setActiveTab("debt")}
          className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "debt"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlertTriangle className="size-4 inline mr-2" />
          Công nợ ({MOCK_DEBTS.length})
        </button>
      </div>

      {activeTab === "warranty" ? (
        <>
          {/* Warranty Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Tổng bảo hành
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {MOCK_WARRANTIES.length}
                    </p>
                  </div>
                  <Shield className="size-8 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Còn hạn
                    </p>
                    <p className="text-2xl font-bold mt-1 text-green-600">
                      {MOCK_WARRANTIES.filter((w) => w.status === "active").length}
                    </p>
                  </div>
                  <CheckCircle className="size-8 text-green-600/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Hết hạn
                    </p>
                    <p className="text-2xl font-bold mt-1 text-red-600">
                      {MOCK_WARRANTIES.filter((w) => w.status === "expired").length}
                    </p>
                  </div>
                  <XCircle className="size-8 text-red-600/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Đang xử lý
                    </p>
                    <p className="text-2xl font-bold mt-1 text-yellow-600">
                      {MOCK_WARRANTIES.filter((w) => w.status === "pending").length}
                    </p>
                  </div>
                  <Clock className="size-8 text-yellow-600/50" />
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
                    placeholder="Tìm theo mã, sản phẩm, khách hàng..."
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
                  <option value="active">Còn hạn</option>
                  <option value="expired">Hết hạn</option>
                  <option value="pending">Đang xử lý</option>
                </select>
                <Button variant="outline" size="icon">
                  <RefreshCw className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Warranty Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã BH</TableHead>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Ngày mua</TableHead>
                    <TableHead>Hết hạn</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWarranties.map((warranty) => {
                    const statusConfig =
                      STATUS_CONFIG[warranty.status as keyof typeof STATUS_CONFIG] ||
                      STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;

                    return (
                      <TableRow key={warranty.id}>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {warranty.code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate max-w-[200px]">
                              {warranty.product}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {warranty.serial}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{warranty.customer}</p>
                            <p className="text-xs text-muted-foreground">
                              {warranty.phone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(warranty.purchaseDate)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(warranty.warrantyEnd)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant} className="gap-1">
                            <StatusIcon className="size-3" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="size-8">
                            <Eye className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Debt Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Tổng công nợ
                    </p>
                    <p className="text-2xl font-bold mt-1 text-red-600">
                      {formatCurrency(
                        MOCK_DEBTS.reduce((sum, d) => sum + d.totalDebt, 0)
                      )}
                    </p>
                  </div>
                  <AlertTriangle className="size-8 text-red-600/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Nợ quá hạn
                    </p>
                    <p className="text-2xl font-bold mt-1 text-red-600">
                      {formatCurrency(
                        MOCK_DEBTS.filter((d) => d.status === "overdue").reduce(
                          (sum, d) => sum + d.totalDebt,
                          0
                        )
                      )}
                    </p>
                  </div>
                  <XCircle className="size-8 text-red-600/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Số khách hàng nợ
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {MOCK_DEBTS.length}
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
                      Nợ lâu nhất
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {Math.max(...MOCK_DEBTS.map((d) => d.overdueDays))} ngày
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
                    placeholder="Tìm theo tên, số điện thoại..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon">
                  <RefreshCw className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Debt Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Điện thoại</TableHead>
                    <TableHead className="text-right">Tổng nợ</TableHead>
                    <TableHead className="text-right">Nợ lâu nhất</TableHead>
                    <TableHead className="text-right">Ngày thanh toán gần nhất</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDebts.map((debt) => {
                    const statusConfig =
                      DEBT_STATUS_CONFIG[debt.status as keyof typeof DEBT_STATUS_CONFIG] ||
                      DEBT_STATUS_CONFIG.normal;

                    return (
                      <TableRow key={debt.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{debt.customer}</p>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {debt.phone}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-red-600">
                            {formatCurrency(debt.totalDebt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {debt.overdueDays > 0 ? (
                            <span className="text-red-600 font-medium">
                              {debt.overdueDays} ngày
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {debt.lastPayment
                            ? formatDate(debt.lastPayment)
                            : "Chưa thanh toán"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant}>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="size-8">
                            <Eye className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
