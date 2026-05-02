/**
 * WooCommerce Database Connector — DEPRECATED
 *
 * ⚠️  FILE NÀY ĐÃ BỊ DEPRECATE — KHÔNG DÙNG CHO MIGRATION MỚI.
 *
 * Lý do: Không kết nối MySQL WordPress trực tiếp.
 *
 * THAY VÀO ĐÓ, dùng WooCommerce REST API:
 *   - services/woocommerce.service.ts (frontend/admin-ui)
 *   - app/api/woo/[...slug]/route.ts (Next.js proxy)
 *
 * WooCommerce REST API cung cấp đầy đủ dữ liệu:
 *   GET /wp-json/wc/v3/products
 *   GET /wp-json/wc/v3/products/categories
 *   GET /wp-json/wc/v3/products/tags
 *   GET /wp-json/wc/v3/products/:id/variations
 *
 * Lấy credentials:
 *   WooCommerce Admin > Settings > Advanced > REST API > Add Key (Read/Write)
 *
 * Kết nối qua proxy tránh CORS:
 *   services/woocommerce.service.ts → /api/woo/... → WooCommerce REST API
 */

import type {
  WooProduct,
  WooProductMeta,
  WooProductImage,
  WooCategory,
  WooTag,
  WooTermRelationship,
  WooTermTaxonomy,
  WooAttribute,
  WooAttributeTerm,
  WooProductVariation,
  WooConfig,
  WooProductWithMeta,
} from "./woo-types";

export class WooDatabaseConnector {
  private config: WooConfig;
  private tablePrefix: string;
  private pool: any;
  private connected: boolean = false;

  constructor(config: WooConfig, tablePrefix: string = "wp_") {
    this.config = config;
    this.tablePrefix = tablePrefix;
  }

  async connect(): Promise<void> {
    try {
      // Using require because mysql2 may not have ESM exports
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const mysql = require("mysql2/promise");
      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });

      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      this.connected = true;
      console.log(`[WooConnector] Connected to WooCommerce database: ${this.config.database}`);
    } catch (error) {
      console.error("[WooConnector] Failed to connect:", error);
      throw new Error(`WooCommerce database connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.connected = false;
      console.log("[WooConnector] Disconnected from WooCommerce database");
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private table(name: string): string {
    return `${this.tablePrefix}${name}`;
  }

  async getAllProducts(status?: string): Promise<WooProduct[]> {
    const query = status
      ? `SELECT * FROM ${this.table("posts")} WHERE post_type = 'product' AND post_status = ? ORDER BY ID ASC`
      : `SELECT * FROM ${this.table("posts")} WHERE post_type = 'product' ORDER BY ID ASC`;

    const [rows] = await this.pool.query(query, status ? [status] : []);
    return rows as WooProduct[];
  }

  async getProductById(id: string): Promise<WooProduct | null> {
    const [rows] = await this.pool.query(
      `SELECT * FROM ${this.table("posts")} WHERE ID = ? AND post_type = 'product'`,
      [id]
    );
    const results = rows as WooProduct[];
    return results[0] || null;
  }

  async getProductMetas(productId: string): Promise<WooProductMeta[]> {
    const [rows] = await this.pool.query(
      `SELECT * FROM ${this.table("postmeta")} WHERE post_id = ?`,
      [productId]
    );
    return rows as WooProductMeta[];
  }

  async getProductsMetaMap(productIds: string[]): Promise<Map<string, WooProductMeta[]>> {
    if (productIds.length === 0) return new Map();

    const placeholders = productIds.map(() => "?").join(",");
    const [rows] = await this.pool.query(
      `SELECT * FROM ${this.table("postmeta")} WHERE post_id IN (${placeholders})`,
      productIds
    );

    const metas = rows as WooProductMeta[];
    const metaMap = new Map<string, WooProductMeta[]>();

    metas.forEach((meta) => {
      const existing = metaMap.get(meta.post_id) || [];
      existing.push(meta);
      metaMap.set(meta.post_id, existing);
    });

    return metaMap;
  }

  parseProductMeta(metas: WooProductMeta[]): Record<string, string> {
    const result: Record<string, string> = {};
    metas.forEach((meta) => {
      result[meta.meta_key] = meta.meta_value;
    });
    return result;
  }

  async getAllCategories(): Promise<WooCategory[]> {
    const [rows] = await this.pool.query(
      `SELECT t.*, tt.* FROM ${this.table("terms")} t
       INNER JOIN ${this.table("term_taxonomy")} tt ON t.term_id = tt.term_id
       WHERE tt.taxonomy = 'product_cat'
       ORDER BY tt.parent, t.name`
    );
    return rows as WooCategory[];
  }

  async getCategoryById(termId: string): Promise<WooCategory | null> {
    const [rows] = await this.pool.query(
      `SELECT t.*, tt.* FROM ${this.table("terms")} t
       INNER JOIN ${this.table("term_taxonomy")} tt ON t.term_id = tt.term_id
       WHERE t.term_id = ? AND tt.taxonomy = 'product_cat'`,
      [termId]
    );
    const results = rows as WooCategory[];
    return results[0] || null;
  }

  async getAllTags(): Promise<WooTag[]> {
    const [rows] = await this.pool.query(
      `SELECT t.*, tt.* FROM ${this.table("terms")} t
       INNER JOIN ${this.table("term_taxonomy")} tt ON t.term_id = tt.term_id
       WHERE tt.taxonomy = 'product_tag'
       ORDER BY t.name`
    );
    return rows as WooTag[];
  }

  async getTermRelationships(objectIds: string[]): Promise<WooTermRelationship[]> {
    if (objectIds.length === 0) return [];

    const placeholders = objectIds.map(() => "?").join(",");
    const [rows] = await this.pool.query(
      `SELECT * FROM ${this.table("term_relationships")}
       WHERE object_id IN (${placeholders})`,
      objectIds
    );
    return rows as WooTermRelationship[];
  }

  async getTermTaxonomies(termTaxonomyIds: string[]): Promise<WooTermTaxonomy[]> {
    if (termTaxonomyIds.length === 0) return [];

    const placeholders = termTaxonomyIds.map(() => "?").join(",");
    const [rows] = await this.pool.query(
      `SELECT * FROM ${this.table("term_taxonomy")}
       WHERE term_taxonomy_id IN (${placeholders}) AND taxonomy = 'product_cat'`,
      termTaxonomyIds
    );
    return rows as WooTermTaxonomy[];
  }

  async getProductImages(productId: string): Promise<WooProductImage[]> {
    const [rows] = await this.pool.query(
      `SELECT * FROM ${this.table("posts")}
       WHERE post_type = 'attachment'
       AND (post_parent = ? OR guid LIKE ?)
       ORDER BY menu_order, ID`,
      [productId, `%/${productId}/%`]
    );
    return rows as WooProductImage[];
  }

  async getProductsImagesMap(productIds: string[]): Promise<Map<string, WooProductImage[]>> {
    if (productIds.length === 0) return new Map();

    const placeholders = productIds.map(() => "?").join(",");
    const [rows] = await this.pool.query(
      `SELECT p.* FROM ${this.table("posts")} p
       WHERE p.post_type = 'attachment'
       AND p.post_parent IN (${placeholders})
       ORDER BY p.menu_order, p.ID`,
      productIds
    );

    const images = rows as WooProductImage[];
    const imageMap = new Map<string, WooProductImage[]>();

    images.forEach((img) => {
      const existing = imageMap.get(img.post_parent) || [];
      existing.push(img);
      imageMap.set(img.post_parent, existing);
    });

    return imageMap;
  }

  async getProductVariations(productId: string): Promise<WooProductVariation[]> {
    const [rows] = await this.pool.query(
      `SELECT * FROM ${this.table("posts")}
       WHERE post_type = 'product_variation'
       AND post_parent = ?
       ORDER BY menu_order, ID`,
      [productId]
    );
    return rows as WooProductVariation[];
  }

  async getVariationMetas(variationId: string): Promise<WooProductMeta[]> {
    const [rows] = await this.pool.query(
      `SELECT * FROM ${this.table("postmeta")} WHERE post_id = ?`,
      [variationId]
    );
    return rows as WooProductMeta[];
  }

  async getProductAttributes(): Promise<WooAttribute[]> {
    const [rows] = await this.pool.query(
      `SELECT * FROM ${this.table("woocommerce_attribute_taxonomies")}`
    );
    return rows as WooAttribute[];
  }

  async getAttributeTerms(attributeId: number): Promise<WooAttributeTerm[]> {
    const [rows] = await this.pool.query(
      `SELECT t.*, tt.* FROM ${this.table("terms")} t
       INNER JOIN ${this.table("term_taxonomy")} tt ON t.term_id = tt.term_id
       WHERE tt.taxonomy = 'pa_${attributeId}'
       ORDER BY t.name`
    );
    return rows as WooAttributeTerm[];
  }

  async getFullProducts(productIds?: string[]): Promise<WooProductWithMeta[]> {
    const products = productIds
      ? await this.getProductsByIds(productIds)
      : await this.getAllProducts();

    if (products.length === 0) return [];

    const ids = products.map((p) => p.ID);

    const [metaMap, imageMap, termRels] = await Promise.all([
      this.getProductsMetaMap(ids),
      this.getProductsImagesMap(ids),
      this.getTermRelationships(ids),
    ]);

    const termTaxonomyIds = [...new Set(termRels.map((tr) => tr.term_taxonomy_id))];
    const termTaxonomies = await this.getTermTaxonomies(termTaxonomyIds);

    const taxonomyToTerm = new Map<string, string>();
    termTaxonomies.forEach((tt) => {
      taxonomyToTerm.set(tt.term_taxonomy_id, tt.term_id);
    });

    const productCategoryMap = new Map<string, string[]>();
    const productTagMap = new Map<string, string[]>();

    termRels.forEach((rel) => {
      const termId = taxonomyToTerm.get(rel.term_taxonomy_id);
      if (!termId) return;

      const tt = termTaxonomies.find((t) => t.term_taxonomy_id === rel.term_taxonomy_id);
      if (!tt) return;

      if (tt.taxonomy === "product_cat") {
        const existing = productCategoryMap.get(rel.object_id) || [];
        existing.push(termId);
        productCategoryMap.set(rel.object_id, existing);
      } else if (tt.taxonomy === "product_tag") {
        const existing = productTagMap.get(rel.object_id) || [];
        existing.push(termId);
        productTagMap.set(rel.object_id, existing);
      }
    });

    const result: WooProductWithMeta[] = [];

    for (const product of products) {
      const metaRecords = metaMap.get(product.ID) || [];
      const meta = this.parseProductMeta(metaRecords);

      const thumbnailId = meta._thumbnail_id;
      const galleryIds = meta._product_image_gallery
        ? meta._product_image_gallery.split(",").filter(Boolean)
        : [];
      const allImageIds = thumbnailId
        ? [thumbnailId, ...galleryIds]
        : galleryIds;

      const imageResults: WooProductImage[] = [];
      for (const imgId of allImageIds) {
        const imgList = imageMap.get(imgId);
        if (imgList !== undefined) {
          for (const img of imgList) {
            imageResults.push(img);
          }
        }
      }

      const categoryTermIds = productCategoryMap.get(product.ID) || [];
      const tagTermIds = productTagMap.get(product.ID) || [];

      result.push({
        ...product,
        meta,
        categories: categoryTermIds,
        tags: tagTermIds,
        images: imageResults,
        variations: [],
      });
    }

    return result;
  }

  async getProductsByIds(ids: string[]): Promise<WooProduct[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => "?").join(",");
    const [rows] = await this.pool.query(
      `SELECT * FROM ${this.table("posts")}
       WHERE post_type = 'product'
       AND ID IN (${placeholders})`,
      ids
    );
    return rows as WooProduct[];
  }

  async getProductCount(status?: string): Promise<number> {
    const query = status
      ? `SELECT COUNT(*) as count FROM ${this.table("posts")} WHERE post_type = 'product' AND post_status = ?`
      : `SELECT COUNT(*) as count FROM ${this.table("posts")} WHERE post_type = 'product'`;

    const [rows] = await this.pool.query(query, status ? [status] : []);
    return (rows as any)[0].count;
  }

  async getCategoryCount(): Promise<number> {
    const [rows] = await this.pool.query(
      `SELECT COUNT(*) as count FROM ${this.table("term_taxonomy")} WHERE taxonomy = 'product_cat'`
    );
    return (rows as any)[0].count;
  }

  async getTagCount(): Promise<number> {
    const [rows] = await this.pool.query(
      `SELECT COUNT(*) as count FROM ${this.table("term_taxonomy")} WHERE taxonomy = 'product_tag'`
    );
    return (rows as any)[0].count;
  }

  async testConnection(): Promise<boolean> {
    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      return true;
    } catch {
      return false;
    }
  }

  async getDatabaseInfo(): Promise<{
    database: string;
    productCount: number;
    categoryCount: number;
    tagCount: number;
  }> {
    const [productCount, categoryCount, tagCount] = await Promise.all([
      this.getProductCount(),
      this.getCategoryCount(),
      this.getTagCount(),
    ]);

    return {
      database: this.config.database,
      productCount,
      categoryCount,
      tagCount,
    };
  }
}

export function createWooConnector(config: WooConfig, tablePrefix: string = "wp_"): WooDatabaseConnector {
  return new WooDatabaseConnector(config, tablePrefix);
}
