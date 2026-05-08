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
  Search,
  RefreshCw,
  Plus,
  Eye,
  Pencil,
  Globe,
  Clock,
  CheckCircle,
  Loader2,
} from "lucide-react";
import type { ContentStatus } from "@/types/content";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

type WebPost = {
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
  archived: { label: "Luu tru", variant: "secondary" },
};

export default function WebsitePostsPage() {
  const [posts, setPosts] = useState<WebPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ content_type: "website", limit: "50" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/content/items?${params}`);
      if (res.ok) {
        const result = await res.json();
        setPosts(result.data || []);
      }
    } catch {
      toast.error("Loi khi lay danh sach");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bai viet Website</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quan ly bai viet SEO cho website
          </p>
        </div>
        <Button asChild className="gap-2">
          <a href="/content/ai-generator">
            <Plus className="size-4" />
            Tao bai viet
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
                placeholder="Tim bai viet, SEO keyword..."
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
                <TableHead>Bai viet</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>San pham</TableHead>
                <TableHead className="w-[120px]">Trang thai</TableHead>
                <TableHead className="w-[160px]">Ngay tao</TableHead>
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
                    Khong co bai viet nao
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((post) => {
                  const statusCfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
                  const slug = post.metadata?.slug as string | undefined;
                  const seoKeyword = post.metadata?.seo_keyword as string | undefined;
                  const views = post.metadata?.views as number | undefined;

                  return (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate max-w-[250px]">
                            {post.title || "(Khong co tieu de)"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(post.created_at)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[150px] block">
                          /{slug || post.id}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {post.product_name || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {views !== undefined ? `${views.toLocaleString()} views` : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="size-8">
                            <Eye className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8">
                            <Pencil className="size-3.5" />
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
    </div>
  );
}
