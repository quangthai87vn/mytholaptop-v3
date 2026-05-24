/**
 * AI Content Generator
 * Builds prompt from product + template + tone + audience, calls AI provider
 */

import { createAIProvider } from "./providers";
import { getSettings } from "../db/settings";
import { getActiveBrandVoice } from "../db/brand-voices";
import { getTemplateById, incrementTemplateUsage } from "../db/templates";
import { createContentItem, updateContentItem } from "../db/content";
import { createGenerationLog } from "../db/logs";
import type { AIProviderType, ContentType, AISettingsOutput } from "../types";
import type { BrandVoice } from "@/types/ai-operating";

export interface GenerateContentParams {
  product: {
    id: string;
    title: string;
    description?: string;
    thumbnail?: string;
    price?: number;
    tags?: string[];
    category?: string;
  };
  contentType: ContentType;
  templateId?: number;
  template?: {
    system_prompt?: string;
    user_template?: string;
  };
  tone?: string;
  audience?: string;
  customPrompt?: string;
  createdBy?: string;
}

export interface GenerateContentResult {
  success: boolean;
  content?: string;
  contentItemId?: number;
  model?: string;
  tokens_used?: number;
  latency_ms?: number;
  error?: string;
}

// Tone mappings for different languages/styles
const TONE_INSTRUCTIONS: Record<string, string> = {
  "chuyên nghiệp":
    "Giọng văn chuyên nghiệp, trang trọng, dùng thuật ngữ kỹ thuật chính xác.",
  "thân thiện":
    "Giọng văn thân thiện, gần gũi, dễ hiểu, phù hợp mọi đối tượng.",
  "hài hước":
    "Giọng văn vui vẻ, hài hước nhẹ nhàng, có emoji phù hợp.",
  "nghiêm túc":
    "Giọng văn nghiêm túc, phân tích sâu, dựa trên số liệu.",
  "năng động":
    "Giọng văn năng động, hào hứng, truyền cảm hứng, có CTA mạnh.",
  "vui nhộn":
    "Giọng văn vui nhộn, giải trí, phù hợp TikTok/Shorts.",
  "vibrant":
    "Giọng văn sáng tạo, đầy màu sắc, mô tả sinh động.",
  "minimalist":
    "Giọng văn tối giản, ngắn gọn, đi thẳng vào vấn đề.",
  "dark moody":
    "Giọng văn đậm chất điện ảnh, mystery, dramatic lighting feel.",
  "bright clean":
    "Giọng văn sáng sủa, clean, professional product photography feel.",
};

const AUDIENCE_INSTRUCTIONS: Record<string, string> = {
  "học sinh/sinh viên":
    "Hướng đến đối tượng học sinh, sinh viên - nhấn mạnh giá thành học tập, tính di động.",
  "dân văn phòng":
    "Hướng đến nhân viên văn phòng - nhấn mạnh năng suất, đa nhiệm, mỏng nhẹ.",
  "game thủ":
    "Hướng đến game thủ - nhấn mạnh hiệu năng GPU, tản nhiệt, RAM.",
  "kỹ sư/lập trình viên":
    "Hướng đến kỹ sư, lập trình viên - nhấn mạnh CPU, RAM, màn hình, bàn phím.",
  "doanh nhân":
    "Hướng đến doanh nhân - nhấn mạnh thương hiệu, sang trọng, bảo mật, di động.",
  "người dùng phổ thông":
    "Hướng đến người dùng phổ thông - đơn giản, dễ sử dụng, giá hợp lý.",
  "creative professional":
    "Hướng đến creative professional - nhấn mạnh màu sắc, độ phân giải, stylus support.",
};

// Map brand voice preset tone sliders to instruction strings
function brandVoiceToneInstructions(voice: BrandVoice | null): string {
  if (!voice) return "";

  const parts: string[] = [];

  // Professional ↔ Casual slider (-1 = professional, 1 = casual)
  if (voice.tone_professional_casual !== undefined) {
    if (voice.tone_professional_casual <= -0.5) {
      parts.push("Giọng văn chuyên nghiệp, trang trọng, dùng thuật ngữ kỹ thuật chính xác.");
    } else if (voice.tone_professional_casual >= 0.5) {
      parts.push("Giọng văn thân thiện, gần gũi, dễ hiểu, phù hợp mọi đối tượng.");
    } else {
      parts.push("Giọng văn cân bằng giữa chuyên nghiệp và thân thiện.");
    }
  }

  // Luxury ↔ Affordable slider
  if (voice.tone_luxury_affordable !== undefined) {
    if (voice.tone_luxury_affordable <= -0.5) {
      parts.push("Nhấn mạnh giá trị cao cấp, sang trọng, đẳng cấp.");
    } else if (voice.tone_luxury_affordable >= 0.5) {
      parts.push("Nhấn mạnh giá trị hợp lý, tiết kiệm, chất lượng tốt.");
    }
  }

  // Technical ↔ Simple slider
  if (voice.tone_technical_simple !== undefined) {
    if (voice.tone_technical_simple <= -0.5) {
      parts.push("Dùng thuật ngữ kỹ thuật chi tiết, phân tích chuyên sâu.");
    } else if (voice.tone_technical_simple >= 0.5) {
      parts.push("Dùng ngôn ngữ đơn giản, dễ hiểu cho người không chuyên.");
    }
  }

  // Emoji usage
  if (voice.emoji_usage === "none") {
    parts.push("Không dùng emoji.");
  } else if (voice.emoji_usage === "minimal") {
    parts.push("Dùng ít emoji (1-2 emoji mỗi đoạn).");
  } else if (voice.emoji_usage === "heavy") {
    parts.push("Dùng nhiều emoji (3-5+) để tăng tính hấp dẫn.");
  }

  // CTA style
  if (voice.cta_style === "urgency") {
    parts.push("CTA: tạo cảm giác khẩn cấp, khan hiếm.");
  } else if (voice.cta_style === "friendly") {
    parts.push("CTA: thân thiện, mời gọi nhẹ nhàng.");
  } else if (voice.cta_style === "soft") {
    parts.push("CTA: mềm nhẹ, gợi ý không ép buộc.");
  } else {
    parts.push("CTA: rõ ràng, trực tiếp.");
  }

  // Content template override
  if (voice.content_template) {
    parts.push(`Quy tắc nội dung: ${voice.content_template}`);
  }

  return parts.join("\n");
}

function buildSystemPrompt(
  settings: AISettingsOutput,
  tone: string,
  audience: string,
  brandVoice: BrandVoice | null
): string {
  const toneNote = TONE_INSTRUCTIONS[tone] || `Giọng văn: ${tone}`;
  const audienceNote = AUDIENCE_INSTRUCTIONS[audience] || `Đối tượng: ${audience}`;
  const brandNote = brandVoiceToneInstructions(brandVoice);

  const parts = [
    settings.brand_voice || "Bạn là chuyên gia marketing laptop và công nghệ.",
    settings.prompt_rules || "",
    brandNote,
    toneNote,
    audienceNote,
    settings.safety_rules || "KHÔNG viết nội dung nhạy cảm, phân biệt đối xử.",
  ].filter(Boolean);

  return parts.join("\n\n");
}

function buildUserPrompt(
  product: GenerateContentParams["product"],
  template: GenerateContentParams["template"],
  contentType: ContentType,
  tone: string,
  audience: string
): string {
  const productInfo = [
    `Tên sản phẩm: ${product.title}`,
    product.description ? `Mô tả: ${product.description}` : "",
    product.price ? `Giá: ${new Intl.NumberFormat("vi-VN").format(product.price)} VND` : "",
    product.category ? `Danh mục: ${product.category}` : "",
    product.tags?.length ? `Tags: ${product.tags.join(", ")}` : "",
    product.thumbnail ? `Hình ảnh: ${product.thumbnail}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (template?.user_template) {
    let prompt = template.user_template
      .replace(/{{product_name}}/gi, product.title)
      .replace(/{{product_highlights}}/gi, product.description || "")
      .replace(/{{price}}/gi, product.price ? `${new Intl.NumberFormat("vi-VN").format(product.price)} VND` : "")
      .replace(/{{cta}}/gi, "Lien he ngay: 0912.345.678")
      .replace(/{{product_info}}/gi, productInfo)
      .replace(/{{content_type}}/gi, contentType)
      .replace(/{{tone}}/gi, tone)
      .replace(/{{audience}}/gi, audience);

    return `${productInfo}\n\nYêu cầu:\n${prompt}`;
  }

  // Default prompt based on content type
  const defaults: Record<string, string> = {
    facebook: `${productInfo}\n\nViết bài Facebook hấp dẫn với:\n- Hook mạnh trong 3 giây đầu\n- Nội dung ${tone || "thân thiện"}\n- Phù hợp đối tượng: ${audience || "mọi người"}\n- Kèm emoji phù hợp\n- Có CTA rõ ràng\n- Độ dài 150-300 từ`,
    website: `${productInfo}\n\nViết bài SEO website chuyên nghiệp:\n- Title: tiêu đề hấp dẫn, chứa từ khóa\n- Meta description: 150-160 ký tự\n- Cấu trúc H2/H3 rõ ràng\n- Nội dung cho đối tượng: ${audience || "người dùng phổ thông"}\n- Giọng văn: ${tone || "chuyên nghiệp"}\n- Tối ưu SEO tự nhiên`,
    video: `${productInfo}\n\nViết kịch bản video ngắn (30-60 giây):\n- Hook gây tò mò trong 3 giây đầu\n- Nội dung ${tone || "năng động"}\n- Phù hợp đối tượng: ${audience || "mọi người"}\n- Có CTA cuối video\n- Gợi ý hình ảnh/video cần quay`,
    image: `${productInfo}\n\nViết prompt chi tiết để AI tạo ảnh sản phẩm:\n- Mô tả chủ thể rõ ràng\n- Bối cảnh/background phù hợp\n- Phong cách: ${tone || "minimalist"}\n- Ánh sáng, góc chụp\n- Negative prompt để loại trừ những gì không muốn`,
  };

  return defaults[contentType] || defaults.facebook;
}

function buildTitle(
  productTitle: string,
  contentType: ContentType
): string {
  const prefixes: Record<string, string> = {
    facebook: `${productTitle} - Laptop chất lượng`,
    website: `Danh gia chi tiet: ${productTitle}`,
    video: `Review nhanh: ${productTitle}`,
    image: `Anh san pham: ${productTitle}`,
  };
  return prefixes[contentType] || productTitle;
}

export async function generateContent(
  params: GenerateContentParams
): Promise<GenerateContentResult> {
  const startTime = Date.now();

  try {
    // 1. Load AI settings
    const settings = await getSettings();
    if (!settings) {
      return { success: false, error: "Chua cau hinh AI. Vui long vao Cau hinh AI de thiet lap." };
    }

    if (!settings.api_key && !settings.base_url) {
      return { success: false, error: "Cau hinh AI chua day du. Vui long kiem tra base_url va api_key." };
    }

    // 2. Load template & active brand voice in parallel
    let template = params.template;
    if (params.templateId && !template) {
      const t = await getTemplateById(params.templateId);
      if (t) {
        template = { system_prompt: t.system_prompt || undefined, user_template: t.user_template };
      }
    }

    // Load active brand voice
    const activeBrandVoice = await getActiveBrandVoice();

    // 3. Build prompt
    const systemPrompt = template?.system_prompt
      || buildSystemPrompt(settings, params.tone || "", params.audience || "", activeBrandVoice);
    const userPrompt = buildUserPrompt(
      params.product,
      template,
      params.contentType,
      params.tone || "",
      params.audience || ""
    );

    // 4. Create AI provider
    const providerType = (settings.provider as AIProviderType) || "openai";
    const provider = createAIProvider(providerType, {
      base_url: settings.base_url || "",
      api_key: settings.api_key || undefined,
      model_name: settings.model_name || "gpt-4o-mini",
      temperature: settings.temperature,
      max_tokens: settings.max_tokens,
    });

    // 5. Call AI
    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ];

    const response = await provider.chat({
      model: settings.model_name || "",
      messages,
      temperature: settings.temperature,
      max_tokens: settings.max_tokens,
    });

    const latencyMs = Date.now() - startTime;

    // 6. Save content item
    const contentItem = await createContentItem({
      content_type: params.contentType,
      title: buildTitle(params.product.title, params.contentType),
      content_body: response.content,
      product_id: params.product.id,
      product_name: params.product.title,
      status: "draft",
      metadata: {
        tone: params.tone,
        audience: params.audience,
        model: response.model,
        tokens_used: response.tokens_used,
        latency_ms: latencyMs,
      },
      generated_by: response.model,
      template_id: params.templateId,
      created_by: params.createdBy,
    });

    // 7. Update template usage
    if (params.templateId) {
      await incrementTemplateUsage(params.templateId);
    }

    // 8. Log generation
    await createGenerationLog({
      content_item_id: contentItem.id,
      provider: providerType,
      model_name: response.model,
      request_payload: JSON.stringify({ messages }),
      response_text: response.content,
      tokens_used: response.tokens_used,
      latency_ms: latencyMs,
    });

    return {
      success: true,
      content: response.content,
      contentItemId: contentItem.id,
      model: response.model,
      tokens_used: response.tokens_used,
      latency_ms: latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Log error
    await createGenerationLog({
      provider: "openai",
      latency_ms: latencyMs,
      error_message: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
      latency_ms: latencyMs,
    };
  }
}
