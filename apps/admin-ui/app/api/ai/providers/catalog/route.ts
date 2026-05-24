/**
 * Provider Catalog API
 * GET /api/ai/providers/catalog
 *
 * Returns known provider templates for the Provider Library dialog.
 * These are NOT from database — they are static reference data
 * that users can use to quickly add a new provider.
 *
 * The actual providers stored in DB are returned by GET /api/ai/providers
 */

import { NextResponse } from "next/server";

export async function GET() {
  // This is static reference data only — does NOT come from DB
  const catalog = [
    // Cloud APIs
    {
      slug: "openai",
      name: "OpenAI",
      group_slug: "cloud_api" as const,
      type: "openai",
      base_url: "https://api.openai.com/v1",
      default_model: "gpt-4o-mini",
      requires_key: true,
      description: "GPT-4o, GPT-4o-mini — Mô hình mạnh nhất",
      tier: "cloud",
    },
    {
      slug: "gemini",
      name: "Google Gemini",
      group_slug: "cloud_api" as const,
      type: "gemini",
      base_url: "https://generativelanguage.googleapis.com/v1beta/models",
      default_model: "gemini-2.0-flash",
      requires_key: true,
      description: "Gemini 2.0 Flash — Nhanh và tiết kiệm token",
      tier: "cloud",
    },
    {
      slug: "deepseek",
      name: "DeepSeek Cloud",
      group_slug: "cloud_api" as const,
      type: "deepseek",
      base_url: "https://api.deepseek.com/v1",
      default_model: "deepseek-chat",
      requires_key: true,
      description: "DeepSeek Chat & Reasoner — Chi phí thấp, hiệu suất cao",
      tier: "cloud",
    },
    // AI Aggregators
    {
      slug: "openrouter",
      name: "OpenRouter",
      group_slug: "ai_aggregator" as const,
      type: "openrouter",
      base_url: "https://openrouter.ai/api/v1",
      default_model: "openrouter/anthropic/claude-3.5-sonnet",
      requires_key: true,
      description: "Truy cập 100+ models (Claude, GPT, Llama, Mistral...)",
      tier: "cloud",
    },
    {
      slug: "groq",
      name: "Groq",
      group_slug: "ai_aggregator" as const,
      type: "groq",
      base_url: "https://api.groq.com/openai/v1",
      default_model: "llama-3.3-70b-versatile",
      requires_key: true,
      description: "Inference cực nhanh với chip LPU",
      tier: "cloud",
    },
    // Local LLMs
    {
      slug: "ollama",
      name: "Ollama",
      group_slug: "local_llm" as const,
      type: "ollama",
      base_url: "http://localhost:11434",
      default_model: "llama3.2",
      requires_key: false,
      description: "Chạy DeepSeek, Llama, Qwen... local. Miễn phí API",
      tier: "local",
    },
    {
      slug: "lmstudio",
      name: "LM Studio",
      group_slug: "local_llm" as const,
      type: "lmstudio",
      base_url: "http://localhost:1234/v1",
      default_model: "local-model",
      requires_key: false,
      description: "Desktop app chạy LLMs local. Miễn phí API",
      tier: "local",
    },
    {
      slug: "openai-compatible",
      name: "OpenAI-Compatible",
      group_slug: "local_llm" as const,
      type: "openai-compatible",
      base_url: "http://localhost:8000/v1",
      default_model: "local-model",
      requires_key: false,
      description: "vLLM, TGI, LocalAI... server tự host. Miễn phí API",
      tier: "local",
    },
    // Inference Platform
    {
      slug: "huggingface",
      name: "HuggingFace",
      group_slug: "inference_platform" as const,
      type: "huggingface",
      base_url: "https://api-inference.huggingface.co/models",
      default_model: "mistralai/Mistral-7B-Instruct-v0.2",
      requires_key: true,
      description: "Inference API — Hàng nghìn model open-source",
      tier: "inference",
    },
    // Custom
    {
      slug: "custom",
      name: "Custom Provider",
      group_slug: "cloud_api" as const,
      type: "custom",
      base_url: "",
      default_model: "",
      requires_key: false,
      description: "Provider tùy chỉnh hoàn toàn với URL và model riêng",
      tier: "cloud",
    },
  ];

  return NextResponse.json({ data: catalog });
}
