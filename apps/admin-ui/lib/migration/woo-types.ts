/**
 * WooCommerce Database Types
 *
 * Type definitions cho WordPress/WooCommerce database structure.
 * Dùng khi đọc dữ liệu từ WordPress database để migrate sang Medusa.
 */

export interface WooProduct {
  ID: string;
  post_author: string;
  post_date: string;
  post_date_gmt: string;
  post_content: string;
  post_title: string;
  post_excerpt: string;
  post_status: string;
  comment_status: string;
  ping_status: string;
  post_password: string;
  post_name: string;
  to_ping: string;
  pinged: string;
  post_modified: string;
  post_modified_gmt: string;
  post_content_filtered: string;
  post_parent: string;
  guid: string;
  menu_order: number;
  post_type: string;
  post_mime_type: string;
  comment_count: string;
}

export interface WooProductMeta {
  post_id: string;
  meta_key: string;
  meta_value: string;
}

export interface WooProductMetaParsed {
  _price?: string;
  _regular_price?: string;
  _sale_price?: string;
  _sku?: string;
  _stock?: string;
  _stock_status?: string;
  _weight?: string;
  _length?: string;
  _width?: string;
  _height?: string;
  _thumbnail_id?: string;
  _product_image_gallery?: string;
  _visibility?: string;
  _featured?: string;
  _manage_stock?: string;
  _backorders?: string;
  _sold_individually?: string;
  _upsell_ids?: string;
  _crosssell_ids?: string;
  _virtual?: string;
  _downloadable?: string;
  _tax_class?: string;
  _shipping_class_id?: string;
  _product_attributes?: string;
  _product_version?: string;
  _wc_rating_counts?: string;
  _wc_average_rating?: string;
  _total_sales?: string;
}

export interface WooProductImage {
  ID: string;
  post_author: string;
  post_date: string;
  post_date_gmt: string;
  post_content: string;
  post_title: string;
  post_excerpt: string;
  post_status: string;
  comment_status: string;
  ping_status: string;
  post_password: string;
  post_name: string;
  to_ping: string;
  pinged: string;
  post_modified: string;
  post_modified_gmt: string;
  post_content_filtered: string;
  post_parent: string;
  guid: string;
  menu_order: number;
  post_type: string;
  post_mime_type: string;
  comment_count: string;
}

export interface WooCategory {
  term_id: string;
  name: string;
  slug: string;
  term_group: string;
  term_taxonomy_id: string;
  taxonomy: string;
  description: string;
  parent: string;
  count: number;
  filter: string;
}

export interface WooCategoryMeta {
  term_id: string;
  meta_key: string;
  meta_value: string;
}

export interface WooTag {
  term_id: string;
  name: string;
  slug: string;
  term_group: string;
  term_taxonomy_id: string;
  taxonomy: string;
  description: string;
  parent: string;
  count: number;
  filter: string;
}

export interface WooTermRelationship {
  object_id: string;
  term_taxonomy_id: string;
  term_order: number;
}

export interface WooTermTaxonomy {
  term_taxonomy_id: string;
  term_id: string;
  taxonomy: string;
  description: string;
  parent: string;
  count: number;
}

export interface WooAttribute {
  attribute_id: string;
  attribute_name: string;
  attribute_label: string;
  attribute_type: string;
  attribute_orderby: string;
  attribute_public: string;
}

export interface WooAttributeTerm {
  term_id: string;
  name: string;
  slug: string;
  term_group: string;
  term_taxonomy_id: string;
  taxonomy: string;
  description: string;
  parent: string;
  count: number;
  filter: string;
}

export interface WooProductVariation {
  ID: string;
  post_author: string;
  post_date: string;
  post_date_gmt: string;
  post_content: string;
  post_title: string;
  post_excerpt: string;
  post_status: string;
  comment_status: string;
  ping_status: string;
  post_password: string;
  post_name: string;
  to_ping: string;
  pinged: string;
  post_modified: string;
  post_modified_gmt: string;
  post_content_filtered: string;
  post_parent: string;
  guid: string;
  menu_order: number;
  post_type: string;
  post_mime_type: string;
  comment_count: string;
}

export interface WooProductWithMeta extends WooProduct {
  meta: WooProductMetaParsed;
  categories: string[];
  tags: string[];
  images: WooProductImage[];
  variations: WooProductVariation[];
}

export interface WooConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface MigrationResult {
  success: boolean;
  categoriesMigrated: number;
  tagsMigrated: number;
  productsMigrated: number;
  productsUpdated: number;
  errors: MigrationError[];
  duration: number;
}

export interface MigrationError {
  type: 'category' | 'tag' | 'product' | 'image' | 'relation';
  sourceId: string;
  message: string;
  timestamp: Date;
}

export interface MigrationStats {
  totalCategories: number;
  totalTags: number;
  totalProducts: number;
  processedCategories: number;
  processedTags: number;
  processedProducts: number;
  startTime: Date;
  errors: MigrationError[];
}

export interface WooProductQueryResult {
  products: WooProduct[];
  total: number;
}

export interface WooCategoryQueryResult {
  categories: WooCategory[];
  total: number;
}
