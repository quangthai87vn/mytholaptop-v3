// ============================================================
// Content Module Types
// ============================================================

// Platform types
export type ContentPlatform = "facebook" | "website" | "tiktok" | "zalo" | "youtube";
export type ContentStatus = "draft" | "scheduled" | "published" | "archived";
export type ContentType = "facebook_post" | "seo_article" | "video_script" | "image_prompt" | "zalo_message";
export type AIGeneratorTone =
  | "professional"
  | "sales_aggressive"
  | "friendly"
  | "gen_z"
  | "technical"
  | "premium";
export type AIGeneratorAudience =
  | "student"
  | "office"
  | "gaming"
  | "business"
  | "design";
export type VideoDuration = "30s" | "60s" | "90s";
export type VideoPlatform = "tiktok" | "reels" | "youtube_shorts";
export type AspectRatio = "1:1" | "4:3" | "16:9" | "9:16";
export type ImageStyle =
  | "minimalist"
  | "modern"
  | "tech"
  | "gaming"
  | "professional"
  | "colorful";
export type AIProvider = "openai" | "gemini" | "deepseek" | "huggingface" | "ollama" | "lmstudio" | "openai-compatible";

// Base content
export interface BaseContent {
  id: string;
  title: string;
  content: string;
  type: ContentType;
  platform: ContentPlatform;
  status: ContentStatus;
  createdBy: "ai" | "manual";
  createdAt: string;
  updatedAt: string;
  createdByStaff?: string;
}

// Facebook Post
export interface FacebookPost extends BaseContent {
  type: "facebook_post";
  platform: "facebook";
  productId?: string;
  productName?: string;
  productSku?: string;
  scheduledAt?: string;
  publishedAt?: string;
  facebookUrl?: string;
  reach?: number;
  likes?: number;
  shares?: number;
  comments?: number;
}

// Website Post / SEO Article
export interface WebsitePost extends BaseContent {
  type: "seo_article";
  platform: "website";
  slug: string;
  productId?: string;
  productName?: string;
  seoKeyword?: string;
  metaDescription?: string;
  publishedAt?: string;
  views?: number;
}

// Video Script
export interface VideoScript extends BaseContent {
  type: "video_script";
  platform: ContentPlatform;
  productId?: string;
  productName?: string;
  hook: string;
  duration: VideoDuration;
  videoPlatform: VideoPlatform;
  script: string;
  callToAction: string;
  scheduledAt?: string;
  publishedAt?: string;
  videoUrl?: string;
  views?: number;
}

// Image Prompt
export interface ImagePrompt extends BaseContent {
  type: "image_prompt";
  platform: ContentPlatform;
  productId?: string;
  productName?: string;
  designStyle: ImageStyle;
  mainColor?: string;
  aspectRatio: AspectRatio;
  prompt: string;
  negativePrompt?: string;
  generatedImageUrl?: string;
  scheduledAt?: string;
}

// Zalo Message / ZNS
export interface ZaloMessage extends BaseContent {
  type: "zalo_message";
  platform: "zalo";
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  statusZns?: "pending" | "sent" | "delivered" | "read" | "failed";
}

// Scheduled Post for Calendar
export interface ScheduledPost {
  id: string;
  contentId: string;
  contentTitle: string;
  platform: ContentPlatform;
  type: ContentType;
  scheduledAt: string;
  status: ContentStatus;
  thumbnail?: string;
}

// Content Template
export interface ContentTemplate {
  id: string;
  name: string;
  type: ContentType;
  description: string;
  template: string;
  variables: string[];
  isSystem: boolean;
  useCount: number;
  createdAt: string;
  updatedAt: string;
}

// AI Settings
export interface AISettings {
  provider: AIProvider;
  modelName: string;
  apiKey: string;
  defaultTone: AIGeneratorTone;
  brandVoice: string;
  promptRules: string;
  safetyRules: string;
  temperature: number;
  maxTokens: number;
}

// Product for AI Generator (lightweight)
export interface AIProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  category: string;
  tags: string[];
  image: string;
  description: string;
  brand: string;
  // Thêm từ adaptProduct để AI có context đầy đủ
  stock: number;
  stockStatus: "in_stock" | "out_of_stock" | "backorder" | "unknown";
  status: string;
  compareAtPrice?: number;
  metadata?: Record<string, string>;
  /** Dùng để build rich context cho AI prompt */
  specs?: string[];
  /** SEO title từ metadata */
  seoTitle?: string;
  /** SEO description từ metadata */
  seoDescription?: string;
  /** Mô tả ngắn gọn để AI hiểu nhanh */
  shortDescription?: string;
}

// Content Stats for Dashboard
export interface ContentStats {
  totalPosts: number;
  drafts: number;
  scheduled: number;
  published: number;
  facebookPosts: number;
  websitePosts: number;
  videoScripts: number;
  imagePrompts: number;
  thisWeekPosts: number;
  thisWeekViews: number;
  topPerformers: {
    title: string;
    type: ContentType;
    views: number;
    likes: number;
  }[];
}
