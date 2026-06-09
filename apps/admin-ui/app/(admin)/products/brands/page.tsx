"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCw,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Loader2,
  X,
  Tag,
  Globe,
  RefreshCcw,
  Info,
  Trash,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCollections,
  useCreateCollection,
  useUpdateCollection,
  useDeleteCollection,
  useDeleteCollections,
  useProductDataSource,
} from "@/hooks/use-medusa";
import type { MedusaCollection } from "@/services/medusa-types";
import { toast } from "sonner";

type SyncStatus = "synced" | "pending" | "failed" | "manual";

interface BrandRow extends MedusaCollection {
  productCount?: number;
  source?: "manual" | "woo" | "medusa";
  syncStatus?: SyncStatus;
  wooId?: number;
  medusaId?: string;
  updatedAt?: string;
}

const SYNC_STATUS_CONFIG: Record<SyncStatus, { label: string; className: string; icon: React.ReactNode }> = {
  synced: { label: "Đã đồng bộ", className: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle className="size-3" /> },
  pending: { label: "Chờ đồng bộ", className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <Clock className="size-3" /> },
  failed: { label: "Lỗi", className: "bg-red-100 text-red-800 border-red-200", icon: <XCircle className="size-3" /> },
  manual: { label: "Thủ công", className: "bg-gray-100 text-gray-800 border-gray-200", icon: <AlertCircle className="size-3" /> },
};

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
  });
}

export default function BrandsPage() {
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<BrandRow | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form state
  const [formName, setFormName] = useState("");
  const [formHandle, setFormHandle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLogo, setFormLogo] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formRank, setFormRank] = useState<number | undefined>(undefined);
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
  } = useCollections({ limit: 1000 });

  const isLoading = isWooSource ? false : isMedusaLoading;
  const isError = isWooSource ? false : isMedusaError;
  const error = isWooSource ? undefined : medusaError;
  const refetch = isWooSource ? () => {} : refetchMedusa;
  const sourceLabel = isWooSource ? "WooCommerce" : "Medusa";

  const collections = medusaData?.data?.product_collections ?? medusaData?.data?.collections ?? [];

  const brands: BrandRow[] = useMemo(() => {
    return collections.map((c) => {
      const meta = c.metadata;
      return {
        ...c,
        productCount:
          meta && typeof meta === "object" && "productCount" in meta
            ? Number((meta as Record<string, unknown>).productCount) || 0
            : 0,
        source:
          (meta && typeof meta === "object" && "source" in meta
            ? String((meta as Record<string, unknown>).source) as "manual" | "woo" | "medusa"
            : "manual"),
        syncStatus:
          (meta && typeof meta === "object" && "syncStatus" in meta
            ? String((meta as Record<string, unknown>).syncStatus) as SyncStatus
            : "manual") as SyncStatus,
        wooId:
          meta && typeof meta === "object" && "wooId" in meta
            ? Number((meta as Record<string, unknown>).wooId) || undefined
            : undefined,
        medusaId: c.id,
        updatedAt: c.updated_at,
      };
    });
  }, [collections]);

  const filtered = useMemo(
    () =>
      brands.filter(
        (b) =>
          b.title.toLowerCase().includes(search.toLowerCase()) ||
          b.handle.toLowerCase().includes(search.toLowerCase())
      ),
    [brands, search]
  );

  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection();
  const deleteCollection = useDeleteCollection();
  const deleteCollections = useDeleteCollections();

  const stats = useMemo(() => {
    const total = brands.length;
    const synced = brands.filter((b) => b.syncStatus === "synced").length;
    const pending = brands.filter((b) => b.syncStatus === "pending").length;
    const failed = brands.filter((b) => b.syncStatus === "failed").length;
    const totalProducts = brands.reduce((sum, b) => sum + (b.productCount || 0), 0);
    return { total, synced, pending, failed, totalProducts };
  }, [brands]);

  const handleNameChange = (name: string) => {
    setFormName(name);
    if (autoHandle && !editingBrand) {
      setFormHandle(generateHandle(name));
    }
  };

  const openCreate = () => {
    setEditingBrand(null);
    setFormName("");
    setFormHandle("");
    setFormDescription("");
    setFormLogo("");
    setFormWebsite("");
    setFormRank(undefined);
    setAutoHandle(true);
    setDrawerOpen(true);
  };

  const openEdit = (brand: BrandRow) => {
    setEditingBrand(brand);
    setFormName(brand.title);
    setFormHandle(brand.handle || "");
    setFormDescription(brand.description || "");
    setFormLogo(
      brand.metadata && typeof brand.metadata === "object" && "logo" in brand.metadata
        ? String((brand.metadata as Record<string, unknown>).logo || "")
        : ""
    );
    setFormWebsite(
      brand.metadata && typeof brand.metadata === "object" && "website" in brand.metadata
        ? String((brand.metadata as Record<string, unknown>).website || "")
        : ""
    );
    setFormRank(
      brand.metadata && typeof brand.metadata === "object" && "rank" in brand.metadata
        ? Number((brand.metadata as Record<string, unknown>).rank) || undefined
        : undefined
    );
    setAutoHandle(false);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditingBrand(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Vui lòng nhập tên thương hiệu");
      return;
    }

    const payload = {
      title: formName,
      handle: formHandle || generateHandle(formName),
      description: formDescription,
      metadata: {
        ...(editingBrand?.metadata || {}),
        logo: formLogo,
        website: formWebsite,
        rank: formRank,
        source: "manual" as const,
        syncStatus: "manual" as SyncStatus,
      },
    };

    try {
      if (editingBrand) {
        const result = await updateCollection.mutateAsync({
          collectionId: editingBrand.id,
          collection: payload,
        });
        if (result.success) {
          toast.success("Đã cập nhật thương hiệu");
          handleDrawerClose();
          refetch();
        } else {
          toast.error("Lỗi: Cập nhật thương hiệu thất bại");
        }
      } else {
        const result = await createCollection.mutateAsync(payload);
        if (result.success) {
          toast.success("Đã tạo thương hiệu mới");
          handleDrawerClose();
          refetch();
        } else {
          toast.error("Lỗi: Cập nhật thương hiệu thất bại");
        }
      }
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const openDelete = (brand: BrandRow) => {
    setBrandToDelete(brand);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!brandToDelete) return;
    try {
      const result = await deleteCollection.mutateAsync(brandToDelete.id);
      if (result.success) {
        toast.success("Đã xoá thương hiệu");
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(brandToDelete.id);
          return next;
        });
        refetch();
      } else {
        toast.error("Lỗi: Cập nhật thương hiệu thất bại");
      }
    } catch {
      toast.error("Có lỗi xảy ra");
    }
    setDeleteDialogOpen(false);
    setBrandToDelete(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      let success = 0;
      let failed = 0;
      for (const id of selectedIds) {
        const result = await deleteCollection.mutateAsync(id);
        if (result.success) success++;
        else failed++;
      }
      if (failed === 0) {
        toast.success(`Đã xoá ${success} thương hiệu`);
      } else {
        toast.warning(`Đã xoá ${success} thương hiệu, ${failed} thất bại`);
      }
      setSelectedIds(new Set());
      setBulkDeleteDialogOpen(false);
      refetch();
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const handleSync = async (brand: BrandRow) => {
    if (!brand.wooId) {
      toast.info(`Thương hiệu "${brand.title}" chưa có nguồn WooCommerce để đồng bộ.`);
      return;
    }
    toast.info(`Bắt đầu đồng bộ "${brand.title}"...`);
    // TODO: Implement WooCommerce sync for specific brand
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
      setSelectedIds(new Set(filtered.map((b) => b.id)));
    }
  };

  const isSaving = createCollection.isPending || updateCollection.isPending;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Quản lý thương hiệu
          </h1>
          <p className="text-muted-foreground">
            Quản lý thương hiệu sản phẩm từ {sourceLabel}.
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
              Thêm thương hiệu
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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Tag className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Tổng thương hiệu</p>
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
              <p className="text-sm text-muted-foreground">Đã đồng bộ</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Chờ đồng bộ</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <XCircle className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.failed}</p>
              <p className="text-sm text-muted-foreground">Lỗi</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Globe className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalProducts}</p>
              <p className="text-sm text-muted-foreground">Tổng sản phẩm</p>
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
                placeholder="Tìm kiếm tên, slug thương hiệu..."
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
            Đã chọn {selectedIds.size} thương hiệu
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {/* Loading */}
          {isLoading && (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="size-4" />
                  <Skeleton className="size-10 rounded-lg" />
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
                Không thể kết nối Medusa
              </p>
              <p className="text-sm text-muted-foreground text-center mb-4">
                {(error as Error)?.message || "Vui lòng kiểm tra cấu hình Medusa."}
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
                          checked={filtered.length > 0 && selectedIds.size === filtered.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-14">Logo</TableHead>
                      <TableHead>Tên thương hiệu</TableHead>
                      <TableHead className="hidden lg:table-cell">Slug</TableHead>
                      <TableHead className="hidden xl:table-cell">Sản phẩm</TableHead>
                      <TableHead className="hidden xl:table-cell">Nguồn</TableHead>
                      <TableHead className="hidden xl:table-cell">Trạng thái</TableHead>
                      <TableHead className="hidden md:table-cell">Cập nhật</TableHead>
                      <TableHead className="w-24">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-16">
                          <div className="flex flex-col items-center text-muted-foreground">
                            <Tag className="size-12 mb-3" />
                            <p className="text-base font-medium mb-1">Chưa có thương hiệu nào</p>
                            <p className="text-sm mb-4">
                              Bắt đầu bằng cách thêm thương hiệu đầu tiên.
                            </p>
                            <Button size="sm" onClick={openCreate}>
                              <Plus className="size-4 mr-2" />
                              Thêm thương hiệu
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((brand) => {
                        const syncCfg = SYNC_STATUS_CONFIG[brand.syncStatus || "manual"];
                        const isSelected = selectedIds.has(brand.id);
                        const hasWoo = !!brand.wooId;

                        return (
                          <TableRow
                            key={brand.id}
                            className={isSelected ? "bg-muted/30" : ""}
                          >
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelect(brand.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="size-10 rounded-lg bg-white border overflow-hidden flex items-center justify-center">
                                {brand.metadata &&
                                typeof brand.metadata === "object" &&
                                "logo" in brand.metadata &&
                                (brand.metadata as Record<string, unknown>).logo ? (
                                  <Image
                                    src={String((brand.metadata as Record<string, unknown>).logo)}
                                    alt={brand.title}
                                    width={36}
                                    height={36}
                                    className="object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground font-semibold">
                                    {brand.title.charAt(0)}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{brand.title}</div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {brand.handle || "—"}
                              </code>
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              <Badge variant="outline" className="font-semibold">
                                {brand.productCount || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              <Badge
                                variant="outline"
                                className={
                                  brand.source === "woo"
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : brand.source === "medusa"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-gray-50 text-gray-600 border-gray-200"
                                }
                              >
                                {brand.source === "woo"
                                  ? "WooCommerce"
                                  : brand.source === "medusa"
                                  ? "Medusa"
                                  : "Thủ công"}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              <Badge className={syncCfg.className}>
                                {syncCfg.icon}
                                <span className="ml-1">{syncCfg.label}</span>
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="text-sm text-muted-foreground">
                                {formatDate(brand.updatedAt)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {hasWoo && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={() => handleSync(brand)}
                                    title="Đồng bộ từ WooCommerce"
                                  >
                                    <RefreshCcw className="size-4" />
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openEdit(brand)}>
                                      <Pencil className="size-4 mr-2" />
                                      Chỉnh sửa
                                    </DropdownMenuItem>
                                    {hasWoo && (
                                      <DropdownMenuItem onClick={() => handleSync(brand)}>
                                        <RefreshCcw className="size-4 mr-2" />
                                        Đồng bộ
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => openDelete(brand)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="size-4 mr-2" />
                                      Xoá
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
              </div>

              {/* Stats footer */}
              {!isLoading && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Hiển thị {filtered.length} / {stats.total} thương hiệu
                    {selectedIds.size > 0 && ` • Đã chọn ${selectedIds.size}`}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Drawer */}
      <Sheet open={drawerOpen} onOpenChange={(open) => !open && handleDrawerClose()}>
        <SheetContent className="w-[460px] sm:max-w-[460px]">
          <SheetHeader>
            <SheetTitle>
              {editingBrand ? "Sửa thương hiệu" : "Thêm thương hiệu mới"}
            </SheetTitle>
            <SheetDescription>
              {editingBrand
                ? "Cập nhật thông tin thương hiệu sản phẩm."
                : "Tạo một thương hiệu mới cho cửa hàng."}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            {/* Logo preview */}
            {formLogo && (
              <div className="flex justify-center">
                <div className="relative size-20 rounded-lg border overflow-hidden bg-white">
                  <Image
                    src={formLogo}
                    alt="Logo preview"
                    fill
                    className="object-contain p-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="brand-name">
                Tên thương hiệu <span className="text-destructive">*</span>
              </Label>
              <Input
                id="brand-name"
                placeholder="Ví dụ: Dell, HP, Lenovo..."
                value={formName}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="brand-handle">Slug</Label>
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
                id="brand-handle"
                placeholder="dell, hp, lenovo..."
                value={formHandle}
                onChange={(e) => {
                  setFormHandle(
                    e.target.value.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-")
                  );
                  setAutoHandle(false);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-logo">Logo URL</Label>
              <Input
                id="brand-logo"
                placeholder="https://logo.clearbit.com/dell.com"
                value={formLogo}
                onChange={(e) => setFormLogo(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Dán URL logo hoặc để trống nếu không có.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-website">Website</Label>
              <Input
                id="brand-website"
                placeholder="https://dell.com"
                value={formWebsite}
                onChange={(e) => setFormWebsite(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-desc">Mô tả</Label>
              <Textarea
                id="brand-desc"
                placeholder="Mô tả ngắn về thương hiệu..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-rank">Thứ tự hiển thị</Label>
              <Input
                id="brand-rank"
                type="number"
                min={0}
                placeholder="0"
                value={formRank ?? ""}
                onChange={(e) =>
                  setFormRank(e.target.value ? Number(e.target.value) : undefined)
                }
              />
            </div>
            {editingBrand && (
              <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="size-3" />
                  ID: <code className="text-[10px]">{editingBrand.id}</code>
                </div>
                <div className="text-xs text-muted-foreground">
                  Tạo: {formatDate(editingBrand.created_at)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Cập nhật: {formatDate(editingBrand.updated_at)}
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
              ) : editingBrand ? (
                "Cập nhật"
              ) : (
                "Tạo mới"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xoá thương hiệu</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xoá thương hiệu &quot;{brandToDelete?.title}&quot;?
              {brandToDelete && brandToDelete.productCount && brandToDelete.productCount > 0 && (
                <span className="block mt-2 text-yellow-600">
                  Cảnh báo: Thương hiệu này đang có {brandToDelete.productCount} sản phẩm.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCollection.isPending}
            >
              {deleteCollection.isPending ? (
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
            <DialogTitle>Xoá {selectedIds.size} thương hiệu đã chọn?</DialogTitle>
            <DialogDescription>
              Tất cả thương hiệu đã chọn sẽ bị xoá vĩnh viễn. Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={deleteCollections.isPending}
            >
              {deleteCollections.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Trash className="size-4 mr-2" />
                  Xoá {selectedIds.size} thương hiệu
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
