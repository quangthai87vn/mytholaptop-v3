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
// Migration Types — re-exported from migration.ts
// ============================================================

export * from "./migration";
