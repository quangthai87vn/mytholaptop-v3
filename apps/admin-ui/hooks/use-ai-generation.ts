/**
 * AI Content Studio - Generation Hook v2
 *
 * Lifecycle states:
 *   idle → resolving → generating → streaming → finalizing → completed
 *                                                       ↘ error
 *                                                       ↘ stopped (user abort)
 *
 * Backend sends SSE events: generation_start, stage_start, stage_done, token, generation_done
 *
 * Timeout:
 *   120s → warning toast  |  180s → force abort + keep partial
 */

const DEV = process.env.NODE_ENV === "development";

import { useCallback, useRef } from "react";
import {
  useStudioStore,
  type StudioContentType,
  type GenerationResult,
  type GenerationStats,
  type PipelineStage,
  CONTENT_TYPE_TO_TASK,
} from "@/store/ai-studio-store";
import type { AIProduct } from "@/types/content";
import { postProcess } from "@/lib/ai/post-processor";
import { toast } from "sonner";

// ── Module-level refs (shared across hook instances, used by stopGeneration) ──────

const abortRef = { current: null as AbortController | null };
const timeoutWarningRef = { current: null as ReturnType<typeof setTimeout> | null };
const timeoutAbortRef = { current: null as ReturnType<typeof setTimeout> | null };

// ── Constants ───────────────────────────────────────────────────────────────────

const TIMEOUT_WARNING_MS = 120_000;  // 2 min → warning toast
const TIMEOUT_ABORT_MS = 180_000;   // 3 min → force stop

// ── Content type label ─────────────────────────────────────────────────────────

function contentTypeLabel(ct: StudioContentType): string {
  const map: Record<StudioContentType, string> = {
    facebook_post: "Bài Facebook",
    seo_article: "Bài SEO",
    video_script: "Kịch bản Video",
    image_prompt: "Prompt Hình ảnh",
    zalo_message: "Tin nhắn Zalo",
    product_description: "Mô tả sản phẩm",
    email_marketing: "Email Marketing",
  };
  return map[ct] || "Nội dung";
}

// ── Pipeline stage mapper ───────────────────────────────────────────────────────

function mapStageToPipeline(stageName: string): PipelineStage {
  const map: Record<string, PipelineStage> = {
    resolving: "resolving",
    analyzing: "analyzing",
    building_prompt: "building_prompt",
    writing_main: "writing_main",
    writing_hooks: "writing_hooks",
    writing_cta: "writing_cta",
    writing_seo: "writing_seo",
    writing_hashtags: "writing_hashtags",
    finalizing: "finalizing",
  };
  return map[stageName] ?? "writing_main";
}

// ── Clear timeout timers ───────────────────────────────────────────────────────

function clearTimers() {
  if (timeoutWarningRef.current) { clearTimeout(timeoutWarningRef.current); timeoutWarningRef.current = null; }
  if (timeoutAbortRef.current) { clearTimeout(timeoutAbortRef.current); timeoutAbortRef.current = null; }
}

// ── Finalize: post-process + store result ──────────────────────────────────────

function finalizeResult(
  store: ReturnType<typeof useStudioStore.getState>,
  content: string,
  product: AIProduct,
  startTime: number,
  routingMeta?: Record<string, unknown>
) {
  const processed = postProcess(content || "");

  const generationResult: GenerationResult = {
    content: processed.content || content || "",
    title:
      processed.title ||
      `${product.name} - ${contentTypeLabel(store.contentType)}`,
    variants: processed.variants.length > 0 ? processed.variants : [],
    hooks: processed.hooks,
    cta: processed.cta,
    seoKeywords: processed.keywords,
    hashtags: processed.hashtags,
  };

  const latency_ms = Date.now() - startTime;

  const stats: GenerationStats = {
    model:
      ((routingMeta as Record<string, string>)?.model as string) ||
      "unknown",
    tokens: Math.ceil((content || "").length / 4),
    latency_ms,
    provider:
      ((routingMeta as Record<string, string>)?.provider_name as string) ||
      ((routingMeta as Record<string, string>)?.provider_slug as string) ||
      "unknown",
  };

  store.finishGeneration(generationResult, stats);
}

// ── Fake typing stream (for non-streaming fallback) ─────────────────────────────

async function fakeTypingStream(
  text: string,
  onToken: (token: string) => void,
  onProgress: (pct: number) => void,
  signal: AbortSignal
): Promise<void> {
  const CHUNK_SIZE = 4;
  const DELAY_MS = 18;

  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    if (signal.aborted) return;
    const chunk = text.slice(i, i + CHUNK_SIZE);
    onToken(chunk);
    onProgress(Math.round((i / text.length) * 100));
    await new Promise((r) => setTimeout(r, DELAY_MS + Math.random() * 12));
  }
  onProgress(100);
}

// ── Main Generation Hook ────────────────────────────────────────────────────────

export function useGeneration() {
  const store = useStudioStore();

  const generate = useCallback(async () => {
    if (!store.selectedProduct) {
      toast.error("Vui lòng chọn 1 sản phẩm");
      return;
    }
    if (!store.contentType) {
      toast.error("Vui lòng chọn loại nội dung");
      return;
    }

    // Abort any existing request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Start generation lifecycle
    store.startGeneration();

    const startTime = Date.now();
    const product = store.selectedProduct as AIProduct;
    const taskType = CONTENT_TYPE_TO_TASK[store.contentType];

    // ── Timeout warning at 2 min ──────────────────────────────────────────────
    timeoutWarningRef.current = setTimeout(() => {
      // Show warning but keep streaming state — stream is still alive
      toast.warning("AI đang phản hồi lâu hơn bình thường.", {
        description: "Vui lòng chờ thêm hoặc nhấn 'Dừng tạo'.",
        duration: 8000,
      });
    }, TIMEOUT_WARNING_MS);

    // ── Timeout force-stop at 3 min ────────────────────────────────────────
    timeoutAbortRef.current = setTimeout(() => {
      abortRef.current?.abort();
    }, TIMEOUT_ABORT_MS);

    try {
      // ── Try streaming endpoint ────────────────────────────────────────────
      store.setGenerationStatus("generating");

      // ── Include user overrides from Step 2 "Custom AI Config" ──────────────────
      const hasOverrides = store.advancedOverrides && Object.keys(store.advancedOverrides).length > 0;

      const streamingPayload: Record<string, unknown> = {
        contentType: store.contentType,
        taskType,
        product,
        customInstructions: store.customInstructions || undefined,
      };

      // Attach advanced overrides so API can merge with routing defaults
      if (hasOverrides) {
        (streamingPayload as Record<string, unknown>).advancedOverrides = store.advancedOverrides;
      }

      if (DEV) {
        console.log("[AI_STREAM_PAYLOAD]", {
          contentType: store.contentType,
          taskType,
          product: product.name,
          hasOverrides,
          advancedOverrides: hasOverrides ? store.advancedOverrides : "none",
        });
      }

      const res = await fetch("/api/ai/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(streamingPayload),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // ── Read SSE stream ────────────────────────────────────────────────────
      store.setGenerationStatus("streaming");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let routingMeta: Record<string, unknown> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Extract complete SSE events (\n\n separator)
        let eventEnd = buffer.indexOf("\n\n");
        while (eventEnd !== -1) {
          const block = buffer.slice(0, eventEnd);
          buffer = buffer.slice(eventEnd + 2);
          eventEnd = buffer.indexOf("\n\n");

          let eventType = "";
          let eventPayload: Record<string, unknown> = {};

          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              try {
                Object.assign(eventPayload, JSON.parse(line.slice(5).trim()));
              } catch {
                // ignore parse errors
              }
            }
          }

          if (DEV) console.log("[SSE]", eventType, eventPayload);

          if (eventType === "generation_start") {
            routingMeta = ((eventPayload as Record<string, Record<string, unknown>>).routing) || {};
            const pipeline = (eventPayload as Record<string, Record<string, unknown>>).prompt_pipeline;
            if (pipeline) {
              store.setPromptPipeline({
                systemPrompt: (pipeline.system_prompt as string) || "",
                brandVoice: (pipeline.brand_voice_text as string) || "",
                safetyRules: (pipeline.safety_rules as string[]) || [],
                productContext: (pipeline.product_context as string) || "",
                userInput: (pipeline.user_input as string) || "",
                finalPrompt: (pipeline.final_prompt as string) || "",
              });
            }
          }

          if (eventType === "stage_start") {
            const stageName = (eventPayload as Record<string, string>).stage ?? "";
            store.setPipelineStage(mapStageToPipeline(stageName));
          }

          if (eventType === "stage_done") {
            const stageName = (eventPayload as Record<string, string>).stage ?? "";
            store.setPipelineStage(mapStageToPipeline(stageName));
          }

          if (eventType === "token") {
            const content = (eventPayload as Record<string, string>).content ?? "";
            if (content) store.appendStreamingText(content);
          }

          if (eventType === "generation_done") {
            clearTimers();
            store.setGenerationStatus("finalizing");
            store.setPipelineStage("finalizing");
            finalizeResult(store, store.streamingText, product, startTime, routingMeta);
            return;
          }

          if (eventType === "error") {
            clearTimers();
            const errMsg = (eventPayload as Record<string, string>).message ?? "Lỗi từ AI";
            console.warn("[SSE_ERROR]", errMsg);
            // Try non-streaming fallback instead of giving up
            try {
              await nonStreamingFallback(store, product, startTime, abortRef.current!.signal, () => {});
            } catch {
              store.setGenerationError("AI gặp lỗi: " + errMsg);
              toast.error("AI gặp lỗi khi tạo nội dung.");
            }
            return;
          }
        }
      }

      // ── Stream ended without generation_done ───────────────────────────────
      clearTimers();

      // Process any remaining buffered content (partial events after last \n\n)
      // Parse remaining buffer directly instead of using stale eventPayload
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim()) as Record<string, string>;
          if (parsed.content) store.appendStreamingText(parsed.content);
        } catch {
          // Not JSON — treat as raw content text
          store.appendStreamingText(buffer.trim());
        }
      }

      if (store.streamingText) {
        store.setGenerationStatus("finalizing");
        store.setPipelineStage("finalizing");
        finalizeResult(store, store.streamingText, product, startTime, routingMeta);
      } else {
        // No content at all — try non-streaming fallback
        try {
          await nonStreamingFallback(
            store,
            product,
            startTime,
            abortRef.current!.signal,
            () => {}
          );
        } catch {
          store.setGenerationError("Không nhận được nội dung từ AI. Vui lòng thử lại.");
          toast.error("AI không phản hồi đúng cách. Thử lại hoặc kiểm tra cấu hình provider.");
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        clearTimers();
        return;
      }

      clearTimers();
      const msg = err instanceof Error ? err.message : "Lỗi khi gọi API";
      console.error("[GENERATION_ERROR]", msg);

      try {
        await nonStreamingFallback(store, product, startTime, abortRef.current!.signal, () => {});
      } catch {
        store.setGenerationError(msg);
        toast.error(msg);
      }
    }
  }, [store]);

  return { generate };
}

// ── Stop Generation ─────────────────────────────────────────────────────────────

/**
 * Call this from anywhere (button click, component unmount) to abort
 * the current generation and keep partial content as lastResult.
 */
export function stopGeneration() {
  abortRef.current?.abort();
  clearTimers();

  const store = useStudioStore.getState();
  if (store.streamingText) {
    const content = store.streamingText;
    const product = store.selectedProduct as AIProduct;
    const startTime = store.generationStartedAt ?? Date.now();
    store.setGenerationStatus("finalizing");
    store.setPipelineStage("finalizing");
    finalizeResult(store, content, product, startTime);
    store.setGenerationStatus("stopped");
    toast.warning("Đã dừng. Nội dung tạm thời đã được giữ lại.");
  } else {
    store.setGenerationStatus("stopped");
  }
}

// ── Non-streaming fallback ─────────────────────────────────────────────────────

async function nonStreamingFallback(
  store: ReturnType<typeof useStudioStore.getState>,
  product: AIProduct,
  startTime: number,
  signal: AbortSignal,
  onProgress: (pct: number) => void
) {
  store.setGenerationStatus("finalizing");

  const hasOverrides = store.advancedOverrides && Object.keys(store.advancedOverrides).length > 0;
  const body: Record<string, unknown> = {
    contentType: store.contentType,
    taskType: CONTENT_TYPE_TO_TASK[store.contentType],
    product,
    customInstructions: store.customInstructions || undefined,
  };
  if (hasOverrides) {
    body.advancedOverrides = store.advancedOverrides;
  }

  const res = await fetch("/api/content/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Lỗi khi tạo nội dung");

  const result = data.data || {};
  const content = result.content || "";
  const routingMeta = result.routing || {};

  await fakeTypingStream(
    content,
    (token) => store.appendStreamingText(token),
    onProgress,
    signal
  );

  await new Promise((r) => setTimeout(r, 150));

  finalizeResult(store, content, product, startTime, routingMeta);
}
