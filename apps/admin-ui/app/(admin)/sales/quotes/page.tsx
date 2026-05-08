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
  Plus,
  Eye,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Download,
  Building2,
} from "lucide-react";
import { MOCK_QUOTES } from "@/lib/mock-data";
import type { Quote } from "@/types/sales";
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
  draft: { label: "Nháp", variant: "secondary", icon: FileText },
  sent: { label: "Đã gửi", variant: "default", icon: Send },
  accepted: { label: "Chấp nhận", variant: "success", icon: CheckCircle },
  rejected: { label: "Từ chối", variant: "destructive", icon: XCircle },
  expired: { label: "Hết hạn", variant: "destructive", icon: XCircle },
};

export default function QuotesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewQuote, setViewQuote] = useState<Quote | null>(null);

  const filteredQuotes = MOCK_QUOTES.filter((quote) => {
    const matchSearch =
      search === "" ||
      quote.code.toLowerCase().includes(search.toLowerCase()) ||
      quote.customerName.toLowerCase().includes(search.toLowerCase()) ||
      quote.customerCompany?.toLowerCase().includes(search.toLowerCase()) ||
      quote.customerEmail.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === "all" || quote.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const handleExportPDF = () => {
    toast.success("Đang export PDF...");
    setTimeout(() => toast.info("Tính năng export PDF sẽ sớm có!"), 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Báo giá</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quản lý báo giá cho khách hàng
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="size-4" />
          Tạo báo giá
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã báo giá, khách hàng, công ty..."
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
              <option value="draft">Nháp</option>
              <option value="sent">Đã gửi</option>
              <option value="accepted">Chấp nhận</option>
              <option value="rejected">Từ chối</option>
              <option value="expired">Hết hạn</option>
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
                  <TableHead>Mã báo giá</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Công ty</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead>Có hiệu lực đến</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      Không tìm thấy báo giá nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotes.map((quote) => {
                    const statusConfig =
                      STATUS_CONFIG[quote.status] || STATUS_CONFIG.draft;
                    const StatusIcon = statusConfig.icon;
                    const isExpired =
                      quote.status !== "accepted" &&
                      new Date(quote.validUntil) < new Date();

                    return (
                      <TableRow key={quote.id}>
                        <TableCell>
                          <span className="font-mono text-sm font-medium">
                            {quote.code}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{quote.customerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {quote.customerPhone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {quote.customerCompany ? (
                            <div className="flex items-center gap-1">
                              <Building2 className="size-3 text-muted-foreground" />
                              <span className="text-sm">{quote.customerCompany}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(quote.total)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-sm ${
                              isExpired ? "text-red-600 font-medium" : ""
                            }`}
                          >
                            {formatDate(quote.validUntil)}
                          </span>
                          {isExpired && (
                            <span className="ml-1 text-xs text-red-600">(Hết hạn)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant} className="gap-1">
                            <StatusIcon className="size-3" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => setViewQuote(quote)}
                            >
                              <Eye className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={handleExportPDF}
                            >
                              <Download className="size-3.5" />
                            </Button>
                          </div>
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
      <Dialog open={!!viewQuote} onOpenChange={() => setViewQuote(null)}>
        <DialogContent className="max-w-2xl">
          {viewQuote && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>Báo giá {viewQuote.code}</DialogTitle>
                  <Badge
                    variant={STATUS_CONFIG[viewQuote.status]?.variant}
                    className="gap-1"
                  >
                    {(() => {
                      const Icon = STATUS_CONFIG[viewQuote.status]?.icon || FileText;
                      return <Icon className="size-3" />;
                    })()}
                    {STATUS_CONFIG[viewQuote.status]?.label}
                  </Badge>
                </div>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Khách hàng</p>
                    <p className="font-medium">{viewQuote.customerName}</p>
                    <p className="text-sm text-muted-foreground">
                      {viewQuote.customerPhone}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {viewQuote.customerEmail}
                    </p>
                  </div>
                  {viewQuote.customerCompany && (
                    <div>
                      <p className="text-xs text-muted-foreground">Công ty</p>
                      <p className="font-medium">{viewQuote.customerCompany}</p>
                    </div>
                  )}
                </div>

                {/* Products */}
                <div>
                  <p className="text-sm font-medium mb-2">Sản phẩm báo giá</p>
                  <div className="border rounded-lg divide-y">
                    {viewQuote.items.map((item) => (
                      <div key={item.id} className="flex justify-between px-3 py-2">
                        <div>
                          <p className="text-sm">
                            {item.productName} x{item.quantity}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.productSku} • {formatCurrency(item.price)}/cái
                          </p>
                        </div>
                        <p className="text-sm font-medium">
                          {formatCurrency(item.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tạm tính</span>
                    <span>{formatCurrency(viewQuote.subtotal)}</span>
                  </div>
                  {viewQuote.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Giảm giá</span>
                      <span>-{formatCurrency(viewQuote.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>Tổng cộng</span>
                    <span className="text-primary">
                      {formatCurrency(viewQuote.total)}
                    </span>
                  </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Có hiệu lực đến</p>
                    <p className="font-medium">{formatDate(viewQuote.validUntil)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nhân viên</p>
                    <p>{viewQuote.staffName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ngày tạo</p>
                    <p>{formatDate(viewQuote.createdAt)}</p>
                  </div>
                </div>

                {viewQuote.note && (
                  <div>
                    <p className="text-xs text-muted-foreground">Ghi chú</p>
                    <p className="text-sm bg-muted/50 rounded p-2">{viewQuote.note}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewQuote(null)}>
                  Đóng
                </Button>
                <Button onClick={handleExportPDF} className="gap-1">
                  <Download className="size-4" />
                  Export PDF
                </Button>
                {viewQuote.status === "draft" && (
                  <Button
                    onClick={() => {
                      toast.success("Đã gửi báo giá!");
                      setViewQuote(null);
                    }}
                    className="gap-1"
                  >
                    <Send className="size-4" />
                    Gửi báo giá
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
