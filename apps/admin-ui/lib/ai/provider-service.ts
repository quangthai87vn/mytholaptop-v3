/**
 * AI Provider Service
 * Wrapper around provider implementations
 * Load provider config từ DB và tạo provider instance
 */

import type { ProviderCard, ProviderType } from "@/types/ai-operating";
import {
  createAIProvider,
  type AIProvider,
  type AIProviderConfig,
} from "@/lib/content/ai/providers";
import type { ResolvedRouting } from "./routing-engine";

export interface ProviderContext {
  /** Routing decision đã chọn provider + model */
  routing: ResolvedRouting;
  /** Base URL override (từ AI Settings DB) */
  baseUrl?: string;
  /** API key override (từ AI Settings DB) */
  apiKey?: string;
}

/**
 * Normalize a provider slug to a known ProviderType.
 * Handles underscore-to-dash conversion and maps to known provider types.
 * For unknown slugs (e.g. "gemma_e4b", "openclaw"), falls back to OpenAI-compatible.
 */
function normalizeSlug(slug: string): ProviderType {
  // First normalize underscores to dashes
  const base = slug.replace(/_/g, "-").toLowerCase();

  // Map known provider types
  const knownTypes: ProviderType[] = [
    "openai", "gemini", "deepseek", "huggingface",
    "ollama", "lmstudio", "openai-compatible",
    "openrouter", "groq",
  ];

  // Direct match
  if ((knownTypes as string[]).includes(base)) {
    return base as ProviderType;
  }

  // Special cases
  if (base === "openai_compatible" || base === "openai-compatible") {
    return "openai-compatible";
  }
  if (base === "lm_studio" || base === "lmstudio") {
    return "lmstudio";
  }
  if (base === "ollama_local") {
    return "ollama";
  }
  if (base === "hugging_face" || base === "hf") {
    return "huggingface";
  }

  // Unknown type (custom provider slug like "gemma_e4b", "openclaw", "gemma4:e4b"):
  // Use OpenAI-compatible provider (generic OpenAI-compatible client)
  // The base_url from dbProvider will be used, so the actual endpoint is resolved
  return "openai-compatible";
}

/** Get default base URL for a normalized provider type */
function getDefaultBaseUrl(provider: ProviderType): string {
  const defaults: Record<ProviderType, string> = {
    openai: "https://api.openai.com/v1",
    gemini: "https://generativelanguage.googleapis.com/v1beta/models",
    deepseek: "https://api.deepseek.com/v1",
    huggingface: "https://api-inference.huggingface.co/models",
    ollama: "http://localhost:11434",
    lmstudio: "http://localhost:1234/v1",
    "openai-compatible": "http://localhost:8000/v1",
    openrouter: "https://openrouter.ai/api/v1",
    groq: "https://api.groq.com/openai/v1",
  };
  return defaults[provider] || "";
}

/**
 * Tạo AI provider instance từ routing decision và provider config.
 *
 * Provider lookup priority:
 * 1. dbProvider (matched by primary_provider_id FK) — has full config including base_url + api_key
 * 2. Fallback: find provider by routing.provider_slug (legacy routing that uses slug instead of FK)
 *
 * After dbProvider is resolved, base_url priority:
 * - dbProvider.base_url (most specific)
 * - routing.base_url (from routing engine)
 * - getDefaultBaseUrl(normalized slug) (generic default)
 *
 * If dbProvider is null, we use OpenAI-compatible with the routing.base_url or generic default.
 * This means custom provider slugs like "gemma_e4b" or "openclaw" will use the base_url
 * from the actual provider config in DB (looked up by slug in generation-service).
 */
export function createProviderFromRouting(
  routing: ResolvedRouting,
  dbProvider?: ProviderCard,
  apiKey?: string
): AIProvider {
  const config: AIProviderConfig = {
    // Priority: dbProvider.base_url > routing.base_url > default base URL
    base_url:
      dbProvider?.base_url ||
      routing.base_url ||
      getDefaultBaseUrl(normalizeSlug(routing.provider_slug)),
    api_key: apiKey,
    model_name: routing.model,
    temperature: routing.temperature,
    max_tokens: routing.max_tokens,
  };

  return createAIProvider(normalizeSlug(routing.provider_slug), config);
}

/** Kiểm tra provider có đang hoạt động không */
export function isProviderActive(
  providerType: string,
  providers?: ProviderCard[]
): boolean {
  if (!providers) return false;
  const p = providers.find((p) => p.type === providerType || p.slug === providerType);
  return p?.is_active ?? false;
}

/** Tìm provider config từ danh sách */
export function findProviderConfig(
  providerType: string,
  providers?: ProviderCard[]
): ProviderCard | undefined {
  if (!providers) return undefined;
  return providers.find((p) => p.type === providerType || p.slug === providerType);
}

/**
 * Tìm provider bằng slug (provider_type trong DB routing table).
 * Dùng khi primary_provider_id FK chưa được set trong routing table.
 *
 * Lookup order: slug (preferred) > type > name (case-insensitive)
 */
export function findProviderBySlug(
  slug: string,
  providers: ProviderCard[]
): ProviderCard | null {
  const lower = slug.toLowerCase();
  return (
    providers.find(
      (p) =>
        p.slug?.toLowerCase() === lower ||
        p.type?.toLowerCase() === lower ||
        p.name?.toLowerCase() === lower
    ) ?? null
  );
}
