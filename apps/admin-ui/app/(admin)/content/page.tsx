"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Clock,
  CheckCircle,
  Send,
  TrendingUp,
  Eye,
  Sparkles,
  Facebook,
  Globe,
  Video,
  ImageIcon,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

const TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  facebook: { label: "Facebook", icon: Facebook, color: "text-blue-600" },
  website: { label: "Website", icon: Globe, color: "text-green-600" },
  video: { label: "Video", icon: Video, color: "text-red-600" },
  image: { label: "Hinh anh", icon: ImageIcon, color: "text-purple-600" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "destructive"; icon: React.ComponentType<{ className?: string }> }> = {
  published: { label: "Da dang", variant: "success", icon: CheckCircle },
  scheduled: { label: "Da len lich", variant: "warning", icon: Clock },
  draft: { label: "Nhap", variant: "secondary", icon: Clock },
  archived: { label: "Luu tru", variant: "secondary", icon: Clock },
};

function formatCurrency(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}K`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return String(amount);
}

export default function ContentDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [recentItems, setRecentItems] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content/stats");
      if (res.ok) {
        const { data } = await res.json();
        setStats(data);
        setRecentItems(data.recent_items || []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPosts = stats?.total_items || 0;
  const published = stats?.by_status?.published || 0;
  const scheduled = stats?.by_status?.scheduled || 0;
  const facebookCount = stats?.by_type?.facebook || 0;
  const websiteCount = stats?.by_type?.website || 0;
  const videoCount = stats?.by_type?.video || 0;
  const imageCount = stats?.by_type?.image || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tong quan noi dung</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quan ly va theo doi noi dung AI-assisted cho My Tho Laptop
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/content/ai-generator">
            <Sparkles className="size-4" />
            Tao bai viet AI
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tong noi dung</p>
                    <p className="text-3xl font-bold mt-1">{totalPosts}</p>
                    <p className="text-xs text-green-600 mt-1">
                      +{stats?.this_week || 0} tuan nay
                    </p>
                  </div>
                  <FileText className="size-10 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Da xuat ban</p>
                    <p className="text-3xl font-bold mt-1 text-green-600">{published}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {totalPosts > 0 ? Math.round((published / totalPosts) * 100) : 0}% tong
                    </p>
                  </div>
                  <CheckCircle className="size-10 text-green-600/30" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Da len lich</p>
                    <p className="text-3xl font-bold mt-1 text-yellow-600">{scheduled}</p>
                    <p className="text-xs text-muted-foreground mt-1">Cho dang</p>
                  </div>
                  <Clock className="size-10 text-yellow-600/30" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Token usage</p>
                    <p className="text-3xl font-bold mt-1">
                      {formatCurrency(stats?.token_usage?.total_tokens || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats?.token_usage?.total_calls || 0} goi API
                    </p>
                  </div>
                  <TrendingUp className="size-10 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Platform breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/content/facebook-posts" className="block">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Facebook className="size-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{facebookCount}</p>
                      <p className="text-xs text-muted-foreground">Bai viet FB</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/content/website-posts" className="block">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Globe className="size-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{websiteCount}</p>
                      <p className="text-xs text-muted-foreground">Bai viet Web</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/content/video-scripts" className="block">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <Video className="size-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{videoCount}</p>
                      <p className="text-xs text-muted-foreground">Kich ban Video</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/content/image-prompts" className="block">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <ImageIcon className="size-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{imageCount}</p>
                      <p className="text-xs text-muted-foreground">Prompt Hinh</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Recent Content */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Noi dung gan day</CardTitle>
              <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
                <Link href="/content/library">
                  Xem tat ca
                  <ChevronRight className="size-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {recentItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Chua co noi dung nao. <Link href="/content/ai-generator" className="underline">Tao bai viet dau tien</Link>
                </div>
              ) : (
                <div className="divide-y">
                  {recentItems.map((item: any) => {
                    const typeCfg = TYPE_CONFIG[item.content_type] || TYPE_CONFIG.facebook;
                    const StatusIcon = STATUS_CONFIG[item.status]?.icon || Clock;
                    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                          item.content_type === "facebook" ? "bg-blue-100" :
                          item.content_type === "website" ? "bg-green-100" :
                          item.content_type === "video" ? "bg-red-100" : "bg-purple-100"
                        }`}>
                          <typeCfg.icon className={`size-4 ${typeCfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title || "(Khong co tieu de)"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{typeCfg.label}</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(item.created_at)}
                            </span>
                          </div>
                        </div>
                        <Badge variant={statusCfg.variant} className="shrink-0 gap-1 text-xs">
                          <StatusIcon className="size-3" />
                          {statusCfg.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/content/ai-generator">
                <Sparkles className="size-5" />
                <span>Tao bai viet AI</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/content/templates">
                <FileText className="size-5" />
                <span>Quan ly mau</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/content/calendar">
                <Clock className="size-5" />
                <span>Lich dang bai</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/content/settings">
                <Sparkles className="size-5" />
                <span>Cau hinh AI</span>
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
