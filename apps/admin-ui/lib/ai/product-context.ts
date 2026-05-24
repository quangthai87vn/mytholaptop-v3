/**
 * Product Context Engine
 *
 * Trích xuất và chuẩn hóa thông tin sản phẩm thành ngữ cảnh
 * dễ đọc cho AI prompt.
 *
 * Normalize từ nhiều nguồn: Medusa product, AIProduct type, mock data.
 */

import type { AIProduct } from "@/types/content";

// ── Stock status labels ────────────────────────────────────────────────────────

const STOCK_LABELS: Record<string, string> = {
  in_stock: "Còn hàng",
  out_of_stock: "Hết hàng",
  backorder: "Đặt trước",
  unknown: "Không rõ",
};

const STOCK_BADGE: Record<string, string> = {
  in_stock: "✅ Còn hàng",
  out_of_stock: "❌ Hết hàng",
  backorder: "⏳ Đặt trước",
  unknown: "❓ Không rõ",
};

// ── Price formatting ────────────────────────────────────────────────────────────

function formatPrice(price: number, currency = "VND"): string {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN").format(price) + " đ";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(price);
}

// ── Core extraction ─────────────────────────────────────────────────────────────

export interface ProductContext {
  // Basic info
  id: string;
  name: string;
  sku: string;
  brand: string;
  category: string;

  // Price
  price: string;
  compareAtPrice?: string;
  hasDiscount: boolean;
  discountPercent?: number;

  // Stock
  stockStatus: string;
  stockBadge: string;
  stockCount?: number;

  // Description
  shortDescription: string;
  fullDescription: string;

  // Media
  imageUrl: string;
  imageUrls: string[];

  // Tags & highlights
  tags: string[];
  specs: string[];
  highlights: string[];

  // SEO
  seoTitle?: string;
  seoDescription?: string;

  // Display helpers
  priceDisplay: string;
  titleDisplay: string;
  subtitleDisplay: string;
}

/**
 * Build a rich ProductContext from an AIProduct.
 * Safe to call with partial data — always returns valid object.
 */
export function buildProductContext(product: AIProduct): ProductContext {
  const {
    name = "",
    sku = "",
    brand = "",
    category = "",
    price = 0,
    compareAtPrice,
    description = "",
    shortDescription,
    tags = [],
    specs = [],
    image = "",
    stock = 0,
    stockStatus = "unknown",
    status = "",
    metadata = {},
    seoTitle,
    seoDescription,
  } = product;

  // Price formatting
  const priceStr = price > 0 ? formatPrice(price) : "Liên hệ";
  const compareAtStr = compareAtPrice && compareAtPrice > price
    ? formatPrice(compareAtPrice)
    : undefined;

  const hasDiscount = !!(compareAtPrice && compareAtPrice > price);
  const discountPercent = hasDiscount && compareAtPrice
    ? Math.round((1 - price / compareAtPrice) * 100)
    : undefined;

  // Short description
  const short = shortDescription
    || metadata?.short_description
    || description.slice(0, 200)
    || `Laptop ${name} - Lựa chọn tối ưu cho nhu cầu của bạn.`;

  // Full description
  const fullDesc = description || metadata?.description || short;

  // Image URLs
  const imageUrls: string[] = [];
  if (image) imageUrls.push(image);
  if (metadata?.images) {
    try {
      const imgs = JSON.parse(metadata.images as string);
      if (Array.isArray(imgs)) imageUrls.push(...imgs);
    } catch {
      // ignore parse errors
    }
  }

  // Highlights — extract from specs or tags
  const highlights = buildHighlights({
    name,
    brand,
    category,
    specs,
    tags,
    metadata,
  });

  return {
    id: product.id,
    name,
    sku,
    brand,
    category,
    price: priceStr,
    compareAtPrice: compareAtStr,
    hasDiscount,
    discountPercent,
    stockStatus: STOCK_LABELS[stockStatus] || STOCK_LABELS.unknown,
    stockBadge: STOCK_BADGE[stockStatus] || STOCK_BADGE.unknown,
    stockCount: stock,
    shortDescription: short,
    fullDescription: fullDesc,
    imageUrl: imageUrls[0] || "",
    imageUrls,
    tags,
    specs,
    highlights,
    seoTitle: seoTitle || metadata?.seo_title || `${name} - Mua tại Mỹ Tho Laptop`,
    seoDescription:
      seoDescription ||
      metadata?.seo_description ||
      `${name} chính hãng. Giá tốt nhất, bảo hành uy tín. Liên hệ ngay!`,
    priceDisplay: hasDiscount
      ? `${priceStr} (giảm ${discountPercent}%)`
      : priceStr,
    titleDisplay: name,
    subtitleDisplay: brand ? `${brand} · ${category}` : category,
  };
}

// ── Highlights builder ─────────────────────────────────────────────────────────

interface HighlightsInput {
  name: string;
  brand: string;
  category: string;
  specs: string[];
  tags: string[];
  metadata?: Record<string, string>;
}

function buildHighlights(input: HighlightsInput): string[] {
  const { name, brand, tags, metadata } = input;
  const highlights: string[] = [];

  // Brand badge
  if (brand) {
    highlights.push(`🏷️ Thương hiệu: ${brand}`);
  }

  // Stock-aware highlights
  if (tags.length > 0) {
    const topTags = tags.slice(0, 5);
    highlights.push(`🏷️ Đặc điểm: ${topTags.join(", ")}`);
  }

  // Key specs from metadata
  const keyFields = ["cpu", "ram", "storage", "gpu", "screen", "battery"];
  const specParts: string[] = [];
  for (const field of keyFields) {
    const value = metadata?.[field] || metadata?.[`spec_${field}`];
    if (value) {
      specParts.push(`${field.toUpperCase()}: ${value}`);
    }
  }
  if (specParts.length > 0) {
    highlights.push(`⚙️ Cấu hình: ${specParts.join(" | ")}`);
  }

  return highlights;
}

// ── Markdown table for AI prompts ──────────────────────────────────────────────

/**
 * Render product as a markdown table for AI consumption.
 * This is the cleanest format for LLMs to understand structured product data.
 */
export function renderProductMarkdown(ctx: ProductContext): string {
  const lines: string[] = [];

  lines.push("## SẢN PHẨM");
  lines.push("");
  lines.push("| Thuộc tính | Giá trị |");
  lines.push("|---|---|");
  lines.push(`| Tên | ${ctx.name} |`);
  if (ctx.sku) lines.push(`| SKU | ${ctx.sku} |`);
  if (ctx.brand) lines.push(`| Thương hiệu | ${ctx.brand} |`);
  if (ctx.category) lines.push(`| Danh mục | ${ctx.category} |`);
  lines.push(`| Giá | ${ctx.priceDisplay} |`);
  lines.push(`| Tình trạng | ${ctx.stockBadge} |`);
  if (ctx.stockCount !== undefined) {
    lines.push(`| Số lượng | ${ctx.stockCount > 0 ? `${ctx.stockCount} chiếc` : "Hết hàng"} |`);
  }

  if (ctx.shortDescription) {
    lines.push("");
    lines.push("**Mô tả ngắn:**");
    lines.push(ctx.shortDescription);
  }

  if (ctx.highlights.length > 0) {
    lines.push("");
    lines.push("**Đặc điểm nổi bật:**");
    for (const h of ctx.highlights) {
      lines.push(`- ${h}`);
    }
  }

  if (ctx.specs.length > 0) {
    lines.push("");
    lines.push("**Thông số kỹ thuật:**");
    for (const spec of ctx.specs) {
      lines.push(`- ${spec}`);
    }
  }

  return lines.join("\n");
}

// ── Plain text version ────────────────────────────────────────────────────────

/**
 * Render product as plain text — for short-context prompts.
 */
export function renderProductPlainText(ctx: ProductContext): string {
  const parts: string[] = [];

  parts.push(`Sản phẩm: ${ctx.name}`);
  if (ctx.brand) parts.push(`Thương hiệu: ${ctx.brand}`);
  if (ctx.category) parts.push(`Danh mục: ${ctx.category}`);
  parts.push(`Giá: ${ctx.priceDisplay}`);
  parts.push(`Tình trạng: ${ctx.stockBadge}`);
  if (ctx.shortDescription) parts.push(`Mô tả: ${ctx.shortDescription}`);

  return parts.join("\n");
}
