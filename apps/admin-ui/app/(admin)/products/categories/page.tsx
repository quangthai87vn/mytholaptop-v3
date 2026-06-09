"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Loader2,
  XCircle,
  FolderOpen,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  FolderSearch,
  Info,
  Settings,
  Globe,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryTree, type CategoryNode } from "@/components/categories/category-tree";
import { CategoryTreeMobile } from "@/components/categories/category-tree-mobile";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useProductDataSource,
  useWooCommerceCategories,
} from "@/hooks/use-medusa";
import type { MedusaCategory } from "@/services/medusa-types";
import type { WooCategory } from "@/lib/products/product-filters";
import { toast } from "sonner";

function buildTreeFromWooCommerce(cats: WooCategory[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  cats.forEach((cat) => {
    map.set(String(cat.id), {
      id: String(cat.id),
      name: cat.name,
      handle: cat.slug || "",
      description: cat.description || "",
      is_active: true, // WooCommerce has no is_active, all are visible
      parent_category_id: cat.parent ? String(cat.parent) : "",
      level: 0,
      children: [],
      wooId: String(cat.id),
    });
  });

  cats.forEach((cat) => {
    const node = map.get(String(cat.id))!;
    if (cat.parent && map.has(String(cat.parent))) {
      const parent = map.get(String(cat.parent))!;
      node.level = parent.level + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

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
        return { ...node, children: filteredChildren };
      }
      if (hasMatchingDescendant) {
        return { ...node, children: filteredChildren };
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

export default function CategoriesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [addChildMode, setAddChildMode] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formHandle, setFormHandle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formParent, setFormParent] = useState("none");
  const [formActive, setFormActive] = useState(true);
  const [formRank, setFormRank] = useState<number | undefined>(undefined);
  const [formThumbnail, setFormThumbnail] = useState("");
  const [formSeoTitle, setFormSeoTitle] = useState("");
  const [formSeoDesc, setFormSeoDesc] = useState("");
  const [autoHandle, setAutoHandle] = useState(true);

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
  } = useCategories({
    limit: 1000,
    include_descendants_tree: true,
  });

  // ── WooCommerce data ──────────────────────────────────────────────────────
  const {
    data: wooCategories,
    isLoading: isWooLoading,
    isError: isWooError,
    error: wooError,
    refetch: refetchWoo,
  } = useWooCommerceCategories({ per_page: 100 });

  const isLoading = isWooSource ? isWooLoading : isMedusaLoading;
  const isError = isWooSource ? isWooError : isMedusaError;
  const error = isWooSource ? wooError : medusaError;
  const refetch = isWooSource ? refetchWoo : refetchMedusa;

  // ── Build tree ────────────────────────────────────────────────────────────
  const categoryTree = useMemo(() => {
    if (isWooSource) {
      // WooCommerce: map WooCategory[] to CategoryNode[]
      if (!wooCategories || !Array.isArray(wooCategories)) return [];
      return buildTreeFromWooCommerce(wooCategories);
    }
    // Medusa: map MedusaCategory[] to CategoryNode[]
    return buildCategoryTree(medusaData?.data?.product_categories ?? []);
  }, [isWooSource, wooCategories, medusaData?.data?.product_categories]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

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

  const filteredTree = useMemo(
    () => filterTree(categoryTree, search, statusFilter),
    [categoryTree, search, statusFilter]
  );

  const totalDisplayed = useMemo(() => countNodes(filteredTree), [filteredTree]);

  const handleNameChange = (name: string) => {
    setFormName(name);
    if (autoHandle && !isEditing) {
      setFormHandle(generateHandle(name));
    }
  };

  const openAddDialog = (parentId?: string) => {
    setSelectedCategory(null);
    setIsEditing(false);
    setAddChildMode(!!parentId);
    setFormName("");
    setFormHandle("");
    setFormDescription("");
    setFormParent(parentId && parentId !== "none" ? parentId : "none");
    setFormActive(true);
    setFormRank(undefined);
    setFormThumbnail("");
    setFormSeoTitle("");
    setFormSeoDesc("");
    setAutoHandle(true);
    setDrawerOpen(true);
  };

  const openEditDialog = (cat: CategoryNode) => {
    setSelectedCategory(cat);
    setIsEditing(true);
    setAddChildMode(false);
    setFormName(cat.name);
    setFormHandle(cat.handle || "");
    setFormDescription(cat.description || "");

    // Load metadata from flat list — only available for Medusa categories
    let catData = null;
    if (!isWooSource && medusaData?.data?.product_categories) {
      catData = medusaData.data.product_categories.find((c) => c.id === cat.id);
    }
    const meta = catData?.metadata;
    setFormRank(
      meta && typeof meta === "object" && "rank" in meta
        ? Number((meta as Record<string, unknown>).rank) || undefined
        : catData?.rank
    );
    setFormThumbnail(
      meta && typeof meta === "object" && "thumbnail" in meta
        ? String((meta as Record<string, unknown>).thumbnail || "")
        : ""
    );
    setFormSeoTitle(
      meta && typeof meta === "object" && "seo_title" in meta
        ? String((meta as Record<string, unknown>).seo_title || "")
        : ""
    );
    setFormSeoDesc(
      meta && typeof meta === "object" && "seo_description" in meta
        ? String((meta as Record<string, unknown>).seo_description || "")
        : ""
    );
    setFormParent(cat.parent_category_id || "none");
    setFormActive(cat.is_active);
    setAutoHandle(false);
    setDrawerOpen(true);
  };

  const openDeleteDialog = (cat: CategoryNode) => {
    setSelectedCategory(cat);
    setDeleteDialogOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedCategory(null);
    setIsEditing(false);
    setAddChildMode(false);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;

    const parentCat = formParent !== "none" ? allFlat.find((c) => c.id === formParent) : null;
    const seoTitle = formSeoTitle.trim() || formName;
    const seoDesc = formSeoDesc.trim() || formDescription;

    const payload: Record<string, unknown> = {
      name: formName,
      handle: formHandle || generateHandle(formName),
      description: formDescription,
      is_active: formActive,
      rank: formRank ?? 0,
      metadata: {
        thumbnail: formThumbnail,
        seo_title: seoTitle,
        seo_description: seoDesc,
        source: "manual",
      },
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
          toast.success("Đã cập nhật danh mục");
          handleDrawerClose();
          refetch();
        } else {
          toast.error("Lỗi: Cập nhật danh mục thất bại");
        }
      } else {
        const result = await createCategory.mutateAsync(payload as any);
        if (result.success) {
          toast.success("Đã tạo danh mục");
          handleDrawerClose();
          refetch();
        } else {
          toast.error("Lỗi: Cập nhật danh mục thất bại");
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
        toast.success("Đã xoá danh mục");
        setDeleteDialogOpen(false);
        refetch();
      } else {
        toast.error("Lỗi: Cập nhật danh mục thất bại");
      }
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const parentOptions = allFlat.filter(
    (c) => !selectedCategory || c.id !== selectedCategory.id
  );

  const catData = selectedCategory && !isWooSource
    ? medusaData?.data?.product_categories?.find((c) => c.id === selectedCategory.id)
    : null;

  const isSaving = createCategory.isPending || updateCategory.isPending;

  // Source-aware labels
  const sourceLabel = isWooSource ? "WooCommerce" : "Medusa";
  const activeCount = allFlat.filter((c) => c.is_active).length;
  const inactiveCount = isWooSource ? 0 : allFlat.filter((c) => !c.is_active).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Quản lý danh mục
          </h1>
          <p className="text-muted-foreground">
            Quản lý danh mục sản phẩm từ {sourceLabel}.
          </p>
        </div>
        {!isWooSource && (
          <Button onClick={() => openAddDialog()}>
            <Plus className="mr-2 size-4" />
            Thêm danh mục
          </Button>
        )}
        {isWooSource && (
          <Button variant="outline" asChild>
            <Link href="/settings/app">
              <Settings className="mr-2 size-4" />
              Đổi nguồn dữ liệu
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <FolderOpen className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{allFlat.length}</p>
              <p className="text-sm text-muted-foreground">Tổng danh mục</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <FolderOpen className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {allFlat.filter((c) => c.is_active).length}
              </p>
              <p className="text-sm text-muted-foreground">Đang hoạt động</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <FolderOpen className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {inactiveCount}
              </p>
              <p className="text-sm text-muted-foreground">
                {isWooSource ? "Không phân biệt" : "Không hoạt động"}
              </p>
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
            <Button variant="outline" size="icon" onClick={() => refetch()} className="size-10">
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
              {isWooSource
                ? "Không thể kết nối WooCommerce"
                : "Không thể kết nối Medusa"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
              {(error as Error)?.message ||
                (isWooSource
                  ? "Vui lòng kiểm tra cấu hình WooCommerce trong Cài đặt ứng dụng."
                  : "Vui lòng kiểm tra cấu hình Medusa.")}
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
                <p className="text-base font-medium mb-1">Không tìm thấy danh mục nào</p>
                <p className="text-sm mb-4">Tạo danh mục đầu tiên để bắt đầu.</p>
                <Button size="sm" onClick={() => openAddDialog()}>
                  <Plus className="size-4 mr-2" />
                  Thêm danh mục
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {/* Desktop Tree */}
                <div className="hidden md:block overflow-x-auto">
                  <EnhancedCategoryTree
                    nodes={filteredTree}
                    onEdit={openEditDialog}
                    onDelete={openDeleteDialog}
                    onAddChild={openAddDialog}
                    allFlat={allFlat}
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

      {/* Create / Edit Drawer */}
      <Sheet open={drawerOpen} onOpenChange={(open) => !open && handleDrawerClose()}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {isEditing
                ? "Sửa danh mục"
                : addChildMode
                ? "Thêm danh mục con"
                : "Thêm danh mục mới"}
            </SheetTitle>
            <SheetDescription>
              {isEditing
                ? "Cập nhật thông tin danh mục."
                : "Tạo một danh mục sản phẩm mới."}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="cat-name">
                Tên danh mục <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cat-name"
                placeholder="Nhập tên danh mục..."
                value={formName}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>

            {/* Handle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="cat-handle">Slug</Label>
                {!autoHandle && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setFormHandle(generateHandle(formName));
                      setAutoHandle(true);
                    }}
                  >
                    Tự sinh
                  </Button>
                )}
              </div>
              <Input
                id="cat-handle"
                placeholder="slug-danh-muc"
                value={formHandle}
                onChange={(e) => {
                  setFormHandle(e.target.value.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-"));
                  setAutoHandle(false);
                }}
              />
            </div>

            {/* Parent */}
            <div className="space-y-2">
              <Label htmlFor="cat-parent">Danh mục cha</Label>
              <Select value={formParent} onValueChange={setFormParent}>
                <SelectTrigger id="cat-parent">
                  <SelectValue placeholder="Chọn danh mục cha (không bắt buộc)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không có (Danh mục gốc)</SelectItem>
                  {parentOptions.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.level > 0 ? `${"  ".repeat(cat.level)}${cat.name}` : cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Mô tả</Label>
              <Textarea
                id="cat-desc"
                placeholder="Mô tả danh mục..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Thumbnail */}
            <div className="space-y-2">
              <Label htmlFor="cat-thumb">Ảnh đại diện (URL)</Label>
              <Input
                id="cat-thumb"
                placeholder="https://example.com/category-image.jpg"
                value={formThumbnail}
                onChange={(e) => setFormThumbnail(e.target.value)}
              />
              {formThumbnail && (
                <div className="relative w-24 h-16 rounded border overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formThumbnail}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>

            {/* Rank */}
            <div className="space-y-2">
              <Label htmlFor="cat-rank">Thứ tự hiển thị</Label>
              <Input
                id="cat-rank"
                type="number"
                min={0}
                placeholder="0"
                value={formRank ?? ""}
                onChange={(e) =>
                  setFormRank(e.target.value ? Number(e.target.value) : undefined)
                }
              />
              <p className="text-xs text-muted-foreground">
                Số nhỏ hơn sẽ hiển thị trước.
              </p>
            </div>

            {/* Active */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="cat-active">Trạng thái</Label>
                <p className="text-xs text-muted-foreground">
                  Danh mục không hoạt động sẽ không hiển thị trên cửa hàng.
                </p>
              </div>
              <Switch
                id="cat-active"
                checked={formActive}
                onCheckedChange={setFormActive}
              />
            </div>

            {/* SEO Section */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold">SEO</h3>
              <div className="space-y-2">
                <Label htmlFor="cat-seo-title">Tiêu đề SEO</Label>
                <Input
                  id="cat-seo-title"
                  placeholder={formName || "Tiêu đề danh mục..."}
                  value={formSeoTitle}
                  onChange={(e) => setFormSeoTitle(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Để trống để dùng tên danh mục. Khuyến nghị 50-60 ký tự.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-seo-desc">Mô tả SEO</Label>
                <Textarea
                  id="cat-seo-desc"
                  placeholder={formDescription || "Mô tả cho công cụ tìm kiếm..."}
                  value={formSeoDesc}
                  onChange={(e) => setFormSeoDesc(e.target.value)}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Để trống để dùng mô tả. Khuyến nghị 120-160 ký tự.
                </p>
              </div>
            </div>

            {/* Metadata info */}
            {isEditing && catData && (
              <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="size-3" />
                  ID: <code className="text-[10px]">{catData.id}</code>
                </div>
                <div className="text-xs text-muted-foreground">
                  Tạo: {formatDate(catData.created_at)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Cập nhật: {formatDate(catData.updated_at)}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" onClick={handleDrawerClose} className="flex-1">
              Huỷ
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formName.trim() || isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isEditing ? (
                "Cập nhật"
              ) : (
                "Tạo mới"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xoá danh mục</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xoá danh mục &quot;{selectedCategory?.name}&quot;?
              {selectedCategory && selectedCategory.children.length > 0 && (
                <span className="block mt-2 text-yellow-600">
                  Cảnh báo: Danh mục này có {selectedCategory.children.length} danh mục con.
                  Cần xoá hoặc di chuyển danh mục con trước.
                </span>
              )}
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
              disabled={deleteCategory.isPending || (selectedCategory?.children.length ?? 0) > 0}
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

// ============================================================
// Enhanced Category Tree with Add Child action
// ============================================================

interface EnhancedTreeProps {
  nodes: CategoryNode[];
  onEdit: (cat: CategoryNode) => void;
  onDelete: (cat: CategoryNode) => void;
  onAddChild: (parentId: string) => void;
  allFlat: CategoryNode[];
  depth?: number;
}

function EnhancedCategoryTree({
  nodes,
  onEdit,
  onDelete,
  onAddChild,
  allFlat,
  depth = 0,
}: EnhancedTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (items: CategoryNode[]) => {
      items.forEach((item) => {
        if (item.children.length > 0) {
          allIds.add(item.id);
          collectIds(item.children);
        }
      });
    };
    collectIds(nodes);
    setExpandedIds(allIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  return (
    <div className="space-y-2">
      {depth === 0 && nodes.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-xs text-muted-foreground">
            {nodes.length} danh mục gốc
          </span>
          <div className="flex gap-3">
            <button
              onClick={expandAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Mở rộng tất cả
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              onClick={collapseAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Thu gọn tất cả
            </button>
          </div>
        </div>
      )}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 px-4 py-3"></th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Tên danh mục
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">
                Slug
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden xl:table-cell">
                Trạng thái
              </th>
              <th className="w-24 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {nodes.map((node) => {
              const hasChildren = node.children.length > 0;
              const isExpanded = expandedIds.has(node.id);

              return (
                <>
                  <EnhancedCategoryRow
                    key={node.id}
                    node={node}
                    depth={0}
                    hasChildren={hasChildren}
                    isExpanded={isExpanded}
                    onToggle={() => handleToggle(node.id)}
                    onEdit={() => onEdit(node)}
                    onDelete={() => onDelete(node)}
                    onAddChild={() => onAddChild(node.id)}
                    allFlat={allFlat}
                  />
                  {hasChildren && isExpanded && (
                    <EnhancedCategoryRow
                      key={`${node.id}-children`}
                      node={node}
                      depth={1}
                      hasChildren={hasChildren}
                      isExpanded={isExpanded}
                      onToggle={() => handleToggle(node.id)}
                      onEdit={() => onEdit(node)}
                      onDelete={() => onDelete(node)}
                      onAddChild={() => onAddChild(node.id)}
                      allFlat={allFlat}
                      childrenOnly
                    />
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface EnhancedRowProps {
  node: CategoryNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddChild: () => void;
  allFlat: CategoryNode[];
  childrenOnly?: boolean;
}

function EnhancedCategoryRow({
  node,
  depth,
  hasChildren,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddChild,
  allFlat,
  childrenOnly,
}: EnhancedRowProps) {
  const indentWidth = depth * 24;

  if (childrenOnly) {
    return (
      <>
        {node.children.map((child) => {
          const childHasChildren = child.children.length > 0;
          const childIsExpanded = false;
          return (
            <EnhancedCategoryRow
              key={child.id}
              node={child}
              depth={depth + 1}
              hasChildren={childHasChildren}
              isExpanded={childIsExpanded}
              onToggle={() => {}}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              allFlat={allFlat}
            />
          );
        })}
      </>
    );
  }

  return (
    <tr className="group hover:bg-muted/30 transition-colors">
      <td className="w-10 px-4 py-3">
        <div style={{ paddingLeft: indentWidth }} className="flex items-center">
          {hasChildren ? (
            <button
              onClick={onToggle}
              className="rounded p-0.5 hover:bg-muted transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="size-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="block w-5" />
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div style={{ paddingLeft: hasChildren ? 0 : 24 }}>
            {node.level === 0 ? (
              hasChildren ? (
                <FolderOpen className="size-5 text-amber-500 shrink-0" />
              ) : (
                <FolderOpen className="size-5 text-amber-400 shrink-0" />
              )
            ) : hasChildren ? (
              <FolderOpen className="size-4 text-amber-500 shrink-0" />
            ) : (
              <FolderOpen className="size-4 text-amber-400 shrink-0" />
            )}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span
              className={
                node.level === 0 ? "font-semibold text-sm" : "font-medium text-sm"
              }
            >
              {node.name}
            </span>
            {hasChildren && (
              <span className="text-xs text-muted-foreground">
                {node.children.length} danh mục con
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {node.handle || "—"}
        </code>
      </td>
      <td className="px-4 py-3 hidden xl:table-cell">
        <span
          className={
            node.is_active
              ? "inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
              : "inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
          }
        >
          {node.is_active ? "Hoạt động" : "Không hoạt động"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddChild}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs h-8"
            title="Thêm danh mục con"
          >
            <PlusCircle className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="opacity-0 group-hover:opacity-100 transition-opacity size-8"
            title="Sửa"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity size-8 text-destructive hover:text-destructive"
            title="Xoá"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
