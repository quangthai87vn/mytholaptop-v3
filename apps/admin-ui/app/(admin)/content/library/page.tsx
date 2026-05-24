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
  Search,
  RefreshCw,
  Copy,
  Eye,
  MoreHorizontal,
  Facebook,
  Globe,
  Video,
  ImageIcon,
  Loader2,
} from "lucide-react";
import type { ContentType, ContentStatus } from "@/types/content";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

type UIItem = {
  id: number;
  title: string | null;
  content_body: string | null;
  content_type: ContentType;
  product_name: string | null;
  status: ContentStatus;
  generated_by: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  facebook: { label: "Facebook", icon: Facebook, color: "text-blue-600", bg: "bg-blue-100" },
  website: { label: "Website", icon: Globe, color: "text-green-600", bg: "bg-green-100" },
  video: { label: "Video", icon: Video, color: "text-red-600", bg: "bg-red-100" },
  image: { label: "Hình ảnh", icon: ImageIcon, color: "text-purple-600", bg: "bg-purple-100" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "destructive" }> = {
  published: { label: "Đã đăng", variant: "success" },
  scheduled: { label: "Đã lên lịch", variant: "warning" },
  draft: { label: "Nháp", variant: "secondary" },
  archived: { label: "Lưu trữ", variant: "secondary" },
};

export default function LibraryPage() {
  const [items, setItems] = useState<UIItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewItem, setViewItem] = useState<UIItem | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (typeFilter !== "all") params.set("content_type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/content/items?${params}`);
      if (res.ok) {
        const result = await res.json();
        setItems(result.data || []);
      }
    } catch {
      toast.error("Lỗi khi lấy danh sách");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (item: UIItem) => {
    if (!confirm(`Xóa "${item.title || "không có tiêu đề"}"?`)) return;
    try {
      const res = await fetch(`/api/content/items/${item.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Đã xóa nội dung");
        await fetchItems();
      } else {
        toast.error("Lỗi khi xóa");
      }
    } catch {
      toast.error("Lỗi khi xóa");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
          <h1 className="text-2xl font-bold">Thư viện nội dung</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tìm kiếm và tái sử dụng nội dung đã tạo
          </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm nội dung, sản phẩm..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">Tất cả loại</option>
              <option value="facebook">Facebook</option>
              <option value="website">Website</option>
              <option value="video">Video</option>
              <option value="image">Hình ảnh</option>
            </select>
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="published">Đã đăng</option>
              <option value="scheduled">Đã lên lịch</option>
              <option value="draft">Nháp</option>
            </select>
            <Button variant="outline" size="icon" onClick={fetchItems}>
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
                  <TableHead>Nội dung</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Không tìm thấy nội dung nào
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const typeCfg = TYPE_CONFIG[item.content_type] || TYPE_CONFIG.facebook;
                  const TypeIcon = typeCfg.icon;
                  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="min-w-0 max-w-[400px]">
                          <p className="font-medium text-sm truncate">
                            {item.title || "(Không có tiêu đề)"}
                          </p>
                          {item.product_name && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              Sản phẩm: {item.product_name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {item.content_body || ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`size-7 rounded flex items-center justify-center ${typeCfg.bg}`}>
                            <TypeIcon className={`size-3.5 ${typeCfg.color}`} />
                          </div>
                          <span className="text-sm">{typeCfg.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(item.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => setViewItem(item)}>
                            <Eye className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="size-8"
                            onClick={() => {
                              if (item.content_body) {
                                navigator.clipboard.writeText(item.content_body);
                                toast.success("Đã copy nội dung!");
                              }
                            }}
                          >
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
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewItem?.title || "Nội dung"}</DialogTitle>
            <DialogDescription>
              {viewItem?.product_name && `Sản phẩm: ${viewItem.product_name}`}
            </DialogDescription>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4 py-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{TYPE_CONFIG[viewItem.content_type]?.label}</Badge>
                <Badge variant="secondary">{STATUS_CONFIG[viewItem.status]?.label}</Badge>
                {viewItem.generated_by && (
                  <Badge>AI: {viewItem.generated_by}</Badge>
                )}
              </div>
              <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm max-h-[400px] overflow-y-auto">
                {viewItem.content_body || "(Không có nội dung)"}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewItem(null)}>Đóng</Button>
            {viewItem?.content_body && (
              <Button onClick={() => {
                navigator.clipboard.writeText(viewItem.content_body!);
                toast.success("Đã copy!");
              }}>
                <Copy className="mr-2 size-4" />Copy
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
