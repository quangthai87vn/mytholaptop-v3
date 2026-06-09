"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, Loader2, Globe } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import {
  Package,
  DollarSign,
  Warehouse,
  ImageIcon,
  Tag,
  FolderTree,
  Code2,
} from "lucide-react";
import { useWooCommerceCategories, useWooCommerceTags, useUpdateWooCommerceProduct } from "@/hooks/use-medusa";
import type { AdaptedProduct, WooCategory } from "@/lib/products/product-filters";
import { formatCurrency } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface WooProductEditFormData {
  name: string;
  slug: string;
  status: string;
  sku: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string;
  date_on_sale_to: string;
  manage_stock: boolean;
  stock_quantity: string;
  stock_status: string;
  backorders: string;
  sold_individually: boolean;
  short_description: string;
  description: string;
  catalog_visibility: string;
  featured: boolean;
  purchase_note: string;
  menu_order: string;
  image_ids: WooImage[];
  category_ids: number[];
  tag_ids: number[];
  new_tags: string[];
  meta_data: Array<{ key: string; value: string }>;
}

export interface WooImage {
  id?: number;
  src: string;
  name?: string;
  alt?: string;
  position?: number;
}

// ─────────────────────────────────────────────────────────────────
// Safe helpers
// ─────────────────────────────────────────────────────────────────

function safeString(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val : fallback;
}

function safeNum(val: unknown, fallback = ""): string {
  if (typeof val === "number") return String(val);
  if (typeof val === "string" && val.trim() !== "") return val;
  return fallback;
}

// ─────────────────────────────────────────────────────────────────
// Map WooProduct to form
// ─────────────────────────────────────────────────────────────────

function mapWooProductToForm(p: AdaptedProduct): WooProductEditFormData {
  const images: WooImage[] = [];

  const raw = p.metadata;
  if (raw?.wordpress_image) {
    const imgStr = raw.wordpress_image;
    let urls: string[] = [];
    if (imgStr.startsWith("[")) {
      try { urls = JSON.parse(imgStr); } catch { urls = imgStr.split(","); }
    } else {
      urls = imgStr.split(",");
    }
    urls.forEach((url, i) => {
      const trimmed = url.trim();
      if (trimmed) images.push({ src: trimmed, position: i });
    });
  }

  const categoryIds: number[] = [];
  if (raw?.wordpress_category_ids) {
    raw.wordpress_category_ids.split(",").forEach((s) => {
      const id = parseInt(s.trim(), 10);
      if (!isNaN(id)) categoryIds.push(id);
    });
  } else if (p.categoryIds && p.categoryIds.length > 0) {
    p.categoryIds.forEach((id) => {
      const numId = parseInt(id, 10);
      if (!isNaN(numId) && !categoryIds.includes(numId)) {
        categoryIds.push(numId);
      }
    });
  }

  const metaData: Array<{ key: string; value: string }> = [];
  if (raw) {
    const knownKeys = new Set([
      "wordpress_product_id", "wordpress_regular_price", "wordpress_sale_price",
      "wordpress_price", "wordpress_manage_stock", "wordpress_stock_status",
      "wordpress_stock_quantity", "wordpress_category_ids", "wordpress_category_names",
      "wordpress_tags", "wordpress_tag_slugs", "wordpress_tag_names", "wordpress_image",
      "sync_status", "sync_error", "backorders", "date_on_sale_from", "date_on_sale_to",
      "manage_stock",
    ]);
    Object.entries(raw).forEach(([k, v]) => {
      if (!knownKeys.has(k) && v) metaData.push({ key: k, value: String(v) });
    });
  }

  return {
    name: safeString(p.name),
    slug: "",
    status: p.status === "published" ? "publish" : p.status,
    sku: safeString(p.sku),
    regular_price: safeNum(raw?.wordpress_regular_price || raw?.wordpress_price),
    sale_price: safeNum(raw?.wordpress_sale_price),
    date_on_sale_from: safeString(raw?.date_on_sale_from),
    date_on_sale_to: safeString(raw?.date_on_sale_to),
    manage_stock: raw?.manage_stock === "true",
    stock_quantity: safeNum(p.stock),
    stock_status: p.stockStatus || "instock",
    backorders: safeString(raw?.backorders, "no"),
    sold_individually: false,
    short_description: safeString(p.description),
    description: "",
    catalog_visibility: "visible",
    featured: false,
    purchase_note: safeString(raw?.purchase_note),
    menu_order: safeNum(raw?.menu_order),
    image_ids: images,
    category_ids: categoryIds,
    tag_ids: [],
    new_tags: [],
    meta_data: metaData,
  };
}

// ─────────────────────────────────────────────────────────────────
// Category tree helpers
// ─────────────────────────────────────────────────────────────────

interface CategoryNode {
  id: number;
  name: string;
  parent: number;
  children: CategoryNode[];
}

function buildCategoryTree(cats: WooCategory[]): CategoryNode[] {
  const map = new Map<number, CategoryNode>();
  cats.forEach((c) => map.set(c.id, { id: c.id, name: c.name, parent: c.parent, children: [] }));
  const roots: CategoryNode[] = [];
  cats.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parent && map.has(c.parent)) {
      map.get(c.parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

// ─────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────

interface WooProductEditFormProps {
  product: AdaptedProduct;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export function WooProductEditForm({ product, onSuccess, onCancel }: WooProductEditFormProps) {
  const updateProduct = useUpdateWooCommerceProduct();
  const { data: wooCategories } = useWooCommerceCategories({ per_page: 100 });
  const { data: wooTags } = useWooCommerceTags({ per_page: 100 });

  const [form, setForm] = useState<WooProductEditFormData>(() =>
    mapWooProductToForm(product)
  );
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [featuredUrl, setFeaturedUrl] = useState("");
  const [galleryUrl, setGalleryUrl] = useState("");

  // Sync featured URL from form on mount
  const featuredUrlRef = useRef(form.image_ids[0]?.src || "");
  useEffect(() => {
    if (form.image_ids[0]) {
      setFeaturedUrl(form.image_ids[0].src);
      featuredUrlRef.current = form.image_ids[0].src;
    }
  }, []);

  // Rebuild form when product changes
  useEffect(() => {
    setForm(mapWooProductToForm(product));
    setIsDirty(false);
    setFeaturedUrl(product.metadata?.wordpress_image?.split(",")[0]?.trim() || "");
  }, [product]);

  // Track dirty state
  useEffect(() => {
    const fresh = mapWooProductToForm(product);
    setIsDirty(JSON.stringify(form) !== JSON.stringify(fresh));
  }, [form, product]);

  const setField = useCallback(<K extends keyof WooProductEditFormData>(
    key: K,
    value: WooProductEditFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ─── Category tree ─────────────────────────────────────────────
  const categoryTree = useMemo(
    () => buildCategoryTree(wooCategories || []),
    [wooCategories]
  );

  const selectedCatIds = useMemo(
    () => new Set(form.category_ids),
    [form.category_ids]
  );

  const toggleCategory = (id: number, name: string) => {
    const ids = form.category_ids;
    if (ids.includes(id)) {
      setField("category_ids", ids.filter((cid) => cid !== id));
    } else {
      setField("category_ids", [...ids, id]);
    }
  };

  const getCatName = (id: number): string => {
    return wooCategories?.find((c) => c.id === id)?.name || String(id);
  };

  // ─── Tags ───────────────────────────────────────────────────────
  const selectedTagIds = useMemo(
    () => new Set(form.tag_ids),
    [form.tag_ids]
  );

  const toggleTag = (id: number) => {
    const ids = form.tag_ids;
    if (ids.includes(id)) {
      setField("tag_ids", ids.filter((tid) => tid !== id));
    } else {
      setField("tag_ids", [...ids, id]);
    }
  };

  const addNewTag = () => {
    const name = newTagInput.trim();
    if (!name) return;
    if (wooTags?.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Thẻ đã tồn tại trong WooCommerce");
      return;
    }
    if (form.new_tags.some((t) => t.toLowerCase() === name.toLowerCase())) {
      toast.error("Thẻ đã được thêm");
      return;
    }
    setField("new_tags", [...form.new_tags, name]);
    setNewTagInput("");
  };

  const removeNewTag = (name: string) => {
    setField("new_tags", form.new_tags.filter((t) => t !== name));
  };

  // ─── Images ────────────────────────────────────────────────────
  const featuredImage = form.image_ids[0];
  const galleryImages = form.image_ids.slice(1);

  const addGalleryImage = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (form.image_ids.some((img) => img.src === trimmed)) {
      toast.error("Ảnh đã tồn tại trong gallery");
      return;
    }
    setField("image_ids", [
      ...form.image_ids,
      { src: trimmed, position: form.image_ids.length },
    ]);
    setGalleryUrl("");
  };

  const removeImage = (src: string) => {
    setField("image_ids", form.image_ids.filter((img) => img.src !== src));
  };

  const updateFeaturedUrl = (url: string) => {
    setFeaturedUrl(url);
    if (!url.trim()) {
      setField("image_ids", form.image_ids.slice(1));
    } else {
      const rest = form.image_ids.filter((img) => img.src !== featuredUrlRef.current);
      setField("image_ids", [{ src: url.trim(), position: 0 }, ...rest]);
      featuredUrlRef.current = url.trim();
    }
  };

  // ─── Save ──────────────────────────────────────────────────────
  const handleSave = async () => {
    const name = safeString(form.name).trim();
    if (!name) {
      toast.error("Vui lòng nhập tên sản phẩm");
      setActiveTab("general");
      return;
    }

    const regularPrice = safeString(form.regular_price).trim();
    const salePrice = safeString(form.sale_price).trim();
    if (salePrice && regularPrice) {
      const rp = parseFloat(regularPrice);
      const sp = parseFloat(salePrice);
      if (!isNaN(rp) && !isNaN(sp) && sp > rp) {
        toast.error("Giá khuyến mãi không được lớn hơn giá gốc");
        setActiveTab("pricing");
        return;
      }
    }

    const payload: Record<string, unknown> = {
      name,
      status: form.status,
    };

    if (regularPrice) payload.regular_price = regularPrice;
    if (salePrice) payload.sale_price = salePrice;
    else payload.sale_price = "";

    if (form.date_on_sale_from) payload.date_on_sale_from = form.date_on_sale_from;
    if (form.date_on_sale_to) payload.date_on_sale_to = form.date_on_sale_to;
    if (form.date_on_sale_from) payload.date_on_sale_from_gmt = "";
    if (form.date_on_sale_to) payload.date_on_sale_to_gmt = "";

    payload.manage_stock = form.manage_stock;
    payload.stock_status = form.stock_status;
    payload.backorders = form.backorders;
    payload.sold_individually = form.sold_individually;

    if (form.manage_stock && form.stock_quantity) {
      const qty = parseInt(form.stock_quantity, 10);
      if (!isNaN(qty)) payload.stock_quantity = qty;
    }

    if (form.short_description.trim()) payload.short_description = form.short_description.trim();
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.purchase_note.trim()) payload.purchase_note = form.purchase_note.trim();
    if (form.menu_order) {
      const order = parseInt(form.menu_order, 10);
      if (!isNaN(order)) payload.menu_order = order;
    }
    if (form.catalog_visibility !== "visible") payload.catalog_visibility = form.catalog_visibility;
    payload.featured = form.featured;

    if (form.category_ids.length > 0) {
      payload.categories = form.category_ids.map((id) => ({ id }));
    }

    // Tags: existing WooCommerce tags by ID + new tags by name
    const allTags: Array<{ id: number } | { name: string }> = [
      ...form.tag_ids.map((id) => ({ id })),
      ...form.new_tags.map((name) => ({ name })),
    ];
    if (allTags.length > 0) payload.tags = allTags;

    if (form.image_ids.length > 0) {
      payload.images = form.image_ids.map((img, i) => ({
        src: img.src,
        position: i,
        ...(img.id ? { id: img.id } : {}),
      }));
    }

    if (form.meta_data.length > 0) {
      payload.meta_data = form.meta_data
        .filter((m) => m.key.trim())
        .map((m) => ({ key: m.key.trim(), value: m.value }));
    }

    setIsSaving(true);
    try {
      await updateProduct.mutateAsync({
        productId: product.sourceId,
        data: payload as never,
      });
      toast.success("Đã cập nhật sản phẩm trên WooCommerce!");
      setIsDirty(false);
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      toast.error(`Lỗi WooCommerce: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const regularPrice = parseFloat(form.regular_price || "0");
  const salePrice = parseFloat(form.sale_price || "0");
  const discountPct =
    regularPrice > 0 && salePrice > 0 && salePrice < regularPrice
      ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
      : 0;
  const isNameEmpty = !form.name.trim();

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-w-0">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="bg-background border rounded-lg p-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 sm:grid-cols-6 h-auto bg-transparent gap-1">
              <TabsTrigger value="general" className="gap-1.5 text-xs sm:text-sm">
                <Package className="size-3.5" />
                <span className="hidden sm:inline">Thông tin</span>
              </TabsTrigger>
              <TabsTrigger value="pricing" className="gap-1.5 text-xs sm:text-sm">
                <DollarSign className="size-3.5" />
                <span>Giá</span>
              </TabsTrigger>
              <TabsTrigger value="inventory" className="gap-1.5 text-xs sm:text-sm">
                <Warehouse className="size-3.5" />
                <span className="hidden sm:inline">Tồn kho</span>
              </TabsTrigger>
              <TabsTrigger value="images" className="gap-1.5 text-xs sm:text-sm">
                <ImageIcon className="size-3.5" />
                <span>Hình ảnh</span>
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-1.5 text-xs sm:text-sm">
                <FolderTree className="size-3.5" />
                <span className="hidden sm:inline">Danh mục</span>
              </TabsTrigger>
              <TabsTrigger value="advanced" className="gap-1.5 text-xs sm:text-sm">
                <Code2 className="size-3.5" />
                <span>Nâng cao</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-4">
              {/* ── General ── */}
              <TabsContent value="general" className="mt-0 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Thông tin chung</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="woo-name">
                        Tên sản phẩm <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="woo-name"
                        placeholder="Nhập tên sản phẩm..."
                        value={form.name}
                        onChange={(e) => setField("name", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="woo-status">Trạng thái</Label>
                        <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                          <SelectTrigger id="woo-status"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="publish">Hoạt động (publish)</SelectItem>
                            <SelectItem value="draft">Bản nháp (draft)</SelectItem>
                            <SelectItem value="pending">Chờ duyệt (pending)</SelectItem>
                            <SelectItem value="private">Riêng tư (private)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="woo-visibility">Hiển thị</Label>
                        <Select value={form.catalog_visibility} onValueChange={(v) => setField("catalog_visibility", v)}>
                          <SelectTrigger id="woo-visibility"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="visible">Hiển thị everywhere</SelectItem>
                            <SelectItem value="catalog">Chỉ danh mục</SelectItem>
                            <SelectItem value="search">Chỉ tìm kiếm</SelectItem>
                            <SelectItem value="hidden">Ẩn</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="woo-sku">SKU</Label>
                        <Input
                          id="woo-sku"
                          placeholder="SKU-001"
                          value={form.sku}
                          onChange={(e) => setField("sku", e.target.value)}
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="flex items-center gap-2 h-9">
                          <Switch
                            id="woo-featured"
                            checked={form.featured}
                            onCheckedChange={(v) => setField("featured", v)}
                          />
                          <Label htmlFor="woo-featured" className="text-sm cursor-pointer">
                            Sản phẩm nổi bật
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="woo-short-desc">Mô tả ngắn</Label>
                      <Textarea
                        id="woo-short-desc"
                        placeholder="Mô tả ngắn gọn về sản phẩm..."
                        value={form.short_description}
                        onChange={(e) => setField("short_description", e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="woo-desc">Mô tả đầy đủ</Label>
                      <Textarea
                        id="woo-desc"
                        placeholder="Mô tả chi tiết sản phẩm (hỗ trợ HTML)..."
                        value={form.description}
                        onChange={(e) => setField("description", e.target.value)}
                        rows={6}
                        className="font-mono text-xs"
                      />
                      <p className="text-xs text-muted-foreground">
                        Hỗ trợ HTML.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Pricing ── */}
              <TabsContent value="pricing" className="mt-0 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Giá bán</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="woo-reg-price">Giá gốc (VND)</Label>
                        <Input
                          id="woo-reg-price"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={form.regular_price}
                          onChange={(e) => setField("regular_price", e.target.value)}
                        />
                        {regularPrice > 0 && (
                          <p className="text-sm text-muted-foreground">
                            = {formatCurrency(regularPrice)}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="woo-sale-price">Giá khuyến mãi (VND)</Label>
                        <Input
                          id="woo-sale-price"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={form.sale_price}
                          onChange={(e) => setField("sale_price", e.target.value)}
                        />
                        {salePrice > 0 && (
                          <p className="text-sm text-muted-foreground">
                            = {formatCurrency(salePrice)}
                          </p>
                        )}
                      </div>
                    </div>

                    {discountPct > 0 && (
                      <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                        <p className="text-sm text-green-800 font-medium">
                          Giảm giá {discountPct}% so với giá gốc
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          Tiết kiệm {formatCurrency(regularPrice - salePrice)}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="woo-sale-from">Giảm giá từ ngày</Label>
                        <Input
                          id="woo-sale-from"
                          type="datetime-local"
                          value={form.date_on_sale_from}
                          onChange={(e) => setField("date_on_sale_from", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="woo-sale-to">Giảm giá đến ngày</Label>
                        <Input
                          id="woo-sale-to"
                          type="datetime-local"
                          value={form.date_on_sale_to}
                          onChange={(e) => setField("date_on_sale_to", e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Inventory ── */}
              <TabsContent value="inventory" className="mt-0 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tồn kho</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="woo-stock-status">Trạng thái tồn kho</Label>
                      <Select value={form.stock_status} onValueChange={(v) => setField("stock_status", v)}>
                        <SelectTrigger id="woo-stock-status"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instock">Còn hàng</SelectItem>
                          <SelectItem value="outofstock">Hết hàng</SelectItem>
                          <SelectItem value="onbackorder">Chờ hàng (on backorder)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="woo-manage-stock">Quản lý tồn kho</Label>
                        <p className="text-xs text-muted-foreground">
                          Bật để nhập số lượng tồn kho thực tế
                        </p>
                      </div>
                      <Switch
                        id="woo-manage-stock"
                        checked={form.manage_stock}
                        onCheckedChange={(v) => setField("manage_stock", v)}
                      />
                    </div>

                    {form.manage_stock && (
                      <div className="space-y-2">
                        <Label htmlFor="woo-stock-qty">Số lượng tồn kho</Label>
                        <Input
                          id="woo-stock-qty"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={form.stock_quantity}
                          onChange={(e) => setField("stock_quantity", e.target.value)}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="woo-backorders">Cho phép đặt hàng trước</Label>
                      <Select value={form.backorders} onValueChange={(v) => setField("backorders", v)}>
                        <SelectTrigger id="woo-backorders"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">Không cho phép</SelectItem>
                          <SelectItem value="notify">Cho phép, thông báo</SelectItem>
                          <SelectItem value="yes">Cho phép</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="woo-sold-individually">Bán riêng lẻ</Label>
                        <p className="text-xs text-muted-foreground">
                          Chỉ cho phép mua 1 sản phẩm mỗi đơn hàng
                        </p>
                      </div>
                      <Switch
                        id="woo-sold-individually"
                        checked={form.sold_individually}
                        onCheckedChange={(v) => setField("sold_individually", v)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Images ── */}
              <TabsContent value="images" className="mt-0 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Hình ảnh</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Thêm ảnh bằng URL. Upload lên WordPress Media Library TODO.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Featured */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Ảnh đại diện</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative aspect-square rounded-xl border-2 border-dashed bg-muted/50 overflow-hidden group">
                          {featuredImage ? (
                            <>
                              <Image
                                src={featuredImage.src}
                                alt="Featured"
                                fill
                                className="object-contain"
                                unoptimized
                              />
                              <div className="absolute top-2 right-2">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="size-7 p-0"
                                  onClick={() => updateFeaturedUrl("")}
                                >
                                  <X className="size-3" />
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                              <ImageIcon className="size-12 mb-2" />
                              <span className="text-sm">Chưa có ảnh đại diện</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="woo-featured-url" className="text-sm">URL ảnh đại diện</Label>
                          <Input
                            id="woo-featured-url"
                            placeholder="https://... hoặc /wp-content/..."
                            value={featuredUrl}
                            onChange={(e) => setFeaturedUrl(e.target.value)}
                            onBlur={(e) => updateFeaturedUrl(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Nhập URL đầy đủ hoặc đường dẫn tương đối WordPress.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Gallery */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Gallery ({galleryImages.length} ảnh)</Label>
                      {galleryImages.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {galleryImages.map((img, idx) => (
                            <div key={idx} className="relative group rounded-lg border bg-muted overflow-hidden aspect-square">
                              <Image
                                src={img.src}
                                alt={`Gallery ${idx + 1}`}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="size-7 p-0"
                                  onClick={() => updateFeaturedUrl(img.src)}
                                  title="Đặt làm đại diện"
                                >
                                  <Package className="size-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="size-7 p-0"
                                  onClick={() => removeImage(img.src)}
                                  title="Xoá ảnh"
                                >
                                  <X className="size-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          placeholder="URL ảnh gallery..."
                          value={galleryUrl}
                          onChange={(e) => setGalleryUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); addGalleryImage(galleryUrl); }
                          }}
                          className="flex-1 min-w-0"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addGalleryImage(galleryUrl)}
                          className="gap-1.5 shrink-0"
                        >
                          <Plus className="size-3.5" />
                          Thêm
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Categories & Tags ── */}
              <TabsContent value="categories" className="mt-0 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Danh mục &amp; Thẻ</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Categories */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Danh mục</Label>
                      {categoryTree.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Đang tải danh mục...</p>
                      ) : (
                        <div className="space-y-1 max-h-64 overflow-y-auto border rounded-lg p-3">
                          {categoryTree.map((node) => (
                            <CategoryCheckbox
                              key={node.id}
                              node={node}
                              selected={selectedCatIds}
                              onToggle={toggleCategory}
                              getName={getCatName}
                            />
                          ))}
                        </div>
                      )}
                      {form.category_ids.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {form.category_ids.map((id) => (
                            <Badge key={id} variant="secondary" className="gap-1 text-xs">
                              {getCatName(id)}
                              <button onClick={() => toggleCategory(id, getCatName(id))} className="ml-1 hover:text-destructive">
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="border-t pt-6 space-y-3">
                      <Label className="text-base font-medium">Thẻ</Label>
                      {wooTags && wooTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto border rounded-lg p-3">
                          {wooTags.map((tag) => (
                            <Badge
                              key={tag.id}
                              variant={selectedTagIds.has(tag.id) ? "default" : "outline"}
                              className="cursor-pointer text-xs"
                              onClick={() => toggleTag(tag.id)}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Tên thẻ mới..."
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); addNewTag(); }
                          }}
                          className="flex-1"
                        />
                        <Button size="sm" variant="outline" onClick={addNewTag} className="gap-1">
                          <Plus className="size-3.5" />
                          Thêm
                        </Button>
                      </div>
                      {form.new_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {form.new_tags.map((name) => (
                            <Badge key={name} variant="outline" className="gap-1 text-xs border-dashed">
                              <Tag className="size-3" />
                              {name} (mới)
                              <button onClick={() => removeNewTag(name)} className="ml-1 hover:text-destructive">
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      {form.tag_ids.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {form.tag_ids.map((id) => {
                            const t = wooTags?.find((tg) => tg.id === id);
                            return (
                              <Badge key={id} variant="secondary" className="gap-1 text-xs">
                                {t?.name || `Tag #${id}`}
                                <button onClick={() => toggleTag(id)} className="ml-1 hover:text-destructive">
                                  <X className="size-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Advanced ── */}
              <TabsContent value="advanced" className="mt-0 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">SEO / Nâng cao</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="woo-menu-order">Thứ tự menu</Label>
                        <Input
                          id="woo-menu-order"
                          type="number"
                          placeholder="0"
                          value={form.menu_order}
                          onChange={(e) => setField("menu_order", e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Dùng để sắp xếp thứ tự trong menu.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="woo-purchase-note">Ghi chú mua hàng</Label>
                        <Textarea
                          id="woo-purchase-note"
                          placeholder="Ghi chú hiển thị sau khi đặt hàng..."
                          value={form.purchase_note}
                          onChange={(e) => setField("purchase_note", e.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>

                    {/* Meta Data */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">Metadata tùy chỉnh</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setField("meta_data", [...form.meta_data, { key: "", value: "" }])
                          }
                          className="gap-1"
                        >
                          <Plus className="size-3.5" />
                          Thêm trường
                        </Button>
                      </div>
                      {form.meta_data.map((meta, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <Input
                            placeholder="Key"
                            value={meta.key}
                            onChange={(e) => {
                              const updated = [...form.meta_data];
                              updated[idx] = { ...updated[idx], key: e.target.value };
                              setField("meta_data", updated);
                            }}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Value"
                            value={meta.value}
                            onChange={(e) => {
                              const updated = [...form.meta_data];
                              updated[idx] = { ...updated[idx], value: e.target.value };
                              setField("meta_data", updated);
                            }}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="shrink-0 text-destructive"
                            onClick={() =>
                              setField("meta_data", form.meta_data.filter((_, i) => i !== idx))
                            }
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ))}
                      {form.meta_data.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Chưa có metadata. Click "Thêm trường" để tạo.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-80 xl:w-96 shrink-0">
        <div className="sticky top-4 space-y-4">
          {/* Preview */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                {featuredImage ? (
                  <Image
                    src={featuredImage.src}
                    alt={form.name || "Preview"}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="size-12 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-sm line-clamp-2">
                {form.name || "Tên sản phẩm"}
              </h3>
              {form.regular_price && (
                <div>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(regularPrice)}
                  </span>
                  {salePrice > 0 && salePrice < regularPrice && (
                    <span className="ml-2 text-sm text-muted-foreground line-through">
                      {formatCurrency(salePrice)}
                    </span>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">
                  {form.stock_status === "instock" ? "Còn hàng"
                    : form.stock_status === "outofstock" ? "Hết hàng"
                    : "Chờ hàng"}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {form.status === "publish" ? "Hoạt động"
                    : form.status === "draft" ? "Bản nháp"
                    : form.status === "pending" ? "Chờ duyệt"
                    : "Riêng tư"}
                </Badge>
              </div>
              {form.category_ids.length > 0 && (
                <p className="text-xs text-muted-foreground truncate">
                  {form.category_ids.map((id) => getCatName(id)).join(", ")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-4 pb-4 space-y-2">
              <div className="text-xs text-muted-foreground px-1">
                <Globe className="size-3.5 inline mr-1" />
                WooCommerce ID: <span className="font-mono">{product.sourceId}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={onCancel}
                >
                  <X className="size-4" />
                  Huỷ
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={handleSave}
                  disabled={isSaving || isNameEmpty}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Lưu
                      {isDirty && (
                        <span className="relative flex size-2 ml-1">
                          <span className="absolute inline-flex size-full rounded-full bg-yellow-400 opacity-75 animate-ping" />
                          <span className="relative inline-flex size-2 rounded-full bg-yellow-500" />
                        </span>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Category Checkbox Sub-component
// ─────────────────────────────────────────────────────────────────

interface CategoryCheckboxProps {
  node: CategoryNode;
  selected: Set<number>;
  onToggle: (id: number, name: string) => void;
  getName: (id: number) => string;
}

function CategoryCheckbox({ node, selected, onToggle, getName }: CategoryCheckboxProps) {
  return (
    <div>
      <label className="flex items-center gap-2 py-1 px-1 hover:bg-muted/50 rounded cursor-pointer">
        <input
          type="checkbox"
          checked={selected.has(node.id)}
          onChange={() => onToggle(node.id, node.name)}
          className="rounded"
        />
        <span className="text-sm">{node.name}</span>
      </label>
      {node.children.map((child) => (
        <CategoryCheckbox
          key={child.id}
          node={child}
          selected={selected}
          onToggle={onToggle}
          getName={getName}
        />
      ))}
    </div>
  );
}
