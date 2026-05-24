/**
 * AI Response Post-Processor
 *
 * Xử lý response từ AI provider và trích xuất:
 * - Nội dung chính
 * - Hooks
 * - CTA
 * - Hashtags
 * - SEO title & meta description
 * - Biến thể (variants)
 */

export interface PostProcessResult {
  // Core content
  content: string;
  title?: string;

  // Extracted parts
  hooks: string[];
  cta: string;
  hashtags: string[];
  seoTitle?: string;
  seoDescription?: string;
  keywords: string[];

  // Variants
  variants: string[];

  // Stats
  wordCount: number;
  charCount: number;
}

// ── Extraction helpers ───────────────────────────────────────────────────────────

function extractHashtags(text: string): string[] {
  // Priority 1: explicit [hashtags] section
  const sectionMatch = text.match(
    /(?:hashtag|tag|từ khóa hashtag)[:\s]*([\s\S]*?)(?=\n\n|## |\[|$)/i
  );
  if (sectionMatch) {
    const tags = sectionMatch[1]
      .split(/[\s,#]+/)
      .map((h) => h.trim())
      .filter((h) => h.length > 1 && h.length < 50)
      .map((h) => (h.startsWith("#") ? h : `#${h}`));
    if (tags.length > 0) return tags;
  }

  // Priority 2: inline hashtags
  const inlineTags = text.match(/#[\w\u00C0-\u024F\u1EA0-\u1EF9]+/g);
  if (inlineTags) {
    return [...new Set(inlineTags.map((h) => h.toLowerCase()))].slice(0, 15);
  }

  return [];
}

function extractCTA(text: string): string {
  // Priority 1: explicit CTA section
  const ctaMatch = text.match(
    /(?:cta|call to action|lời kêu gọi|liên hệ|mua ngay|đặt hàng)[:\s]*(["'​]?)(.*?)(\1|$)/i
  );
  if (ctaMatch && ctaMatch[2]) {
    return ctaMatch[2].trim().replace(/^["'​]+|["'​]+$/g, "");
  }

  // Priority 2: last sentence with CTA keywords
  const sentences = text.split(/[.!?]+/);
  for (let i = sentences.length - 1; i >= 0; i--) {
    const s = sentences[i].trim().toLowerCase();
    if (/mua|liên hệ|gọi|đặt|reply| inbox|click|follow|share|comment/i.test(s)) {
      return sentences[i].trim();
    }
  }

  return "";
}

function extractHooks(text: string): string[] {
  // Priority 1: explicit hooks section
  const hookMatches = text.matchAll(
    /(?:hook|đoạn mở đầu|mở đầu|alt[_\s]?hook|hook\s*\d)[:\s]*([\s\S]*?)(?=\n\n|## |\[|$)/gi
  );
  const fromSection: string[] = [];
  for (const m of hookMatches) {
    const cleaned = m[1]
      .replace(/^(?:\d+[\.\)]\s*|[-*]\s*)+/gm, "")
      .trim();
    if (cleaned.length > 10 && cleaned.length < 300) {
      fromSection.push(cleaned);
    }
  }
  if (fromSection.length > 0) return fromSection.slice(0, 5);

  // Priority 2: first lines that look like hooks
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const hooks: string[] = [];

  for (const line of lines.slice(0, 6)) {
    const cleaned = line.trim();
    // Skip markdown headers and metadata
    if (cleaned.startsWith("#") || cleaned.startsWith("[") || cleaned.includes(":")) continue;
    // Hooks are usually short and punchy
    if (cleaned.length > 20 && cleaned.length < 200) {
      hooks.push(cleaned);
    }
    if (hooks.length >= 3) break;
  }

  return hooks;
}

function extractSEO(text: string): { title?: string; description?: string; keywords: string[] } {
  const keywords: string[] = [];

  // SEO Title
  const titleMatch = text.match(
    /(?:seo\s*title|tiêu đề\s*seo|title\s*seo)[:\s]*([^\n]{5,70})/i
  );
  const title = titleMatch?.[1]?.trim().replace(/^["'​]+|["'​]+$/g, "");

  // Meta description
  const descMatch = text.match(
    /(?:meta\s*description|mô tả\s*seo|description\s*seo)[:\s]*([^\n]{20,200})/i
  );
  const description = descMatch?.[1]?.trim().replace(/^["'​]+|["'​]+$/g, "");

  // Keywords
  const kwMatch = text.match(
    /(?:keyword|từ khóa|seo\s*keyword)[:\s]*([\s\S]*?)(?=\n\n|## |\[|$)/i
  );
  if (kwMatch) {
    const extracted = kwMatch[1]
      .split(/[,;|\n]/)
      .map((k) => k.trim())
      .filter((k) => k.length > 2 && k.length < 30)
      .slice(0, 10);
    keywords.push(...extracted);
  }

  return { title, description, keywords };
}

function extractVariants(text: string): string[] {
  // Priority 1: explicit variants section
  const variantMatches = text.matchAll(
    /(?:biến thể|variant|option|alternative|phiên bản)[:\s]*([\s\S]*?)(?=(?:biến thể|variant|option|## |\n\n\[)|$)/gi
  );
  const variants: string[] = [];
  for (const m of variantMatches) {
    const parts = m[1].split(/\n(?=\d+[\.\)]\s)/);
    for (const part of parts) {
      const cleaned = part.trim().replace(/^\d+[\.\)]\s*/, "");
      if (cleaned.length > 50) {
        variants.push(cleaned);
      }
    }
  }

  if (variants.length > 0) return variants.slice(0, 3);

  // Priority 2: split by numbered sections
  const numberedSections = text.split(/(?=\n(?:1\.|2\.|3\.|biến thể|variant))/i);
  for (const section of numberedSections) {
    const trimmed = section.trim();
    if (trimmed.length > 100 && trimmed.length < 1000) {
      variants.push(trimmed);
    }
  }

  return variants.slice(0, 3);
}

function stripMetadata(text: string): string {
  return text
    // Remove metadata sections
    .replace(/\n*\[hashtag[^\]]*\][\s\S]*?(?=\n\n|## |\[Nội dung\])/gi, "\n")
    .replace(/\n*\[seo[^\]]*\][\s\S]*?(?=\n\n|## |\[Nội dung\])/gi, "\n")
    .replace(/\n*\[keyword[^\]]*\][\s\S]*?(?=\n\n|## |\[Nội dung\])/gi, "\n")
    .replace(/\n*\[cta[^\]]*\][\s\S]*?(?=\n\n|## |\[Nội dung\])/gi, "\n")
    // Remove section headers
    .replace(/\n## (Hashtag|SEO Title|Meta Description|Keywords|Hooks|Variants|Biến thể|Từ khóa).*/gi, "")
    .replace(/\n\*\*.*?(Hashtag|SEO Title|Meta Description|Keywords|Hooks|Biến thể|Từ khóa).*?\*\*.*?/gi, "")
    // Clean up multiple blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTitle(text: string): string | undefined {
  // First non-empty line that doesn't start with #
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.length > 5 && trimmed.length < 100) {
      return trimmed;
    }
  }
  return undefined;
}

// ── Main post-processor ────────────────────────────────────────────────────────

/**
 * Post-process raw AI response into structured output.
 */
export function postProcess(rawContent: string): PostProcessResult {
  if (!rawContent || !rawContent.trim()) {
    return {
      content: "",
      hooks: [],
      cta: "",
      hashtags: [],
      keywords: [],
      variants: [],
      wordCount: 0,
      charCount: 0,
    };
  }

  const seo = extractSEO(rawContent);
  const cleanContent = stripMetadata(rawContent);
  const wordCount = cleanContent.split(/\s+/).filter(Boolean).length;
  const charCount = cleanContent.length;

  return {
    content: cleanContent,
    title: extractTitle(cleanContent),
    hooks: extractHooks(rawContent),
    cta: extractCTA(rawContent) || seo.description?.slice(0, 100) || "",
    hashtags: extractHashtags(rawContent),
    seoTitle: seo.title,
    seoDescription: seo.description,
    keywords: seo.keywords,
    variants: extractVariants(rawContent),
    wordCount,
    charCount,
  };
}

/**
 * Summarize post-process result for UI display.
 */
export function summarizeResult(result: PostProcessResult): string {
  const parts: string[] = [];

  if (result.wordCount > 0) {
    parts.push(`${result.wordCount} từ`);
  }
  if (result.hashtags.length > 0) {
    parts.push(`${result.hashtags.length} hashtags`);
  }
  if (result.hooks.length > 0) {
    parts.push(`${result.hooks.length} hooks`);
  }
  if (result.cta) {
    parts.push("1 CTA");
  }
  if (result.seoTitle) {
    parts.push("SEO ready");
  }

  return parts.join(" · ") || "Nội dung đã tạo";
}
