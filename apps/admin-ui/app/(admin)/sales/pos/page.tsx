"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  User,
  ShoppingBag,
  Receipt,
} from "lucide-react";
import { MOCK_AI_PRODUCTS } from "@/lib/mock-data";
import type { POSCartItem } from "@/types/sales";
import { toast } from "sonner";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount);
}

const PAYMENT_METHODS = [
  { value: "cod", label: "COD", icon: Banknote, desc: "Nhận tiền khi giao hàng" },
  { value: "cash", label: "Tiền mặt", icon: Banknote, desc: "Thanh toán tại quầy" },
  { value: "bank_transfer", label: "Chuyển khoản", icon: QrCode, desc: "QR Code / Banking" },
  { value: "momo", label: "MoMo", icon: QrCode, desc: "Thanh toán MoMo" },
  { value: "vnpay", label: "VNPay", icon: QrCode, desc: "Thanh toán VNPay" },
];

function generateOrderCode(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `MTL-${dateStr}-${random}`;
}

export default function POSPage() {
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<string | null>(null);
  const [cart, setCart] = useState<POSCartItem[]>([]);

  const filteredProducts = MOCK_AI_PRODUCTS.filter(
    (p) =>
      search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal - discountAmount;

  const addToCart = (product: (typeof MOCK_AI_PRODUCTS)[0]) => {
    const existing = cart.find((item) => item.productId === product.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          price: product.price,
          quantity: 1,
          maxQuantity: 99,
          image: product.image,
          discount: 0,
        },
      ]);
    }
    toast.success(`Đã thêm "${product.name}" vào giỏ`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Vui lòng thêm sản phẩm vào giỏ");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Vui lòng nhập thông tin khách hàng");
      return;
    }

    const orderCode = generateOrderCode();
    setCompletedOrder(orderCode);
    setShowReceipt(true);
    toast.success(`Đơn hàng ${orderCode} đã được tạo!`);
  };

  const handleNewOrder = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setDiscountCode("");
    setDiscountAmount(0);
    setPaymentMethod("cod");
    setShowReceipt(false);
    setCompletedOrder(null);
  };

  // Receipt view
  if (showReceipt && completedOrder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Card className="w-full max-w-md">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="size-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Receipt className="size-8 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">Thanh toán thành công!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Mã đơn hàng:{" "}
                  <span className="font-mono font-semibold">{completedOrder}</span>
                </p>
              </div>
              <div className="border-t border-b py-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Khách hàng</span>
                  <span>{customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Số sản phẩm</span>
                  <span>{cart.length} sản phẩm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Thanh toán</span>
                  <span>{PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2">
                  <span>Tổng cộng</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
              <Button className="w-full" onClick={handleNewOrder}>
                Tạo đơn hàng mới
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tạo đơn hàng (POS)</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Bán hàng trực tiếp tại cửa hàng
          </p>
        </div>
        {cart.length > 0 && (
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => {
              setCart([]);
              toast.info("Đã xóa giỏ hàng");
            }}
          >
            <Trash2 className="mr-2 size-4" />
            Xóa giỏ
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Products */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm sản phẩm..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    <div className="relative size-16 rounded overflow-hidden bg-muted shrink-0">
                      <Image
                        src={product.image || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium line-clamp-2">{product.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {product.sku}
                      </p>
                      <p className="text-sm font-bold text-primary mt-1">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" className="size-8 self-center shrink-0">
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Cart & Customer */}
        <div className="space-y-4">
          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="size-4" />
                Thông tin khách hàng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-medium">Tên khách hàng</label>
                <Input
                  placeholder="Nhập tên..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Số điện thoại</label>
                <Input
                  placeholder="Nhập SĐT..."
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="size-4" />
                Giỏ hàng ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Chưa có sản phẩm nào
                </p>
              ) : (
                <>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.productId} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.productName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-7"
                            onClick={() => updateQuantity(item.productId, -1)}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="text-sm font-medium w-6 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-7"
                            onClick={() => updateQuantity(item.productId, 1)}
                          >
                            <Plus className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive"
                            onClick={() => removeItem(item.productId)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Discount */}
                  <div className="border-t pt-3 space-y-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Mã giảm giá</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nhập mã..."
                          value={discountCode}
                          onChange={(e) => setDiscountCode(e.target.value)}
                          className="flex-1"
                        />
                        <Button variant="outline" size="sm">
                          Áp dụng
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tạm tính</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Giảm giá</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base pt-2 border-t">
                      <span>Tổng cộng</span>
                      <span className="text-primary">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="size-4" />
                Phương thức thanh toán
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.value}
                      onClick={() => setPaymentMethod(method.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        paymentMethod === method.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="size-4" />
                        <span className="text-sm font-medium">{method.label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {method.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Checkout */}
          <Button
            className="w-full h-12 text-base gap-2"
            disabled={cart.length === 0}
            onClick={handleCheckout}
          >
            <CreditCard className="size-5" />
            Thanh toán {cart.length > 0 ? formatCurrency(total) : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
