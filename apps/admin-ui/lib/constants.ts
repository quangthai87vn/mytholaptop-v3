export const CUSTOMER_GROUPS = ["vip", "regular", "new"] as const;

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;

export const PRODUCT_STATUSES = ["active", "draft", "archived"] as const;

export const ROLES = ["admin", "manager", "sales", "warehouse", "marketing"] as const;

export const STAFF_PERMISSIONS = [
  "Dashboard",
  "Products",
  "Orders",
  "Customers",
  "Migration",
  "Settings",
] as const;

export const MIGRATION_DATA_TYPES = [
  { id: "categories", label: "Danh mục sản phẩm", checked: true },
  { id: "products", label: "Sản phẩm", checked: true },
  { id: "images", label: "Hình ảnh sản phẩm", checked: true },
  { id: "shortDesc", label: "Mô tả ngắn", checked: true },
  { id: "longDesc", label: "Mô tả dài", checked: true },
  { id: "variants", label: "Biến thể sản phẩm", checked: true },
  { id: "inventory", label: "Tồn kho", checked: true },
] as const;

export const CONFLICT_STRATEGIES = [
  { id: "skip", label: "Bỏ qua nếu SKU đã tồn tại" },
  { id: "update", label: "Cập nhật nếu SKU đã tồn tại" },
  { id: "create", label: "Tạo mới nếu chưa có" },
] as const;

export const STATUS_LABELS: Record<string, string> = {
  active: "Hoạt động",
  draft: "Nháp",
  archived: "Lưu trữ",
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  shipped: "Đã giao hàng",
  delivered: "Đã nhận hàng",
  cancelled: "Đã hủy",
  paid: "Đã thanh toán",
  failed: "Thất bại",
  refunded: "Đã hoàn tiền",
  vip: "VIP",
  regular: "Thường",
  new: "Mới",
  admin: "Quản trị",
  manager: "Quản lý",
  sales: "Bán hàng",
  warehouse: "Kho hàng",
  marketing: "Marketing",
};

// ============================================================
// Extended Constants for Multi-Source Sync & Staff Management
// ============================================================

export const PRODUCT_SOURCES = ["manual", "woo", "medusa"] as const;
export const SYNC_STATUSES = ["synced", "pending", "failed", "manual"] as const;
export const STOCK_STATUSES = ["in_stock", "low_stock", "out_of_stock"] as const;
export const STAFF_STATUSES = ["active", "inactive", "locked", "pending"] as const;
export const STAFF_ROLES = ["super_admin", "admin", "manager", "sales", "warehouse", "marketing", "accountant", "viewer"] as const;
export const PERMISSION_ACTIONS = ["view", "create", "update", "delete", "export", "import", "sync", "approve"] as const;

export const SYNC_STATUS_LABELS: Record<string, string> = {
  synced: "Đã đồng bộ",
  pending: "Chờ đồng bộ",
  failed: "Đồng bộ thất bại",
  manual: "Thủ công",
};

export const PRODUCT_SOURCE_LABELS: Record<string, string> = {
  manual: "Thủ công",
  woo: "WooCommerce",
  medusa: "Medusa",
};

export const STAFF_STATUS_LABELS: Record<string, string> = {
  active: "Hoạt động",
  inactive: "Tắt",
  locked: "Khoá",
  pending: "Chờ mời",
};

export const STAFF_ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Quản trị",
  manager: "Quản lý",
  sales: "Bán hàng",
  warehouse: "Kho hàng",
  marketing: "Marketing",
  accountant: "Kế toán",
  viewer: "Người xem",
};

export const PERMISSION_ACTION_LABELS: Record<string, string> = {
  view: "Xem",
  create: "Tạo",
  update: "Sửa",
  delete: "Xoá",
  export: "Xuất",
  import: "Nhập",
  sync: "Đồng bộ",
  approve: "Duyệt",
};
