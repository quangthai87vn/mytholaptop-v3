// ============================================================
// Shared Domain Types
// ============================================================

// ============================================================
// Extended Types for Multi-Source Sync
// ============================================================

export type ProductStatus = "active" | "draft" | "archived";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
export type SyncStatus = "synced" | "pending" | "failed" | "manual";
export type ProductSource = "manual" | "woo" | "medusa";

export interface ProductTag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  productCount: number;
  source: ProductSource;
  wooId?: number;
  medusaId?: string;
  localId?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export type StaffStatus = "active" | "inactive" | "locked" | "pending";
export type StaffRole = "super_admin" | "admin" | "manager" | "sales" | "warehouse" | "marketing" | "accountant" | "viewer";

export interface Role {
  id: string;
  name: string;
  code: StaffRole;
  description: string;
  isSystem: boolean;
  staffCount: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export type PermissionAction = "view" | "create" | "update" | "delete" | "export" | "import" | "sync" | "approve";

export interface PermissionModule {
  id: string;
  name: string;
  code: string;
}

export interface PermissionMatrix {
  roleId: string;
  permissions: Record<string, PermissionAction[]>;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
  department?: string;
  avatar?: string;
  lockedAt?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  categoryId?: string;
  stock: number;
  status: ProductStatus;
  image: string;
  description: string;
  weight?: string;
  tags: string[];
  source: ProductSource;
  wooId?: number;
  medusaId?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  productCount: number;
  status: "active" | "inactive";
  description?: string;
  image?: string;
  sortOrder: number;
  source: ProductSource;
  wooId?: number;
  medusaId?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  code: string;
  customer: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  orderStatus: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  shippingAddress: Address;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface Address {
  fullName: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  city: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  customerGroup: "vip" | "regular" | "new";
  totalOrders: number;
  totalSpent: number;
  orders: string[];
  createdAt: string;
  lastOrderAt?: string;
  status: "active" | "inactive";
}

export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  lowStockProducts: number;
  newCustomers: number;
  revenueChange: number;
  ordersChange: number;
  lowStockChange: number;
  customersChange: number;
}

export interface ChartData {
  date: string;
  revenue: number;
  orders: number;
}

export interface Settings {
  company: {
    name: string;
    website: string;
    phone: string;
    address: string;
    logoUrl: string;
  };
  wooCommerce: {
    wordpressUrl: string;
    consumerKey: string;
    consumerSecret: string;
  };
  medusa: {
    backendUrl: string;
    adminApiKey: string;
    adminEmail: string;
    adminPassword: string;
  };
  ui: {
    primaryColor: string;
    darkMode: boolean;
    sidebarCollapsed: boolean;
  };
}

// ============================================================
// Product Extended Types
// ============================================================

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  productCount: number;
  source: ProductSource;
  syncStatus: SyncStatus;
  wooId?: number;
  medusaId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductAttribute {
  id: string;
  name: string;
  code: string;
  type: "text" | "number" | "boolean" | "select";
  values: AttributeValue[];
  productCount: number;
  source: ProductSource;
  syncStatus: SyncStatus;
  wooId?: number;
  medusaId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttributeValue {
  id: string;
  value: string;
  slug: string;
  productCount: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  productName: string;
  title: string;
  sku: string;
  prices: VariantPrice[];
  options: VariantOption[];
  stock: number;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  status: ProductStatus;
  source: ProductSource;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VariantPrice {
  amount: number;
  currencyCode: string;
}

export interface VariantOption {
  optionId: string;
  optionName: string;
  value: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  sku: string;
  variantId?: string;
  variantTitle?: string;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  warehouseId?: string;
  warehouseName?: string;
  stockStatus: StockStatus;
  lastUpdated: string;
  source: ProductSource;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  manager?: string;
  itemCount: number;
  totalStock: number;
  status: "active" | "inactive";
}

export interface SyncLog {
  id: string;
  type: "product" | "category" | "brand" | "attribute" | "order" | "full";
  action: "sync" | "dry_run" | "repair";
  status: "running" | "success" | "failed" | "cancelled";
  source: "woo" | "medusa" | "manual";
  totalItems: number;
  syncedItems: number;
  failedItems: number;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  errorMessage?: string;
  logs: SyncLogEntry[];
  triggeredBy: string;
}

export interface SyncLogEntry {
  timestamp: string;
  level: "info" | "warning" | "error" | "success";
  message: string;
  itemId?: string;
  itemType?: string;
}

// ============================================================
// CRM Types
// ============================================================

export interface CustomerGroup {
  id: string;
  name: string;
  description?: string;
  customerCount: number;
  tags: string[];
  status: "active" | "inactive";
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseHistory {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  orderId: string;
  orderCode: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  purchaseDate: string;
  warrantyEndDate?: string;
  warrantyStatus: "active" | "expired" | "none";
  staffName?: string;
}

export interface WarrantyDebt {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  productId: string;
  productName: string;
  productImage?: string;
  sku: string;
  warrantyEndDate?: string;
  warrantyStatus: "active" | "expired" | "none";
  debtAmount: number;
  paidAmount: number;
  paymentStatus: "paid" | "partial" | "unpaid" | "overdue";
  note?: string;
  lastPaymentDate?: string;
}

export interface ZnsTemplate {
  id: string;
  name: string;
  templateId: string;
  zaloTemplateId?: string;
  content: string;
  variables: string[];
  status: "active" | "inactive";
  sentCount: number;
  successRate: number;
  createdAt: string;
}

export interface ZnsLog {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  templateId: string;
  templateName: string;
  status: "pending" | "sent" | "delivered" | "failed" | "read";
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  errorMessage?: string;
  cost: number;
  sentBy: string;
}

export interface CareScenario {
  id: string;
  name: string;
  description: string;
  trigger: "purchase_1d" | "purchase_7d" | "purchase_30d" | "purchase_6m" | "birthday" | "inactive_30d" | "warranty_expiring" | "manual";
  triggerLabel: string;
  templateId?: string;
  templateName?: string;
  targetSegment?: string;
  isActive: boolean;
  sentCount: number;
  successCount: number;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
}

export interface CustomerSegment {
  id: string;
  name: string;
  code: string;
  description: string;
  color: string;
  icon: string;
  customerCount: number;
  avgOrderValue: number;
  avgOrderCount: number;
  totalRevenue: number;
  criteria: string[];
  isSystem: boolean;
  createdAt: string;
}

export type InteractionChannel = "zalo" | "zns" | "phone" | "facebook" | "store" | "email";
export type InteractionStatus = "pending" | "completed" | "failed";

export interface ActivityLog {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  channel: InteractionChannel;
  action: string;
  staffId?: string;
  staffName?: string;
  status: InteractionStatus;
  timestamp: string;
  duration?: number;
  note?: string;
  relatedOrderId?: string;
}

// ============================================================
// Migration Types — re-exported from migration.ts
// ============================================================

export * from "./migration";
// Note: media-mapping types are imported directly from @/types/media-mapping where needed
// to avoid naming conflicts with migration.ts

// ============================================================
// Content Types
// ============================================================

export * from "./content";

// ============================================================
// Sales Types
// ============================================================

export * from "./sales";
