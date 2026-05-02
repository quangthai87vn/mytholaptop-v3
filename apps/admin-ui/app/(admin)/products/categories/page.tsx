"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Loader2,
  XCircle,
  FolderOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CategoryTree, type CategoryNode } from "@/components/categories/category-tree";
import { CategoryTreeMobile } from "@/components/categories/category-tree-mobile";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/use-medusa";
import type { MedusaCategory } from "@/services/medusa-types";
import { toast } from "sonner";

function buildCategoryTree(cats: MedusaCategory[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  cats.forEach((cat) => {
    map.set(cat.id, {
      id: cat.id,
      name: cat.name,
      handle: cat.handle || cat.slug || "",
      description: cat.description || "",
      is_active: cat.is_active !== false,
      parent_category_id: cat.parent_category_id || "",
      level: 0,
      children: [],
    });
  });

  cats.forEach((cat) => {
    const node = map.get(cat.id)!;
    if (cat.parent_category_id && map.has(cat.parent_category_id)) {
      const parent = map.get(cat.parent_category_id)!;
      node.level = parent.level + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function filterTree(
  nodes: CategoryNode[],
  search: string,
  statusFilter: string
): CategoryNode[] {
  return nodes
    .map((node) => {
      const lowerSearch = search.toLowerCase();
      const matchesSearch =
        !search ||
        node.name.toLowerCase().includes(lowerSearch) ||
        node.handle.toLowerCase().includes(lowerSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && node.is_active) ||
        (statusFilter === "inactive" && !node.is_active);

      const filteredChildren = filterTree(node.children, search, statusFilter);
      const hasMatchingDescendant = filteredChildren.length > 0;

      if (matchesSearch && matchesStatus) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      if (hasMatchingDescendant) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    })
    .filter((n): n is CategoryNode => n !== null);
}

function countNodes(nodes: CategoryNode[]): number {
  return nodes.reduce((acc, node) => acc + 1 + countNodes(node.children), 0);
}

function generateHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
}

export default function CategoriesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formName, setFormName] = useState("");
  const [formHandle, setFormHandle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formParent, setFormParent] = useState("none");
  const [formActive, setFormActive] = useState(true);

  const { data, isLoading, isError, error, refetch } = useCategories({
    limit: 1000,
    include_descendants_tree: true,
  });

  const categoryTree = useMemo(
    () => buildCategoryTree(data?.data?.product_categories ?? []),
    [data?.data?.product_categories]
  );

  const filteredTree = useMemo(
    () => filterTree(categoryTree, search, statusFilter),
    [categoryTree, search, statusFilter]
  );

  const totalDisplayed = useMemo(
    () => countNodes(filteredTree),
    [filteredTree]
  );

  const allFlat = useMemo(() => {
    const result: CategoryNode[] = [];
    const traverse = (nodes: CategoryNode[]) => {
      nodes.forEach((node) => {
        result.push(node);
        traverse(node.children);
      });
    };
    traverse(categoryTree);
    return result;
  }, [categoryTree]);

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const getParentName = (node: CategoryNode): string => {
    if (!node.parent_category_id) return "—";
    const parent = allFlat.find((c) => c.id === node.parent_category_id);
    return parent?.name || "—";
  };

  const openAddDialog = () => {
    setSelectedCategory(null);
    setIsEditing(false);
    setFormName("");
    setFormHandle("");
    setFormDescription("");
    setFormParent("none");
    setFormActive(true);
    setEditDialogOpen(true);
  };

  const openEditDialog = (cat: CategoryNode) => {
    setSelectedCategory(cat);
    setIsEditing(true);
    setFormName(cat.name);
    setFormHandle(cat.handle);
    setFormDescription(cat.description);
    setFormParent(cat.parent_category_id || "none");
    setFormActive(cat.is_active);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (cat: CategoryNode) => {
    setSelectedCategory(cat);
    setDeleteDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    setFormName(name);
    if (!isEditing) {
      setFormHandle(generateHandle(name));
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) return;

    const payload: Record<string, unknown> = {
      name: formName,
      handle: formHandle || generateHandle(formName),
      description: formDescription,
      is_active: formActive,
    };

    if (formParent !== "none") {
      payload.parent_category_id = formParent;
    }

    try {
      if (isEditing && selectedCategory) {
        const result = await updateCategory.mutateAsync({
          categoryId: selectedCategory.id,
          category: payload as any,
        });
        if (result.success) {
          toast.success("�ã cập nhật danh mục");
          setEditDialogOpen(false);
          refetch();
        } else {
          toast.error(`Lỗi: ${result.error}`);
        }
      } else {
        const result = await createCategory.mutateAsync(payload as any);
        if (result.success) {
          toast.success("Đã tạo danh mục");
          setEditDialogOpen(false);
          refetch();
        } else {
          toast.error(`Lỗi: ${result.error}`);
        }
      }
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    try {
      const result = await deleteCategory.mutateAsync(selectedCategory.id);
      if (result.success) {
        toast.success("�ã xoá danh mục");
        setDeleteDialogOpen(false);
        refetch();
      } else {
        toast.error(`Lỗi: ${result.error}`);
      }
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const parentOptions = allFlat.filter(
    (c) => !selectedCategory || c.id !== selectedCategory.id
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Quản lý danh mục
          </h1>
          <p className="text-muted-foreground">
            Quản lý danh mục sản phẩm trong cửa hàng.
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 size-4" />
          Thêm danh mục
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm tên, slug danh mục..."
                className="pl-9 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-10">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Không hoạt động</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={() => refetch()} className="size-10">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Đang tải danh mục...</p>
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
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
              {(error as Error)?.message || "Vui lòng kiểm tra cấu hình Medusa."}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Thử lại
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Category Tree */}
      {!isLoading && !isError && (
        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Danh sách danh mục ({totalDisplayed})
              </CardTitle>
              <FolderOpen className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {totalDisplayed === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <XCircle className="size-12 mb-3" />
                <p>Không tìm thấy danh mục nào.</p>
              </div>
            ) : (
              <div className="divide-y">
                {/* Desktop Tree */}
                <div className="hidden md:block overflow-x-auto">
                  <CategoryTree
                    nodes={filteredTree}
                    onEdit={openEditDialog}
                    onDelete={openDeleteDialog}
                  />
                </div>

                {/* Mobile Tree */}
                <div className="md:hidden px-4 py-2">
                  <CategoryTreeMobile
                    nodes={filteredTree}
                    onEdit={openEditDialog}
                    onDelete={openDeleteDialog}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Sửa danh mục" : "Thêm danh mục mới"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Cập nhật thông tin danh mục."
                : "Tạo một danh mục sản phẩm mới."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên danh mục</label>
              <Input
                placeholder="Nhập tên danh mục..."
                value={formName}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Slug</label>
              <Input
                placeholder="slug-danh-muc"
                value={formHandle}
                onChange={(e) => setFormHandle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Danh mục cha</label>
              <Select value={formParent} onValueChange={setFormParent}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục cha (không bắt buộc)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không có (Danh mục gốc)</SelectItem>
                  {parentOptions.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.level > 0
                        ? `${"  ".repeat(cat.level)}${cat.name}`
                        : cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mô tả</label>
              <Textarea
                placeholder="Mô tả danh mục..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Huỷ
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !formName.trim() ||
                createCategory.isPending ||
                updateCategory.isPending
              }
            >
              {createCategory.isPending || updateCategory.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isEditing ? (
                "Cập nhật"
              ) : (
                "Tạo mới"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xoá danh mục</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xoá danh mục &quot;{selectedCategory?.name}&quot;?
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
              disabled={deleteCategory.isPending}
            >
              {deleteCategory.isPending ? (
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
