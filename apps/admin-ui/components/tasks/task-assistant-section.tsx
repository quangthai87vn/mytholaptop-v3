"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Sparkles, Copy, Check, FileText, Zap, Hash, Image, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminFetch } from "@/lib/api/admin-fetch";
import type { Task } from "@/lib/workspace/types";
import type { TaskAssistantAction } from "@/app/api/ai/task-assistant/route";
import { TASK_TYPE_LABELS } from "@/lib/workspace/types";

// ─── Types ────────────────────────────────────────────────────────────

interface AssistantResult {
  id: string;
  action: TaskAssistantAction;
  content: string;
  model: string;
  provider: string;
  latency_ms: number;
  createdAt: string;
}

interface TaskAssistantSectionProps {
  task: Task;
  userId?: string;
  userRole?: string;
}

// ─── Action Config ───────────────────────────────────────────────────

const ACTION_CONFIG: Array<{
  id: TaskAssistantAction;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  colorHover: string;
}> = [
  {
    id: "generate_outline",
    label: "Dàn ý",
    description: "Tạo outline chi tiết",
    icon: FileText,
    color: "text-slate-700 border-slate-200 hover:border-slate-400",
    colorHover: "hover:bg-slate-50",
  },
  {
    id: "generate_hooks",
    label: "Hooks",
    description: "5 hook hấp dẫn",
    icon: Zap,
    color: "text-amber-700 border-amber-200 hover:border-amber-400",
    colorHover: "hover:bg-amber-50",
  },
  {
    id: "generate_caption",
    label: "Caption",
    description: "Viết caption hoàn chỉnh",
    icon: FileText,
    color: "text-blue-700 border-blue-200 hover:border-blue-400",
    colorHover: "hover:bg-blue-50",
  },
  {
    id: "generate_hashtags",
    label: "Hashtags",
    description: "15-25 hashtags",
    icon: Hash,
    color: "text-purple-700 border-purple-200 hover:border-purple-400",
    colorHover: "hover:bg-purple-50",
  },
  {
    id: "generate_thumbnail_prompt",
    label: "Thumbnail",
    description: "Prompt thiết kế thumbnail",
    icon: Image,
    color: "text-pink-700 border-pink-200 hover:border-pink-400",
    colorHover: "hover:bg-pink-50",
  },
  {
    id: "generate_shot_list",
    label: "Shot List",
    description: "Danh sách các shot",
    icon: Clapperboard,
    color: "text-green-700 border-green-200 hover:border-green-400",
    colorHover: "hover:bg-green-50",
  },
];

// ─── Simple Markdown Renderer ───────────────────────────────────────

function renderMarkdown(text: string): string {
  if (!text) return "";

  let html = text
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Code blocks
    .replace(/```[\w]*\n([\s\S]+?)```/g, '<pre class="bg-slate-100 rounded p-3 my-2 overflow-x-auto text-sm font-mono"><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 rounded px-1.5 py-0.5 text-xs font-mono">$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-slate-800 mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold text-slate-800 mt-4 mb-2">$1</h2>')
    // Lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm text-slate-700">$1</li>')
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc text-sm text-slate-700">$1</li>')
    // Line breaks
    .replace(/\n\n/g, "</p><p class='text-sm text-slate-700 leading-relaxed my-2'>")
    .replace(/\n/g, "<br/>");

  // Wrap in paragraph
  return `<p class='text-sm text-slate-700 leading-relaxed my-2'>${html}</p>`;
}

// ─── Result Item ────────────────────────────────────────────────────

interface ResultItemProps {
  result: AssistantResult;
}

function ResultItem({ result }: ResultItemProps) {
  const [copied, setCopied] = React.useState(false);
  const [showRaw, setShowRaw] = React.useState(false);

  const actionLabel = ACTION_CONFIG.find((a) => a.id === result.action)?.label ?? result.action;

  async function copyContent() {
    try {
      await navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fail silently
    }
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-slate-700">{actionLabel}</span>
          <span className="text-[10px] text-slate-400">·</span>
          <span className="text-[10px] text-slate-400">
            {result.provider} · {result.model}
          </span>
          <span className="text-[10px] text-slate-400">·</span>
          <span className="text-[10px] text-slate-400">{result.latency_ms}ms</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowRaw((p) => !p)}
            className="text-[10px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded transition-colors"
          >
            {showRaw ? "Hiện đẹp" : "Hiện raw"}
          </button>
          <button
            onClick={copyContent}
            className={cn(
              "flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors",
              copied ? "text-green-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? "Đã copy!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 bg-white max-h-96 overflow-y-auto">
        {showRaw ? (
          <pre className="text-xs font-mono text-slate-600 whitespace-pre-wrap break-words">
            {result.content}
          </pre>
        ) : (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(result.content) }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-right">
        <span className="text-[10px] text-slate-400">
          {new Date(result.createdAt).toLocaleTimeString("vi-VN")}
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function TaskAssistantSection({ task, userRole }: TaskAssistantSectionProps) {
  const [results, setResults] = React.useState<AssistantResult[]>([]);
  const [loading, setLoading] = React.useState<TaskAssistantAction | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedAction, setSelectedAction] = React.useState<TaskAssistantAction | null>(null);

  // Determine if user can generate
  const canGenerate =
    userRole === "editor" ||
    userRole === "admin" ||
    userRole === "super_admin";

  async function handleGenerate(action: TaskAssistantAction) {
    if (!canGenerate || loading) return;

    setLoading(action);
    setSelectedAction(action);
    setError(null);

    try {
      const res = await adminFetch("/api/ai/task-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          action,
        task: {
          title: task.title,
          description: task.description,
          task_type: task.task_type ? TASK_TYPE_LABELS[task.task_type as keyof typeof TASK_TYPE_LABELS] : undefined,
          platform: task.platform,
        },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Lỗi không xác định" }));
        throw new Error(err.error || err.message || "Lỗi không xác định");
      }

      const data = await res.json();

      setResults((prev) => [
        {
          id: `${action}-${Date.now()}`,
          action: data.action,
          content: data.content,
          model: data.model,
          provider: data.provider,
          latency_ms: data.latency_ms,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi khi gọi AI";
      setError(msg);
    } finally {
      setLoading(null);
      setSelectedAction(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Task Context Banner */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="size-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">AI Assistant</p>
            <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-2">{task.title}</p>
            {task.task_type && (
              <span className="inline-flex items-center mt-1 text-[10px] bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-500">
                {TASK_TYPE_LABELS[task.task_type as keyof typeof TASK_TYPE_LABELS] ?? task.task_type}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Permission notice */}
      {!canGenerate && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-medium text-amber-800">Không có quyền generate</p>
            <p className="text-[12px] text-amber-700 mt-0.5">
              Bạn cần quyền Editor trở lên để sử dụng AI Assistant.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div>
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-3">
          Chọn thao tác
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ACTION_CONFIG.map((action) => {
            const Icon = action.icon;
            const isLoading = loading === action.id;
            const isSelected = selectedAction === action.id;

            return (
              <Button
                key={action.id}
                variant="outline"
                disabled={!canGenerate || !!loading}
                onClick={() => handleGenerate(action.id)}
                className={cn(
                  "h-auto py-3 px-3 flex-col items-start gap-1.5 border-[1.5px] transition-all",
                  action.color,
                  action.colorHover,
                  isSelected && "ring-2 ring-primary/30 ring-offset-1",
                  !canGenerate && "opacity-50 cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Icon className="size-4 shrink-0" />
                )}
                <div className="text-left">
                  <p className="text-[12px] font-semibold leading-tight">{action.label}</p>
                  <p className="text-[10px] opacity-70 leading-tight">{action.description}</p>
                </div>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Loading state */}
      {loading && !selectedAction && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-[13px] text-slate-600">AI đang xử lý...</span>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="size-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-medium text-red-800">Lỗi AI Assistant</p>
            <p className="text-[12px] text-red-700 mt-0.5">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-[11px] text-red-500 hover:text-red-700 mt-2 underline"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Kết quả ({results.length})
            </p>
            <button
              onClick={() => setResults([])}
              className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
            >
              Xóa tất cả
            </button>
          </div>
          <div className="space-y-4">
            {results.map((result) => (
              <ResultItem key={result.id} result={result} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && !loading && !error && (
        <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg">
          <Sparkles className="size-8 text-slate-200 mx-auto mb-2" />
          <p className="text-[13px] text-slate-400">
            Chọn thao tác để AI tạo nội dung cho bạn
          </p>
          <p className="text-[11px] text-slate-300 mt-1">
            Kết quả sẽ hiển thị ở đây, không tự ghi đè nội dung task
          </p>
        </div>
      )}
    </div>
  );
}
