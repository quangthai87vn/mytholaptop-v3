"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Package,
  DollarSign,
  FolderTree,
  Warehouse,
  ImageIcon,
  Search,
  Code2,
  Eye,
  Save,
  X,
} from "lucide-react";
import { useUpdateProduct } from "@/hooks/use-medusa";
import { useCategories } from "@/hooks/use-medusa";
import type { MedusaProduct } from "@/services/medusa-types";
import type { CategoryNode } from "@/components/categories/category-tree";
import { ProductBasicTab } from "./product-basic-tab";
import { ProductPricingTab } from "./product-pricing-tab";
import { ProductCategoriesTab } from "./product-categories-tab";
import { ProductInventoryTab } from "./product-inventory-tab";
import { ProductImagesTab } from "./product-images-tab";
import { ProductSeoTab } from "./product-seo-tab";
import { ProductWordPressMetadataTab } from "./product-wordpress-metadata-tab";
import { ProductEditSidebar } from "./product-edit-sidebar";
import { toast } from "sonner";

export type ProductEditFormData = {
  title: string;
  subtitle?: string;
  description?: string;
  handle: string;
  status: "draft" | "published" | "proposed";
  sku?: string;
  regular_price?: string;
  sale_price?: string;
  inventory_quantity?: string;
  manage_inventory: boolean;
  stock_status_override?: "instock" | "outofstock" | "onbackorder";
  thumbnail?: string;
  gallery_urls: string[];
  category_ids: string[];
  tags: string[];
  short_description?: string;
  seo_title?: string;
  seo_description?: string;
  _handleManuallyEdited: boolean;
  variant_id?: string;
  woo_product_id?: string;
  woo_regular_price?: string;
  woo_sale_price?: string;
  woo_price?: string;
  woo_manage_stock?: string;
  woo_stock_status?: string;
  woo_stock_quantity?: string;
  woo_category_ids?: string;
  woo_category_names?: string;
  woo_tags?: string;
  woo_tag_slugs?: string;
  woo_tag_names?: string;
  woo_image?: string;
};

function buildCategoryTreeFromMedusa(
  cats: { id: string; name: string; parent_category_id?: string; category_children?: any[] }[]
): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  cats.forEach((cat) => {
    map.set(cat.id, {
      id: cat.id,
      name: cat.name,
      handle: "",
      description: "",
      is_active: true,
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

function mapMedusaProductToForm(p: MedusaProduct): ProductEditFormData {
  const firstVariant = p.variants?.[0];
  const meta = p.metadata as Record<string, string> | undefined;

  const wooSalePrice = meta?.wordpress_sale_price
    ? parseFloat(meta.wordpress_sale_price).toString()
    : "";
  const wooRegularPrice = meta?.wordpress_regular_price
    ? parseFloat(meta.wordpress_regular_price).toString()
    : "";

  const medusaPrice = firstVariant?.calculated_price
    ? (firstVariant.calculated_price / 100).toString()
    : firstVariant?.price?.[0]
      ? (firstVariant.price[0] / 100).toString()
      : "";

  const imageUrls: string[] = [];
  const seenUrls = new Set<string>();

  const isValidImageUrl = (url: string | undefined | null): boolean => {
    if (!url) return false;
    const trimmed = url.trim();
    return trimmed.length >= 5;
  };

  if (isValidImageUrl(p.thumbnail) && !seenUrls.has(p.thumbnail!.trim())) {
    seenUrls.add(p.thumbnail!.trim());
    imageUrls.push(p.thumbnail!.trim());
  }
  if (p.images) {
    for (const img of p.images) {
      const url = img.url || (img as any).src || "";
      if (isValidImageUrl(url) && !seenUrls.has(url.trim())) {
        seenUrls.add(url.trim());
        imageUrls.push(url.trim());
      }
    }
  }

  const wooImages = meta?.wordpress_image;
  if (wooImages) {
    let urls: string[] = [];
    if (wooImages.startsWith("[")) {
      try {
        urls = JSON.parse(wooImages);
      } catch {
        urls = wooImages.split(",").map((u) => u.trim()).filter(Boolean);
      }
    } else {
      urls = wooImages.split(",").map((u) => u.trim()).filter(Boolean);
    }
    for (const url of urls) {
      if (isValidImageUrl(url) && !seenUrls.has(url.trim())) {
        seenUrls.add(url.trim());
        imageUrls.push(url.trim());
      }
    }
  }

  return {
    title: p.title || "",
    subtitle: p.subtitle,
    description: p.description,
    handle: p.handle || "",
    status: (p.status as ProductEditFormData["status"]) || "draft",
    sku: firstVariant?.sku,
    regular_price: medusaPrice || wooSalePrice || wooRegularPrice,
    sale_price:
      firstVariant?.calculated_original_price
        ? (firstVariant.calculated_original_price / 100).toString()
        : "",
    inventory_quantity: String(firstVariant?.inventory_quantity ?? ""),
    manage_inventory: firstVariant?.manage_inventory ?? false,
    stock_status_override: undefined,
    thumbnail: imageUrls[0] || "",
    gallery_urls: imageUrls.slice(1),
    category_ids: p.categories?.map((c) => c.id) || [],
    tags: p.tags?.map((t) => t.value) || [],
    short_description: undefined,
    seo_title: undefined,
    seo_description: undefined,
    _handleManuallyEdited: true,
    variant_id: firstVariant?.id,
    woo_product_id: meta?.wordpress_product_id,
    woo_regular_price: meta?.wordpress_regular_price,
    woo_sale_price: meta?.wordpress_sale_price,
    woo_price: meta?.wordpress_price,
    woo_manage_stock: meta?.wordpress_manage_stock,
    woo_stock_status: meta?.wordpress_stock_status,
    woo_stock_quantity: meta?.wordpress_stock_quantity,
    woo_category_ids: meta?.wordpress_category_ids,
    woo_category_names: meta?.wordpress_category_names,
    woo_tags: meta?.wordpress_tags,
    woo_tag_slugs: meta?.wordpress_tag_slugs,
    woo_tag_names: meta?.wordpress_tag_names,
    woo_image: meta?.wordpress_image,
  };
}

function mapFormToMedusaPayload(
  form: ProductEditFormData,
  originalProduct: MedusaProduct
): Record<string, unknown> {
  const priceNum = parseFloat(form.regular_price || "0");
  const originalPriceNum = parseFloat(form.sale_price || "0");
  const inventoryNum = parseInt(form.inventory_quantity || "0");

  const payload: Record<string, unknown> = {
    title: form.title.trim(),
    subtitle: form.subtitle?.trim() || undefined,
    description: form.description?.trim() || undefined,
    handle: form.handle.trim() || undefined,
    status: form.status,
  };

  if (form.variant_id) {
    payload.variants = [
      {
        id: form.variant_id,
        title: form.title.trim(),
        sku: form.sku?.trim() || undefined,
        price: priceNum > 0 ? Math.round(priceNum * 100) : undefined,
        original_price:
          originalPriceNum > 0
            ? Math.round(originalPriceNum * 100)
            : undefined,
        inventory_quantity: inventoryNum,
        manage_inventory: form.manage_inventory,
      },
    ];
  } else {
    payload.variants = [
      {
        title: form.title.trim(),
        sku: form.sku?.trim() || undefined,
        price: priceNum > 0 ? Math.round(priceNum * 100) : undefined,
        original_price:
          originalPriceNum > 0
            ? Math.round(originalPriceNum * 100)
            : undefined,
        inventory_quantity: inventoryNum,
        manage_inventory: form.manage_inventory,
      },
    ];
  }

  if (form.category_ids.length > 0) {
    payload.categories = form.category_ids.map((id) => ({ id }));
  }

  if (form.thumbnail) {
    payload.thumbnail = form.thumbnail.trim();
  }

  if (form.gallery_urls.length > 0) {
    payload.images = form.gallery_urls
      .filter(Boolean)
      .map((url) => ({ url }));
  }

  const existingMeta = (originalProduct.metadata as Record<string, unknown>) || {};
  payload.metadata = {
    ...existingMeta,
    ...(form.seo_title && { seo_title: form.seo_title }),
    ...(form.seo_description && { seo_description: form.seo_description }),
    ...(form.short_description && { short_description: form.short_description }),
  };

  return payload;
}

interface ProductEditFormProps {
  product: MedusaProduct;
  onSuccess?: () => void;
}

export function ProductEditForm({ product, onSuccess }: ProductEditFormProps) {
  const router = useRouter();
  const updateProduct = useUpdateProduct();
  const { data: categoriesData } = useCategories({ limit: 1000 });

  const [form, setForm] = useState<ProductEditFormData>(() =>
    mapMedusaProductToForm(product)
  );
  const [activeTab, setActiveTab] = useState("basic");
  const [isSaving, setIsSaving] = useState(false);

  // Track unsaved changes
  const [isDirty, setIsDirty] = useState(false);

  // Update form when product changes
  useEffect(() => {
    setForm(mapMedusaProductToForm(product));
    setIsDirty(false);
  }, [product]);

  // Track dirty state
  useEffect(() => {
    const current = mapMedusaProductToForm(product);
    const isFormDirty = JSON.stringify(form) !== JSON.stringify(current);
    setIsDirty(isFormDirty);
  }, [form, product]);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Handle navigation with unsaved changes
  const handleNavigate = useCallback(
    (href: string) => {
      if (isDirty) {
        const confirmed = window.confirm(
          "Bạn có thay đổi chưa lưu. Bạn có chắc muốn rời khỏi trang này?"
        );
        if (!confirmed) return;
      }
      router.push(href);
    },
    [isDirty, router]
  );

  const categoryTree = buildCategoryTreeFromMedusa(
    categoriesData?.data?.product_categories || []
  );

  const wooMeta: Record<string, string | undefined> = {
    wordpress_product_id: form.woo_product_id,
    wordpress_regular_price: form.woo_regular_price,
    wordpress_sale_price: form.woo_sale_price,
    wordpress_price: form.woo_price,
    wordpress_manage_stock: form.woo_manage_stock,
    wordpress_stock_status: form.woo_stock_status,
    wordpress_stock_quantity: form.woo_stock_quantity,
    wordpress_category_ids: form.woo_category_ids,
    wordpress_category_names: form.woo_category_names,
    wordpress_tags: form.woo_tags,
    wordpress_tag_slugs: form.woo_tag_slugs,
    wordpress_tag_names: form.woo_tag_names,
    wordpress_image: form.woo_image,
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Vui lòng nhập tên sản phẩm");
      return;
    }

    if (!form.handle.trim()) {
      toast.error("Vui lòng nhập slug sản phẩm");
      return;
    }

    if (form.regular_price && isNaN(parseFloat(form.regular_price))) {
      toast.error("Giá thường phải là số");
      return;
    }
    if (form.sale_price && isNaN(parseFloat(form.sale_price))) {
      toast.error("Giá khuyến mãi phải là số");
      return;
    }

    setIsSaving(true);
    try {
      const payload = mapFormToMedusaPayload(form, product);
      const result = await updateProduct.mutateAsync({
        productId: product.id,
        product: payload as any,
      });

      if (result.success) {
        toast.success("Đã cập nhật sản phẩm");
        setIsDirty(false);
        onSuccess?.();
        router.push("/products");
      } else {
        toast.error(`Lỗi: ${result.error}`);
      }
    } catch {
      toast.error("Có lỗi xảy ra khi lưu");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-w-0">
      {/* Main Content - Left Column (65-70%) */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Tabs Navigation */}
        <div className="bg-background border rounded-lg p-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 sm:grid-cols-7 h-auto bg-transparent gap-1">
              <TabsTrigger
                value="basic"
                className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Package className="size-3.5" />
                <span className="hidden sm:inline">Thông tin</span>
                <span className="sm:hidden">TT</span>
              </TabsTrigger>
              <TabsTrigger
                value="pricing"
                className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <DollarSign className="size-3.5" />
                <span>Giá</span>
              </TabsTrigger>
              <TabsTrigger
                value="categories"
                className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <FolderTree className="size-3.5" />
                <span className="hidden sm:inline">Danh mục</span>
              </TabsTrigger>
              <TabsTrigger
                value="inventory"
                className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Warehouse className="size-3.5" />
                <span className="hidden sm:inline">Tồn kho</span>
              </TabsTrigger>
              <TabsTrigger
                value="images"
                className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <ImageIcon className="size-3.5" />
                <span className="hidden sm:inline">Hình ảnh</span>
              </TabsTrigger>
              <TabsTrigger
                value="seo"
                className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Search className="size-3.5" />
                <span>SEO</span>
              </TabsTrigger>
              <TabsTrigger
                value="wordpress"
                className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Code2 className="size-3.5" />
                <span className="hidden sm:inline">WP Meta</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Contents */}
            <div className="mt-4">
              <TabsContent value="basic" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Thông tin cơ bản</CardTitle>
                    <CardDescription>
                      Tên, mô tả và trạng thái sản phẩm
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProductBasicTab form={form} onChange={setForm} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pricing" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Giá bán</CardTitle>
                    <CardDescription>
                      Thiết lập giá thường, giá khuyến mãi và SKU
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProductPricingTab
                      form={form}
                      onChange={setForm}
                      excludeProductId={product.id}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="categories" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Danh mục & Thẻ</CardTitle>
                    <CardDescription>
                      Phân loại sản phẩm và quản lý thẻ
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProductCategoriesTab
                      form={form}
                      onChange={setForm}
                      categories={categoryTree}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="inventory" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tồn kho</CardTitle>
                    <CardDescription>
                      Quản lý số lượng và trạng thái kho hàng
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProductInventoryTab form={form} onChange={setForm} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="images" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Hình ảnh</CardTitle>
                    <CardDescription>
                      Quản lý ảnh đại diện và gallery sản phẩm
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProductImagesTab form={form} onChange={setForm} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seo" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">SEO</CardTitle>
                    <CardDescription>
                      Tối ưu tiêu đề, mô tả và URL cho công cụ tìm kiếm
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProductSeoTab form={form} onChange={setForm} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="wordpress" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">WordPress Metadata</CardTitle>
                    <CardDescription>
                      Thông tin migration từ WooCommerce (chỉ đọc)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProductWordPressMetadataTab meta={wooMeta} />
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Sidebar - Right Column (30-35%) */}
      <div className="w-full lg:w-80 xl:w-96 shrink-0 order-first lg:order-last">
        <div className="sticky top-4 space-y-4">
          {/* Preview Sidebar */}
          <ProductEditSidebar
            form={form}
            productId={product.id}
            isDirty={isDirty}
          />

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    const previewUrl = `/products/${form.handle || product.id}`;
                    window.open(previewUrl, "_blank");
                  }}
                >
                  <Eye className="size-4" />
                  Xem trước sản phẩm
                </Button>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => handleNavigate("/products")}
                  >
                    <X className="size-4" />
                    Hủy
                  </Button>

                  <Button
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={handleSave}
                    disabled={!form.title.trim() || !form.handle.trim() || isSaving}
                  >
                    {isSaving ? (
                      <>
                        <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save className="size-4" />
                        Lưu
                        {isDirty && (
                          <span className="relative flex size-2">
                            <span className="absolute inline-flex size-full rounded-full bg-yellow-400 opacity-75 animate-ping" />
                            <span className="relative inline-flex size-2 rounded-full bg-yellow-500" />
                          </span>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
