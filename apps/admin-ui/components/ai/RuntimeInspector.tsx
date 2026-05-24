"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Wifi,
  WifiOff,
  Zap,
  Clock,
  DollarSign,
  Server,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ProviderType, LocalRuntime, ModelFamily } from "@/types/ai-operating";

function getRuntimeTier(p: ProviderType): "local" | "cloud" {
  return ["ollama", "lmstudio", "openai-compatible"].includes(p) ? "local" : "cloud";
}

interface RuntimeInspectorProps {
  providerName?: string | null;
  providerType?: string | null;
  baseUrl?: string | null;
  connectionStatus?: string | null;
  model: string | null;
  modelFamily?: ModelFamily | null;
  localRuntime?: LocalRuntime | null;
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
    <div className="flex items-center gap-3 py-2">
      <div className={`shrink-0 ${accent || "text-muted-foreground"}`}>
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold font-mono ${accent || ""}`}>{value}</p>
      </div>
    </div>
  );
}

function SectionHeader({
  label,
  icon: Icon,
}: {
  label: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className="size-3 text-muted-foreground" />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function RuntimeInspector({
  providerName,
  providerType,
  baseUrl,
  connectionStatus,
  model,
  modelFamily,
  latency_ms,
  tokens_used,
  streaming,
  requestCount,
  estimatedCost,
}: RuntimeInspectorProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pt = providerType as ProviderType | null;
  const isLocal = pt ? getRuntimeTier(pt) === "local" : false;
  const isConnected =
    connectionStatus === "connected" || (latency_ms !== null && providerType !== null);

  const costFormatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <aside className="w-80 shrink-0 border-l bg-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Current AI</h2>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {now.toLocaleTimeString("vi-VN")}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* No provider */}
        {!providerName && !providerType ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <WifiOff className="size-8 text-muted-foreground/30 mb-3" />
            <p className="text-xs text-muted-foreground font-medium">
              Chưa chọn AI Engine
            </p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              Chọn AI Engine ở sidebar để xem thông tin
            </p>
          </div>
        ) : (
          <>
            {/* Current AI */}
            <div>
              <SectionHeader label="AI Engine" icon={Zap} />
              <div className="rounded-lg border bg-background p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Engine</span>
                  <span className="text-xs font-medium">
                    {providerName || providerType || "—"}
                  </span>
                </div>
                {model && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Model</span>
                    <span className="text-xs font-mono font-medium text-primary truncate max-w-[160px]">
                      {model}
                    </span>
                  </div>
                )}
                {baseUrl && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">URL</span>
                    <span
                      className="text-[10px] font-mono text-muted-foreground truncate max-w-[160px]"
                      title={baseUrl}
                    >
                      {baseUrl.replace(/^https?:\/\//, "")}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Trạng thái</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
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
            <div>
              <SectionHeader label="Response Speed" icon={Clock} />
              <div className="rounded-lg border bg-background p-3 space-y-2">
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
                  icon={Zap}
                  label="Streaming"
                  value={streaming ? "On" : "Off"}
                  accent={streaming ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}
                />
              </div>
            </div>

            {/* Cost */}
            <div>
              <SectionHeader label="Chi phí" icon={DollarSign} />
              <div className="rounded-lg border bg-background p-3">
                {isLocal ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 py-1">
                      <Server className="size-4 text-orange-500 shrink-0" />
                      <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                        Miễn phí API
                      </span>
                    </div>
                    <div className="flex items-center gap-2 py-1">
                      <AlertTriangle className="size-3.5 text-yellow-600 dark:text-yellow-400 shrink-0" />
                      <span className="text-[11px] text-yellow-700 dark:text-yellow-300 leading-relaxed">
                        Tốn tài nguyên máy
                      </span>
                    </div>
                    {tokens_used !== null && (
                      <div className="flex items-center justify-between pt-1 border-t">
                        <span className="text-xs text-muted-foreground">Tokens</span>
                        <span className="text-xs font-mono">
                          {tokens_used.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Ước tính</span>
                      <span className="text-sm font-semibold text-primary">
                        {costFormatter.format(estimatedCost)}
                      </span>
                    </div>
                    {tokens_used !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Tokens đã dùng</span>
                        <span className="text-xs font-mono">
                          {tokens_used.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
