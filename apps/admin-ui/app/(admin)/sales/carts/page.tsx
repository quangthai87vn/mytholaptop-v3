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
  Mail,
  MessageSquare,
  Clock,
  ShoppingCart,
  Phone,
} from "lucide-react";
import { MOCK_ABANDONED_CARTS } from "@/lib/mock-data";
import type { AbandonedCart } from "@/types/sales";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Vừa xong";
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return "Hôm qua";
  return `${diffDays} ngày trước`;
}

export default function CartsPage() {
  const [search, setSearch] = useState("");
  const [viewCart, setViewCart] = useState<AbandonedCart | null>(null);

  const filteredCarts = MOCK_ABANDONED_CARTS.filter((cart) => {
    const matchSearch =
      search === "" ||
      cart.customerName.toLowerCase().includes(search.toLowerCase()) ||
      cart.customerPhone.includes(search) ||
      cart.customerEmail?.toLowerCase().includes(search.toLowerCase());

    return matchSearch;
  });

  const handleSendEmail = (cart: AbandonedCart) => {
    toast.success(`Đã gửi email nhắc nhở đến ${cart.customerEmail}`);
  };

  const handleSendSMS = (cart: AbandonedCart) => {
    toast.success(`Đã gửi SMS đến ${cart.customerPhone}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Giỏ hàng dở dang</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Theo dõi và khôi phục giỏ hàng bị bỏ quên
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Giỏ hàng bỏ quên</p>
                <p className="text-2xl font-bold mt-1">
                  {MOCK_ABANDONED_CARTS.length}
                </p>
              </div>
              <ShoppingCart className="size-10 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đã gửi email</p>
                <p className="text-2xl font-bold mt-1 text-blue-600">
                  {MOCK_ABANDONED_CARTS.filter((c) => c.emailSent).length}
                </p>
              </div>
              <Mail className="size-10 text-blue-600/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Giá trị tổng</p>
                <p className="text-2xl font-bold mt-1 text-primary">
                  {formatCurrency(
                    MOCK_ABANDONED_CARTS.reduce((sum, c) => sum + c.total, 0)
                  )}
                </p>
              </div>
              <Clock className="size-10 text-muted-foreground/20" />
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
                placeholder="Tìm khách hàng, SĐT, email..."
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-right">Giá trị</TableHead>
                  <TableHead>Hoạt động cuối</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Khả năng khôi phục</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCarts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-muted-foreground"
                    >
                      Không tìm thấy giỏ hàng nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCarts.map((cart) => {
                    const recoveryColor =
                      (cart.recoveryRate || 0) >= 20
                        ? "text-green-600"
                        : (cart.recoveryRate || 0) >= 10
                        ? "text-yellow-600"
                        : "text-red-600";

                    return (
                      <TableRow key={cart.id}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{cart.customerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {cart.customerPhone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm truncate max-w-[200px]">
                              {cart.items[0]?.productName}
                              {cart.items.length > 1 && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  +{cart.items.length - 1}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {cart.items.length} sản phẩm
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(cart.total)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            {formatRelativeTime(cart.lastActivity)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {cart.emailSent ? (
                            <Badge variant="success" className="gap-1 text-xs">
                              <Mail className="size-3" />
                              Đã gửi
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Chưa gửi
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${recoveryColor}`}>
                            {cart.recoveryRate || 0}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => setViewCart(cart)}
                            >
                              <Eye className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title="Gửi email"
                              onClick={() => handleSendEmail(cart)}
                            >
                              <Mail className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title="Gửi SMS"
                              onClick={() => handleSendSMS(cart)}
                            >
                              <MessageSquare className="size-3.5" />
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

      {/* Cart Detail Dialog */}
      <Dialog open={!!viewCart} onOpenChange={() => setViewCart(null)}>
        <DialogContent className="max-w-lg">
          {viewCart && (
            <>
              <DialogHeader>
                <DialogTitle>Chi tiết giỏ hàng</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Khách hàng</p>
                    <p className="font-medium">{viewCart.customerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Điện thoại</p>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="size-3" />
                      {viewCart.customerPhone}
                    </p>
                  </div>
                  {viewCart.customerEmail && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="flex items-center gap-1">
                        <Mail className="size-3" />
                        {viewCart.customerEmail}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Sản phẩm</p>
                  <div className="border rounded-lg divide-y">
                    {viewCart.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between px-3 py-2"
                      >
                        <div>
                          <p className="text-sm">
                            {item.productName} x{item.quantity}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.productSku}
                          </p>
                        </div>
                        <p className="text-sm font-medium">
                          {formatCurrency(item.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tạm tính</span>
                    <span>{formatCurrency(viewCart.subtotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>Tổng cộng</span>
                    <span className="text-primary">
                      {formatCurrency(viewCart.total)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-1"
                    onClick={() => handleSendEmail(viewCart)}
                    disabled={!!viewCart.emailSent}
                  >
                    <Mail className="size-4" />
                    Gửi email
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-1"
                    onClick={() => handleSendSMS(viewCart)}
                  >
                    <MessageSquare className="size-4" />
                    Gửi SMS
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewCart(null)}>
                  Đóng
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
