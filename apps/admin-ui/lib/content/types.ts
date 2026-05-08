/**
 * Shared TypeScript types for Content Module
 */

export type AIProviderType = "openai" | "gemini" | "ollama" | "lmstudio";
export type ContentType = "facebook" | "website" | "video" | "image";
export type ContentStatus = "draft" | "published" | "scheduled" | "archived";
export type ScheduleStatus = "pending" | "published" | "failed" | "cancelled";
export type PublishJobStatus = "pending" | "running" | "success" | "failed";
export type MediaPromptStatus = "pending" | "generated" | "failed";

export interface AIProvider {
  id: number;
  provider: AIProviderType;
  display_name: string;
  base_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AISettings {
  id: number;
  provider_id: number | null;
  base_url: string | null;
  model_name: string | null;
  api_key_encrypted: string | null;
  api_key_iv: string | null;
  temperature: number;
  max_tokens: number;
  brand_voice: string | null;
  prompt_rules: string | null;
  safety_rules: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AISettingsInput {
  provider_id: number;
  base_url?: string;
  model_name: string;
  api_key?: string;
  temperature: number;
  max_tokens: number;
  brand_voice?: string;
  prompt_rules?: string;
  safety_rules?: string;
  is_active?: boolean;
}

export interface AISettingsOutput {
  id: number;
  provider_id: number | null;
  provider?: string;
  provider_display_name?: string;
  base_url: string | null;
  model_name: string | null;
  api_key: string | null;
  temperature: number;
  max_tokens: number;
  brand_voice: string | null;
  prompt_rules: string | null;
  safety_rules: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentTemplate {
  id: number;
  template_name: string;
  content_type: ContentType;
  system_prompt: string | null;
  user_template: string;
  variables: string[];
  tone_options: string[];
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface ContentTemplateInput {
  template_name: string;
  content_type: ContentType;
  system_prompt?: string;
  user_template: string;
  variables?: string[];
  tone_options?: string[];
  is_active?: boolean;
}

export interface ContentItem {
  id: number;
  content_type: ContentType;
  title: string | null;
  content_body: string | null;
  product_id: string | null;
  product_name: string | null;
  status: ContentStatus;
  metadata: Record<string, unknown>;
  generated_by: string | null;
  template_id: number | null;
  created_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentItemInput {
  content_type: ContentType;
  title?: string;
  content_body?: string;
  product_id?: string;
  product_name?: string;
  status?: ContentStatus;
  metadata?: Record<string, unknown>;
  generated_by?: string;
  template_id?: number;
  created_by?: string;
  published_at?: string;
}

export interface ContentGenerationLog {
  id: number;
  content_item_id: number | null;
  provider: AIProviderType;
  model_name: string | null;
  request_payload: string | null;
  response_text: string | null;
  tokens_used: number | null;
  latency_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export interface ContentSchedule {
  id: number;
  content_item_id: number | null;
  channel: string;
  publish_at: string;
  timezone: string;
  status: ScheduleStatus;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentScheduleInput {
  content_item_id: number;
  channel: string;
  publish_at: string;
  timezone?: string;
  status?: ScheduleStatus;
  metadata?: Record<string, unknown>;
  created_by?: string;
}

export interface MediaPrompt {
  id: number;
  content_item_id: number | null;
  prompt: string;
  negative_prompt: string | null;
  style: string | null;
  aspect_ratio: string;
  quality: string;
  status: MediaPromptStatus;
  result_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaPromptInput {
  content_item_id?: number;
  prompt: string;
  negative_prompt?: string;
  style?: string;
  aspect_ratio?: string;
  quality?: string;
  status?: MediaPromptStatus;
  result_url?: string;
  created_by?: string;
}

export interface PublishChannel {
  id: number;
  channel_code: string;
  channel_name: string;
  icon: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublishJob {
  id: number;
  schedule_id: number | null;
  channel: string;
  status: PublishJobStatus;
  result: Record<string, unknown>;
  error_message: string | null;
  attempts: number;
  run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentStats {
  total_items: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  recent_items: ContentItem[];
  this_week: number;
  this_month: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
