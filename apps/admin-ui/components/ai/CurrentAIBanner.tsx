/**
 * CurrentAIBanner
 * Hiển thị AI provider đang hoạt động — resolved từ active route + provider
 * Status engine: connected | missing_api_key | offline | timeout | invalid_config | disabled
 */

"use client";

import { CheckCircle2, AlertCircle, WifiOff, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProviderCard, RoutingRule, TaskRoute } from "@/types/ai-operating";

interface CurrentAIBannerProps {
  activeProvider: ProviderCard | null;
  taskRoute: TaskRoute | RoutingRule | null;
  onNavigateToProviders: () => void;
  onNavigateToRouting: () => void;
}

function resolveConnectionStatus(p: ProviderCard): {
  status: "connected" | "missing_api_key" | "offline" | "timeout" | "invalid_config" | "disabled";
  label: string;
  detail: string;
} {
  if (!p.is_active && p.status !== "active") {
    return {
      status: "disabled",
      label: "Tắt",
      detail: "Provider đang bị tắt. Bật lại để sử dụng.",
    };
  }

  const cs = p.connection_status;
  if (cs === "connected") {
    return {
      status: "connected",
      label: "Hoạt động",
      detail: p.model_name ? `Đang dùng ${p.model_name}` : "Đã kết nối thành công",
    };
  }

  if (!p.base_url || p.base_url.trim() === "") {
    return {
      status: "missing_api_key",
      label: "Chưa cấu hình",
      detail: "Thiếu Base URL. Vui lòng cấu hình provider.",
    };
  }

  if (cs === "error" || cs === "unknown") {
    const lastError = p.last_error;
    if (lastError) {
      const err = lastError.toLowerCase();
      if (err.includes("timeout")) return { status: "timeout", label: "Timeout", detail: lastError };
      if (err.includes("401") || err.includes("unauthorized") || err.includes("api key")) {
        return { status: "invalid_config", label: "API Key lỗi", detail: "API Key không hợp lệ hoặc đã hết hạn." };
      }
      if (err.includes("connection refused") || err.includes("econnrefused")) {
        return { status: "offline", label: "Offline", detail: "Không thể kết nối đến server. Kiểm tra URL và network." };
      }
      if (err.includes("localhost") || err.includes("127.0.0.1")) {
        return { status: "offline", label: "Offline", detail: "Local server chưa chạy. Khởi động Ollama/LM Studio." };
      }
      return { status: "invalid_config", label: "Lỗi cấu hình", detail: lastError };
    }
    return {
      status: "invalid_config",
      label: "Chưa test",
      detail: "Chưa kiểm tra kết nối. Nhấn Test để xác nhận.",
    };
  }

  return {
    status: "connected",
    label: "Hoạt động",
    detail: p.model_name ? `Đang dùng ${p.model_name}` : "Đã kết nối",
  };
}

function getHostname(url: string | null | undefined): string {
  if (!url) return "—";
  try { return new URL(url).hostname; } catch { return url; }
}

export function CurrentAIBanner({
  activeProvider,
  taskRoute,
  onNavigateToProviders,
  onNavigateToRouting,
}: CurrentAIBannerProps) {
  if (!activeProvider) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="size-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <AlertCircle className="size-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">Chưa có AI Provider nào hoạt động</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Bật ít nhất 1 provider và thêm API Key để bắt đầu sử dụng AI Assistant.
          </p>
        </div>
        <button
          onClick={onNavigateToProviders}
          className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-md transition-colors"
        >
          Cấu hình AI
        </button>
      </div>
    );
  }

  const { status, label, detail } = resolveConnectionStatus(activeProvider);

  const statusStyles: Record<string, { bg: string; border: string; icon: string; iconBg: string; badge: string }> = {
    connected: { bg: "bg-green-50", border: "border-green-200", icon: "text-green-600", iconBg: "bg-green-100", badge: "bg-green-100 text-green-700" },
    missing_api_key: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", iconBg: "bg-amber-100", badge: "bg-amber-100 text-amber-700" },
    offline: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-600", iconBg: "bg-red-100", badge: "bg-red-100 text-red-700" },
    timeout: { bg: "bg-orange-50", border: "border-orange-200", icon: "text-orange-600", iconBg: "bg-orange-100", badge: "bg-orange-100 text-orange-700" },
    invalid_config: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-600", iconBg: "bg-red-100", badge: "bg-red-100 text-red-700" },
    disabled: { bg: "bg-slate-50", border: "border-slate-200", icon: "text-slate-400", iconBg: "bg-slate-100", badge: "bg-slate-100 text-slate-500" },
  };
  const s = statusStyles[status];

  const routeLabel = taskRoute
    ? ((taskRoute as TaskRoute).task_label ?? (taskRoute as RoutingRule).task_type)
    : null;

  return (
    <div className={cn("flex items-start gap-3 px-4 py-3 rounded-lg border transition-all", s.bg, s.border)}>
      <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", s.iconBg)}>
        {status === "connected" ? (
          <CheckCircle2 className={cn("size-4", s.icon)} />
        ) : status === "disabled" ? (
          <WifiOff className={cn("size-4", s.icon)} />
        ) : (
          <XCircle className={cn("size-4", s.icon)} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-800">
            {activeProvider.display_name || activeProvider.name}
          </span>
          <span className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium", s.badge)}>
            {label}
          </span>
        </div>
        <p className="text-[11px] text-slate-600 mt-0.5">{detail}</p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {activeProvider.model_name && (
            <span className="text-[10px] text-slate-400 font-mono">{activeProvider.model_name}</span>
          )}
          <span className="text-[10px] text-slate-400 font-mono">{getHostname(activeProvider.base_url)}</span>
          {routeLabel && (
            <button
              onClick={onNavigateToRouting}
              className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline"
            >
              Routing: {routeLabel}
            </button>
          )}
        </div>
      </div>

      {status !== "connected" && status !== "disabled" && (
        <button
          onClick={onNavigateToProviders}
          className="shrink-0 px-2.5 py-1 bg-white hover:bg-slate-50 border border-current text-[11px] font-medium rounded-md transition-colors text-slate-700"
        >
          Sửa
        </button>
      )}
    </div>
  );
}
