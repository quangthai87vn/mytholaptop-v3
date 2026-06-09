/**
 * Medusa API Types
 *
 * Type definitions cho tất cả Medusa Admin API resources.
 * Phản ánh chính xác Medusa v2 Admin API response structure.
 */

export interface MedusaConfig {
  backendUrl: string;
  adminApiKey: string;
}

export interface MedusaApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export interface PaginatedResponse<T> {
  limit: number;
  offset: number;
  count: number;
  products?: T[];
  product?: T[];
  product_categories?: T[];
  product_category?: T[];
  product_tags?: T[];
  tags?: T[];
  product_types?: T[];
  product_collections?: T[];
  collections?: T[];
  orders?: T[];
  order?: T[];
  customers?: T[];
  customer?: T[];
  users?: T[];
  user?: T[];
}

// ============================================================
// PRODUCT TYPES
// ============================================================

export interface MedusaProductVariant {
  id: string;
  title: string;
  sku?: string;
  ean?: string;
  upc?: string;
  barcode?: string;
  price?: number[];
  original_price?: number[];
  calculated_price?: number;
  calculated_original_price?: number;
  inventory_quantity?: number;
  allow_backorder?: boolean;
  manage_inventory?: boolean;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  hs_code?: string;
  mid_code?: string;
  country_of_origin?: string;
  material?: string;
  variant_rank?: number;
  options?: { option_id: string; value: string }[];
  inventory_item?: {
    id: string;
    sku?: string;
    title: string;
    type?: string;
    description?: string;
    origin_country?: string;
    hs_code?: string;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    metadata?: Record<string, unknown>;
  };
}

export interface MedusaProductImage {
  id: string;
  url?: string;
  filename?: string;
  original_filename?: string;
  size?: number;
  mime_type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MedusaProductCategory {
  id: string;
  name: string;
  description?: string;
  handle?: string;
  slug?: string;
  is_active?: boolean;
  is_internal?: boolean;
  rank?: number;
  parent_category_id?: string;
  category_children?: MedusaProductCategory[];
  created_at?: string;
  updated_at?: string;
}

export interface MedusaProductTag {
  id: string;
  value: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
}

export interface MedusaProductOption {
  id: string;
  title: string;
  values: string[];
}

export interface MedusaProduct {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  handle?: string;
  is_giftcard?: boolean;
  status?: "draft" | "proposed" | "published" | "rejected";
  thumbnail?: string;
  weight?: number;
  length?: number;
  height?: number;
  width?: number;
  hs_code?: string;
  origin_country?: string;
  mid_code?: string;
  material?: string;
  tags?: MedusaProductTag[];
  type?: { id: string; value: string };
  collection?: { id: string; title: string; handle: string };
  categories?: MedusaProductCategory[];
  variants?: MedusaProductVariant[];
  images?: MedusaProductImage[];
  options?: MedusaProductOption[];
  profiles?: { id: string; name: string; type: string }[];
  profile_id?: string;
  sales_channels?: { id: string; name: string }[];
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  metadata?: Record<string, unknown>;
}

export interface ProductFilter {
  limit?: number;
  offset?: number;
  q?: string;
  status?: string[];
  category_id?: string;
  order?: string;
  fields?: string;
  expand?: string;
  /** Internal: skip Medusa fetch when product_data_source = woocommerce */
  __skipMedusa?: boolean;
}

export interface CreateProductInput {
  title: string;
  subtitle?: string;
  description?: string;
  handle?: string;
  status?: "draft" | "published";
  is_giftcard?: boolean;
  weight?: number;
  length?: number;
  height?: number;
  width?: number;
  hs_code?: string;
  origin_country?: string;
  mid_code?: string;
  material?: string;
  thumbnail?: string;
  tags?: { id?: string; value: string }[];
  type?: { value: string };
  collection_id?: string;
  categories?: { id: string }[];
  variants?: Array<{
    title: string;
    sku?: string;
    ean?: string;
    upc?: string;
    barcode?: string;
    price?: number;
    original_price?: number;
    inventory_quantity?: number;
    allow_backorder?: boolean;
    manage_inventory?: boolean;
    weight?: number;
    options?: { option_id?: string; value: string }[];
  }>;
  images?: { url: string }[];
  options?: Array<{ title: string; values: string[] }>;
  metadata?: Record<string, unknown>;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {}

// ============================================================
// CATEGORY TYPES
// ============================================================

export interface MedusaCategory {
  id: string;
  name: string;
  description?: string;
  handle?: string;
  slug?: string;
  is_active?: boolean;
  is_internal?: boolean;
  rank?: number;
  parent_category_id?: string;
  category_children?: MedusaCategory[];
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
}

export interface CategoryFilter {
  limit?: number;
  offset?: number;
  fields?: string;
  expand?: string;
  include_descendants_tree?: boolean;
  parent_category_id?: string | null;
  /** Internal: skip Medusa fetch when product_data_source = woocommerce */
  enabled?: boolean;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  handle?: string;
  is_active?: boolean;
  is_internal?: boolean;
  rank?: number;
  parent_category_id?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {}

// ============================================================
// TAG TYPES
// ============================================================

export interface TagFilter {
  limit?: number;
  offset?: number;
  fields?: string;
  q?: string;
  /** Internal: skip Medusa fetch when product_data_source = woocommerce */
  __skipMedusa?: boolean;
}

export interface CreateTagInput {
  value: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTagInput {
  value?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// ORDER TYPES
// ============================================================

export interface MedusaOrderAddress {
  id: string;
  customer_id?: string;
  company?: string;
  first_name?: string;
  last_name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country_code?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

export interface MedusaOrderLineItem {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  is_giftcard?: boolean;
  variant?: {
    id: string;
    title: string;
    sku?: string;
    product?: { id: string; title: string; thumbnail?: string };
  };
  product?: { id: string; title: string; thumbnail?: string };
  variant_id?: string;
  product_id?: string;
  quantity: number;
  fulfilled_quantity?: number;
  returned_quantity?: number;
  unit_price: number;
  original_unit_price: number;
  discounted_unit_price?: number;
  is_free_dhipping?: boolean;
  subtotal?: number;
  total: number;
  original_total?: number;
  tax_lines?: Array<{
    rate: number;
    name: string;
    code: string;
  }>;
  adjustments?: Array<{
    code?: string;
    amount: number;
    description: string;
  }>;
}

export interface MedusaOrderPayment {
  id: string;
  amount: number;
  currency_code: string;
  amount_refunded: number;
  captured_at?: string;
  created_at?: string;
}

export interface MedusaOrder {
  id: string;
  status:
    | "pending"
    | "completed"
    | "archived"
    | "canceled"
    | "requires_action";
  fulfill_status:
    | "not_fulfilled"
    | "partially_fulfilled"
    | "fulfilled"
    | "partially_returned"
    | "returned"
    | "requires_action";
  payment_status:
    | "not_paid"
    | "awaiting"
    | "captured"
    | "partially_refunded"
    | "refunded"
    | "canceled"
    | "requires_action";
  display_id?: number;
  order_number?: string;
  cart_id?: string;
  customer_id?: string;
  customer?: MedusaCustomer;
  email?: string;
  billing_address?: MedusaOrderAddress;
  shipping_address?: MedusaOrderAddress;
  line_items?: MedusaOrderLineItem[];
  items?: MedusaOrderLineItem[];
  shipping_methods?: Array<{
    id: string;
    order_id: string;
    shipping_option_id?: string;
    shipping_option?: { id: string; name: string; description?: string };
    method?: string;
    price: number;
    data?: Record<string, unknown>;
  }>;
  discounts?: Array<{
    code: string;
    is_giftcard?: boolean;
    is_dynamic?: boolean;
    rule?: { id: string; type: string; value: string };
  }>;
  tracks?: Array<{
    id: string;
    tracking_link?: string;
    tracking_number?: string;
  }>;
  payments?: MedusaOrderPayment[];
  fulfillments?: Array<{
    id: string;
    created_at?: string;
    tracking_links?: Array<{
      url?: string;
      tracking_number?: string;
    }>;
  }>;
  returns?: Array<{
    id: string;
    status: string;
    created_at?: string;
  }>;
  claims?: Array<{ id: string; type: string }>;
  refunds?: Array<{
    id: string;
    amount: number;
    reason?: string;
    note?: string;
  }>;
  subtotal?: number;
  shipping_total?: number;
  tax_total?: number;
  total?: number;
  paid_total?: number;
  refunded_total?: number;
  currency_code?: string;
  shipping_address_id?: string;
  billing_address_id?: string;
  region_id?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
}

export interface OrderFilter {
  limit?: number;
  offset?: number;
  fields?: string;
  expand?: string;
  q?: string;
  status?: string[];
  created_at?: { gte?: string; lte?: string };
}

// ============================================================
// CUSTOMER TYPES
// ============================================================

export interface MedusaCustomerAddress {
  id: string;
  customer_id?: string;
  company?: string;
  first_name?: string;
  last_name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country_code?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

export interface MedusaCustomer {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  has_account?: boolean;
  billing_address_id?: string;
  billing_address?: MedusaCustomerAddress;
  shipping_addresses?: MedusaCustomerAddress[];
  orders?: MedusaOrder[];
  groups?: Array<{ id: string; name: string }>;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  metadata?: Record<string, unknown>;
}

export interface CustomerFilter {
  limit?: number;
  offset?: number;
  fields?: string;
  expand?: string;
  q?: string;
}

// ============================================================
// USER TYPES
// ============================================================

export interface MedusaUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: "member" | "admin" | "developer";
  api_token?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  metadata?: Record<string, unknown>;
}

export interface MedusaInvite {
  id: string;
  role: string;
  user_email: string;
  accepted: boolean;
  created_at?: string;
  expires_at?: string;
  token?: string;
}

export interface UserFilter {
  limit?: number;
  offset?: number;
  fields?: string;
}

export interface CreateUserInput {
  email: string;
  first_name?: string;
  last_name?: string;
  role?: "member" | "admin" | "developer";
  metadata?: Record<string, unknown>;
}

export interface InviteUserInput {
  user: string;
  role: "member" | "admin" | "developer";
}

// ============================================================
// COLLECTION (BRAND) TYPES
// ============================================================

export interface MedusaCollection {
  id: string;
  title: string;
  handle: string;
  description?: string;
  thumbnail?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface CollectionFilter {
  limit?: number;
  offset?: number;
  fields?: string;
  expand?: string;
  q?: string;
}

export interface CreateCollectionInput {
  title: string;
  handle?: string;
  description?: string;
  thumbnail?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCollectionInput extends Partial<CreateCollectionInput> {}

// ============================================================
// PRODUCT TYPE (ATTRIBUTE) TYPES
// ============================================================

export interface MedusaProductType {
  id: string;
  value: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface ProductTypeFilter {
  limit?: number;
  offset?: number;
  fields?: string;
  q?: string;
}

export interface CreateProductTypeInput {
  value: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateProductTypeInput {
  value?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  monthRevenue: number;
  monthOrders: number;
  totalProducts: number;
  totalCustomers: number;
}
