/**
 * AI Task Assistant API
 * POST /api/ai/task-assistant
 *
 * P7.1: AI Assistant trong Task Workflow
 *
 * Nhận context của 1 task, gọi AI để hỗ trợ tạo content:
 * - Generate Outline
 * - Generate Hooks
 * - Generate Caption
 * - Generate Hashtags
 * - Generate Thumbnail Prompt
 * - Generate Shot List
 *
 * Security: requireAdminAuth() + requireCsrf() + rate limit + audit log
 * RBAC: viewer chỉ xem, editor/admin/super_admin được generate
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { requirePermission } from "@/lib/auth/require-permission";
import { resolveRouting } from "@/lib/ai/routing-engine";
import { createProviderFromRouting } from "@/lib/ai/provider-service";
import { getAllRoutingRules } from "@/lib/content/db/task-routes";
import { getAllProviderCardsLegacy, getDecryptedApiKeyLegacy } from "@/lib/content/db/provider-service";
import { getAllBrandVoices } from "@/lib/content/db/brand-voices";
import { getSafetyRules } from "@/lib/content/db/safety-rules";
import { getAllSystemPrompts } from "@/lib/content/db/system-prompts";
import { createGenerationLog } from "@/lib/content/db/logs";
import type { RoutingRule, ProviderCard, BrandVoice, SafetyRule, SystemPromptTemplate } from "@/types/ai-operating";
import type { AIGeneratorTask } from "@/lib/ai/routing-engine";

// ─── Types ────────────────────────────────────────────────────────────

export type TaskAssistantAction =
  | "generate_outline"
  | "generate_hooks"
  | "generate_caption"
  | "generate_hashtags"
  | "generate_thumbnail_prompt"
  | "generate_shot_list";

export interface TaskAssistantRequest {
  taskId: string;
  action: TaskAssistantAction;
  task: {
    title: string;
    description?: string;
    task_type?: string;
    workflow_stage?: string;
    platform?: string;
    tags?: string[];
  };
  recentComments?: Array<{ author_name: string; content: string }>;
  assets?: Array<{ name: string; url: string; type: string }>;
}

export interface TaskAssistantResponse {
  action: TaskAssistantAction;
  content: string;
  model: string;
  provider: string;
  latency_ms: number;
}

// ─── Rate Limiting ────────────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10; // 10 req/phút/người

function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true };
}

// ─── Prompt Templates ────────────────────────────────────────────────

const ACTION_PROMPTS: Record<TaskAssistantAction, { verb: string; instruction: string }> = {
  generate_outline: {
    verb: "tạo dàn ý",
    instruction: `Bạn là chuyên gia content marketing cho laptop/tech products. Dựa trên thông tin task bên dưới, hãy tạo một dàn ý chi tiết (outline) cho nội dung.

Yêu cầu:
- Dàn ý rõ ràng với các heading chính và phụ
- Phù hợp với platform và định dạng nội dung đã chỉ định
- Có tính logic, dễ theo dõi
- Đánh số các phần rõ ràng

Trả lời bằng tiếng Việt, format markdown.`,
  },
  generate_hooks: {
    verb: "tạo hooks",
    instruction: `Bạn là chuyên gia viết content cho laptop/tech products. Dựa trên thông tin task bên dưới, hãy tạo 5 hook hấp dẫn để thu hút người xem/đọc ngay từ đầu.

Yêu cầu:
- Mỗi hook phải gây tò mò hoặc gây shock nhẹ
- Hook phù hợp với platform đã chỉ định
- Hook có thể dùng làm opening line cho bài viết/video/post
- Đa dạng style: question, statement, statistic, story hook

Trả lời bằng tiếng Việt, format markdown. Đánh số 1-5.`,
  },
  generate_caption: {
    verb: "tạo caption",
    instruction: `Bạn là chuyên gia viết caption cho laptop/tech products. Dựa trên thông tin task và dàn ý/hook (nếu có) bên dưới, hãy viết một caption hoàn chỉnh.

Yêu cầu:
- Caption hấp dẫn, phù hợp với platform đã chỉ định
- Có hook mạnh ở đầu
- Nội dung rõ ràng, thuyết phục
- Có CTA phù hợp (nếu phù hợp với platform)
- Độ dài phù hợp với platform: Facebook 50-200 từ, Website 300-800 từ, TikTok 15-30 giây

Trả lời bằng tiếng Việt. Không cần format markdown phức tạp, chỉ cần plain text rõ ràng.`,
  },
  generate_hashtags: {
    verb: "tạo hashtags",
    instruction: `Bạn là chuyên gia SEO và social media cho laptop/tech products. Dựa trên thông tin task bên dưới, hãy tạo danh sách hashtags phù hợp.

Yêu cầu:
- 15-25 hashtags phù hợp với platform đã chỉ định
- Mix giữa hashtag phổ biến và hashtag ngách
- Hashtag tiếng Việt và tiếng Anh
- Đã loại bỏ các hashtag vi phạm chính sách nền tảng
- Sắp xếp theo thứ tự: hashtag thương hiệu → hashtag phổ biến → hashtag ngách

Trả lời bằng tiếng Việt, mỗi hashtag trên 1 dòng.`,
  },
  generate_thumbnail_prompt: {
    verb: "tạo prompt thiết kế thumbnail",
    instruction: `Bạn là chuyên gia thiết kế hình ảnh cho laptop/tech products. Dựa trên thông tin task bên dưới, hãy viết một prompt chi tiết để tạo thumbnail hấp dẫn.

Yêu cầu:
- Prompt mô tả chi tiết: composition, màu sắc, lighting, mood, text overlay
- Phù hợp với platform đã chỉ định (YouTube: 1280x720, Facebook: 1200x630, TikTok: 1080x1920)
- Prompt có thể dùng cho AI image generator (Midjourney, DALL-E, Stable Diffusion...)
- Mô tả rõ đối tượng chính, background, phong cách
- Có gợi ý text overlay nếu phù hợp

Trả lời bằng tiếng Việt, format markdown rõ ràng.`,
  },
  generate_shot_list: {
    verb: "tạo shot list",
    instruction: `Bạn là đạo diễn video chuyên nghiệp cho laptop/tech products. Dựa trên thông tin task bên dưới, hãy tạo một shot list chi tiết để quay video.

Yêu cầu:
- Mỗi shot gồm: STT, loại shot (CU/MS/WS), mô tả hành động/nội dung, duration ước tính
- Phù hợp với nội dung và platform đã chỉ định
- Có continuity (logic sắp xếp các shot)
- Đề xuất B-Roll nếu phù hợp
- Thứ tự: Opening → Main content → B-Roll → Closing

Trả lời bằng tiếng Việt, format markdown với bảng.`,
  },
};

// ─── Build Task Context ──────────────────────────────────────────────

function buildTaskContext(task: TaskAssistantRequest["task"]): string {
  const lines: string[] = [];

  lines.push(`## TASK TITLE: ${task.title}`);

  if (task.description) {
    lines.push(`\n## DESCRIPTION:`);
    lines.push(task.description);
  }

  if (task.task_type) {
    lines.push(`\n## CONTENT TYPE: ${task.task_type}`);
  }

  if (task.platform) {
    lines.push(`## PLATFORM: ${task.platform}`);
  }

  if (task.workflow_stage) {
    lines.push(`## WORKFLOW STAGE: ${task.workflow_stage}`);
  }

  if (task.tags?.length) {
    lines.push(`\n## TAGS: ${task.tags.join(", ")}`);
  }

  return lines.join("\n");
}

// ─── Build System Prompt ─────────────────────────────────────────────

function buildSystemPrompt(req: TaskAssistantRequest): string {
  const actionConfig = ACTION_PROMPTS[req.action];

  return `Bạn là AI Assistant cho hệ thống quản lý nội dung Marketing của Mỹ Tho Laptop.
Bạn hỗ trợ nhân viên tạo content chất lượng cao cho các sản phẩm laptop và công nghệ.

## NGUYÊN TẮC:
- Trả lời bằng tiếng Việt, rõ ràng, chuyên nghiệp
- Không tạo nội dung vi phạm pháp luật hoặc chính sách nền tảng
- Không bịa đặt thông tin sản phẩm (chỉ dựa trên thông tin được cung cấp)
- Content phù hợp với văn hóa và thị trường Việt Nam

## NHIỆM VỤ:
${actionConfig.instruction}

---
${buildTaskContext(req.task)}
`;
}

// ─── Route Handler ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // Auth
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  // RBAC: check ai_generate permission
  const permError = requirePermission(req, "ai_generate");
  if (permError) return permError;

  // Get user for rate limit (attached by requireAdminAuth)
  const reqWithUser = req as NextRequest & { _authUser?: { id: string } };
  const user = reqWithUser._authUser;

  // CSRF
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  // Rate limit
  const rl = checkRateLimit(user?.id ?? "unknown");
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "Quá nhiều yêu cầu",
        message: "Vui lòng chờ một lát rồi thử lại.",
        retryAfterSeconds: rl.retryAfterSeconds,
      },
      { status: 429 }
    );
  }

  // Parse body
  let body: TaskAssistantRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { taskId, action, task } = body;

  // Validate
  if (!taskId || !action || !task?.title) {
    return NextResponse.json(
      { error: "Thiếu thông tin bắt buộc: taskId, action, task.title" },
      { status: 400 }
    );
  }

  if (!ACTION_PROMPTS[action]) {
    return NextResponse.json(
      { error: `Action không hợp lệ. Các action hợp lệ: ${Object.keys(ACTION_PROMPTS).join(", ")}` },
      { status: 400 }
    );
  }

  try {
    // Load AI context from DB
    const [taskRoutes, providers, brandVoices, safetyRules, systemPrompts] = await Promise.all([
      getAllRoutingRules().catch(() => [] as RoutingRule[]),
      getAllProviderCardsLegacy().catch(() => [] as ProviderCard[]),
      getAllBrandVoices().catch(() => [] as BrandVoice[]),
      getSafetyRules().catch(() => [] as SafetyRule[]),
      getAllSystemPrompts().catch(() => [] as SystemPromptTemplate[]),
    ]);

    // Resolve routing: try task_assistant rule first, then fall back to facebook_content
    const aiTask: AIGeneratorTask = {
      contentType: (task.task_type as "facebook_post") || "facebook_post",
      taskType: task.task_type || "facebook_content",
      platforms: task.platform ? [task.platform as "facebook"] : [],
      marketingGoal: "conversion",
      funnelStage: "consideration",
      productCount: 1,
      hasStock: true,
    };

    // Try task_assistant routing rule first, then fall back to facebook_content
    let resolvedRouting = resolveRouting(aiTask, taskRoutes, providers);

    if (!resolvedRouting.provider_id && !resolvedRouting.provider_slug) {
      // task_assistant rule had no active provider → try facebook_content rule
      const fbTask: AIGeneratorTask = {
        ...aiTask,
        taskType: "facebook_content",
      };
      const fbRouting = resolveRouting(fbTask, taskRoutes, providers);
      if (fbRouting.provider_id || fbRouting.provider_slug) {
        resolvedRouting = fbRouting;
      }
    }

    // Find provider
    const dbProvider =
      providers.find((p) => p.id === resolvedRouting.provider_id) ??
      (resolvedRouting.provider_slug
        ? providers.find(
            (p) =>
              p.slug?.toLowerCase() === resolvedRouting.provider_slug.toLowerCase() ||
              p.type?.toLowerCase() === resolvedRouting.provider_slug.toLowerCase()
          )
        : null);

    // ── Detect misconfigured AI system ───────────────────────────────────
    const hasActiveProviders = providers.some(
      (p) => p.is_active || p.status === "active"
    );
    if (!dbProvider && !hasActiveProviders) {
      return NextResponse.json(
        {
          error: "Chưa cấu hình AI Provider",
          message:
            "Không có AI Provider nào đang bật. Vui lòng bật ít nhất một AI Provider (OpenAI, Gemini, DeepSeek...) trong AI Settings.",
          hint: "Vào AI Settings → Providers → bật is_active cho provider mong muốn và thêm API Key.",
          action,
        },
        { status: 503 }
      );
    }

    const apiKey = dbProvider ? await getDecryptedApiKeyLegacy(dbProvider.id) : null;
    const provider = createProviderFromRouting(
      resolvedRouting,
      dbProvider ?? undefined,
      apiKey ?? undefined
    );

    // Build messages
    const systemPrompt = buildSystemPrompt(body);
    const messages = [
      { role: "system" as const, content: systemPrompt },
      {
        role: "user" as const,
        content: `Hãy ${ACTION_PROMPTS[action].verb} cho task: "${task.title}"${task.description ? `\n\nMô tả bổ sung:\n${task.description}` : ""}${task.platform ? `\n\nPlatform: ${task.platform}` : ""}${task.workflow_stage ? `\n\nWorkflow stage: ${task.workflow_stage}` : ""}${body.recentComments?.length ? `\n\n## RECENT COMMENTS:\n${body.recentComments.map((c) => `- ${c.author_name}: ${c.content}`).join("\n")}` : ""}${body.assets?.length ? `\n\n## ASSETS:\n${body.assets.map((a) => `- ${a.name} (${a.type}): ${a.url}`).join("\n")}` : ""}`,
      },
    ];

    // Call AI
    const response = await provider.chat({
      model: resolvedRouting.model,
      messages,
      temperature: resolvedRouting.temperature,
      max_tokens: resolvedRouting.max_tokens,
    });

    const latencyMs = Date.now() - startTime;

    // Audit log — metadata only, no raw API key
    await createGenerationLog({
      content_item_id: undefined,
      provider: (resolvedRouting.provider_slug || "unknown") as "openai" | "gemini" | "deepseek" | "huggingface" | "ollama" | "lmstudio" | "openai-compatible",
      model_name: resolvedRouting.model,
      request_payload: JSON.stringify({
        action,
        taskId,
        taskTitle: task.title,
        taskType: task.task_type,
        platform: task.platform,
        routing: {
          provider_name: resolvedRouting.provider_name,
          provider_slug: resolvedRouting.provider_slug,
          model: resolvedRouting.model,
          reasoning: resolvedRouting.reasoning,
        },
      }),
      response_text: response.content,
      tokens_used: response.tokens_used,
      latency_ms: latencyMs,
    });

    return NextResponse.json({
      action,
      content: response.content,
      model: resolvedRouting.model,
      provider: resolvedRouting.provider_name || resolvedRouting.provider_slug,
      latency_ms: latencyMs,
    } satisfies TaskAssistantResponse);
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Classify error for better UX
    let userMessage = errorMessage;
    const lowerError = errorMessage.toLowerCase();

    if (
      lowerError.includes("401") ||
      lowerError.includes("unauthorized") ||
      lowerError.includes("invalid api key") ||
      lowerError.includes("api key") ||
      lowerError.includes("authentication")
    ) {
      userMessage =
        "API Key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại API Key trong AI Settings.";
    } else if (
      lowerError.includes("404") ||
      lowerError.includes("not found") ||
      lowerError.includes("model not found") ||
      lowerError.includes("model.*not.*found")
    ) {
      userMessage =
        "Model không tồn tại hoặc không được hỗ trợ. Vui lòng kiểm tra lại cấu hình model trong AI Settings.";
    } else if (
      lowerError.includes("400") ||
      lowerError.includes("bad request")
    ) {
      userMessage =
        "Yêu cầu không hợp lệ. Vui lòng thử lại với thông tin khác.";
    } else if (
      lowerError.includes("timeout") ||
      lowerError.includes("timed out") ||
      lowerError.includes("etimedout")
    ) {
      userMessage =
        "AI Provider không phản hồi (timeout). Vui lòng thử lại hoặc chọn provider khác.";
    } else if (
      lowerError.includes("connect") ||
      lowerError.includes("connection") ||
      lowerError.includes("enotfound") ||
      lowerError.includes("econnrefused") ||
      lowerError.includes("fetch failed")
    ) {
      userMessage =
        "Không thể kết nối đến AI Provider. Vui lòng kiểm tra base URL và API Key trong AI Settings.";
    } else if (
      lowerError.includes("rate limit") ||
      lowerError.includes("too many requests") ||
      lowerError.includes("429")
    ) {
      userMessage =
        "AI Provider đã đạt giới hạn request. Vui lòng thử lại sau vài phút.";
    } else if (
      lowerError.includes("no api key") ||
      lowerError.includes("missing api key")
    ) {
      userMessage =
        "Chưa có API Key cho provider này. Vui lòng thêm API Key trong AI Settings.";
    }

    await createGenerationLog({
      content_item_id: undefined,
      provider: "openai-compatible" as
        | "openai"
        | "gemini"
        | "deepseek"
        | "huggingface"
        | "ollama"
        | "lmstudio"
        | "openai-compatible"
        | "openrouter"
        | "groq",
      latency_ms: latencyMs,
      error_message: errorMessage,
    });

    return NextResponse.json(
      {
        error: "Lỗi khi gọi AI Assistant",
        message: userMessage,
        action,
      },
      { status: 500 }
    );
  }
}
