"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
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
  ImageIcon,
  Loader2,
} from "lucide-react";
import type { ContentStatus } from "@/types/content";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

type ImagePromptItem = {
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
  published: { label: "Đã đăng", variant: "success" },
  scheduled: { label: "Đã lên lịch", variant: "warning" },
  draft: { label: "Nháp", variant: "secondary" },
};

const STYLE_CONFIG: Record<string, string> = {
  minimalist: "Minimalist",
  modern: "Hiện đại",
  tech: "Công nghệ",
  gaming: "Gaming",
  professional: "Chuyên nghiệp",
  colorful: "Nhiều màu",
};

export default function ImagePromptsPage() {
  const [prompts, setPrompts] = useState<ImagePromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewPrompt, setViewPrompt] = useState<ImagePromptItem | null>(null);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ content_type: "image", limit: "50" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/content/items?${params}`);
      if (res.ok) {
        const result = await res.json();
        setPrompts(result.data || []);
      }
    } catch {
      toast.error("Lỗi khi lấy danh sách");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prompt hình ảnh</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quản lý prompt tạo hình ảnh với AI
          </p>
        </div>
        <Button asChild className="gap-2">
          <a href="/content/ai-generator">
            <Plus className="size-4" />
            Tao prompt
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
                placeholder="Tìm prompt, sản phẩm..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="draft">Nháp</option>
              <option value="published">Đã đăng</option>
            </select>
            <Button variant="outline" size="icon" onClick={fetchPrompts}>
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
                <TableHead>Prompt</TableHead>
                <TableHead>San pham</TableHead>
                <TableHead>Phong cach</TableHead>
                <TableHead className="w-[120px]">Trang thai</TableHead>
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
              ) : prompts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Không có prompt nào
                  </TableCell>
                </TableRow>
              ) : (
                prompts.map((prompt) => {
                  const statusCfg = STATUS_CONFIG[prompt.status] || STATUS_CONFIG.draft;
                  const style = (prompt.metadata?.style as string) || "modern";
                  const aspectRatio = (prompt.metadata?.aspect_ratio as string) || "1:1";
                  const resultUrl = prompt.metadata?.result_url as string | undefined;

                  return (
                    <TableRow key={prompt.id}>
                      <TableCell>
                        <div className="min-w-0 max-w-[300px]">
                          {resultUrl ? (
                            <div className="relative size-12 rounded overflow-hidden bg-muted mb-1">
                              <Image src={resultUrl} alt={prompt.title || ""} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="size-12 rounded bg-muted flex items-center justify-center mb-1">
                              <ImageIcon className="size-5 text-muted-foreground" />
                            </div>
                          )}
                          <p className="text-xs font-medium truncate">{prompt.title || "(Không có tiêu đề)"}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(prompt.created_at)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {prompt.product_name || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="text-xs w-fit">
                            {STYLE_CONFIG[style] || style}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{aspectRatio}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => setViewPrompt(prompt)}>
                            <Eye className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8"
                            onClick={() => {
                              if (prompt.content_body) {
                                navigator.clipboard.writeText(prompt.content_body);
                                toast.success("Đã copy prompt!");
                              }
                            }}>
                            <Copy className="size-3.5" />
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
      <Dialog open={!!viewPrompt} onOpenChange={() => setViewPrompt(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="size-5 text-purple-600" />
              {viewPrompt?.title || "Prompt hình ảnh"}
            </DialogTitle>
            <DialogDescription>
              {viewPrompt?.product_name && `Sản phẩm: ${viewPrompt.product_name}`}
            </DialogDescription>
          </DialogHeader>
          {viewPrompt && (
            <div className="space-y-4 py-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">
                  {STYLE_CONFIG[viewPrompt.metadata?.style as string || "modern"] || "Hiện đại"}
                </Badge>
                <Badge variant="outline">{(viewPrompt.metadata?.aspect_ratio as string) || "1:1"}</Badge>
                {viewPrompt.generated_by && <Badge>AI: {viewPrompt.generated_by}</Badge>}
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Prompt:</p>
                <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm font-mono max-h-[300px] overflow-y-auto">
                  {viewPrompt.content_body || "(Không có prompt)"}
                </div>
                {viewPrompt.content_body && (
                  <Button className="mt-2" size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(viewPrompt.content_body!);
                      toast.success("Đã copy prompt!");
                    }}>
                    <Copy className="mr-2 size-3" />Copy prompt
                  </Button>
                )}
              </div>
              {(viewPrompt.metadata?.negative_prompt as string) && (
                <div>
                  <p className="text-sm font-medium mb-2">Negative Prompt:</p>
                  <div className="bg-red-50 rounded-lg p-3 text-sm font-mono text-red-800">
                    {viewPrompt.metadata.negative_prompt as string}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewPrompt(null)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
