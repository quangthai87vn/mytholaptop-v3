"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Settings2,
  Loader2,
  X,
  Tag,
  Info,
  Trash,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useProductTypes,
  useCreateProductType,
  useUpdateProductType,
  useDeleteProductType,
} from "@/hooks/use-medusa";
import type { MedusaProductType } from "@/services/medusa-types";
import { toast } from "sonner";

interface AttrValue {
  id: string;
  value: string;
  slug: string;
  productCount?: number;
}

interface AttrType {
  id: string;
  value: string;
  type?: "select" | "text" | "number" | "boolean" | "color";
  displayType?: "dropdown" | "radio" | "checkbox" | "color";
  isFilterable?: boolean;
  isSearchable?: boolean;
  isRequired?: boolean;
  sortOrder?: number;
  values: AttrValue[];
  productCount?: number;
  source?: "manual" | "woo" | "medusa";
  syncStatus?: "synced" | "pending" | "failed" | "manual";
  createdAt?: string;
  updatedAt?: string;
}

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

function parseAttrType(type: MedusaProductType): AttrType {
  const meta = type.metadata;
  const getMetaStr = (key: string) =>
    meta && typeof meta === "object" && key in meta ? String(meta[key as keyof typeof meta]) : "";
  const getMetaNum = (key: string) =>
    meta && typeof meta === "object" && key in meta ? Number(meta[key as keyof typeof meta]) || 0 : 0;
  const getMetaBool = (key: string) =>
    meta && typeof meta === "object" && key in meta ? Boolean(meta[key as keyof typeof meta]) : false;

  const rawValues = getMetaStr("values");
  let values: AttrValue[] = [];
  try {
    values = JSON.parse(rawValues) as AttrValue[];
  } catch {
    values = [];
  }

  return {
    id: type.id,
    value: type.value,
    type: (getMetaStr("type") as AttrType["type"]) || "select",
    displayType: (getMetaStr("displayType") as AttrType["displayType"]) || "dropdown",
    isFilterable: getMetaBool("isFilterable"),
    isSearchable: getMetaBool("isSearchable"),
    isRequired: getMetaBool("isRequired"),
    sortOrder: getMetaNum("sortOrder"),
    values,
    productCount: getMetaNum("productCount"),
    source: (getMetaStr("source") as AttrType["source"]) || "manual",
    syncStatus: (getMetaStr("syncStatus") as AttrType["syncStatus"]) || "manual",
    createdAt: type.created_at,
    updatedAt: type.updated_at,
  };
}

export default function AttributesPage() {
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<AttrType | null>(null);
  const [valueDrawerOpen, setValueDrawerOpen] = useState(false);
  const [editingAttrForValue, setEditingAttrForValue] = useState<AttrType | null>(null);
  const [valueFormValue, setValueFormValue] = useState("");
  const [valueToEdit, setValueToEdit] = useState<AttrValue | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attrToDelete, setAttrToDelete] = useState<AttrType | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form state
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formType, setFormType] = useState<AttrType["type"]>("select");
  const [formDisplayType, setFormDisplayType] = useState<AttrType["displayType"]>("dropdown");
  const [formFilterable, setFormFilterable] = useState(false);
  const [formSearchable, setFormSearchable] = useState(false);
  const [formRequired, setFormRequired] = useState(false);
  const [formSortOrder, setFormSortOrder] = useState<number | undefined>(undefined);
  const [autoSlug, setAutoSlug] = useState(true);

  const { data, isLoading, isError, error, refetch } = useProductTypes({ limit: 1000 });
  const productTypes = data?.data?.product_types ?? [];

  const attributes: AttrType[] = useMemo(
    () => productTypes.map(parseAttrType).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [productTypes]
  );

  const filtered = useMemo(
    () =>
      attributes.filter(
        (a) =>
          a.value.toLowerCase().includes(search.toLowerCase()) ||
          a.type?.toLowerCase().includes(search.toLowerCase())
      ),
    [attributes, search]
  );

  const createProductType = useCreateProductType();
  const updateProductType = useUpdateProductType();
  const deleteProductType = useDeleteProductType();

  const stats = useMemo(() => {
    const total = attributes.length;
    const totalValues = attributes.reduce((sum, a) => sum + a.values.length, 0);
    const totalProducts = attributes.reduce((sum, a) => sum + (a.productCount || 0), 0);
    const synced = attributes.filter((a) => a.syncStatus === "synced").length;
    return { total, totalValues, totalProducts, synced };
  }, [attributes]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(attributes.map((a) => a.id)));
  const collapseAll = () => setExpandedIds(new Set());

  const handleNameChange = (name: string) => {
    setFormName(name);
    if (autoSlug && !editingAttr) {
      setFormSlug(generateSlug(name));
    }
  };

  const openCreate = () => {
    setEditingAttr(null);
    setFormName("");
    setFormSlug("");
    setFormType("select");
    setFormDisplayType("dropdown");
    setFormFilterable(false);
    setFormSearchable(false);
    setFormRequired(false);
    setFormSortOrder(undefined);
    setAutoSlug(true);
    setDrawerOpen(true);
  };

  const openEdit = (attr: AttrType) => {
    setEditingAttr(attr);
    setFormName(attr.value);
    setFormSlug(generateSlug(attr.value));
    setFormType(attr.type || "select");
    setFormDisplayType(attr.displayType || "dropdown");
    setFormFilterable(attr.isFilterable || false);
    setFormSearchable(attr.isSearchable || false);
    setFormRequired(attr.isRequired || false);
    setFormSortOrder(attr.sortOrder);
    setAutoSlug(false);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditingAttr(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Vui lòng nhập tên thuộc tính");
      return;
    }

    const existingValues = editingAttr?.values || [];
    const metadata: Record<string, unknown> = {
      type: formType,
      displayType: formDisplayType,
      isFilterable: formFilterable,
      isSearchable: formSearchable,
      isRequired: formRequired,
      sortOrder: formSortOrder ?? 0,
      values: JSON.stringify(existingValues),
      source: "manual",
      syncStatus: "manual",
    };

    try {
      if (editingAttr) {
        const result = await updateProductType.mutateAsync({
          typeId: editingAttr.id,
          type: {
            value: formName,
            metadata,
          },
        });
        if (result.success) {
          toast.success("Đã cập nhật thuộc tính");
          handleDrawerClose();
          refetch();
        } else {
          toast.error(`Lỗi: ${result.error}`);
        }
      } else {
        const result = await createProductType.mutateAsync({
          value: formName,
          metadata,
        });
        if (result.success) {
          toast.success("Đã tạo thuộc tính mới");
          handleDrawerClose();
          refetch();
        } else {
          toast.error(`Lỗi: ${result.error}`);
        }
      }
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const openAddValue = (attr: AttrType) => {
    setEditingAttrForValue(attr);
    setValueFormValue("");
    setValueToEdit(null);
    setValueDrawerOpen(true);
  };

  const openEditValue = (attr: AttrType, val: AttrValue) => {
    setEditingAttrForValue(attr);
    setValueFormValue(val.value);
    setValueToEdit(val);
    setValueDrawerOpen(true);
  };

  const handleValueSave = async () => {
    if (!valueFormValue.trim() || !editingAttrForValue) {
      toast.error("Vui lòng nhập tên giá trị");
      return;
    }

    const updatedValues = [...editingAttrForValue.values];
    if (valueToEdit) {
      const idx = updatedValues.findIndex((v) => v.id === valueToEdit.id);
      if (idx >= 0) {
        updatedValues[idx] = {
          ...updatedValues[idx],
          value: valueFormValue,
          slug: generateSlug(valueFormValue),
        };
      }
    } else {
      updatedValues.push({
        id: `val-${Date.now()}`,
        value: valueFormValue,
        slug: generateSlug(valueFormValue),
      });
    }

    try {
      const result = await updateProductType.mutateAsync({
        typeId: editingAttrForValue.id,
        type: {
          value: editingAttrForValue.value,
          metadata: {
            ...(editingAttrForValue.productCount !== undefined
              ? { productCount: editingAttrForValue.productCount }
              : {}),
            type: editingAttrForValue.type || "select",
            displayType: editingAttrForValue.displayType || "dropdown",
            isFilterable: editingAttrForValue.isFilterable || false,
            isSearchable: editingAttrForValue.isSearchable || false,
            isRequired: editingAttrForValue.isRequired || false,
            sortOrder: editingAttrForValue.sortOrder ?? 0,
            values: JSON.stringify(updatedValues),
            source: "manual",
            syncStatus: "manual",
          },
        },
      });
      if (result.success) {
        toast.success(valueToEdit ? "Đã cập nhật giá trị" : "Đã thêm giá trị mới");
        setValueDrawerOpen(false);
        refetch();
      } else {
        toast.error(`Lỗi: ${result.error}`);
      }
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const handleDeleteValue = async (attr: AttrType, valId: string) => {
    const updatedValues = attr.values.filter((v) => v.id !== valId);
    try {
      const result = await updateProductType.mutateAsync({
        typeId: attr.id,
        type: {
          value: attr.value,
          metadata: {
            ...(attr.productCount !== undefined ? { productCount: attr.productCount } : {}),
            type: attr.type || "select",
            displayType: attr.displayType || "dropdown",
            isFilterable: attr.isFilterable || false,
            isSearchable: attr.isSearchable || false,
            isRequired: attr.isRequired || false,
            sortOrder: attr.sortOrder ?? 0,
            values: JSON.stringify(updatedValues),
            source: "manual",
            syncStatus: "manual",
          },
        },
      });
      if (result.success) {
        toast.success("Đã xoá giá trị");
        refetch();
      } else {
        toast.error(`Lỗi: ${result.error}`);
      }
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const openDelete = (attr: AttrType) => {
    setAttrToDelete(attr);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!attrToDelete) return;
    try {
      const result = await deleteProductType.mutateAsync(attrToDelete.id);
      if (result.success) {
        toast.success("Đã xoá thuộc tính");
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(attrToDelete.id);
          return next;
        });
        refetch();
      } else {
        toast.error(`Lỗi: ${result.error}`);
      }
    } catch {
      toast.error("Có lỗi xảy ra");
    }
    setDeleteDialogOpen(false);
    setAttrToDelete(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      let success = 0;
      let failed = 0;
      for (const id of selectedIds) {
        const result = await deleteProductType.mutateAsync(id);
        if (result.success) success++;
        else failed++;
      }
      if (failed === 0) {
        toast.success(`Đã xoá ${success} thuộc tính`);
      } else {
        toast.warning(`Đã xoá ${success} thuộc tính, ${failed} thất bại`);
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
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((a) => a.id)));
    }
  };

  const isSaving = createProductType.isPending || updateProductType.isPending;
  const isSavingValue = updateProductType.isPending;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Quản lý thuộc tính
          </h1>
          <p className="text-muted-foreground">
            Quản lý thuộc tính và giá trị sản phẩm.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="size-4 mr-2" />
            Làm mới
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4 mr-2" />
            Thêm thuộc tính
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Settings2 className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Tổng thuộc tính</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <CheckCircle className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalValues}</p>
              <p className="text-sm text-muted-foreground">Tổng giá trị</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Tag className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalProducts}</p>
              <p className="text-sm text-muted-foreground">Sản phẩm sử dụng</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <CheckCircle className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.synced}</p>
              <p className="text-sm text-muted-foreground">Đã đồng bộ</p>
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
                placeholder="Tìm kiếm tên thuộc tính..."
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

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
          <span className="text-sm font-medium">
            Đã chọn {selectedIds.size} thuộc tính
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

      {/* Attributes accordion */}
      {!isLoading && !isError && (
        <>
          {/* Expand/collapse controls */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-muted-foreground">
                {filtered.length} thuộc tính
              </p>
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

          <div className="space-y-3">
            {/* Loading skeleton */}
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="size-8" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

            {/* Empty state */}
            {filtered.length === 0 && !isLoading && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Settings2 className="size-12 text-muted-foreground mb-3" />
                  <p className="text-base font-medium mb-1">Chưa có thuộc tính nào</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tạo thuộc tính đầu tiên để phân loại sản phẩm.
                  </p>
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="size-4 mr-2" />
                    Thêm thuộc tính
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Attribute cards */}
            {filtered.map((attr) => {
              const isExpanded = expandedIds.has(attr.id);
              const isSelected = selectedIds.has(attr.id);

              return (
                <Card key={attr.id} className={isSelected ? "border-primary/50" : ""}>
                  <CardHeader className="py-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(attr.id)}
                        className="shrink-0"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(attr.id)}
                        className="size-8 p-0 shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </Button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">{attr.value}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {attr.type || "select"}
                          </Badge>
                          {attr.values.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {attr.values.length} giá trị
                            </Badge>
                          )}
                          {attr.isFilterable && (
                            <Badge variant="secondary" className="text-xs">
                              Filterable
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {attr.productCount || 0} sản phẩm
                          {attr.source && attr.source !== "manual" && (
                            <span className="ml-2">
                              • Nguồn:{" "}
                              <span className="capitalize">{attr.source}</span>
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAddValue(attr)}
                          className="text-xs"
                        >
                          <Plus className="size-3 mr-1" />
                          Thêm giá trị
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(attr)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openDelete(attr)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Expanded values */}
                  {isExpanded && (
                    <CardContent className="pt-0 pb-4">
                      <div className="pl-14">
                        {attr.values.length === 0 ? (
                          <div className="text-sm text-muted-foreground py-2">
                            Chưa có giá trị nào.{" "}
                            <button
                              onClick={() => openAddValue(attr)}
                              className="text-primary hover:underline"
                            >
                              Thêm giá trị đầu tiên
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {attr.values.map((val) => (
                              <div
                                key={val.id}
                                className="flex items-center gap-2 px-3 py-1.5 bg-muted/60 rounded-full text-sm group"
                              >
                                <span>{val.value}</span>
                                {val.productCount !== undefined && val.productCount > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {val.productCount}
                                  </Badge>
                                )}
                                <button
                                  onClick={() => openEditValue(attr, val)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Pencil className="size-3 text-muted-foreground hover:text-foreground" />
                                </button>
                                <button
                                  onClick={() => handleDeleteValue(attr, val.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Loading state */}
      {isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Đang tải thuộc tính...</p>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="size-12 text-destructive mb-4" />
            <p className="text-base font-medium text-destructive mb-1">
              Không thể kết nối Medusa
            </p>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {(error as Error)?.message || "Vui lòng kiểm tra cấu hình Medusa."}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="size-4 mr-2" />
              Thử lại
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Attribute Drawer */}
      <Sheet open={drawerOpen} onOpenChange={(open) => !open && handleDrawerClose()}>
        <SheetContent className="w-[460px] sm:max-w-[460px]">
          <SheetHeader>
            <SheetTitle>
              {editingAttr ? "Sửa thuộc tính" : "Thêm thuộc tính mới"}
            </SheetTitle>
            <SheetDescription>
              {editingAttr
                ? "Cập nhật thông tin thuộc tính sản phẩm."
                : "Tạo thuộc tính mới (ví dụ: CPU, RAM, Ổ cứng)."}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="attr-name">
                Tên thuộc tính <span className="text-destructive">*</span>
              </Label>
              <Input
                id="attr-name"
                placeholder="Ví dụ: CPU, RAM, Ổ cứng..."
                value={formName}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attr-type">Loại dữ liệu</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as AttrType["type"])}>
                <SelectTrigger id="attr-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select">Select (Dropdown)</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean (Yes/No)</SelectItem>
                  <SelectItem value="color">Color Swatch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="attr-display">Kiểu hiển thị</Label>
              <Select
                value={formDisplayType}
                onValueChange={(v) => setFormDisplayType(v as AttrType["displayType"])}
              >
                <SelectTrigger id="attr-display">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dropdown">Dropdown</SelectItem>
                  <SelectItem value="radio">Radio Button</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                  <SelectItem value="color">Color Swatch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="attr-filterable"
                  checked={formFilterable}
                  onCheckedChange={(v) => setFormFilterable(!!v)}
                />
                <Label htmlFor="attr-filterable" className="text-sm cursor-pointer">
                  Filterable
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="attr-searchable"
                  checked={formSearchable}
                  onCheckedChange={(v) => setFormSearchable(!!v)}
                />
                <Label htmlFor="attr-searchable" className="text-sm cursor-pointer">
                  Searchable
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="attr-required"
                  checked={formRequired}
                  onCheckedChange={(v) => setFormRequired(!!v)}
                />
                <Label htmlFor="attr-required" className="text-sm cursor-pointer">
                  Required
                </Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="attr-order">Thứ tự</Label>
              <Input
                id="attr-order"
                type="number"
                min={0}
                placeholder="0"
                value={formSortOrder ?? ""}
                onChange={(e) =>
                  setFormSortOrder(e.target.value ? Number(e.target.value) : undefined)
                }
              />
            </div>
            {editingAttr && (
              <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="size-3" />
                  ID: <code className="text-[10px]">{editingAttr.id}</code>
                </div>
                <div className="text-xs text-muted-foreground">
                  Tạo: {editingAttr.createdAt ? new Date(editingAttr.createdAt).toLocaleDateString("vi-VN") : "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Cập nhật: {editingAttr.updatedAt ? new Date(editingAttr.updatedAt).toLocaleDateString("vi-VN") : "—"}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
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
              ) : editingAttr ? (
                "Cập nhật"
              ) : (
                "Tạo mới"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add / Edit Value Drawer */}
      <Sheet open={valueDrawerOpen} onOpenChange={(open) => !open && setValueDrawerOpen(false)}>
        <SheetContent className="w-[380px] sm:max-w-[380px]">
          <SheetHeader>
            <SheetTitle>
              {valueToEdit ? "Sửa giá trị" : "Thêm giá trị mới"}
            </SheetTitle>
            <SheetDescription>
              Thêm giá trị cho thuộc tính &quot;{editingAttrForValue?.value}&quot;
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="val-name">
                Tên giá trị <span className="text-destructive">*</span>
              </Label>
              <Input
                id="val-name"
                placeholder={
                  editingAttrForValue?.type === "color"
                    ? "Ví dụ: #FF0000 hoặc Đỏ"
                    : "Ví dụ: Intel Core i5, 8GB DDR4..."
                }
                value={valueFormValue}
                onChange={(e) => setValueFormValue(e.target.value)}
              />
            </div>
            {editingAttrForValue?.type === "color" && (
              <div className="space-y-2">
                <Label htmlFor="val-color">Mã màu</Label>
                <Input
                  id="val-color"
                  type="color"
                  className="h-12 w-full cursor-pointer"
                  value={valueFormValue.startsWith("#") ? valueFormValue : "#000000"}
                  onChange={(e) => setValueFormValue(e.target.value)}
                />
              </div>
            )}
            {valueToEdit && (
              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <div>Slug: {valueToEdit.slug || generateSlug(valueToEdit.value)}</div>
                {valueToEdit.productCount !== undefined && (
                  <div>{valueToEdit.productCount} sản phẩm</div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setValueDrawerOpen(false)}
              className="flex-1"
            >
              Huỷ
            </Button>
            <Button
              onClick={handleValueSave}
              disabled={!valueFormValue.trim() || isSavingValue}
              className="flex-1"
            >
              {isSavingValue ? (
                <Loader2 className="size-4 animate-spin" />
              ) : valueToEdit ? (
                "Cập nhật"
              ) : (
                "Thêm"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xoá thuộc tính</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xoá thuộc tính &quot;{attrToDelete?.value}&quot;?
              {attrToDelete && attrToDelete.values.length > 0 && (
                <span className="block mt-2 text-yellow-600">
                  Cảnh báo: Thuộc tính này có {attrToDelete.values.length} giá trị.
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
              disabled={deleteProductType.isPending}
            >
              {deleteProductType.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Xoá"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirm */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá {selectedIds.size} thuộc tính đã chọn?</DialogTitle>
            <DialogDescription>
              Tất cả thuộc tính và giá trị đã chọn sẽ bị xoá vĩnh viễn.
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={deleteProductType.isPending}
            >
              {deleteProductType.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Trash className="size-4 mr-2" />
                  Xoá {selectedIds.size} thuộc tính
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
