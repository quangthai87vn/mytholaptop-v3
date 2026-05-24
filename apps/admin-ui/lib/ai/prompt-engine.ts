/**
 * AI Prompt Engine
 * Xây dựng system prompt và user prompt từ routing + brand + safety rules
 */

import type { BrandVoice, SafetyRule, SystemPromptTemplate } from "@/types/ai-operating";
import type { AIProduct } from "@/types/content";
import type { AIRoutingStrategy } from "./routing-engine";
import { buildBrandInstructions } from "./brand-engine";

export interface PromptContext {
  /** Sản phẩm được chọn */
  product: AIProduct;
  /** Routing strategy */
  strategy: AIRoutingStrategy;
  /** Brand voice từ DB */
  brandVoice: BrandVoice | null;
  /** Safety rules từ DB */
  safetyRules: SafetyRule[];
  /** System prompt template từ DB */
  systemPrompt?: SystemPromptTemplate;
  /** Custom user instructions (từ AI Generator UI - optional) */
  customInstructions?: string;
}

// ── Content type labels ─────────────────────────────────────────────────────────

const CONTENT_TYPE_LABELS: Record<string, string> = {
  facebook_post: "bài viết Facebook",
  seo_article: "bài viết SEO website",
  video_script: "kịch bản video",
  image_prompt: "prompt hình ảnh",
  zalo_message: "tin nhắn Zalo",
};

// ── Prompt style modifiers ──────────────────────────────────────────────────────

const PROMPT_STYLE_MODIFIERS: Record<string, string> = {
  creative: "Sáng tạo, độc đáo, không theo khuôn mẫu. Dám thử nghiệm angle mới.",
  balanced: "Cân bằng giữa sáng tạo và hiệu quả. Theo format quen thuộc nhưng có twist.",
  conservative: "An toàn, theo format chuẩn. Ưu tiên clarity và conversion.",
};

// ── Content length descriptions ────────────────────────────────────────────────

const LENGTH_MAP: Record<string, string> = {
  short: "150-250 từ",
  medium: "300-500 từ",
  long: "800-1200 từ",
};

// ── Safety rules text ──────────────────────────────────────────────────────────

function buildSafetySection(rules: SafetyRule[]): string {
  if (!rules || rules.length === 0) {
    return "NỘI DUNG CẦN TUÂN THỦ:\n- Không bịa đặt thông tin sản phẩm\n- Không so sánh với đối thủ cụ thể\n- Không cam kết giá nếu chưa xác nhận\n- Nội dung phù hợp với người Việt Nam";
  }

  const activeRules = rules.filter((r) => r.is_active !== false);
  if (activeRules.length === 0) return "";

  return (
    "NỘI DUNG CẦN TUÂN THỦ:\n" +
    activeRules
      .map((r, i) => `${i + 1}. ${r.rule_text || ""}`)
      .filter(Boolean)
      .join("\n")
  );
}

// ── Product context ───────────────────────────────────────────────────────────

function buildProductContext(product: AIProduct): string {
  const parts: string[] = [];

  parts.push(`Tên sản phẩm: ${product.name}`);
  if (product.sku) parts.push(`SKU: ${product.sku}`);
  if (product.price) {
    parts.push(
      `Giá: ${new Intl.NumberFormat("vi-VN").format(product.price)} VND`
    );
  }
  if (product.description) parts.push(`Mô tả: ${product.description}`);
  if (product.category) parts.push(`Danh mục: ${product.category}`);
  if (product.brand) parts.push(`Thương hiệu: ${product.brand}`);
  if (product.tags?.length) parts.push(`Tags: ${product.tags.join(", ")}`);

  if (product.specs?.length) {
    parts.push(`\nThông số nổi bật:\n${product.specs.map((s) => `- ${s}`).join("\n")}`);
  }

  if (product.stock !== undefined) {
    const stockLabel =
      product.stockStatus === "in_stock"
        ? `Còn hàng (${product.stock})`
        : product.stockStatus === "out_of_stock"
        ? "Hết hàng"
        : "Tình trạng không rõ";
    parts.push(`Tình trạng kho: ${stockLabel}`);
  }

  return parts.join("\n");
}

// ── Content type specific instructions ─────────────────────────────────────────

function buildContentInstructions(
  contentType: string,
  strategy: AIRoutingStrategy
): string {
  const length = LENGTH_MAP[strategy.contentLength] || "300-500 từ";
  const style = PROMPT_STYLE_MODIFIERS[strategy.promptStyle] || "";

  const templates: Record<string, string> = {
    facebook_post: `YÊU CẦU:
- Viết ${CONTENT_TYPE_LABELS["facebook_post"]}
- Độ dài: ${length}
- Hook mạnh trong 3 giây đầu (gây tò mò hoặc shock)
- Body content có value, không spam
- ${strategy.generateHashtags ? "Kèm 5-10 hashtag phù hợp" : "Không dùng hashtag"}
- ${strategy.generateSEO ? "Tối ưu từ khóa tự nhiên" : ""}
- CTA: kết thúc bằng lời kêu gọi hành động rõ ràng
- ${style}`,

    seo_article: `YÊU CẦU:
- Viết ${CONTENT_TYPE_LABELS["seo_article"]}
- Độ dài: ${length}
- Title hấp dẫn, chứa từ khóa chính
- Meta description: 150-160 ký tự
- Cấu trúc H2/H3 rõ ràng, có danh sách
- Nội dung chuyên sâu, có value cho người đọc
- Tối ưu SEO tự nhiên (không keyword stuffing)
- ${strategy.extractHooks ? "Có hook, section nổi bật" : ""}
- ${style}`,

    video_script: `YÊU CẦU:
- Viết ${CONTENT_TYPE_LABELS["video_script"]}
- Độ dài: ${length}
- Hook gây tò mò trong 3 giây đầu
- Body có flow rõ ràng: mở đầu → giới thiệu → highlight → CTA
- Gợi ý hình ảnh/video cần quay
- CTA cuối video rõ ràng
- ${style}`,

    image_prompt: `YÊU CẦU:
- Viết ${CONTENT_TYPE_LABELS["image_prompt"]}
- Mô tả chủ thể rõ ràng, chi tiết
- Bối cảnh/background phù hợp
- Phong cách hình ảnh: ${style}
- Ánh sáng, góc chụp cụ thể
- Có negative prompt để loại trừ những gì không muốn`,

    zalo_message: `YÊU CẘU:
- Viết ${CONTENT_TYPE_LABELS["zalo_message"]}
- Ngắn gọn, súc tích (${length})
- Giọng văn thân thiện, gần gũi
- CTA rõ ràng
- ${style}`,
  };

  return templates[contentType] || templates.facebook_post;
}

// ── Main builder functions ──────────────────────────────────────────────────────

/**
 * Xây dựng system prompt hoàn chỉnh
 */
export function buildSystemPrompt(ctx: PromptContext): string {
  const { brandVoice, safetyRules, strategy } = ctx;
  const brand = buildBrandInstructions(brandVoice, strategy);
  const safety = buildSafetySection(safetyRules);

  // Priority: 1. custom system prompt from DB, 2. build from components
  if (ctx.systemPrompt?.prompt_text) {
    return ctx.systemPrompt.prompt_text;
  }

  const parts: string[] = [];

  // Role definition
  parts.push(
    "Bạn là chuyên gia content marketing cho cửa hàng laptop Mỹ Tho Laptop.\n" +
    "Nhiệm vụ: Tạo nội dung marketing chất lượng cao, phù hợp thị trường Việt Nam."
  );

  // Brand voice
  parts.push(`\n${brand.instructionText}`);

  // Strategy
  parts.push(`\nPHONG CÁCH: ${PROMPT_STYLE_MODIFIERS[strategy.promptStyle] || "Cân bằng"}`);

  // Safety
  if (safety) {
    parts.push(`\n${safety}`);
  }

  // Custom instructions
  if (ctx.customInstructions) {
    parts.push(`\nLƯU Ý THÊM:\n${ctx.customInstructions}`);
  }

  return parts.filter(Boolean).join("\n\n");
}

/**
 * Xây dựng user prompt hoàn chỉnh
 */
export function buildUserPrompt(
  contentType: string,
  ctx: PromptContext
): string {
  const productContext = buildProductContext(ctx.product);
  const contentInstructions = buildContentInstructions(contentType, ctx.strategy);

  return `${productContext}

---
${contentInstructions}`;
}

/**
 * Xây dựng messages array cho AI provider chat
 */
export function buildChatMessages(
  contentType: string,
  ctx: PromptContext
): Array<{ role: "system" | "user"; content: string }> {
  const systemPrompt = buildSystemPrompt(ctx);
  const userPrompt = buildUserPrompt(contentType, ctx);

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}

/**
 * Extract variants from AI response
 */
export function parseAIResponse(
  content: string
): {
  content: string;
  hooks: string[];
  cta: string;
  hashtags: string[];
  seoKeywords: string[];
} {
  const result = {
    content,
    hooks: [] as string[],
    cta: "",
    hashtags: [] as string[],
    seoKeywords: [] as string[],
  };

  // Extract CTA
  const ctaMatch = content.match(
    /(?:cta|call to action|lời kêu gọi)[:\s]*(.*)/i
  );
  if (ctaMatch) result.cta = ctaMatch[1].trim();

  // Extract hashtags
  const hashtagMatch = content.match(/(?:hashtag)[:\s]*([#\w\s,]+)/i);
  if (hashtagMatch) {
    result.hashtags = hashtagMatch[1]
      .split(/[\s,#]+/)
      .filter((h) => h.length > 1)
      .map((h) => (h.startsWith("#") ? h : `#${h}`));
  }

  // Extract SEO keywords
  const seoMatch = content.match(
    /(?:seo|keywords|từ khóa)[:\s]*([\s\S]*?)(?=\n\n|$)/i
  );
  if (seoMatch) {
    result.seoKeywords = seoMatch[1]
      .split(/[,;\n]/)
      .map((k) => k.trim())
      .filter((k) => k.length > 1);
  }

  return result;
}
