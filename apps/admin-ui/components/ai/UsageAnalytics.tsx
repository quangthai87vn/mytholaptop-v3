"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  Cpu,
  Cloud,
  Server,
  DollarSign,
  Hash,
  Activity,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import type { UsageStats, ProviderType } from "@/types/ai-operating";

interface UsageAnalyticsProps {
  onRefresh?: () => void;
}

function formatVND(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return `${v}`;
}

function MetricTile({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
  trend?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
          accent ? accent.replace("text-", "bg-") + "/10" : "bg-primary/10"
        }`}
      >
        <Icon className={`size-5 ${accent || "text-primary"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold tabular-nums truncate">{value}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
          {trend && (
            <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-0.5">
              <ArrowUpRight className="size-2.5" />
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CostBar({
  cloud,
  local,
}: {
  cloud: { requests: number; estimated_vnd: number; label: string; color: string };
  local: { requests: number; estimated_vnd: number; label: string; color: string };
}) {
  const total = cloud.estimated_vnd + local.estimated_vnd;
  const cloudPct = total > 0 ? Math.round((cloud.estimated_vnd / total) * 100) : 50;
  const localPct = 100 - cloudPct;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">Phân bổ chi phí</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-blue-500 inline-block" /> Cloud {cloudPct}%
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-orange-500 inline-block" /> Local {localPct}%
          </span>
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
        <div className="bg-blue-500 h-full transition-all duration-700" style={{ width: `${cloudPct}%` }} />
        <div className="bg-orange-500 h-full transition-all duration-700" style={{ width: `${localPct}%` }} />
      </div>
      <div className="flex gap-4">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="size-2 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">{cloud.label}:</span>
          <span className="font-medium font-mono">{formatVND(cloud.estimated_vnd)} VND</span>
          <span className="text-muted-foreground">({cloud.requests} req)</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="size-2 rounded-full bg-orange-500" />
          <span className="text-muted-foreground">{local.label}:</span>
          <span className="font-medium font-mono">Miễn phí</span>
          <span className="text-muted-foreground">({local.requests} req)</span>
        </div>
      </div>
    </div>
  );
}

export function UsageAnalytics({ onRefresh }: UsageAnalyticsProps) {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("today");

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/usage-stats");
      if (res.ok) {
        const { data } = await res.json();
        setStats(data);
      } else {
        setStats(null);
      }
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          Không có dữ liệu usage. Hãy bắt đầu tạo nội dung AI để xem thống kê.
        </CardContent>
      </Card>
    );
  }

  const totalLocal = stats.local_vs_cloud.local;
  const totalCloud = stats.local_vs_cloud.cloud;
  const total = totalLocal + totalCloud;

  const cloudData = {
    requests: totalCloud,
    estimated_vnd: stats.cost_by_provider
      .filter((p) => p.provider !== "ollama" && p.provider !== "lmstudio")
      .reduce((s, p) => s + p.estimated_vnd, 0),
    label: "Cloud",
    color: "#4285F4",
  };
  const localData = {
    requests: totalLocal,
    estimated_vnd: 0,
    label: "Local",
    color: "#CC3300",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            Usage Analytics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Thống kê sử dụng AI — {new Date().toLocaleDateString("vi-VN")}
          </p>
        </div>
        <div className="flex gap-2">
          {(["today", "week", "month"] as const).map((r) => (
            <Button
              key={r}
              variant={timeRange === r ? "default" : "outline"}
              size="sm"
              className="text-[11px] h-7"
              onClick={() => setTimeRange(r)}
            >
              {r === "today" ? "Hôm nay" : r === "week" ? "7 ngày" : "30 ngày"}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-7"
            onClick={fetchStats}
            disabled={loading}
          >
            <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <MetricTile
              label={
                timeRange === "today" ? "Requests hôm nay" :
                timeRange === "week" ? "Requests 7 ngày" : "Requests 30 ngày"
              }
              value={
                timeRange === "today" ? stats.requests_today.toLocaleString() :
                timeRange === "week" ? stats.requests_this_week.toLocaleString() :
                stats.requests_this_month.toLocaleString()
              }
              icon={Activity}
              accent="text-blue-600"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <MetricTile
              label={
                timeRange === "today" ? "Chi phí hôm nay" : "Chi phí ước tính"
              }
              value={
                timeRange === "today"
                  ? `${formatVND(stats.estimated_cost_today)} VND`
                  : `${formatVND(stats.estimated_cost_this_month)} VND`
              }
              icon={DollarSign}
              accent="text-primary"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <MetricTile
              label={
                timeRange === "today" ? "Tokens hôm nay" : "Tokens tháng này"
              }
              value={
                timeRange === "today"
                  ? stats.tokens_today.toLocaleString()
                  : stats.tokens_this_month.toLocaleString()
              }
              sub="tokens"
              icon={Hash}
              accent="text-purple-600"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <MetricTile
              label="Active Provider"
              value={stats.active_provider || "—"}
              icon={Zap}
              accent="text-orange-600"
            />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cost breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="size-4 text-primary" />
              Chi phí & Phân bổ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CostBar cloud={cloudData} local={localData} />

            <Separator />

            {/* Cost by provider */}
            {stats.cost_by_provider.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">CHI PHÍ THEO PROVIDER</p>
                <div className="space-y-2">
                  {stats.cost_by_provider.map((p) => {
                    const maxCost = Math.max(...stats.cost_by_provider.map((x) => x.estimated_vnd));
                    const pct = maxCost > 0 ? Math.round((p.estimated_vnd / maxCost) * 100) : 0;
                    return (
                      <div key={p.provider} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-mono capitalize">
                              {p.provider}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span>{p.requests} req</span>
                            <span className="font-semibold text-foreground font-mono">
                              {formatVND(p.estimated_vnd)} VND
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/70 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Models */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              Top Models
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.top_models.length > 0 ? (
              stats.top_models.slice(0, 5).map((m, i) => {
                const maxReq = Math.max(...stats.top_models.map((x) => x.requests));
                const pct = maxReq > 0 ? Math.round((m.requests / maxReq) * 100) : 0;
                return (
                  <div key={m.model} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="size-5 rounded bg-primary/10 text-[10px] font-bold flex items-center justify-center text-primary">
                          {i + 1}
                        </span>
                        <span className="text-xs font-mono truncate max-w-[120px]">{m.model}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{m.requests} req</span>
                        <span className="font-medium text-foreground">{m.tokens.toLocaleString()} tok</span>
                      </div>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Local vs Cloud Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200 dark:border-blue-900">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Cloud className="size-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{totalCloud}</p>
              <p className="text-xs text-muted-foreground">Cloud Requests</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 dark:border-orange-900">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Cpu className="size-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{totalLocal}</p>
              <p className="text-xs text-muted-foreground">Local Requests</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Server className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">Tổng Requests</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="size-5 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {formatVND(
                  stats.cost_by_provider.reduce((s, p) => s + p.estimated_vnd, 0)
                )}
              </p>
              <p className="text-xs text-muted-foreground">Tổng chi phí (VND)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
