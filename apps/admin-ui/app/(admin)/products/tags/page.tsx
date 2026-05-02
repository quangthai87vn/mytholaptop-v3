"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Pencil,
  Trash2,
  Plus,
  X,
  Edit,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  useTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
} from "@/hooks/use-medusa";
import type { MedusaProductTag } from "@/services/medusa-types";
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

export default function TagsPage() {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<MedusaProductTag | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);

  const [formValue, setFormValue] = useState("");

  const { data, isLoading, isError, error, refetch } = useTags({
    limit: PAGE_SIZE,
    q: search || undefined,
  });

  const tags = data?.data?.product_tags ?? [];
  const total = data?.data?.count ?? 0;

  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const handleEdit = (tag: MedusaProductTag) => {
    setSelectedTag(tag);
    setFormValue(tag.value);
    setIsEditing(true);
  };

  const handleDelete = (tagId: string) => {
    setTagToDelete(tagId);
    setDeleteDialogOpen(true);
  };

  const handleCancel = () => {
    setSelectedTag(null);
    setIsEditing(false);
    setFormValue("");
  };

  const handleSave = async () => {
    if (!formValue.trim()) return;

    try {
      if (isEditing && selectedTag) {
        const result = await updateTag.mutateAsync({
          tagId: selectedTag.id,
          tag: { value: formValue },
        });
        if (result.success) {
          toast.success("Đã cập nhật thẻ");
          handleCancel();
          refetch();
        } else {
          toast.error(`Lỗi: ${result.error}`);
        }
      } else {
        const result = await createTag.mutateAsync({ value: formValue });
        if (result.success) {
          toast.success("Đã tạo thẻ mới");
          handleCancel();
          refetch();
        } else {
          toast.error(`Lỗi: ${result.error}`);
        }
      }
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const confirmDelete = async () => {
    if (!tagToDelete) return;
    try {
      const result = await deleteTag.mutateAsync(tagToDelete);
      if (result.success) {
        toast.success("Đã xoá thẻ");
        setSelectedIds((prev) => prev.filter((id) => id !== tagToDelete));
        if (selectedTag?.id === tagToDelete) {
          handleCancel();
        }
        refetch();
      } else {
        toast.error(`Lỗi: ${result.error}`);
      }
    } catch {
      toast.error("Có lỗi xảy ra");
    }
    setDeleteDialogOpen(false);
    setTagToDelete(null);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === tags.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tags.map((t) => t.id));
    }
  };

  const toggleSelect = (tagId: string) => {
    setSelectedIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const isSaving = createTag.isPending || updateTag.isPending;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Quản lý thẻ
        </h1>
        <p className="text-muted-foreground">
          Tạo và quản lý thẻ sản phẩm để phân loại và tìm kiếm dễ dàng hơn.
        </p>
      </div>

      {/* Split panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left panel - Form */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {isEditing ? "Sửa thẻ" : "Thêm thẻ mới"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tên thẻ</label>
                <Input
                  placeholder="Nhập tên thẻ..."
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={!formValue.trim() || isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : isEditing ? (
                    "Cập nhật"
                  ) : (
                    "Lưu"
                  )}
                </Button>
                {isEditing && (
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="mr-1 size-4" />
                    Huỷ
                  </Button>
                )}
              </div>

              {isEditing && selectedTag && (
                <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle className="size-3" />
                    ID: <code className="text-xs">{selectedTag.id}</code>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Tạo:{" "}
                    {selectedTag.created_at
                      ? new Date(selectedTag.created_at).toLocaleString("vi-VN")
                      : "—"}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right panel - Table */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm thẻ..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Loading */}
          {isLoading && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="size-8 animate-spin text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Đang tải thẻ...</p>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {isError && (
            <Card className="border-destructive/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="size-10 text-destructive mb-3" />
                <p className="text-base font-medium text-destructive">
                  Không thể kết nối Medusa
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {(error as Error)?.message || "Vui lòng kiểm tra cấu hình Medusa."}
                </p>
                <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                  Thử lại
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          {!isLoading && !isError && (
            <Card className="hidden md:block overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={tags.length > 0 && selectedIds.length === tags.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Tên thẻ</TableHead>
                    <TableHead className="w-24">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Không tìm thấy thẻ nào.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tags.map((tag) => (
                      <TableRow key={tag.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(tag.id)}
                            onCheckedChange={() => toggleSelect(tag.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{tag.value}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => handleEdit(tag)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(tag.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Mobile cards */}
          {!isLoading && !isError && tags.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {tags.map((tag) => (
                <Card key={tag.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedIds.includes(tag.id)}
                          onCheckedChange={() => toggleSelect(tag.id)}
                        />
                        <div>
                          <p className="font-medium">{tag.value}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleEdit(tag)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(tag.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Stats */}
          {!isLoading && !isError && (
            <div className="flex items-center justify-between px-1">
              <div className="text-sm text-muted-foreground">
                Hiển thị {tags.length} / {total} thẻ
                {selectedIds.length > 0 && ` • Đã chọn ${selectedIds.length} thẻ`}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                className="gap-1"
              >
                <RefreshCw className="size-3" />
                Làm mới
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xoá thẻ</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xoá thẻ này? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
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
    </div>
  );
}
