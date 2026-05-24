/**
 * AI Brand Engine
 * Xây dựng brand voice instructions từ BrandVoice DB record
 */

import type { BrandVoice } from "@/types/ai-operating";
import type { AIRoutingStrategy } from "./routing-engine";

export interface BrandInstructions {
  /** Full instruction text for system prompt */
  instructionText: string;
  /** Quick tone description */
  toneLabel: string;
  /** CTA style */
  ctaStyle: string;
  /** Emoji usage level */
  emojiLevel: "none" | "minimal" | "moderate" | "heavy";
}

/**
 * Build brand instructions từ DB BrandVoice record
 * Kết hợp với routing strategy để tạo final instructions
 */
export function buildBrandInstructions(
  voice: BrandVoice | null,
  strategy: AIRoutingStrategy
): BrandInstructions {
  if (!voice) {
    return getDefaultBrandInstructions(strategy);
  }

  const parts: string[] = [];

  // ── Brand identity ────────────────────────────────────────────────────────
  if (voice.name) {
    parts.push(`Thương hiệu: ${voice.name}`);
  }
  if (voice.tone_instruction) {
    parts.push(voice.tone_instruction);
  }
  if (voice.target_audience) {
    parts.push(`Đối tượng: ${voice.target_audience}`);
  }

  // ── Keyword guidance ─────────────────────────────────────────────────────
  if (voice.keywords_to_use?.length) {
    parts.push(`Từ khóa ưu tiên: ${voice.keywords_to_use.join(", ")}`);
  }
  if (voice.keywords_to_avoid?.length) {
    parts.push(`Tránh dùng: ${voice.keywords_to_avoid.join(", ")}`);
  }

  // ── Tone sliders ─────────────────────────────────────────────────────────
  const toneParts: string[] = [];

  if (voice.tone_professional_casual !== undefined) {
    if (voice.tone_professional_casual <= -0.5) {
      toneParts.push("chuyên nghiệp, trang trọng, dùng thuật ngữ kỹ thuật chính xác");
    } else if (voice.tone_professional_casual >= 0.5) {
      toneParts.push("thân thiện, gần gũi, dễ hiểu");
    } else {
      toneParts.push("cân bằng giữa chuyên nghiệp và thân thiện");
    }
  }

  if (voice.tone_luxury_affordable !== undefined) {
    if (voice.tone_luxury_affordable <= -0.5) {
      toneParts.push("nhấn mạnh giá trị cao cấp, sang trọng, đẳng cấp");
    } else if (voice.tone_luxury_affordable >= 0.5) {
      toneParts.push("nhấn mạnh giá trị hợp lý, tiết kiệm, chất lượng tốt");
    }
  }

  if (voice.tone_technical_simple !== undefined) {
    if (voice.tone_technical_simple <= -0.5) {
      toneParts.push("dùng thuật ngữ kỹ thuật chi tiết, phân tích chuyên sâu");
    } else if (voice.tone_technical_simple >= 0.5) {
      toneParts.push("dùng ngôn ngữ đơn giản, dễ hiểu cho người không chuyên");
    }
  }

  if (toneParts.length > 0) {
    parts.push(`Giọng văn: ${toneParts.join("; ")}`);
  }

  // ── CTA style ─────────────────────────────────────────────────────────────
  const ctaStyle = voice.cta_style || "direct";
  const ctaLabels: Record<string, string> = {
    urgency: "tạo cảm giác khẩn cấp, khan hiếm, có thời hạn",
    friendly: "mời gọi nhẹ nhàng, thân thiện",
    soft: "gợi ý không ép buộc, tự nhiên",
    direct: "rõ ràng, trực tiếp, hành động cụ thể",
  };
  parts.push(`CTA: ${ctaLabels[ctaStyle] || ctaStyle}`);

  // ── Content template override ────────────────────────────────────────────
  if (voice.content_template) {
    parts.push(`Quy tắc nội dung: ${voice.content_template}`);
  }

  // ── Strategy-based emoji guidance ────────────────────────────────────────
  const emojiLevel = voice.emoji_usage || "moderate";
  if (emojiLevel === "none") {
    parts.push("Không dùng emoji.");
  } else if (emojiLevel === "minimal") {
    parts.push("Dùng ít emoji (1-2 emoji mỗi đoạn).");
  } else if (emojiLevel === "heavy") {
    parts.push("Dùng nhiều emoji (3-5+) để tăng tính hấp dẫn.");
  } else {
    parts.push("Dùng emoji vừa phải (2-3 emoji) để tăng sinh động.");
  }

  return {
    instructionText: parts.join("\n"),
    toneLabel: voice.name || "Default",
    ctaStyle,
    emojiLevel,
  };
}

function getDefaultBrandInstructions(
  strategy: AIRoutingStrategy
): BrandInstructions {
  const ctaStyles: Record<string, string> = {
    urgent: "tạo cảm giác khẩn cấp, khan hiếm, có thời hạn",
    friendly: "mời gọi nhẹ nhàng, thân thiện",
    professional: "rõ ràng, trực tiếp, hành động cụ thể",
    soft: "gợi ý không ép buộc, tự nhiên",
  };

  return {
    instructionText:
      "Thương hiệu: Mỹ Tho Laptop - Chuyên laptop chính hãng, giá tốt, bảo hành uy tín.\n" +
      "Phong cách: Tư vấn chân thành, không spam, đặt lợi ích khách hàng lên đầu.",
    toneLabel: "Mỹ Tho Laptop",
    ctaStyle: strategy.suggestedCTAStyle === "urgent" ? "urgency" : "friendly",
    emojiLevel: "moderate",
  };
}

/** Extract short brand voice summary for UI display */
export function getBrandVoiceSummary(voice: BrandVoice | null): string {
  if (!voice) return "Mặc định";

  const parts: string[] = [];
  if (voice.name) parts.push(voice.name);
  if (voice.target_audience) parts.push(voice.target_audience);
  if (voice.cta_style) parts.push(`CTA: ${voice.cta_style}`);

  return parts.length > 0 ? parts.join(" | ") : "Mặc định";
}
