/**
 * AI Content Studio - Generation State Store
 *
 * KIẾN TRÚC MỚI (Single Source of Truth)
 *
 * Layer 1 (System Config) — AI Operating Center:
 *   - AI Providers, AI Task Routing, Brand Voice, System Prompt
 *   → SINGLE SOURCE OF TRUTH
 *
 * Layer 2 (Runtime Workspace) — AI Writer Wizard:
 *   - Chọn Product + Routing Preset (Content Type)
 *   - AI config được resolve tự động từ Layer 1
 *   - User chỉ nhập customInstructions
 *
 * Store này quản lý:
 *   - Wizard step navigation
 *   - Product selection
 *   - Selected content type (maps to AI Task Routing)
 *   - Content preferences (hook, CTA, emoji, hashtag)
 *   - Advanced overrides (temporary, for this generation only)
 *   - Custom instructions
 *   - Generation state & results
 *
 * AI config (provider, model, creativity, brand voice, system prompt)
 * KHÔNG có ở đây — được resolve tự động từ AI Routing.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { AIProduct } from "@/types/content";
import type { ContentPlatform } from "@/types/content";

// ── Wizard Steps ────────────────────────────────────────────────────────────────

export type WizardStep =
  | "product"      // Step 1: Select product
  | "routing"     // Step 2: Select AI Task Routing + advanced overrides
  | "preview"      // Step 3: Preview final prompt
  | "generate"     // Step 4: Generate content
  | "review";     // Step 5: Review / Save / Schedule / Publish

export const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  product: "Chọn sản phẩm",
  routing: "Cấu hình AI",
  preview: "Xem trước Prompt",
  generate: "Tạo nội dung",
  review: "Hoàn tất",
};

export const WIZARD_STEP_ORDER: WizardStep[] = [
  "product",
  "routing",
  "preview",
  "generate",
  "review",
];

// ── Content Types ─────────────────────────────────────────────────────────────────
// Content type = routing preset (maps to AI Task Routing)

export type StudioContentType =
  | "facebook_post"
  | "seo_article"
  | "video_script"
  | "image_prompt"
  | "zalo_message"
  | "product_description"
  | "email_marketing";

export const CONTENT_TYPE_LABELS: Record<StudioContentType, string> = {
  facebook_post: "Bài viết Facebook",
  seo_article: "Bài viết SEO Website",
  video_script: "Kịch bản Video",
  image_prompt: "Prompt Hình ảnh",
  zalo_message: "Tin nhắn Zalo",
  product_description: "Mô tả sản phẩm",
  email_marketing: "Email Marketing",
};

// Mapping content type → task_type for AI Task Routing
export const CONTENT_TYPE_TO_TASK: Record<StudioContentType, string> = {
  facebook_post: "facebook_content",
  seo_article: "seo_article",
  video_script: "video_script",
  image_prompt: "image_prompt",
  zalo_message: "zalo_message",
  product_description: "product_description",
  email_marketing: "email_marketing",
};

// ── Generation Status ────────────────────────────────────────────────────────────

export type GenerationStatus =
  | "idle"
  | "resolving"
  | "generating"
  | "streaming"
  | "finalizing"
  | "completed"
  | "stopped"
  | "error";

export const GENERATION_STATUS_LABELS: Record<GenerationStatus, string> = {
  idle: "Sẵn sàng",
  resolving: "Đang chuẩn bị...",
  generating: "Đang gửi yêu cầu...",
  streaming: "AI đang viết...",
  finalizing: "Đang hoàn tất...",
  completed: "Hoàn tất",
  stopped: "Đã dừng",
  error: "Lỗi",
};

// ── Pipeline Stage ───────────────────────────────────────────────────────────────

export type PipelineStage =
  | "idle"
  | "resolving"
  | "analyzing"
  | "building_prompt"
  | "writing_main"
  | "writing_hooks"
  | "writing_cta"
  | "writing_seo"
  | "writing_hashtags"
  | "finalizing"
  | "done";

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  idle: "Sẵn sàng",
  resolving: "Đang chuẩn bị AI...",
  analyzing: "Đã phân tích sản phẩm",
  building_prompt: "Đã xây dựng prompt",
  writing_main: "Đã viết nội dung chính",
  writing_hooks: "Đã viết hooks",
  writing_cta: "Đã viết CTA",
  writing_seo: "Đã viết SEO",
  writing_hashtags: "Đã viết hashtags",
  finalizing: "Đang hoàn tất...",
  done: "Hoàn tất",
};

// ── Output Tab ───────────────────────────────────────────────────────────────────

export type OutputTab =
  | "main"
  | "variants"
  | "hooks"
  | "cta"
  | "seo"
  | "hashtags";

// ── Prompt Pipeline ───────────────────────────────────────────────────────────────

export interface PromptPipeline {
  systemPrompt: string;
  brandVoice: string;
  safetyRules: string[];
  productContext: string;
  userInput: string;
  finalPrompt: string;
}

// ── Generation Result ────────────────────────────────────────────────────────────

export interface GenerationResult {
  content: string;
  title: string;
  variants: string[];
  hooks: string[];
  cta: string;
  seoKeywords: string[];
  hashtags: string[];
  contentItemId?: number;
}

export interface GenerationStats {
  model: string;
  tokens: number;
  latency_ms: number;
  cost_estimate?: number;
  provider: string;
}

// ── Content Style Preferences ───────────────────────────────────────────────────
// Những gì user được tùy chỉnh — KHÔNG phải AI config

export type HookStyle =
  | "question"
  | "statistic"
  | "story"
  | "provocative"
  | "urgency"
  | "howto"
  | "testimonial"
  | "shocking";

export const HOOK_LABELS: Record<HookStyle, string> = {
  question: "Câu hỏi gợi tò mò",
  statistic: "Số liệu ấn tượng",
  story: "Chia sẻ câu chuyện",
  provocative: "Gây tranh cãi",
  urgency: "Tạo cảm giác khẩn cấp",
  howto: "Hướng dẫn cách làm",
  testimonial: "Đánh giá/Khách hàng",
  shocking: "Thông tin gây sốc",
};

export type CTAStyle =
  | "direct"
  | "soft"
  | "question"
  | "benefit"
  | "urgency"
  | "social_proof";

export const CTA_LABELS: Record<CTAStyle, string> = {
  direct: "Mua ngay / Liên hệ",
  soft: "Tư vấn thêm",
  question: "Hỏi người đọc",
  benefit: "Nhấn mạnh lợi ích",
  urgency: "Khuyến mãi có hạn",
  social_proof: "Theo dõi đánh giá",
};

export type EmojiLevel = "none" | "minimal" | "moderate" | "heavy";

export const EMOJI_LABELS: Record<EmojiLevel, string> = {
  none: "Không emoji",
  minimal: "Ít (1-2)",
  moderate: "Vừa (3-5)",
  heavy: "Nhiều (5+)",
};

export type HashtagMode = "none" | "minimal" | "moderate" | "heavy";

export const HASHTAG_LABELS: Record<HashtagMode, string> = {
  none: "Không hashtag",
  minimal: "Ít (1-3)",
  moderate: "Vừa (4-8)",
  heavy: "Nhiều (8+)",
};

export const GOAL_LABELS: Record<MarketingGoal, string> = {
  branding: "Xây dựng thương hiệu",
  conversion: "Chuyển đổi mua hàng",
  seo: "Tối ưu SEO",
  viral: "Lan truyền viral",
};

export const FUNNEL_LABELS: Record<FunnelStage, string> = {
  awareness: "Nhận thức",
  consideration: "Cân nhắc",
  conversion: "Chuyển đổi",
};

export type ContentLength = "short" | "medium" | "long";

export type MarketingGoal =
  | "branding"
  | "conversion"
  | "seo"
  | "viral";

export type FunnelStage =
  | "awareness"
  | "consideration"
  | "conversion";

// ── Store State ────────────────────────────────────────────────────────────────

interface StudioState {
  // ── Wizard Navigation ──────────────────────────────────────────────────────
  wizardStep: WizardStep;

  // Product selection
  selectedProduct: AIProduct | null;
  availableProducts: AIProduct[];
  productsLoading: boolean;
  productsError: string | null;
  productSearch: string;

  // Routing preset — chỉ chọn content type, AI config được load tự động từ AI Routing
  contentType: StudioContentType;

  // Content style preferences — những gì user được tùy chỉnh
  contentLength: ContentLength;
  hookStyle: HookStyle;
  ctaStyle: CTAStyle;
  emojiLevel: EmojiLevel;
  hashtagMode: HashtagMode;

  // Custom instructions — duy nhất user được nhập
  customInstructions: string;

  // ── Advanced Overrides (temporary, for this generation only) ──────────────
  // These override the routing config but do NOT persist to the routing DB
  advancedOverrides: {
    provider_id?: number | null;
    model_override?: string | null;
    brand_preset?: string | null;
    system_prompt_id?: number | null;
    temperature_override?: number | null;
    max_tokens_override?: number | null;
    content_length?: ContentLength | null;
    cta_style_override?: CTAStyle | null;
    emoji_level_override?: EmojiLevel | null;
    hashtag_mode_override?: HashtagMode | null;
  };

  // Generation state
  isGenerating: boolean;
  generationStatus: GenerationStatus;
  pipelineStage: PipelineStage;
  stageProgress: number;
  streamingText: string;
  generationError: string | null;
  lastResult: GenerationResult | null;
  stats: GenerationStats | null;
  generationStartedAt: number | null;
  timeoutWarningShown: boolean;

  // Output
  activeOutputTab: OutputTab;
  isStreaming: boolean;
  tokenCount: number;
  /** Raw final content preserved after streamingText is cleared */
  finalContent: string;

  /** Prompt pipeline built from product + routing + brand voice before generation */
  promptPipeline: PromptPipeline | null;

  // Advanced routing preferences (used by useResolvedConfig for routing resolution)
  platforms: string[];
  marketingGoal: string;
  funnelStage: string;
}

// ── Actions ───────────────────────────────────────────────────────────────────

interface StudioActions {
  // Wizard navigation
  setWizardStep: (step: WizardStep) => void;
  goToNextStep: () => void;
  goToPrevStep: () => void;

  // Product
  setSelectedProduct: (product: AIProduct | null) => void;
  selectProduct: (product: AIProduct) => void;
  setAvailableProducts: (products: AIProduct[]) => void;
  setProductsLoading: (loading: boolean) => void;
  setProductsError: (error: string | null) => void;
  setProductSearch: (q: string) => void;

  // Product toggle
  toggleProduct: (product: AIProduct) => void;

  // Routing preset
  setContentType: (ct: StudioContentType) => void;

  // Content preferences
  setContentLength: (length: ContentLength) => void;
  setHookStyle: (style: HookStyle) => void;
  setCTAStyle: (style: CTAStyle) => void;
  setEmojiLevel: (level: EmojiLevel) => void;
  setHashtagMode: (mode: HashtagMode) => void;

  // Custom instructions
  setCustomInstructions: (text: string) => void;

  // Advanced overrides
  setAdvancedOverride: (overrides: Partial<StudioState["advancedOverrides"]>) => void;
  clearAdvancedOverrides: () => void;

  // Generation
  startGeneration: () => void;
  appendStreamingText: (text: string) => void;
  setStreamingText: (text: string) => void;
  finishGeneration: (result: GenerationResult, stats: GenerationStats) => void;
  setGenerationStatus: (status: GenerationStatus) => void;
  setPipelineStage: (stage: PipelineStage) => void;
  setStageProgress: (progress: number) => void;
  setGenerationError: (error: string | null) => void;
  stopGeneration: () => void;
  clearResult: () => void;

  // Output
  setActiveOutputTab: (tab: OutputTab) => void;
  setIsStreaming: (v: boolean) => void;
  setTokenCount: (c: number) => void;
  setFinalContent: (content: string) => void;

  // Prompt Pipeline
  setPromptPipeline: (pipeline: PromptPipeline) => void;
  clearPromptPipeline: () => void;

  // Advanced routing preferences
  togglePlatform: (platform: string) => void;
  setPlatforms: (platforms: string[]) => void;
  setMarketingGoal: (goal: string) => void;
  setFunnelStage: (stage: string) => void;

  // Reset
  resetStudio: () => void;
}

// ── Default State ──────────────────────────────────────────────────────────────

const defaultState: StudioState = {
  wizardStep: "product",
  selectedProduct: null,
  availableProducts: [],
  productsLoading: false,
  productsError: null,
  productSearch: "",
  contentType: "facebook_post",
  contentLength: "medium",
  hookStyle: "question",
  ctaStyle: "direct",
  emojiLevel: "moderate",
  hashtagMode: "moderate",
  customInstructions: "",
  advancedOverrides: {},
  isGenerating: false,
  generationStatus: "idle",
  pipelineStage: "idle",
  stageProgress: 0,
  streamingText: "",
  generationError: null,
  lastResult: null,
  stats: null,
  generationStartedAt: null,
  timeoutWarningShown: false,
  activeOutputTab: "main",
  isStreaming: false,
  tokenCount: 0,
  finalContent: "",
  promptPipeline: null,
  platforms: [],
  marketingGoal: "conversion",
  funnelStage: "consideration",
};

// ── Store ──────────────────────────────────────────────────────────────────────

export const useStudioStore = create<StudioState & StudioActions>()(
  devtools(
    (set, get) => ({
      // Wizard navigation
      setWizardStep: (step) => set({ wizardStep: step ?? "product" }),
      goToNextStep: () => {
        const current = get().wizardStep;
        const idx = WIZARD_STEP_ORDER.indexOf(current);
        if (idx < WIZARD_STEP_ORDER.length - 1) {
          set({ wizardStep: WIZARD_STEP_ORDER[idx + 1] });
        }
      },
      goToPrevStep: () => {
        const current = get().wizardStep;
        const idx = WIZARD_STEP_ORDER.indexOf(current);
        if (idx > 0) {
          set({ wizardStep: WIZARD_STEP_ORDER[idx - 1] });
        }
      },

      // Product
      setSelectedProduct: (product) => set({ selectedProduct: product }),
      selectProduct: (product) => set({ selectedProduct: product }),
      setAvailableProducts: (products) => set({ availableProducts: products }),
      setProductsLoading: (loading) => set({ productsLoading: loading }),
      setProductsError: (error) => set({ productsError: error }),
      setProductSearch: (q) => set({ productSearch: q }),
      toggleProduct: (product) =>
        set((s) => ({
          selectedProduct: s.selectedProduct?.id === product.id ? null : product,
        })),

      // Routing preset
      setContentType: (ct) => set({ contentType: ct }),

      // Content preferences
      setContentLength: (length) => set({ contentLength: length }),
      setHookStyle: (style) => set({ hookStyle: style }),
      setCTAStyle: (style) => set({ ctaStyle: style }),
      setEmojiLevel: (level) => set({ emojiLevel: level }),
      setHashtagMode: (mode) => set({ hashtagMode: mode }),

      // Custom instructions
      setCustomInstructions: (text) => set({ customInstructions: text }),

      // Advanced overrides
      setAdvancedOverride: (overrides) =>
        set((s) => ({
          advancedOverrides: { ...s.advancedOverrides, ...overrides },
        })),
      clearAdvancedOverrides: () => set({ advancedOverrides: {} }),

      // Generation
      startGeneration: () =>
        set({
          isGenerating: true,
          generationStatus: "resolving",
          pipelineStage: "resolving",
          stageProgress: 0,
          streamingText: "",
          finalContent: "",
          promptPipeline: null,
          generationError: null,
          lastResult: null,
          stats: null,
          activeOutputTab: "main",
          tokenCount: 0,
          isStreaming: true,
          generationStartedAt: Date.now(),
          timeoutWarningShown: false,
        }),
      appendStreamingText: (text) =>
        set((s) => ({ streamingText: s.streamingText + text })),
      setStreamingText: (text) => set({ streamingText: text }),
      finishGeneration: (result, stats) =>
        set((s) => ({
          isGenerating: false,
          generationStatus: "completed",
          pipelineStage: "done",
          stageProgress: 100,
          finalContent: s.streamingText || result.content,
          streamingText: "",
          isStreaming: false,
          lastResult: result,
          stats,
          generationError: null,
        })),
      setGenerationStatus: (status) =>
        set({ generationStatus: status, isGenerating: status !== "completed" && status !== "error" && status !== "idle" && status !== "stopped" }),
      setPipelineStage: (stage) => set({ pipelineStage: stage }),
      setStageProgress: (progress) => set({ stageProgress: progress }),
      setGenerationError: (error) =>
        set({
          isGenerating: false,
          generationStatus: error ? "error" : "idle",
          streamingText: "",
          isStreaming: false,
          generationError: error,
        }),
      stopGeneration: () =>
        set((s) => ({
          isGenerating: false,
          generationStatus: "stopped",
          isStreaming: false,
          finalContent: s.streamingText,
          streamingText: "",
          promptPipeline: null,
        })),
      clearResult: () =>
        set({
          isGenerating: false,
          generationStatus: "idle",
          pipelineStage: "idle",
          stageProgress: 0,
          lastResult: null,
          stats: null,
          generationError: null,
          streamingText: "",
          finalContent: "",
          promptPipeline: null,
          generationStartedAt: null,
          timeoutWarningShown: false,
        }),

      // Output
      setActiveOutputTab: (tab) => set({ activeOutputTab: tab }),
      setIsStreaming: (v) => set({ isStreaming: v }),
      setTokenCount: (c) => set({ tokenCount: c }),
      setFinalContent: (content) => set({ finalContent: content }),

      // Prompt Pipeline
      setPromptPipeline: (pipeline) => set({ promptPipeline: pipeline }),
      clearPromptPipeline: () => set({ promptPipeline: null }),

      // Advanced routing preferences
      togglePlatform: (platform) =>
        set((s) => ({
          platforms: s.platforms.includes(platform)
            ? s.platforms.filter((p) => p !== platform)
            : [...s.platforms, platform],
        })),
      setPlatforms: (platforms) => set({ platforms }),
      setMarketingGoal: (goal) => set({ marketingGoal: goal }),
      setFunnelStage: (stage) => set({ funnelStage: stage }),

      // Reset
      resetStudio: () =>
        set({
          ...defaultState,
          availableProducts: get().availableProducts,
          selectedProduct: null,
          generationStatus: "idle",
          pipelineStage: "idle",
          finalContent: "",
          promptPipeline: null,
          platforms: get().platforms,
          marketingGoal: get().marketingGoal,
          funnelStage: get().funnelStage,
          wizardStep: "product",
          advancedOverrides: {},
          // Keep content preferences on reset
          contentLength: get().contentLength,
          hookStyle: get().hookStyle,
          ctaStyle: get().ctaStyle,
          emojiLevel: get().emojiLevel,
          hashtagMode: get().hashtagMode,
        }),
    }),
    { name: "AI-Studio" }
  )
);
