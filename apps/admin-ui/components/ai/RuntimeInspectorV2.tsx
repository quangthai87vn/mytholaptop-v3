"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Wifi,
  WifiOff,
  Clock,
  DollarSign,
  Server,
  AlertTriangle,
  Minimize2,
  Maximize2,
  Cloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ProviderType } from "@/types/ai-operating";

function getRuntimeTier(p: ProviderType): "local" | "cloud" {
  return ["ollama", "lmstudio", "openai-compatible"].includes(p) ? "local" : "cloud";
}

interface RuntimeInspectorProps {
  providerName?: string | null;
  providerType?: string | null;
  baseUrl?: string | null;
  connectionStatus?: string | null;
  model: string | null;
  latency_ms: number | null;
  tokens_used: number | null;
  context_window: number | null;
  streaming: boolean;
  requestCount: number;
  estimatedCost: number;
}

function MetricRow({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <div className={`shrink-0 ${accent || "text-muted-foreground"}`}>
        <Icon className="size-3.5" />
      </div>
      <span className="text-[11px] text-muted-foreground flex-1">{label}</span>
      <span className={`text-xs font-semibold font-mono ${accent || ""}`}>{value}</span>
    </div>
  );
}

export function RuntimeInspectorCompact({
  providerName,
  providerType,
  baseUrl,
  connectionStatus,
  model,
  latency_ms,
  tokens_used,
  context_window,
  streaming,
  requestCount,
  estimatedCost,
}: RuntimeInspectorProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pt = providerType as ProviderType | null;
  const isConnected =
    connectionStatus === "connected" || (latency_ms !== null && providerType !== null);
  const isLocal = pt ? getRuntimeTier(pt) === "local" : false;
  const contextPct =
    context_window && tokens_used
      ? Math.round((tokens_used / context_window) * 100)
      : null;

  const costFormatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  if (collapsed) {
    return (
      <aside className="w-10 shrink-0 border-l bg-card flex flex-col items-center py-3 gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setCollapsed(false)}
          title="Mở rộng"
        >
          <Maximize2 className="size-4" />
        </Button>
        <div className="flex flex-col items-center gap-2 mt-2">
          {isConnected ? (
            <>
              <Wifi className="size-4 text-green-500" />
              <span
                className="text-[9px] text-muted-foreground"
                style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
              >
                Live
              </span>
            </>
          ) : (
            <>
              <WifiOff className="size-4 text-muted-foreground/50" />
              <span
                className="text-[9px] text-muted-foreground/50"
                style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
              >
                Idle
              </span>
            </>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 shrink-0 border-l bg-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <Activity className="size-3.5 text-primary" />
          <span className="text-xs font-semibold">Current AI</span>
        </div>
        <div className="flex items-center gap-1">
          {isConnected && (
            <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => setCollapsed(true)}
            title="Thu gọn"
          >
            <Minimize2 className="size-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* No provider */}
        {!providerName && !providerType ? (
          <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <WifiOff className="size-5 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Chưa có AI Engine
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Chọn AI Engine bên trái để xem
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-4">
            {/* AI Engine */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                {isConnected ? (
                  <Wifi className="size-3 text-green-500" />
                ) : (
                  <WifiOff className="size-3 text-muted-foreground" />
                )}
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Kết nối
                </span>
              </div>
              <div className="rounded-md border bg-background p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Engine</span>
                  <span className="text-[11px] font-medium">
                    {providerName || providerType || "—"}
                  </span>
                </div>
                {model && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Model</span>
                    <span className="text-[10px] font-mono font-medium text-primary truncate max-w-[130px]">
                      {model}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Trạng thái</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] h-5 ${
                      connectionStatus === "connected"
                        ? "border-green-300 text-green-600 dark:border-green-800 dark:text-green-400"
                        : connectionStatus === "error"
                          ? "border-red-300 text-red-600 dark:border-red-800 dark:text-red-400"
                          : "border-muted-foreground/30 text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full mr-1 inline-block ${
                        connectionStatus === "connected"
                          ? "bg-green-500 animate-pulse"
                          : connectionStatus === "error"
                            ? "bg-red-500"
                            : "bg-muted-foreground"
                      }`}
                    />
                    {connectionStatus === "connected"
                      ? "Connected"
                      : connectionStatus === "error"
                        ? "Error"
                        : "Offline"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Response Speed */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Clock className="size-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Response
                </span>
              </div>
              <div className="rounded-md border bg-background p-2.5">
                <MetricRow
                  icon={Clock}
                  label="Response time"
                  value={latency_ms !== null ? `${latency_ms}ms` : "—"}
                  accent={
                    latency_ms === null
                      ? ""
                      : latency_ms < 500
                        ? "text-green-600 dark:text-green-400"
                        : latency_ms < 2000
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400"
                  }
                />
                <MetricRow
                  icon={Activity}
                  label="Requests"
                  value={requestCount.toString()}
                />
                <MetricRow
                  icon={Activity}
                  label="Streaming"
                  value={streaming ? "On" : "Off"}
                  accent={streaming ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}
                />
              </div>
            </div>

            {/* Cost */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <DollarSign className="size-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Chi phí
                </span>
              </div>
              <div className="rounded-md border bg-background p-2.5">
                {isLocal ? (
                  <>
                    <div className="flex items-center gap-2 py-1">
                      <Server className="size-3.5 text-orange-500 shrink-0" />
                      <span className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">
                        Miễn phí API
                      </span>
                    </div>
                    <div className="flex items-center gap-2 py-1">
                      <AlertTriangle className="size-3 text-yellow-600 dark:text-yellow-400 shrink-0" />
                      <span className="text-[10px] text-yellow-700 dark:text-yellow-300">
                        Tốn tài nguyên máy
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Ước tính</span>
                      <span className="text-sm font-semibold text-primary">
                        {costFormatter.format(estimatedCost)}
                      </span>
                    </div>
                    {tokens_used != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Tokens</span>
                        <span className="text-[11px] font-mono">{tokens_used.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer time */}
      <div className="px-3 py-1.5 border-t bg-muted/10 text-center">
        <span className="text-[10px] text-muted-foreground/60">
          {now.toLocaleTimeString("vi-VN")}
        </span>
      </div>
    </aside>
  );
}
