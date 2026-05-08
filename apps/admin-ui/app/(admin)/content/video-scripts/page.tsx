"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  RefreshCw,
  Plus,
  Eye,
  Copy,
  MoreHorizontal,
  Video,
  Clock,
  CheckCircle,
  Loader2,
} from "lucide-react";
import type { ContentStatus } from "@/types/content";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

type VideoScript = {
  id: number;
  title: string | null;
  content_body: string | null;
  product_name: string | null;
  status: ContentStatus;
  generated_by: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "secondary" }> = {
  published: { label: "Da dang", variant: "success" },
  scheduled: { label: "Da len lich", variant: "warning" },
  draft: { label: "Nhap", variant: "secondary" },
};

const PLATFORM_CONFIG: Record<string, { label: string; color: string }> = {
  tiktok: { label: "TikTok", color: "text-pink-600" },
  youtube: { label: "YouTube", color: "text-red-600" },
  reels: { label: "Reels", color: "text-purple-600" },
};

export default function VideoScriptsPage() {
  const [scripts, setScripts] = useState<VideoScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewScript, setViewScript] = useState<VideoScript | null>(null);

  const fetchScripts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ content_type: "video", limit: "50" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/content/items?${params}`);
      if (res.ok) {
        const result = await res.json();
        setScripts(result.data || []);
      }
    } catch {
      toast.error("Loi khi lay danh sach");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kich ban video</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quan ly kich ban video TikTok, Reels, YouTube Shorts
          </p>
        </div>
        <Button asChild className="gap-2">
          <a href="/content/ai-generator">
            <Plus className="size-4" />
            Tao kich ban
          </a>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tim kich ban, san pham..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Tat ca trang thai</option>
              <option value="draft">Nhap</option>
              <option value="scheduled">Da len lich</option>
              <option value="published">Da dang</option>
            </select>
            <Button variant="outline" size="icon" onClick={fetchScripts}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kich ban</TableHead>
                <TableHead>San pham</TableHead>
                <TableHead>Trang thai</TableHead>
                <TableHead className="w-[160px]">Ngay tao</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : scripts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Khong co kich ban nao
                  </TableCell>
                </TableRow>
              ) : (
                scripts.map((script) => {
                  const statusCfg = STATUS_CONFIG[script.status] || STATUS_CONFIG.draft;
                  const platform = (script.metadata?.platform as string) || "tiktok";
                  const platformCfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.tiktok;
                  const views = script.metadata?.views as number | undefined;

                  return (
                    <TableRow key={script.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate max-w-[250px]">
                            {script.title || "(Khong co tieu de)"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {platformCfg.label}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {script.product_name || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {views !== undefined ? `${views.toLocaleString()} views` : formatDate(script.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => setViewScript(script)}>
                            <Eye className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewScript} onOpenChange={() => setViewScript(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="size-5 text-red-600" />
              {viewScript?.title || "Kich ban video"}
            </DialogTitle>
            <DialogDescription>
              {viewScript?.product_name && `San pham: ${viewScript.product_name}`}
            </DialogDescription>
          </DialogHeader>
          {viewScript && (
            <div className="space-y-4 py-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">
                  {PLATFORM_CONFIG[viewScript.metadata?.platform as string || "tiktok"]?.label || "TikTok"}
                </Badge>
                {viewScript.generated_by && <Badge>AI: {viewScript.generated_by}</Badge>}
              </div>
              <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm max-h-[400px] overflow-y-auto font-mono">
                {viewScript.content_body || "(Khong co noi dung)"}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewScript(null)}>Dong</Button>
            <Button onClick={() => {
              if (viewScript?.content_body) {
                navigator.clipboard.writeText(viewScript.content_body);
                toast.success("Da copy kich ban!");
              }
            }}>
              <Copy className="mr-2 size-4" />Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
