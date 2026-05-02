"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package,
  DollarSign,
  FolderTree,
  Warehouse,
  ImageIcon,
  Search,
  Code2,
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
    thumbnail: p.thumbnail,
    gallery_urls: p.images?.map((img) => img.url || "") || [],
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

  useEffect(() => {
    setForm(mapMedusaProductToForm(product));
  }, [product]);

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

    setIsSaving(true);
    try {
      const payload = mapFormToMedusaPayload(form, product);
      const result = await updateProduct.mutateAsync({
        productId: product.id,
        product: payload as any,
      });

      if (result.success) {
        toast.success("Đã cập nhật sản phẩm");
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
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="sticky top-0 z-10 bg-background pb-4">
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7">
            <TabsTrigger value="basic" className="gap-1.5 text-xs sm:text-sm">
              <Package className="size-3.5" />
              <span className="hidden sm:inline">Thông tin</span>
              <span className="sm:hidden">Chung</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-1.5 text-xs sm:text-sm">
              <DollarSign className="size-3.5" />
              <span>Giá</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5 text-xs sm:text-sm">
              <FolderTree className="size-3.5" />
              <span className="hidden sm:inline">Danh mục</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-1.5 text-xs sm:text-sm">
              <Warehouse className="size-3.5" />
              <span className="hidden sm:inline">Tồn kho</span>
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-1.5 text-xs sm:text-sm">
              <ImageIcon className="size-3.5" />
              <span className="hidden sm:inline">Hình ảnh</span>
            </TabsTrigger>
            <TabsTrigger value="seo" className="gap-1.5 text-xs sm:text-sm">
              <Search className="size-3.5" />
              <span>SEO</span>
            </TabsTrigger>
            <TabsTrigger value="wordpress" className="gap-1.5 text-xs sm:text-sm">
              <Code2 className="size-3.5" />
              <span className="hidden sm:inline">WP Meta</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <Card className="mt-4">
          <CardContent className="p-6">
            <TabsContent value="basic" className="mt-0">
              <ProductBasicTab form={form} onChange={setForm} />
            </TabsContent>

            <TabsContent value="pricing" className="mt-0">
              <ProductPricingTab form={form} onChange={setForm} />
            </TabsContent>

            <TabsContent value="categories" className="mt-0">
              <ProductCategoriesTab
                form={form}
                onChange={setForm}
                categories={categoryTree}
              />
            </TabsContent>

            <TabsContent value="inventory" className="mt-0">
              <ProductInventoryTab form={form} onChange={setForm} />
            </TabsContent>

            <TabsContent value="images" className="mt-0">
              <ProductImagesTab form={form} onChange={setForm} />
            </TabsContent>

            <TabsContent value="seo" className="mt-0">
              <ProductSeoTab form={form} onChange={setForm} />
            </TabsContent>

            <TabsContent value="wordpress" className="mt-0">
              <ProductWordPressMetadataTab meta={wooMeta} />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      <div className="sticky bottom-4 flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/products")}>
          Huỷ
        </Button>
        <Button
          onClick={handleSave}
          disabled={!form.title.trim() || isSaving}
        >
          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </div>
    </div>
  );
}
