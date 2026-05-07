// ============================================================
// Sales Module Types
// ============================================================

// Payment types
export type PaymentMethod = "cod" | "bank_transfer" | "installment" | "momo" | "vnpay" | "cash";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partial";
export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";
export type ShippingStatus = "not_shipped" | "picking" | "shipped" | "in_transit" | "delivered" | "failed" | "returned";
export type ShippingPartner = "ghn" | "ghtk" | "viettel" | "vnpost" | "grab" | "aha";
export type DiscountType = "percent" | "fixed" | "shipping";
export type PromotionStatus = "active" | "inactive" | "expired";
export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

// Sales Dashboard Stats
export interface SalesStats {
  todayRevenue: number;
  todayOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  revenueChange: number;
  ordersChange: number;
  pendingChange: number;
  cancelledChange: number;
  thisWeekRevenue: number;
  thisWeekOrders: number;
}

// Order (enhanced from existing)
export interface SalesOrder {
  id: string;
  code: string;
  customer: string;
  customerEmail: string;
  customerPhone: string;
  items: SalesOrderItem[];
  subtotal: number;
  discount: number;
  discountCode?: string;
  shipping: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  shippingStatus: ShippingStatus;
  shippingAddress: SalesAddress;
  shippingPartner?: ShippingPartner;
  trackingCode?: string;
  note?: string;
  staffName: string;
  createdAt: string;
  updatedAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface SalesOrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
  image?: string;
}

export interface SalesAddress {
  fullName: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  city: string;
}

// Cart / Abandoned Cart
export interface AbandonedCart {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  items: SalesOrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  lastActivity: string;
  createdAt: string;
  emailSent: boolean;
  recoveryRate?: number;
}

// Payment
export interface Payment {
  id: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  transactionId?: string;
  paidAt?: string;
  createdAt: string;
}

// Shipping
export interface Shipment {
  id: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: SalesAddress;
  partner: ShippingPartner;
  trackingCode: string;
  status: ShippingStatus;
  estimatedDelivery?: string;
  shippedAt?: string;
  deliveredAt?: string;
  fee: number;
  weight?: number;
}

// Refund
export interface Refund {
  id: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  productId: string;
  productName: string;
  productSku: string;
  reason: string;
  refundAmount: number;
  refundMethod: "bank_transfer" | "cash" | "original_payment";
  status: "pending" | "approved" | "processing" | "completed" | "rejected";
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
}

// Promotion / Coupon
export interface Promotion {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  status: PromotionStatus;
  applicableProducts?: string[];
  applicableCategories?: string[];
  createdAt: string;
  updatedAt: string;
}

// Quote
export interface Quote {
  id: string;
  code: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompany?: string;
  items: SalesOrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  validUntil: string;
  status: QuoteStatus;
  note?: string;
  staffName: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
}

// Sales Log
export interface SalesLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  actionType: "create" | "update" | "cancel" | "refund" | "ship" | "payment" | "quote" | "promotion";
  orderId?: string;
  orderCode?: string;
  details?: string;
  timestamp: string;
}

// POS Cart Item
export interface POSCartItem {
  productId: string;
  productName: string;
  productSku: string;
  price: number;
  quantity: number;
  maxQuantity: number;
  image?: string;
  discount: number;
}
