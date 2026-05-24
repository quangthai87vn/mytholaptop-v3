/**
 * AI Operating Center Types v3
 * Provider architecture:
 *   - Cloud: OpenAI, Google Gemini, DeepSeek Cloud
 *   - Inference: HuggingFace
 *   - Local Runtime: Ollama, LM Studio, OpenAI-compatible
 *   - DeepSeek model family chạy local qua Ollama/LM Studio
 */

// ── Provider Tier (where it runs) ─────────────────────────────────────────────

export type ProviderTier = "cloud" | "local" | "inference";

// ── Local Runtime (local LLM software) ─────────────────────────────────────────

export type LocalRuntime = "ollama" | "lmstudio" | "openai-compatible";

export const LOCAL_RUNTIME_META: Record<LocalRuntime, {
  label: string;
  defaultPort: number;
  description: string;
  requiresApiKey: boolean;
  usesOpenAICompat: boolean;
}> = {
  ollama: {
    label: "Ollama",
    defaultPort: 11434,
    description: "Download & run LLMs locally. Không tốn phí API.",
    requiresApiKey: false,
    usesOpenAICompat: false,
  },
  lmstudio: {
    label: "LM Studio",
    defaultPort: 1234,
    description: "Desktop app chạy LLMs. Không tốn phí API.",
    requiresApiKey: false,
    usesOpenAICompat: true,
  },
  "openai-compatible": {
    label: "OpenAI-Compatible Server",
    defaultPort: 8000,
    description: "Tất cả server OpenAI-compatible (vLLM, Text Generation Inference, etc.)",
    requiresApiKey: false,
    usesOpenAICompat: true,
  },
};

// ── Model Families (for Ollama model suggestions) ──────────────────────────────

export type ModelFamily = "general" | "deepseek" | "qwen" | "llama" | "gemma" | "mistral";

export const MODEL_FAMILY_META: Record<ModelFamily, {
  label: string;
  suggestedModels: string[];
  description: string;
}> = {
  general: {
    label: "General",
    suggestedModels: ["llama3.2", "llama3.1", "mistral", "mixtral"],
    description: "Models đa năng, cân bằng giữa chất lượng và tốc độ",
  },
  deepseek: {
    label: "DeepSeek",
    suggestedModels: ["deepseek-r1:1.5b", "deepseek-r1:7b", "deepseek-r1:8b", "deepseek-r1:14b", "deepseek-coder:6.7b", "deepseek-v3"],
    description: "DeepSeek R1 — Reasoning model mạnh, chi phí thấp. Cần download riêng trong Ollama.",
  },
  qwen: {
    label: "Qwen",
    suggestedModels: ["qwen2.5:7b", "qwen2.5:14b", "qwen2.5-coder:7b", "qwen2.5:72b"],
    description: "Alibaba Qwen — Hỗ trợ Tiếng Việt tốt, nhiều size model",
  },
  llama: {
    label: "Llama",
    suggestedModels: ["llama3.2:1b", "llama3.2:3b", "llama3.2", "llama3.1:8b", "llama3.1:70b"],
    description: "Meta Llama — Open-source phổ biến nhất",
  },
  gemma: {
    label: "Gemma",
    suggestedModels: ["gemma2:2b", "gemma2:9b", "gemma2:27b"],
    description: "Google Gemma — Nhẹ, nhanh, chạy được trên laptop",
  },
  mistral: {
    label: "Mistral",
    suggestedModels: ["mistral-nemo", "mistral-large", "codestral"],
    description: "Mistral AI — Cân bằng giữa chất lượng và hiệu suất",
  },
};

// ── Provider Type (discriminated union by tier) ────────────────────────────────

// Built-in providers + custom (openrouter, groq, v.v.)
export type ProviderType =
  | "openai"     // Cloud
  | "gemini"     // Cloud
  | "deepseek"   // Cloud
  | "huggingface" // Inference platform
  | "ollama"     // Local runtime
  | "lmstudio"   // Local runtime
  | "openai-compatible" // Local runtime
  | "openrouter" // Cloud inference aggregator
  | "groq";     // Cloud inference (fast GPU)

export type ProviderStatus = "connected" | "offline" | "error" | "unknown";

// ── Provider Group Types ────────────────────────────────────────────────────────

export type ProviderGroupSlug = "cloud_api" | "ai_aggregator" | "local_llm" | "inference_platform";

export interface ProviderGroup {
  id: number;
  name: string;
  slug: ProviderGroupSlug;
  icon: string;
  sort_order: number;
}

export const DEFAULT_PROVIDER_GROUPS: ProviderGroup[] = [
  { id: 1, name: "Cloud APIs",         slug: "cloud_api",          icon: "Cloud",          sort_order: 1 },
  { id: 2, name: "AI Aggregator",      slug: "ai_aggregator",     icon: "Layers",         sort_order: 2 },
  { id: 3, name: "Local LLM",          slug: "local_llm",          icon: "Cpu",            sort_order: 3 },
  { id: 4, name: "Inference Platform", slug: "inference_platform", icon: "Layers",         sort_order: 4 },
];

// Map provider slug → group
export const PROVIDER_GROUP_MAP: Record<ProviderType, ProviderGroupSlug> = {
  openai:              "cloud_api",
  gemini:              "cloud_api",
  deepseek:            "cloud_api",
  openrouter:          "ai_aggregator",
  groq:                "ai_aggregator",
  ollama:              "local_llm",
  lmstudio:            "local_llm",
  "openai-compatible": "local_llm",
  huggingface:         "inference_platform",
};

export function getGroupForProvider(type: ProviderType): ProviderGroupSlug {
  return PROVIDER_GROUP_MAP[type] ?? "cloud_api";
}

// ── Provider Config (per type) ─────────────────────────────────────────────────

export interface ProviderConfig {
  // Common
  tier: ProviderTier;
  label: string;
  description: string;
  defaultUrl: string;
  cloudModels?: string[];       // Pre-defined cloud models
  requiresApiKey: boolean;
  accentColor: string;
  icon: string;
}

export const PROVIDER_CONFIG: Record<ProviderType, ProviderConfig> = {
  // ── Cloud Providers ──────────────────────────────────────────────────────
  openai: {
    tier: "cloud",
    label: "OpenAI",
    description: "GPT-4o, GPT-4o-mini — Mạnh nhất, chi phí vừa phải",
    defaultUrl: "https://api.openai.com/v1",
    cloudModels: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    requiresApiKey: true,
    accentColor: "#10A37F",
    icon: "Zap",
  },
  gemini: {
    tier: "cloud",
    label: "Google Gemini",
    description: "Gemini 2.0 Flash — Nhanh và tiết kiệm token",
    defaultUrl: "https://generativelanguage.googleapis.com/v1beta/models",
    cloudModels: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.5-pro-preview-06-05"],
    requiresApiKey: true,
    accentColor: "#4285F4",
    icon: "Zap",
  },
  deepseek: {
    tier: "cloud",
    label: "DeepSeek Cloud",
    description: "DeepSeek Chat & Reasoner — Chi phí thấp, hiệu suất cao. Bắt buộc API Key.",
    defaultUrl: "https://api.deepseek.com/v1",
    cloudModels: ["deepseek-chat", "deepseek-reasoner"],
    requiresApiKey: true,
    accentColor: "#0066FF",
    icon: "Zap",
  },
  // ── Inference Platform ───────────────────────────────────────────────────
  huggingface: {
    tier: "inference",
    label: "HuggingFace",
    description: "Inference API — Hàng nghìn model open-source",
    defaultUrl: "https://api-inference.huggingface.co/models",
    requiresApiKey: true,
    accentColor: "#FFD21E",
    icon: "Layers",
  },
  // ── Local Runtimes ─────────────────────────────────────────────────────
  ollama: {
    tier: "local",
    label: "Ollama",
    description: "Chạy DeepSeek, Llama, Qwen, Gemma... local. Miễn phí, cần Ollama chạy ở localhost.",
    defaultUrl: "http://localhost:11434",
    requiresApiKey: false,
    accentColor: "#CC3300",
    icon: "Cpu",
  },
  lmstudio: {
    tier: "local",
    label: "LM Studio",
    description: "Chạy DeepSeek, Llama... local qua LM Studio. Miễn phí, cần LM Studio chạy ở localhost.",
    defaultUrl: "http://localhost:1234/v1",
    requiresApiKey: false,
    accentColor: "#FF6B35",
    icon: "Cpu",
  },
  "openai-compatible": {
    tier: "local",
    label: "OpenAI-Compatible",
    description: "Kết nối bất kỳ server nào dùng OpenAI API (vLLM, TGI, LocalAI...).",
    defaultUrl: "http://localhost:8000/v1",
    requiresApiKey: false,
    accentColor: "#9333EA",
    icon: "Cpu",
  },
  // ── Custom / Aggregator Providers ─────────────────────────────────────────
  openrouter: {
    tier: "cloud",
    label: "OpenRouter",
    description: "Truy cập 100+ models (Claude, GPT, Llama, Mistral...) qua OpenRouter.",
    defaultUrl: "https://openrouter.ai/api/v1",
    cloudModels: [],
    requiresApiKey: true,
    accentColor: "#FF6B35",
    icon: "Layers",
  },
  groq: {
    tier: "cloud",
    label: "Groq",
    description: "Inference cực nhanh với chip LPU. Miễn phí tier có giới hạn.",
    defaultUrl: "https://api.groq.com/openai/v1",
    cloudModels: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    requiresApiKey: true,
    accentColor: "#00D2FF",
    icon: "Zap",
  },
};

export const PROVIDER_TIERS: { id: ProviderTier; label: string; icon: string }[] = [
  { id: "cloud", label: "Cloud APIs", icon: "Cloud" },
  { id: "local", label: "Local LLM", icon: "Cpu" },
  { id: "inference", label: "Inference Platform", icon: "Layers" },
];

// Helper: get providers by tier
export function getProvidersByTier(tier: ProviderTier): ProviderType[] {
  return (Object.keys(PROVIDER_CONFIG) as ProviderType[]).filter(
    (p) => PROVIDER_CONFIG[p].tier === tier
  );
}

// Helper: is local runtime
export function isLocalRuntime(p: ProviderType | string): boolean {
  const cfg = PROVIDER_CONFIG[p as ProviderType];
  return cfg ? cfg.tier === "local" : false;
}

// Helper: requires API key
export function requiresApiKey(p: ProviderType | string): boolean {
  const cfg = PROVIDER_CONFIG[p as ProviderType];
  return cfg ? cfg.requiresApiKey : true;
}

// ── Provider Model ──────────────────────────────────────────────────────────────

export interface ProviderModel {
  id: string;
  name: string;
  display_name: string;
  context_window?: number;
  supports_vision?: boolean;
  supports_streaming?: boolean;
  model_family?: ModelFamily;
}

// ── Provider Health ──────────────────────────────────────────────────────────────

export interface ProviderHealth {
  status: ProviderStatus;
  latency_ms: number | null;
  error?: string;
  models?: ProviderModel[];
}

// ── Provider Card (UI representation) ────────────────────────────────────────────

/**
 * ProviderCard is the canonical frontend representation of an AI provider.
 *
 * Field semantics:
 *   display_name — Tên hiển thị trong UI (tên thân thiện người dùng)
 *   type         — Internal provider key từ DB column `provider` (e.g. "openclaw")
 *   slug         — Routing key từ DB column `slug` (e.g. "openclaw")
 *   name         — Alias cho display_name (để tương thích code cũ)
 *
 * DB column mapping:
 *   display_name ← ai_providers.display_name (Tên hiển thị)
 *   type         ← ai_providers.provider     (Internal key, không đổi)
 *   slug         ← ai_providers.slug         (Routing key)
 *   name         ← ai_providers.display_name (dùng thay thế display_name)
 */
export interface ProviderCard {
  id: number;
  // Internal keys (from DB columns)
  type: ProviderType;           // = DB.provider — internal key, e.g. "openclaw"
  slug: string;                 // = DB.slug     — routing key
  // UI display name
  display_name: string;         // = DB.display_name — tên hiển thị trong UI
  name: string;                  // alias cho display_name (backward compat)
  // Runtime config fields
  base_url: string | null;
  is_active: boolean;
  sort_order: number;
  health?: ProviderHealth;
  request_count?: number;
  // New schema fields
  group_slug?: ProviderGroupSlug;
  status?: "active" | "inactive";
  is_system?: boolean;
  is_default?: boolean;
  connection_status?: "connected" | "error" | "unknown" | "testing";
  last_checked_at?: string | null;
  last_error?: string | null;
  custom_headers?: Record<string, string>;
  // Runtime config
  model_name?: string | null;
  temperature?: number | null;
  streaming_enabled?: boolean | null;
  timeout_ms?: number | null;
  retry_count?: number | null;
  max_output_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

// ── Runtime Config (UI state, not from DB directly) ──────────────────────────────

export interface AIRuntimeConfig {
  // Which provider this config belongs to
  provider_id?: number;
  // Connection
  base_url: string;
  api_key: string;
  // Model
  model_name: string;
  model_family?: ModelFamily;   // Ollama: selected family
  local_runtime?: LocalRuntime;  // local: which runtime software
  context_window?: number;
  // Generation params
  temperature: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  max_output_tokens?: number;
  // Connection params
  timeout_ms: number;
  retry_count: number;
  enable_streaming: boolean;
}

// ── Runtime Inspector Stats ────────────────────────────────────────────────────

export interface RuntimeStats {
  provider: ProviderType;
  localRuntime?: LocalRuntime;
  modelFamily?: ModelFamily;
  model: string;
  context_window: number | null;
  tokens_used: number;
  tokens_remaining: number | null;
  vram_estimate_gb: number | null;
  request_latency_ms: number | null;
  streaming_active: boolean;
  estimated_cost_vnd: number;
  is_local: boolean;
  total_requests: number;
}

// ── Request Stats ──────────────────────────────────────────────────────────────

export interface RequestStats {
  total: number;
  success: number;
  errors: number;
  total_tokens: number;
  total_latency_ms: number;
}

// ── Task Routing v2 ─────────────────────────────────────────────────────────
// Forward-declare so RoutingRuleInput can reference AIProvider type
export type AITaskType =
  | "facebook_content"
  | "seo_article"
  | "video_script"
  | "image_prompt"
  | "zalo_message"
  | "product_description"
  | "email_marketing";

/**
 * RoutingRule — new interface for routing rules stored in ai_task_routes.
 *
 * Key design: Routing rules reference Providers by FK (primary_provider_id),
 * not by duplicating provider fields. Model selection is optional — if
 * primary_model_override is null/empty, the routing resolver falls back
 * to the provider's default_model / runtime_config.selected_model.
 *
 * Backward compatibility: The DB column names remain as-is (provider_type,
 * model_name, etc.) but the TypeScript interface uses override semantics.
 * The CRUD layer maps between old column names and new field names.
 */
export interface RoutingRule {
  id: number;
  task_type: AITaskType;
  task_label: string;

  // Primary provider (FK to ai_providers.id)
  primary_provider_id: number | null;
  primary_model_override: string | null;

  // Fallback provider (FK to ai_providers.id)
  fallback_provider_id: number | null;
  fallback_model_override: string | null;

  // Optional generation overrides — null means "use provider runtime config"
  temperature_override: number | null;
  max_tokens_override: number | null;
  top_p_override: number | null;

  priority: number;
  system_prompt_id: number | null;
  brand_preset: BrandPreset | null;

  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Input for creating/updating a routing rule */
export interface RoutingRuleInput {
  task_type: AITaskType;
  task_label?: string;

  primary_provider_id: number | null;
  primary_model_override?: string | null;

  fallback_provider_id?: number | null;
  fallback_model_override?: string | null;

  temperature_override?: number | null;
  max_tokens_override?: number | null;
  top_p_override?: number | null;

  priority?: number;
  system_prompt_id?: number | null;
  brand_preset?: BrandPreset | null;

  is_active?: boolean;
}

// ── Legacy TaskRoute (backward compat) ──────────────────────────────────────
// Old interface that the current DB schema + CRUD still uses.
// Will be phased out once all consumers migrate to RoutingRule.
/** @deprecated Use RoutingRule instead */
export interface TaskRoute {
  id: number;
  task_type: AITaskType;
  task_label: string;
  // Primary — provider_type stores slug string, model_name stores model
  provider_type: ProviderType;
  model_name: string;
  // Fallback
  fallback_provider_type?: ProviderType;
  fallback_model_name?: string;
  // Settings
  temperature: number;
  max_tokens: number;
  priority: number;
  system_prompt_id?: number;
  brand_preset?: BrandPreset;
  // Status
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use RoutingRuleInput instead */
export interface TaskRouteInput {
  task_type: AITaskType;
  provider_type: ProviderType;
  model_name: string;
  fallback_provider_type?: ProviderType;
  fallback_model_name?: string;
  temperature?: number;
  max_tokens?: number;
  priority?: number;
  system_prompt_id?: number;
  brand_preset?: BrandPreset;
  is_active?: boolean;
}

export const TASK_ROUTE_LABELS: Record<AITaskType, string> = {
  facebook_content: "Bài viết Facebook",
  seo_article: "Bài viết SEO Website",
  video_script: "Kịch bản Video",
  image_prompt: "Prompt Hình ảnh",
  zalo_message: "Tin nhắn Zalo",
  product_description: "Mô tả sản phẩm",
  email_marketing: "Email Marketing",
};

/**
 * Resolved routing output — returned by the routing resolver.
 * Contains the fully-resolved provider + model + runtime config ready for use.
 */
export interface ResolvedRouting {
  provider_id: number | null;
  provider_name: string;
  provider_slug: string;
  base_url: string | null;
  model: string;
  effective_model_source: "routing_override" | "provider_default" | "system_default";
  temperature: number;
  max_tokens: number;
  top_p: number;
  streaming_enabled: boolean;
  fallback_provider_id: number | null;
  fallback_model: string | null;
  fallback_model_source: "routing_override" | "provider_default" | "none";
  system_prompt_id: number | null;
  brand_preset: BrandPreset | null;
  reasoning: string;
  source: "routing_rule" | "provider_default" | "system_default";
  task_route_id: number | null;
}

/**
 * Display info for the routing table "Effective Model" column.
 */
export interface EffectiveModelDisplay {
  model: string;
  is_override: boolean;
  provider_name: string;
  label: string;
  tooltip: string;
}

// ── Brand Voice ────────────────────────────────────────────────────────────────

export type BrandPreset =
  | "professional"
  | "gaming"
  | "student"
  | "business"
  | "apple_premium"
  | "budget_friendly";

export interface BrandPresetOption {
  value: BrandPreset;
  label: string;
  description: string;
  target_audience: string;
  tone_instruction: string;
  keywords_to_use: string[];
  keywords_to_avoid: string[];
  cta_style: "direct" | "friendly" | "urgency" | "soft";
  emoji_usage: "none" | "minimal" | "moderate" | "heavy";
  example_output: string;
}

export const BRAND_PRESET_OPTIONS: BrandPresetOption[] = [
  {
    value: "professional",
    label: "Chuyên nghiệp",
    description: "Phong cách trang trọng, chuyên nghiệp cho doanh nghiệp",
    target_audience: "Doanh nhân, quản lý, kỹ sư IT",
    tone_instruction: "Giọng văn chuyên nghiệp, trang trọng, dùng thuật ngữ kỹ thuật chính xác.",
    keywords_to_use: ["chất lượng", "bảo hành", "tin cậy", "hiệu suất", "đáng giá"],
    keywords_to_avoid: ["rẻ", "tốt rẻ", "free", "siêu rẻ"],
    cta_style: "direct",
    emoji_usage: "minimal",
    example_output: "Laptop Dell Latitude 5540 — lựa chọn hoàn hảo cho doanh nhân với chip Intel Core i7 thế hệ 13.",
  },
  {
    value: "gaming",
    label: "Gaming",
    description: "Phong cách năng động cho game thủ và giới trẻ",
    target_audience: "Game thủ, sinh viên, người trẻ thích công nghệ",
    tone_instruction: "Giọng văn năng động, hào hứng, truyền cảm hứng. Nhấn mạnh FPS, hiệu ứng, tốc độ.",
    keywords_to_use: ["mạnh mẽ", "chiến game", "RGB", "144Hz", "RTX", "GPU", "FPS"],
    keywords_to_avoid: ["văn phòng", "bền", "tiết kiệm pin"],
    cta_style: "urgency",
    emoji_usage: "heavy",
    example_output: "🎮 Cấu hình KHỦNG! RTX 4060 + i7 Gen 13 — Chiến mượt mọi tựa game AAA!",
  },
  {
    value: "student",
    label: "Sinh viên",
    description: "Giọng văn gần gũi, dễ hiểu cho sinh viên",
    target_audience: "Học sinh, sinh viên, người có ngân sách hạn chế",
    tone_instruction: "Giọng văn thân thiện, gần gũi, đơn giản. Nhấn mạnh giá thành học tập, tính di động.",
    keywords_to_use: ["giá sinh viên", "học tập", "nhẹ", "pin trâu", "mỏng nhẹ"],
    keywords_to_avoid: ["doanh nghiệp", "sang trọng", "Executive"],
    cta_style: "friendly",
    emoji_usage: "moderate",
    example_output: "Laptop này cực kỳ phù hợp cho bạn sinh viên nè! Giá chỉ từ 12 triệu, nhẹ xoay 360 độ.",
  },
  {
    value: "business",
    label: "Doanh nhân",
    description: "Sang trọng, uy tín cho doanh nhân và doanh nghiệp",
    target_audience: "Doanh nhân, CEO, giám đốc, người có thu nhập cao",
    tone_instruction: "Giọng văn sang trọng, uy tín, đẳng cấp. Nhấn mạnh thương hiệu, bảo mật, di động.",
    keywords_to_use: ["đẳng cấp", "sang trọng", "bảo mật", "thương hiệu", "doanh nhân"],
    keywords_to_avoid: ["rẻ", "tiết kiệm", "sinh viên", "game"],
    cta_style: "direct",
    emoji_usage: "none",
    example_output: "MacBook Pro M3 — công cụ của những nhà lãnh đạo. Thiết kế tinh tế, hiệu suất vượt trội.",
  },
  {
    value: "apple_premium",
    label: "Apple Premium",
    description: "Tinh tế, đẳng cấp như Apple Store",
    target_audience: "Người yêu Apple, tín đồ công nghệ, designer",
    tone_instruction: "Giọng văn tinh tế, đẳng cấp. Nhấn mạnh thiết kế, hệ sinh thái, trải nghiệm.",
    keywords_to_use: ["Apple", "ecosystem", "tinh tế", "mượt mà", "bền bỉ", "hệ sinh thái"],
    keywords_to_avoid: ["Windows", "Android", "rẻ tiền"],
    cta_style: "soft",
    emoji_usage: "minimal",
    example_output: "MacBook Air M3 — mỏng nhẹ chưa từng thấy. Chip M3 thế hệ mới, pin 18 giờ.",
  },
  {
    value: "budget_friendly",
    label: "Giá rẻ dễ tiếp cận",
    description: "Tập trung vào giá trị và tiết kiệm chi phí",
    target_audience: "Người có ngân sách hạn chế, gia đình, người dùng phổ thông",
    tone_instruction: "Giọng văn đơn giản, thực tế. Nhấn mạnh giá trị, bền, tiết kiệm chi phí.",
    keywords_to_use: ["giá tốt", "tiết kiệm", "bền", "chất lượng", "ưu đãi", "khuyến mãi"],
    keywords_to_avoid: ["cao cấp", "sang trọng", "Executive", "premium"],
    cta_style: "friendly",
    emoji_usage: "moderate",
    example_output: "Chỉ từ 8.990.000đ — Laptop giá sinh viên cấu hình tốt, bền bỉ cho nhu cầu học tập và văn phòng.",
  },
];

export interface BrandVoice {
  id: number;
  preset: BrandPreset;
  name: string;
  description: string;
  target_audience: string;
  tone_instruction: string;
  keywords_to_use: string[];
  keywords_to_avoid: string[];
  tone_professional_casual: number;
  tone_luxury_affordable: number;
  tone_technical_simple: number;
  content_template: string;
  emoji_usage: "none" | "minimal" | "moderate" | "heavy";
  cta_style: "direct" | "friendly" | "urgency" | "soft";
  example_output: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandVoiceInput {
  preset: BrandPreset;
  name: string;
  description: string;
  target_audience?: string;
  tone_instruction?: string;
  keywords_to_use?: string[];
  keywords_to_avoid?: string[];
  tone_professional_casual?: number;
  tone_luxury_affordable?: number;
  tone_technical_simple?: number;
  content_template?: string;
  emoji_usage?: "none" | "minimal" | "moderate" | "heavy";
  cta_style?: "direct" | "friendly" | "urgency" | "soft";
  example_output?: string;
  is_active?: boolean;
}

// Default Vietnamese System Prompt
export const DEFAULT_VI_SYSTEM_PROMPT = `Luôn trả lời bằng tiếng Việt. Không dùng tiếng Trung hoặc tiếng Anh trừ khi được yêu cầu. Không hiển thị quá trình suy luận. Chỉ trả về kết quả cuối cùng.`;

// ── Prompt Rules ──────────────────────────────────────────────────────────────

export interface GlobalPromptRule {
  id: number;
  rule_key: string;
  rule_text: string;
  is_active: boolean;
  priority: number;
  created_at: string;
}

export interface PlatformPromptRule {
  id: number;
  platform: "facebook" | "website" | "video" | "image" | "zalo" | "email";
  rule_key: string;
  rule_text: string;
  is_active: boolean;
  created_at: string;
}

export interface PromptRulesConfig {
  global_rules: GlobalPromptRule[];
  platform_rules: Record<string, PlatformPromptRule[]>;
}

// ── Safety Rules ───────────────────────────────────────────────────────────────

export interface SafetyRule {
  id: number;
  rule_key: string;
  rule_text: string;
  severity: "low" | "medium" | "high";
  is_active: boolean;
  created_at: string;
}

export interface SafetyConfig {
  enabled: boolean;
  block_sensitive_content: boolean;
  block_false_claims: boolean;
  block_competitor_mentions: boolean;
  max_claims_per_post: number;
  blacklist_keywords: string[];
  safety_rules: SafetyRule[];
}

export const DEFAULT_SAFETY_RULES: Omit<SafetyRule, "id" | "created_at">[] = [
  { rule_key: "no_sensitive", rule_text: "Không viết nội dung nhạy cảm về chính trị, tôn giáo, sắc tộc", severity: "high", is_active: true },
  { rule_key: "no_false_claim", rule_text: "Không đưa ra claim vượt quá khả năng sản phẩm", severity: "medium", is_active: true },
  { rule_key: "no_competitor", rule_text: "Không nhắc đến đối thủ cạnh tranh trực tiếp", severity: "low", is_active: true },
  { rule_key: "no_spam", rule_text: "Không spam emoji hoặc ký tự đặc biệt liên tục", severity: "low", is_active: true },
  { rule_key: "no_pricing_claim", rule_text: "Không đưa ra cam kết giá cụ thể nếu chưa xác nhận", severity: "medium", is_active: true },
  { rule_key: "appropriate_age", rule_text: "Nội dung phù hợp với mọi lứa tuổi", severity: "medium", is_active: true },
];

// ── Usage Analytics ───────────────────────────────────────────────────────────

export interface UsageStats {
  requests_today: number;
  requests_this_week: number;
  requests_this_month: number;
  tokens_today: number;
  tokens_this_week: number;
  tokens_this_month: number;
  estimated_cost_today: number;
  estimated_cost_this_month: number;
  active_provider: ProviderType | null;
  local_vs_cloud: { local: number; cloud: number };
  top_models: Array<{ model: string; requests: number; tokens: number }>;
  cost_by_provider: Array<{ provider: ProviderType; estimated_vnd: number; requests: number }>;
  generated_at: string;
}

// ── Test Playground ───────────────────────────────────────────────────────────

export interface PlaygroundMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  tokens_used?: number;
  latency_ms?: number;
  timestamp: number;
  streaming?: boolean;
}

export interface PlaygroundConfig {
  provider_type: ProviderType;
  model_name: string;
  temperature: number;
  max_tokens: number;
  system_prompt?: string;
}

// ── System Prompt Templates ───────────────────────────────────────────────────

export interface SystemPromptTemplate {
  id: number;
  name: string;
  description: string;
  prompt_text: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

// ── Media AI ─────────────────────────────────────────────────────────────────

export type MediaImageModel = "openai_dall_e" | "stability" | "comfyui" | "sdxl" | "flux";
export type MediaPromptModel = "gemini" | "deepseek" | "ollama";

export interface MediaAIConfig {
  // Prompt Enhancer Model (LLM để viết prompt hình ảnh)
  prompt_model: MediaPromptModel;
  prompt_model_name?: string;
  prompt_temperature?: number;
  // Image Generation Model
  image_model: MediaImageModel;
  image_model_url?: string; // ComfyUI endpoint
  openai_api_key?: string;  // OpenAI Image API key
  stability_api_key?: string;
}

export interface MediaAIJob {
  id: string;
  type: "image" | "video" | "audio";
  status: "pending" | "processing" | "done" | "failed";
  prompt: string;
  enhanced_prompt?: string;
  result_url?: string;
  model_used: string;
  created_at: string;
}

// ── AI Settings (comprehensive) ─────────────────────────────────────────────

export interface AISettingsState {
  activeProvider: ProviderCard | null;
  providers: ProviderCard[];
  runtimeConfig: AIRuntimeConfig;
  taskRoutes: TaskRoute[];
  activeBrandVoice: BrandVoice | null;
  brandVoices: BrandVoice[];
  promptRules: PromptRulesConfig;
  safetyConfig: SafetyConfig;
  usageStats: UsageStats | null;
}
