"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  RefreshCw,
  Plus,
  Eye,
  MoreHorizontal,
  Facebook,
  Clock,
  CheckCircle,
  Copy,
  Send,
  Loader2,
} from "lucide-react";
import type { ContentStatus } from "@/types/content";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

type FBPost = {
  id: number;
  title: string | null;
  content_body: string | null;
  product_name: string | null;
  status: ContentStatus;
  generated_by: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "destructive"; icon: React.ComponentType<{ className?: string }> }> = {
  published: { label: "Đã đăng", variant: "success", icon: CheckCircle },
  scheduled: { label: "Đã lên lịch", variant: "warning", icon: Clock },
  draft: { label: "Nháp", variant: "secondary", icon: Clock },
  archived: { label: "Lưu trữ", variant: "secondary", icon: Clock },
};

export default function FacebookPostsPage() {
  const [posts, setPosts] = useState<FBPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [viewPost, setViewPost] = useState<FBPost | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ content_type: "facebook", limit: "50" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/content/items?${params}`);
      if (res.ok) {
        const result = await res.json();
        let data = result.data || [];
        if (sourceFilter !== "all") {
          data = data.filter((p: FBPost) =>
            sourceFilter === "ai" ? p.generated_by : !p.generated_by
          );
        }
        setPosts(data);
      }
    } catch {
      toast.error("Lỗi khi lấy danh sách");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter, search]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = async (post: FBPost) => {
    if (!confirm("Xóa bài viết này?")) return;
    try {
      const res = await fetch(`/api/content/items/${post.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Đã xóa!");
        await fetchPosts();
      }
    } catch {
      toast.error("Lỗi khi xóa");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bài viết Facebook</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quản lý nội dung bài viết Facebook
          </p>
        </div>
        <Button asChild className="gap-2">
          <a href="/content/ai-generator">
            <Plus className="size-4" />
            Tạo bài viết
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
                placeholder="Tìm bài viết, sản phẩm..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="draft">Nháp</option>
              <option value="scheduled">Đã lên lịch</option>
              <option value="published">Đã đăng</option>
            </select>
            <select className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
              <option value="all">Tất cả nguồn</option>
              <option value="ai">AI tạo</option>
              <option value="manual">Thủ công</option>
            </select>
            <Button variant="outline" size="icon" onClick={fetchPosts}>
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
                  <TableHead>Bài viết</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="w-[100px]">Nguồn</TableHead>
                  <TableHead className="w-[120px]">Trạng thái</TableHead>
                  <TableHead className="w-[160px]">Ngày tạo</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Không có bài viết nào
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((post) => {
                  const statusCfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
                  const StatusIcon = statusCfg.icon;
                  const reach = post.metadata?.reach as number | undefined;
                  const likes = post.metadata?.likes as number | undefined;

                  return (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate max-w-[300px]">
                            {post.title || "(Không có tiêu đề)"}
                          </p>
                          {reach !== undefined && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Reach: {reach.toLocaleString()} • Likes: {likes ?? 0}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {post.product_name || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={post.generated_by ? "default" : "secondary"}>
                          {post.generated_by ? "AI" : "Manual"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusCfg.variant} className="gap-1">
                          <StatusIcon className="size-3" />
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(post.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => setViewPost(post)}>
                            <Eye className="size-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                if (post.content_body) {
                                  navigator.clipboard.writeText(post.content_body);
                                  toast.success("Đã copy nội dung!");
                                }
                              }}>
                                <Copy className="mr-2 size-4" />Copy
                              </DropdownMenuItem>
                              {post.status === "draft" && (
                                <DropdownMenuItem>
                                  <Send className="mr-2 size-4" />Lên lịch đăng
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(post)}>
                                <MoreHorizontal className="mr-2 size-4" />Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
      <Dialog open={!!viewPost} onOpenChange={() => setViewPost(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Facebook className="size-5 text-blue-600" />
              {viewPost?.title || "Bài viết Facebook"}
            </DialogTitle>
            <DialogDescription>
              {viewPost?.product_name && `Sản phẩm: ${viewPost.product_name}`}
            </DialogDescription>
          </DialogHeader>
          {viewPost && (
            <div className="space-y-4 py-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant={STATUS_CONFIG[viewPost.status]?.variant as any || "secondary"}>
                  {STATUS_CONFIG[viewPost.status]?.label || viewPost.status}
                </Badge>
                {viewPost.generated_by && (
                  <Badge>AI: {viewPost.generated_by}</Badge>
                )}
              </div>
              <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                {viewPost.content_body || "(Không có nội dung)"}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewPost(null)}>Đóng</Button>
            <Button onClick={() => {
              if (viewPost?.content_body) {
                navigator.clipboard.writeText(viewPost.content_body);
                toast.success("Đã copy!");
              }
            }}>
              <Copy className="mr-2 size-4" />Copy nội dung
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
