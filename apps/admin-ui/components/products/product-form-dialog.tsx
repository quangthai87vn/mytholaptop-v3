"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, Package, DollarSign, ImageIcon, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateProduct,
  useUpdateProduct,
  useCategories,
} from "@/hooks/use-medusa";
import type { MedusaProduct, CreateProductInput } from "@/services/medusa-types";
import { resolveImageUrlForDisplay } from "@/lib/products/product-filters";
import { toast } from "sonner";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: MedusaProduct | null;
  onSuccess?: () => void;
}

interface AdaptedProduct {
  title: string;
  subtitle: string;
  description: string;
  handle: string;
  status: "draft" | "published";
  sku: string;
  price: string;
  originalPrice: string;
  inventoryQuantity: string;
  thumbnail: string;
  categoryId: string;
  weight: string;
  length: string;
  height: string;
  width: string;
}

function adaptProductToForm(p: MedusaProduct): AdaptedProduct {
  const firstVariant = p.variants?.[0];
  return {
    title: p.title || "",
    subtitle: p.subtitle || "",
    description: p.description || "",
    handle: p.handle || "",
    status: p.status === "published" ? "published" : "draft",
    sku: firstVariant?.sku || "",
    price: firstVariant?.calculated_price
      ? String(firstVariant.calculated_price / 100)
      : firstVariant?.price?.[0]
        ? String(firstVariant.price[0] / 100)
        : "",
    originalPrice: firstVariant?.calculated_original_price
      ? String(firstVariant.calculated_original_price / 100)
      : "",
    inventoryQuantity: String(firstVariant?.inventory_quantity ?? 0),
    thumbnail: p.thumbnail || "",
    categoryId: p.categories?.[0]?.id || "",
    weight: String(p.weight ?? ""),
    length: String(p.length ?? ""),
    height: String(p.height ?? ""),
    width: String(p.width ?? ""),
  };
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

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: ProductFormDialogProps) {
  const isEditing = !!product;

  const [form, setForm] = useState<AdaptedProduct>({
    title: "",
    subtitle: "",
    description: "",
    handle: "",
    status: "draft",
    sku: "",
    price: "",
    originalPrice: "",
    inventoryQuantity: "0",
    thumbnail: "",
    categoryId: "",
    weight: "",
    length: "",
    height: "",
    width: "",
  });

  useEffect(() => {
    if (open) {
      if (product) {
        setForm(adaptProductToForm(product));
      } else {
        setForm({
          title: "",
          subtitle: "",
          description: "",
          handle: "",
          status: "draft",
          sku: "",
          price: "",
          originalPrice: "",
          inventoryQuantity: "0",
          thumbnail: "",
          categoryId: "",
          weight: "",
          length: "",
          height: "",
          width: "",
        });
      }
    }
  }, [open, product]);

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const isPending = createProduct.isPending || updateProduct.isPending;

  const { data: categoriesData } = useCategories({ limit: 1000 });

  const categories = categoriesData?.data?.product_categories ?? [];

  const setField = <K extends keyof AdaptedProduct>(
    key: K,
    value: AdaptedProduct[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTitleChange = (value: string) => {
    setField("title", value);
    if (!isEditing) {
      setField("handle", generateHandle(value));
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Vui lòng nhập tên sản phẩm");
      return;
    }

    const priceNum = parseFloat(form.price) || 0;
    const originalPriceNum = parseFloat(form.originalPrice) || 0;
    const inventoryNum = parseInt(form.inventoryQuantity) || 0;

    const payload: CreateProductInput = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || undefined,
      description: form.description.trim() || undefined,
      handle: form.handle.trim() || generateHandle(form.title),
      status: form.status,
      categories: form.categoryId
        ? [{ id: form.categoryId }]
        : undefined,
      thumbnail: form.thumbnail.trim() || undefined,
      weight: form.weight ? parseFloat(form.weight) : undefined,
      length: form.length ? parseFloat(form.length) : undefined,
      height: form.height ? parseFloat(form.height) : undefined,
      width: form.width ? parseFloat(form.width) : undefined,
      variants: [
        {
          title: form.title.trim(),
          sku: form.sku.trim() || undefined,
          price: priceNum > 0 ? Math.round(priceNum * 100) : undefined,
          original_price:
            originalPriceNum > 0
              ? Math.round(originalPriceNum * 100)
              : undefined,
          inventory_quantity: inventoryNum,
          manage_inventory: true,
        },
      ],
    };

    try {
      if (isEditing && product) {
        const result = await updateProduct.mutateAsync({
          productId: product.id,
          product: payload,
        });
        if (result.success) {
          toast.success("Đã cập nhật sản phẩm");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(`Lỗi: ${result.error}`);
        }
      } else {
        const result = await createProduct.mutateAsync(payload);
        if (result.success) {
          toast.success("Đã tạo sản phẩm");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(`Lỗi: ${result.error}`);
        }
      }
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Sửa sản phẩm" : "Thêm sản phẩm mới"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Cập nhật thông tin sản phẩm."
              : "Tạo một sản phẩm mới trong cửa hàng."}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general" className="gap-1.5">
              <Package className="size-3.5" />
              Thông tin chung
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-1.5">
              <DollarSign className="size-3.5" />
              Phân loại & Giá
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-1.5">
              <ImageIcon className="size-3.5" />
              Hình ảnh
            </TabsTrigger>
          </TabsList>

          {/* Tab: General Info */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Tên sản phẩm <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Nhập tên sản phẩm..."
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Phụ đề</Label>
              <Input
                id="subtitle"
                placeholder="Phụ đề sản phẩm (tuỳ chọn)..."
                value={form.subtitle}
                onChange={(e) => setField("subtitle", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="handle">Slug</Label>
                <Input
                  id="handle"
                  placeholder="slug-san-pham"
                  value={form.handle}
                  onChange={(e) => setField("handle", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Trạng thái</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setField("status", v as "draft" | "published")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Nháp</SelectItem>
                    <SelectItem value="published">Hoạt động</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Danh mục</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setField("categoryId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục (tuỳ chọn)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Không có</SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                placeholder="Mô tả chi tiết sản phẩm..."
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={4}
              />
            </div>
          </TabsContent>

          {/* Tab: Pricing & Variants */}
          <TabsContent value="pricing" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  placeholder="SKU-001"
                  value={form.sku}
                  onChange={(e) => setField("sku", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventory">Tồn kho</Label>
                <Input
                  id="inventory"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.inventoryQuantity}
                  onChange={(e) => setField("inventoryQuantity", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Giá bán (VND)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.price}
                  onChange={(e) => setField("price", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="originalPrice">Giá gốc (VND)</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.originalPrice}
                  onChange={(e) => setField("originalPrice", e.target.value)}
                />
                {form.originalPrice && parseFloat(form.originalPrice) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Giảm giá:{" "}
                    {Math.round(
                      ((parseFloat(form.originalPrice) -
                        (parseFloat(form.price) || 0)) /
                        parseFloat(form.originalPrice)) *
                        100
                    )}
                    %
                  </p>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Kích thước & Trọng lượng</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="weight" className="text-xs">
                    Trọng lượng (g)
                  </Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.weight}
                    onChange={(e) => setField("weight", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="length" className="text-xs">
                    Dài (cm)
                  </Label>
                  <Input
                    id="length"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.length}
                    onChange={(e) => setField("length", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height" className="text-xs">
                    Cao (cm)
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.height}
                    onChange={(e) => setField("height", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="width" className="text-xs">
                    Rộng (cm)
                  </Label>
                  <Input
                    id="width"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.width}
                    onChange={(e) => setField("width", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Images */}
          <TabsContent value="images" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="thumbnail">URL Hình ảnh chính</Label>
              <Input
                id="thumbnail"
                placeholder="https://example.com/image.jpg"
                value={form.thumbnail}
                onChange={(e) => setField("thumbnail", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Nhập URL của hình ảnh sản phẩm. Hỗ trợ JPG, PNG, WebP.
              </p>
            </div>

              {form.thumbnail && (
              <div className="space-y-2">
                <Label>Xem trước</Label>
                <div className="relative w-full max-w-xs h-48 rounded-md border overflow-hidden bg-muted">
                  <Image
                    src={resolveImageUrlForDisplay(form.thumbnail)}
                    alt="Preview"
                    fill
                    className="object-contain"
                    unoptimized
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Huỷ
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.title.trim() || isPending}
          >
            {isPending ? (
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
  );
}
