/**
 * Data Transformer - WooCommerce to Medusa
 *
 * Chuyển đổi dữ liệu từ WooCommerce format sang Medusa format.
 * Xử lý: products, categories, tags, images, variants, attributes.
 */

import type {
  WooProductWithMeta,
  WooProductImage,
  WooProductVariation,
  WooProductMetaParsed,
} from "./woo-types";

import type {
  MedusaProductForMigration,
  MedusaVariantForMigration,
} from "./medusa-migration-types";

export class DataTransformer {
  private defaultCurrency: string = "usd";

  setDefaultCurrency(currency: string): void {
    this.defaultCurrency = currency;
  }

  transformCategoryName(name: string): string {
    return name.trim();
  }

  transformProductTitle(title: string): string {
    return title.trim() || "Untitled Product";
  }

  transformDescription(content: string): string {
    if (!content) return "";

    let desc = content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    desc = desc.length > 10000 ? desc.substring(0, 10000) : desc;

    return desc;
  }

  transformHandle(title: string, sourceId?: string): string {
    let handle = title
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a")
      .replace(/[èéẹẻẽêềếệểễ]/g, "e")
      .replace(/[ìíịỉĩ]/g, "i")
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o")
      .replace(/[ùúụủũưừứựửữ]/g, "u")
      .replace(/[ỳýỵỷỹ]/g, "y")
      .replace(/[đ]/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!handle) {
      handle = sourceId ? `product-${sourceId}` : `product-${Date.now()}`;
    }

    return handle;
  }

  transformPrice(price: string | undefined): number {
    if (!price || price === "") return 0;
    const num = parseFloat(price);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  }

  transformStock(stock: string | undefined): number {
    if (!stock || stock === "") return 0;
    const num = parseInt(stock, 10);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Tính inventory_quantity từ WooCommerce stock data.
   * Ưu tiên stock_quantity (khi _manage_stock = yes).
   * Nếu không quản lý tồn kho (_manage_stock != yes), dùng stock_status:
   *   - instock / onbackorder -> coi là có hàng (999)
   *   - outofstock           -> 0
   */
  resolveInventoryQuantity(
    meta: WooProductMetaParsed,
    defaultStockQuantity: number | null
  ): { inventory_quantity: number; manage_inventory: boolean } {
    const manageStock = meta._manage_stock === "yes";

    if (manageStock) {
      // Có bật quản lý tồn kho -> dùng stock_quantity
      const qty = this.transformStock(meta._stock);
      return { inventory_quantity: qty, manage_inventory: true };
    }

    // Không quản lý tồn kho -> dùng stock_status
    const stockStatus = meta._stock_status || "";
    if (stockStatus === "outofstock") {
      return { inventory_quantity: 0, manage_inventory: false };
    }
    // instock hoặc onbackorder -> coi là có hàng (số lớn để không báo hết)
    return { inventory_quantity: 999, manage_inventory: false };
  }

  transformWeight(weight: string | undefined): number | undefined {
    if (!weight || weight === "") return undefined;
    const num = parseFloat(weight);
    return isNaN(num) ? undefined : num;
  }

  transformImageUrl(image: WooProductImage): string {
    let url = image.guid || "";

    if (url.includes("\\")) {
      url = url.replace(/\\/g, "/");
    }

    if (!url.startsWith("http")) {
      const parts = url.split("/");
      if (parts.length > 0) {
        url = parts[parts.length - 1];
      }
    }

    return url;
  }

  transformProductStatus(wooStatus: string): "draft" | "published" {
    // WooCommerce statuses:
    //   publish  -> published (đã xuất bản, ai cũng thấy)
    //   private  -> published (chỉ admin thấy trên WP, nhưng xem là published)
    //   draft    -> draft (bản nháp)
    //   pending  -> draft (đang chờ duyệt)
    //   future   -> draft (hẹn giờ đăng)
    const publishedStatuses = ["publish", "private"];
    const result: "draft" | "published" = publishedStatuses.includes(wooStatus) ? "published" : "draft";
    if (wooStatus !== "publish" && wooStatus !== "private" && wooStatus !== "draft") {
      console.log(`[DataTransformer] Woo status "${wooStatus}" -> Medusa status "${result}"`);
    }
    return result;
  }

  parseProductAttributes(
    attributesJson: string | undefined
  ): Array<{ title: string; values: string[] }> {
    if (!attributesJson) return [];

    try {
      const parsed = JSON.parse(attributesJson);
      if (!parsed || typeof parsed !== "object") return [];

      const attrArray: Array<{ title: string; values: string[] }> = Object.values(parsed).map((attr: any) => {
        const values = attr.is_taxonomy
          ? (attr.value as string).split("|").filter(Boolean)
          : (attr.value as string[]).filter(Boolean);

        return {
          title: attr.name || attr.legacy_name || "Attribute",
          values: values.map((v: string) => v.trim()),
        };
      }).filter((a) => a.values.length > 0);

      return attrArray;
    } catch {
      return [];
    }
  }

  transformWooProductToMedusa(
    woo: WooProductWithMeta,
    categoryIds: string[],
    tagIds: { id: string; value: string }[],
    newTagIds: { id?: string; value: string }[],
    currency: string = "usd"
  ): MedusaProductForMigration {
    const meta = woo.meta;

    const regularPrice = this.transformPrice(meta._regular_price);
    const salePrice = this.transformPrice(meta._sale_price);
    const price = salePrice > 0 && salePrice < regularPrice ? salePrice : regularPrice;

    const thumbnail = woo.images.length > 0
      ? this.transformImageUrl(woo.images[0])
      : undefined;

    const images = woo.images
      .slice(1)
      .map((img) => ({ url: this.transformImageUrl(img) }));

    const attributes = this.parseProductAttributes(meta._product_attributes);

    const product: MedusaProductForMigration = {
      title: this.transformProductTitle(woo.post_title),
      subtitle: undefined,
      description: this.transformDescription(woo.post_content),
      handle: this.transformHandle(woo.post_title, woo.ID),
      status: this.transformProductStatus(woo.post_status),
      is_giftcard: false,
      weight: this.transformWeight(meta._weight),
      length: this.transformWeight(meta._length),
      width: this.transformWeight(meta._width),
      height: this.transformWeight(meta._height),
      thumbnail,
      categories: categoryIds.map((id) => ({ id })),
      tags: [...newTagIds],
      variants: [],
      images,
      options: attributes.length > 0 ? attributes : undefined,
      metadata: {
        wooId: woo.ID,
        sourceType: "woocommerce",
        originalSlug: woo.post_name,
        originalGuid: woo.guid,
        originalPrice: regularPrice,
        originalSalePrice: salePrice,
        originalStock: meta._stock,
        originalStockStatus: meta._stock_status,
        originalFeatured: meta._featured,
        originalVisibility: meta._visibility,
        originalTotalSales: meta._total_sales,
        originalRatingCount: meta._wc_rating_counts,
        originalRatingAverage: meta._wc_average_rating,
        originalCreatedAt: woo.post_date,
        originalModifiedAt: woo.post_modified,
        originalPostParent: woo.post_parent || undefined,
      },
    };

    if (woo.variations.length > 0) {
      const mainVariant = this.transformVariation(
        woo.variations[0],
        woo.meta,
        attributes,
        price,
        currency
      );
      mainVariant.title = product.title;
      product.variants.push(mainVariant);
    } else {
      const stockInfo = this.resolveInventoryQuantity(meta, null);
      const defaultVariant: MedusaVariantForMigration = {
        title: `${product.title} - Default`,
        sku: meta._sku || undefined,
        price,
        original_price: regularPrice,
        inventory_quantity: stockInfo.inventory_quantity,
        allow_backorder: meta._backorders === "yes",
        manage_inventory: stockInfo.manage_inventory,
        weight: product.weight,
        length: product.length,
        width: product.width,
        height: product.height,
        metadata: {
          isDefaultVariant: true,
          originalStockStatus: meta._stock_status,
        },
      };
      product.variants.push(defaultVariant);
    }

    return product;
  }

  transformVariation(
    variation: WooProductVariation,
    parentMeta: WooProductMetaParsed,
    attributes: Array<{ title: string; values: string[] }>,
    basePrice: number,
    currency: string = "usd"
  ): MedusaVariantForMigration {
    const stockInfo = this.resolveInventoryQuantity(parentMeta, null);
    const defaultVariant: MedusaVariantForMigration = {
      title: variation.post_title || "Variation",
      sku: undefined,
      price: basePrice,
      inventory_quantity: stockInfo.inventory_quantity,
      allow_backorder: parentMeta._backorders === "yes",
      manage_inventory: stockInfo.manage_inventory,
      metadata: {
        variationId: variation.ID,
        originalTitle: variation.post_title,
      },
    };

    return defaultVariant;
  }

  extractAttributeValues(attributesJson: string | undefined): Record<string, string> {
    if (!attributesJson) return {};

    try {
      const parsed = JSON.parse(attributesJson);
      const result: Record<string, string> = {};

      Object.values(parsed).forEach((attr: any) => {
        if (attr.name) {
          const value = attr.is_taxonomy
            ? (attr.value as string).split("|")[0]?.trim()
            : (attr.value as string[])[0]?.trim() || "";
          if (value) result[attr.name] = value;
        }
      });

      return result;
    } catch {
      return {};
    }
  }

  groupProductsByCategory(
    products: WooProductWithMeta[]
  ): Map<string, WooProductWithMeta[]> {
    const groups = new Map<string, WooProductWithMeta[]>();

    products.forEach((product) => {
      product.categories.forEach((catId) => {
        const existing = groups.get(catId) || [];
        if (!existing.includes(product)) {
          existing.push(product);
        }
        groups.set(catId, existing);
      });
    });

    return groups;
  }

  deduplicateCategories(
    categories: Array<{ termId: string; name: string; slug: string; parent: string }>
  ): Array<{ termId: string; name: string; slug: string; parent: string }> {
    const seen = new Map<string, typeof categories[0]>();

    categories.forEach((cat) => {
      if (!seen.has(cat.termId)) {
        seen.set(cat.termId, cat);
      }
    });

    return Array.from(seen.values());
  }

  generateCategoryHierarchy(
    categories: Array<{ termId: string; name: string; slug: string; parent: string }>
  ): Map<string | number, string | number> {
    const slugToId = new Map<string | number, string | number>();

    categories.forEach((cat) => {
      slugToId.set(cat.slug, cat.termId);
      slugToId.set(cat.name.toLowerCase(), cat.termId);
    });

    return slugToId;
  }

  validateProductForMigration(product: MedusaProductForMigration): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!product.title || product.title.trim() === "") {
      errors.push("Product title is empty");
    }

    if (!product.handle || product.handle.trim() === "") {
      errors.push("Product handle is empty");
    }

    if (product.handle && !/^[a-z0-9-]+$/.test(product.handle)) {
      errors.push(`Invalid handle format: ${product.handle}`);
    }

    if (product.variants.length === 0) {
      errors.push("Product has no variants");
    }

    product.variants.forEach((variant, index) => {
      if (variant.price < 0) {
        errors.push(`Variant ${index + 1}: price cannot be negative`);
      }

      if (variant.sku && variant.sku.length > 255) {
        errors.push(`Variant ${index + 1}: SKU too long`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const dataTransformer = new DataTransformer();
