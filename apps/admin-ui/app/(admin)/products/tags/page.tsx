"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Pencil,
  Trash2,
  Plus,
  RefreshCw,
  AlertCircle,
  Loader2,
  Tag,
  CheckCircle,
  X,
  ShoppingBag,
  Globe,
  Trash,
  ToggleLeft,
  ToggleRight,
  Info,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  useProductDataSource,
  useWooCommerceTags,
} from "@/hooks/use-medusa";
import type { MedusaProductTag } from "@/services/medusa-types";
import type { WooTag } from "@/hooks/use-medusa";
import { toast } from "sonner";

const PAGE_SIZE = 50;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TagsPage() {
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<MedusaProductTag | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<MedusaProductTag | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form state
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);

  // ── Data source routing ──────────────────────────────────────────────────────
  const { data: productSource } = useProductDataSource();
  const isWooSource = (productSource ?? "woocommerce") === "woocommerce";

  // ── Medusa data ─────────────────────────────────────────────────────────────
  const {
    data: medusaData,
    isLoading: isMedusaLoading,
    isError: isMedusaError,
    error: medusaError,
    refetch: refetchMedusa,
  } = useTags({
    limit: PAGE_SIZE,
    q: search || undefined,
    __skipMedusa: isWooSource,
  });

  // ── WooCommerce data ──────────────────────────────────────────────────────
  const {
    data: wooTags,
    isLoading: isWooLoading,
    isError: isWooError,
    error: wooError,
    refetch: refetchWoo,
  } = useWooCommerceTags({ per_page: 100 });

  const isLoading = isWooSource ? isWooLoading : isMedusaLoading;
  const isError = isWooSource ? isWooError : isMedusaError;
  const error = isWooSource ? wooError : medusaError;
  const refetch = isWooSource ? refetchWoo : refetchMedusa;
  const sourceLabel = isWooSource ? "WooCommerce" : "Medusa";

  const medusaTags = medusaData?.data?.product_tags ?? [];
  const total = isWooSource
    ? (wooTags?.length ?? 0)
    : (medusaData?.data?.count ?? 0);

  // Unified tags for display
  const displayTags = useMemo(() => {
    if (isWooSource) {
      return (wooTags ?? []).map((t) => ({
        id: String(t.id),
        name: t.name,
        slug: t.slug,
        count: t.count,
      }));
    }
    return medusaTags.map((t) => ({
      id: t.id,
      name: t.value,
      slug: t.value.toLowerCase().replace(/\s+/g, "-"),
      count: 0,
    }));
  }, [isWooSource, wooTags, medusaTags]);

  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const stats = useMemo(() => {
    const totalTags = total;
    const syncedTags = isWooSource
      ? totalTags
      : medusaTags.filter(
          (t) => t.metadata && typeof t.metadata === "object" && "woo_id" in (t.metadata as object)
        ).length;
    return {
      total: totalTags,
      synced: syncedTags,
      manual: isWooSource ? 0 : totalTags - syncedTags,
    };
  }, [total, isWooSource, medusaTags]);

  const handleNameChange = (name: string) => {
    setFormName(name);
    if (autoSlug && !editingTag) {
      setFormSlug(generateSlug(name));
    }
  };

  const openCreate = () => {
    setEditingTag(null);
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setAutoSlug(true);
    setDrawerOpen(true);
  };

  const openEdit = (tag: MedusaProductTag) => {
    setEditingTag(tag);
    setFormName(tag.value);
    setFormSlug(generateSlug(tag.value));
    setFormDescription(
      (tag.metadata && typeof tag.metadata === "object" && "description" in (tag.metadata as object))
        ? String((tag.metadata as Record<string, unknown>).description || "")
        : ""
    );
    setAutoSlug(false);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditingTag(null);
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setAutoSlug(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Vui lòng nhập tên thẻ");
      return;
    }

    try {
      if (editingTag) {
        const result = await updateTag.mutateAsync({
          tagId: editingTag.id,
          tag: {
            value: formName,
            metadata: {
              ...editingTag.metadata,
              slug: formSlug,
              description: formDescription,
            },
          },
        });
        if (result.success) {
          toast.success("Đã cập nhật thẻ");
          handleDrawerClose();
          refetch();
        } else {
          toast.error("Lỗi: Cập nhật tag thất bại");
        }
      } else {
        const result = await createTag.mutateAsync({
          value: formName,
          metadata: {
            slug: formSlug || generateSlug(formName),
            description: formDescription,
          },
        });
        if (result.success) {
          toast.success("Đã tạo thẻ mới");
          handleDrawerClose();
          refetch();
        } else {
          toast.error("Lỗi: Cập nhật tag thất bại");
        }
      }
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const openDelete = (tag: MedusaProductTag) => {
    setTagToDelete(tag);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!tagToDelete) return;
    try {
      const result = await deleteTag.mutateAsync(tagToDelete.id);
      if (result.success) {
        toast.success("Đã xoá thẻ");
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(tagToDelete.id);
          return next;
        });
        refetch();
      } else {
        toast.error("Lỗi: Cập nhật tag thất bại");
      }
    } catch {
      toast.error("Có lỗi xảy ra");
    }
    setDeleteDialogOpen(false);
    setTagToDelete(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      let success = 0;
      let failed = 0;
      for (const id of selectedIds) {
        const result = await deleteTag.mutateAsync(id);
        if (result.success) success++;
        else failed++;
      }
      if (failed === 0) {
        toast.success(`Đã xoá ${success} thẻ`);
      } else {
        toast.warning(`Đã xoá ${success} thẻ, ${failed} thẻ thất bại`);
      }
      setSelectedIds(new Set());
      setBulkDeleteDialogOpen(false);
      refetch();
    } catch {
      toast.error("Có lỗi xảy ra khi xoá hàng loạt");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayTags.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayTags.map((t) => t.id)));
    }
  };

  const isSaving = createTag.isPending || updateTag.isPending;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Quản lý thẻ
          </h1>
          <p className="text-muted-foreground">
            Tạo và quản lý thẻ sản phẩm từ {sourceLabel}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="size-4 mr-2" />
            Làm mới
          </Button>
          {!isWooSource && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4 mr-2" />
              Thêm thẻ
            </Button>
          )}
          {isWooSource && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/app">
                <Settings className="size-4 mr-2" />
                Đổi nguồn dữ liệu
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Tag className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Tổng thẻ</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <CheckCircle className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.synced}</p>
              <p className="text-sm text-muted-foreground">Đồng bộ WC</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <ShoppingBag className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.manual}</p>
              <p className="text-sm text-muted-foreground">Thủ công</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Globe className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {total > 0 ? Math.round((stats.synced / stats.total) * 100) : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Tỷ lệ đồng bộ</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm tên, slug thẻ..."
                className="pl-9 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()} className="size-10">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
          <span className="text-sm font-medium">
            Đã chọn {selectedIds.size} thẻ
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkDeleteDialogOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash className="size-4 mr-1" />
              Xoá đã chọn
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              <X className="size-4 mr-1" />
              Bỏ chọn
            </Button>
          </div>
        </div>
      )}

      {/* Main table */}
      <Card>
        <CardContent className="p-0">
          {/* Loading skeleton */}
          {isLoading && (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="size-4" />
                  <Skeleton className="size-4" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <AlertCircle className="size-12 text-destructive mb-4" />
              <p className="text-base font-medium text-destructive mb-1">
                {isWooSource ? "Không thể kết nối WooCommerce" : "Không thể kết nối Medusa"}
              </p>
              <p className="text-sm text-muted-foreground text-center mb-4">
                {(error as Error)?.message ||
                  (isWooSource
                    ? "Vui lòng kiểm tra cấu hình WooCommerce trong Cài đặt ứng dụng."
                    : "Vui lòng kiểm tra cấu hình Medusa.")}
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="size-4 mr-2" />
                Thử lại
              </Button>
            </div>
          )}

          {/* Table */}
          {!isLoading && !isError && (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={displayTags.length > 0 && selectedIds.size === displayTags.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Tên thẻ</TableHead>
                      <TableHead className="hidden lg:table-cell">Slug</TableHead>
                      <TableHead className="hidden md:table-cell">Mô tả</TableHead>
                      <TableHead className="hidden xl:table-cell">Ngày tạo</TableHead>
                      <TableHead className="w-24">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayTags.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-16">
                          <div className="flex flex-col items-center text-muted-foreground">
                            <Tag className="size-12 mb-3" />
                            <p className="text-base font-medium mb-1">Chưa có thẻ nào</p>
                            <p className="text-sm mb-4">
                              Thẻ được quản lý trong {sourceLabel}.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayTags.map((tag) => {
                        const isSelected = selectedIds.has(tag.id);
                        return (
                          <TableRow
                            key={tag.id}
                            className={isSelected ? "bg-muted/30" : ""}
                          >
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelect(tag.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{tag.name}</div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {tag.slug || "—"}
                              </code>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="text-sm text-muted-foreground">
                                {isWooSource ? (
                                  tag.count > 0 ? `${tag.count} sản phẩm` : "—"
                                ) : "—"}
                              </span>
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              <span className="text-sm text-muted-foreground">—</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {!isWooSource && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8"
                                      onClick={() => {
                                        const medusaTag = medusaTags.find((t) => t.id === tag.id);
                                        if (medusaTag) openEdit(medusaTag);
                                      }}
                                      title="Sửa"
                                    >
                                      <Pencil className="size-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8 text-destructive hover:text-destructive"
                                      onClick={() => {
                                        const medusaTag = medusaTags.find((t) => t.id === tag.id);
                                        if (medusaTag) openDelete(medusaTag);
                                      }}
                                      title="Xoá"
                                    >
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </>
                                )}
                                {isWooSource && (
                                  <span className="text-xs text-muted-foreground px-2">
                                    Chỉ xem
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination info */}
              {!isLoading && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Hiển thị {displayTags.length} / {total} thẻ
                    {selectedIds.size > 0 && ` • Đã chọn ${selectedIds.size} thẻ`}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Drawer */}
      <Sheet open={drawerOpen} onOpenChange={(open) => !open && handleDrawerClose()}>
        <SheetContent className="w-[420px] sm:max-w-[420px]">
          <SheetHeader>
            <SheetTitle>
              {editingTag ? "Sửa thẻ" : "Thêm thẻ mới"}
            </SheetTitle>
            <SheetDescription>
              {editingTag
                ? "Cập nhật thông tin thẻ sản phẩm."
                : "Tạo một thẻ mới để gắn vào sản phẩm."}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name">
                Tên thẻ <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tag-name"
                placeholder="Ví dụ: Laptop Gaming, Văn phòng..."
                value={formName}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tag-slug">Slug</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    if (!autoSlug) {
                      setFormSlug(generateSlug(formName));
                      setAutoSlug(true);
                    }
                  }}
                >
                  {autoSlug ? (
                    <ToggleRight className="size-4 mr-1 text-green-600" />
                  ) : (
                    <ToggleLeft className="size-4 mr-1" />
                  )}
                  Tự sinh
                </Button>
              </div>
              <Input
                id="tag-slug"
                placeholder="ten-the"
                value={formSlug}
                onChange={(e) => {
                  setFormSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                  setAutoSlug(false);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Dùng cho URL thân thiện. Để trống để tự sinh.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-desc">Mô tả</Label>
              <Textarea
                id="tag-desc"
                placeholder="Mô tả ngắn về thẻ này..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
            {editingTag && (
              <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="size-3" />
                  ID: <code className="text-[10px]">{editingTag.id}</code>
                </div>
                <div className="text-xs text-muted-foreground">
                  Tạo: {formatDate(editingTag.created_at)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Cập nhật: {formatDate(editingTag.updated_at)}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleDrawerClose}
              className="flex-1"
            >
              Huỷ
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formName.trim() || isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : editingTag ? (
                "Cập nhật"
              ) : (
                "Tạo mới"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirm dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xoá thẻ</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xoá thẻ &quot;{tagToDelete?.value}&quot;?{" "}
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTag.isPending}
            >
              {deleteTag.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Xoá"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirm dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá {selectedIds.size} thẻ đã chọn?</DialogTitle>
            <DialogDescription>
              Tất cả thẻ đã chọn sẽ bị xoá vĩnh viễn. Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={deleteTag.isPending}
            >
              {deleteTag.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Trash className="size-4 mr-2" />
                  Xoá {selectedIds.size} thẻ
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
