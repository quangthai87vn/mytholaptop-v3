/**
 * AI Prompt Composer
 *
 * Xây dựng final prompt theo cấu trúc chuẩn:
 * [SYSTEM PROMPT]
 * [BRAND VOICE]
 * [PROMPT RULES]
 * [SAFETY RULES]
 * [PRODUCT CONTEXT]
 * [MARKETING GOAL]
 * [TASK INSTRUCTION]
 *
 * Tách prompt-engine.ts (backend) — đây là phiên bản cho cả frontend preview lẫn backend.
 */

import type { AIProduct } from "@/types/content";
import type { ContentPlatform } from "@/types/content";
import type {
  StudioContentType,
  MarketingGoal,
  FunnelStage,
} from "@/store/ai-studio-store";
import type {
  BrandVoice,
  SafetyRule,
  SystemPromptTemplate,
} from "@/types/ai-operating";
import { buildStrategy, type AIRoutingStrategy } from "./routing-engine";
import { buildProductContext, renderProductMarkdown, renderProductPlainText } from "./product-context";

// ── Content type labels ─────────────────────────────────────────────────────────

const CONTENT_TYPE_LABELS: Record<StudioContentType, string> = {
  facebook_post: "bài viết Facebook",
  seo_article: "bài viết SEO website",
  video_script: "kịch bản video marketing",
  image_prompt: "prompt hình ảnh cho AI tạo ảnh",
  zalo_message: "tin nhắn Zalo/ZNS",
  product_description: "mô tả sản phẩm",
  email_marketing: "email marketing",
};

const CONTENT_TYPE_INSTRUCTIONS: Record<StudioContentType, string> = {
  facebook_post: `Viết bài viết Facebook hấp dẫn.
- Hook ngay 3 giây đầu (gây tò mò hoặc shock nhẹ)
- Body có cấu trúc: Vấn đề → Giải pháp → Sản phẩm
- Kết thúc bằng CTA rõ ràng
- Thêm emoji phù hợp, tối đa 3 emoji mỗi đoạn
- 150-300 từ`,
  seo_article: `Viết bài viết SEO chuyên sâu.
- Title chứa keyword chính, dưới 60 ký tự
- Meta description dưới 155 ký tự, có CTA
- Cấu trúc: Mở bài (giới thiệu vấn đề) → Thân bài (2-3 mục con) → Kết luận (tổng hợp + CTA)
- Từ khóa LSI tự nhiên trong bài
- Heading H2, H3 rõ ràng
- 800-1500 từ`,
  video_script: `Viết kịch bản video ngắn 60-90 giây.
- Hook: 5 giây đầu gây tò mò
- Cấu trúc: Hook → Giới thiệu → Demo → Proof → CTA
- Mỗi scene ghi rõ thời gian
- Có lời thoại chính và voiceover
- Kết thúc: "Follow để xem thêm" + link sản phẩm`,
  image_prompt: `Viết prompt chi tiết cho AI tạo hình ảnh sản phẩm.
- Mô tả chủ thể, bối cảnh, ánh sáng, góc chụp, phong cách
- Thêm negative prompt nếu cần
- Tỷ lệ khung hình phù hợp
- Style: professional product photography, soft lighting, clean background`,
  zalo_message: `Viết tin nhắn Zalo/ZNS ngắn gọn.
- Dưới 160 ký tự (1 SMS)
- Hook là tên khách hàng hoặc ưu đãi
- Body: giới thiệu ngắn sản phẩm + lợi ích
- CTA: liên kết hoặc reply để nhận tư vấn`,
  product_description: `Viết mô tả sản phẩm chi tiết.
- Tiêu đề hấp dẫn chứa từ khóa chính
- Điểm nổi bật (3-5 bullet points)
- Thông số kỹ thuật
- Ưu điểm so với đối thủ
- Call-to-action rõ ràng
- 200-500 từ`,
  email_marketing: `Viết email marketing chuyên nghiệp.
- Subject line hấp dẫn, dưới 50 ký tự
- Preview text thú vị
- Body: chào hỏi → giá trị → ưu đãi → CTA
- CTA button rõ ràng
- Footer với link hủy đăng ký
- 200-400 từ`,
};

// ── Platform labels ─────────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<ContentPlatform, string> = {
  facebook: "Facebook",
  website: "Website",
  tiktok: "TikTok",
  zalo: "Zalo",
  youtube: "YouTube",
};

// ── Funnel stage labels ────────────────────────────────────────────────────────

const FUNNEL_LABELS: Record<FunnelStage, string> = {
  awareness: "Nhận thức",
  consideration: "Cân nhắc",
  conversion: "Mua hàng",
};

// ── Goal labels ─────────────────────────────────────────────────────────────────

const GOAL_LABELS: Record<MarketingGoal, string> = {
  conversion: "Chuyển đổi / Bán hàng",
  viral: "Lan truyền / Viral",
  branding: "Xây dựng thương hiệu",
  seo: "SEO / Tìm kiếm",
};

// ── CTA style ───────────────────────────────────────────────────────────────────

const CTA_STYLES: Record<string, string> = {
  urgent: "Khuyến mãi có thời hạn — thúc đẩy hành động ngay.",
  friendly: "Gợi ý nhẹ nhàng, mời tư vấn miễn phí.",
  professional: "Liên hệ đội ngũ tư vấn chuyên nghiệp.",
  soft: "Follow, share, hoặc comment để biết thêm.",
};

// ── Safety rules ────────────────────────────────────────────────────────────────

function buildSafetySection(rules: SafetyRule[]): string {
  const active = (rules || []).filter((r) => r.is_active !== false);
  if (active.length === 0) {
    return `[AN TOÀN NỘI DUNG]
- Không bịa đặt thông tin sản phẩm
- Không so sánh với đối thủ cụ thể
- Không cam kết giá nếu chưa xác nhận
- Nội dung phù hợp với người Việt Nam
- Không vi phạm chính sách quảng cáo Facebook/Google`;
  }
  return (
    "[AN TOÀN NỘI DUNG]\n" +
    active
      .map((r, i) => `${i + 1}. ${r.rule_text || ""}`)
      .filter(Boolean)
      .join("\n")
  );
}

// ── Brand voice section ────────────────────────────────────────────────────────

function buildBrandSection(voice: BrandVoice | null): string {
  if (!voice) return "";

  const lines: string[] = [];
  lines.push("[PHONG CÁCH THƯƠNG HIỆU]");
  if (voice.name) lines.push(`Tên: ${voice.name}`);
  if (voice.description) lines.push(`Mô tả: ${voice.description}`);
  if (voice.target_audience) lines.push(`Đối tượng: ${voice.target_audience}`);
  if (voice.tone_instruction) lines.push(`Giọng điệu: ${voice.tone_instruction}`);
  if (voice.content_template) lines.push(`Template: ${voice.content_template}`);
  if (voice.cta_style) lines.push(`Phong cách CTA: ${voice.cta_style}`);

  return lines.join("\n") + "\n";
}

// ── System prompt section ──────────────────────────────────────────────────────

function buildSystemPromptSection(sp: SystemPromptTemplate | null | undefined): string {
  if (!sp || !sp.prompt_text) return "";
  return `[HƯỚNG DẪN HỆ THỐNG]\n${sp.prompt_text}\n`;
}

// ── Strategy section ───────────────────────────────────────────────────────────

function buildStrategySection(strategy: AIRoutingStrategy): string {
  const lines: string[] = [];

  lines.push("[YÊU CẦU VỀ NỘI DUNG]");
  lines.push(`- Phong cách: ${strategy.promptStyle}`);
  lines.push(`- Số biến thể: ${strategy.variantCount}`);
  lines.push(`- Độ dài: ${strategy.contentLength}`);
  lines.push(`- CTA style: ${strategy.suggestedCTAStyle}`);

  if (strategy.extractHooks) {
    lines.push("- Trích xuất 2-3 hook alternative");
  }
  if (strategy.generateHashtags) {
    lines.push("- Gợi ý 5-10 hashtag phù hợp");
  }
  if (strategy.generateSEO) {
    lines.push("- Kèm SEO title, meta description, keywords");
  }

  return lines.join("\n") + "\n";
}

// ── Marketing goal section ─────────────────────────────────────────────────────

function buildMarketingSection(
  goal: MarketingGoal,
  funnel: FunnelStage,
  platforms: ContentPlatform[]
): string {
  const lines: string[] = [];

  lines.push("[MỤC TIÊU MARKETING]");
  lines.push(`- Mục tiêu: ${GOAL_LABELS[goal]}`);
  lines.push(`- Giai đoạn: ${FUNNEL_LABELS[funnel]}`);
  lines.push(`- Nền tảng: ${platforms.map((p) => PLATFORM_LABELS[p]).join(", ")}`);

  // Funnel-specific guidance
  if (funnel === "awareness") {
    lines.push("- Tập trung vào pain point chung, giáo dục");
    lines.push("- Không push bán hàng ngay");
    lines.push("- CTA: follow, share, tìm hiểu thêm");
  }
  if (funnel === "consideration") {
    lines.push("- Đi sâu vào tính năng, lợi ích, so sánh");
    lines.push("- Proof points: đánh giá, testimonial, spec");
    lines.push("- CTA: tư vấn miễn phí, demo");
  }
  if (funnel === "conversion") {
    lines.push("- CTA mạnh, urgency rõ ràng");
    lines.push("- Highlight ưu đãi, bảo hành, khuyến mãi");
    lines.push("- Giảm rào cản mua hàng");
  }

  return lines.join("\n") + "\n";
}

// ── Main composer ────────────────────────────────────────────────────────────────

export interface PromptComposerInput {
  product: AIProduct;
  contentType: StudioContentType;
  platforms: ContentPlatform[];
  marketingGoal: MarketingGoal;
  funnelStage: FunnelStage;
  brandVoice: BrandVoice | null;
  safetyRules: SafetyRule[];
  systemPrompt: SystemPromptTemplate | null;
  strategy: AIRoutingStrategy;
  customInstructions?: string;
  format?: "markdown" | "plain";
}

export interface ComposedPrompt {
  systemPrompt: string;
  userPrompt: string;
  fullPrompt: string;
  estimatedTokens: number;
  tokenBreakdown: {
    system: number;
    brand: number;
    safety: number;
    product: number;
    marketing: number;
    task: number;
  };
}

/**
 * Compose final prompt from all parts.
 * Returns structured parts + estimated token count.
 */
export function composePrompt(input: PromptComposerInput): ComposedPrompt {
  const {
    product,
    contentType,
    platforms,
    marketingGoal,
    funnelStage,
    brandVoice,
    safetyRules,
    systemPrompt,
    strategy,
    customInstructions,
    format = "markdown",
  } = input;

  // Build product context
  const productCtx = buildProductContext(product);
  const productText =
    format === "markdown"
      ? renderProductMarkdown(productCtx)
      : renderProductPlainText(productCtx);

  // Build all sections
  const systemSections: string[] = [];
  const userSections: string[] = [];

  // 1. System prompt (highest priority)
  const sysSection = buildSystemPromptSection(systemPrompt);
  if (sysSection) systemSections.push(sysSection);

  // 2. Brand voice
  const brandSection = buildBrandSection(brandVoice);
  if (brandSection) systemSections.push(brandSection);

  // 3. Strategy
  systemSections.push(buildStrategySection(strategy));

  // 4. Safety rules
  systemSections.push(buildSafetySection(safetyRules));

  // 5. Marketing goal
  systemSections.push(
    buildMarketingSection(marketingGoal, funnelStage, platforms)
  );

  // ── User prompt sections ─────────────────────────────────────────────────

  // Product context
  userSections.push("## SẢN PHẨM CẦN QUẢNG CÁO");
  userSections.push(productText);

  // Task instruction
  userSections.push("## NHIỆM VỤ");
  userSections.push(CONTENT_TYPE_INSTRUCTIONS[contentType] || "Tạo nội dung phù hợp.");

  // Custom instructions
  if (customInstructions?.trim()) {
    userSections.push("\n## HƯỚNG DẪN BỔ SUNG");
    userSections.push(customInstructions.trim());
  }

  // CTA style for this task
  const ctaStyle = CTA_STYLES[strategy.suggestedCTAStyle];
  userSections.push(`\n## YÊU CẦU CTA\n${ctaStyle}`);

  // Output format
  if (strategy.extractHooks || strategy.generateHashtags) {
    userSections.push("\n## ĐỊNH DẠNG OUTPUT");
    const outputParts: string[] = ["**Nội dung chính:**\n[...]\n"];
    if (strategy.extractHooks) {
      outputParts.push("**Hook alternatives:**\n1. [...]\n2. [...]\n3. [...]\n");
    }
    if (strategy.generateHashtags) {
      outputParts.push("**Hashtags:**\n[tag1] [tag2] [tag3] [...]\n");
    }
    if (strategy.generateSEO) {
      outputParts.push("**SEO Title:**\n[...]\n");
      outputParts.push("**Meta Description:**\n[...]\n");
    }
    userSections.push(outputParts.join("\n"));
  }

  // Combine
  const systemPromptText = systemSections.join("\n");
  const userPromptText = userSections.join("\n\n");
  const fullPromptText = `${systemPromptText}\n${userPromptText}`;

  // Estimate tokens (rough: 1 token ≈ 4 chars for Vietnamese)
  const tokenBreakdown = {
    system: Math.ceil(systemPromptText.length / 4),
    brand: Math.ceil(brandSection.length / 4),
    safety: Math.ceil(buildSafetySection(safetyRules).length / 4),
    product: Math.ceil(productText.length / 4),
    marketing: Math.ceil(buildMarketingSection(marketingGoal, funnelStage, platforms).length / 4),
    task: Math.ceil(CONTENT_TYPE_INSTRUCTIONS[contentType].length / 4),
  };
  const estimatedTokens = Object.values(tokenBreakdown).reduce((a, b) => a + b, 0);

  return {
    systemPrompt: systemPromptText,
    userPrompt: userPromptText,
    fullPrompt: fullPromptText,
    estimatedTokens,
    tokenBreakdown,
  };
}

/**
 * Compose a simple one-shot prompt string (for display/preview).
 */
export function composeSimplePrompt(input: PromptComposerInput): string {
  const { fullPrompt } = composePrompt(input);
  return fullPrompt;
}
