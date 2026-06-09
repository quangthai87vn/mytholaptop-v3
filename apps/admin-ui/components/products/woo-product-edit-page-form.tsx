"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  X,
  Plus,
  Save,
  Loader2,
  Globe,
  Package,
  ImageIcon,
  Tag,
  FolderTree,
  Code2,
  Eye,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Upload,
  GripVertical,
  ZoomIn,
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Link2,
  Undo,
  Redo,
  ChevronUp,
  ChevronDown,
  Check,
  Search,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  useWooCommerceCategories,
  useWooCommerceTags,
  useWooCommerceProductsAll,
  useUpdateWooCommerceProduct,
  WpMediaItem,
  WooTag,
} from "@/hooks/use-medusa";
import { MediaPicker, type MediaPickerResult } from "@/components/media/media-picker";
import type { WooProduct, WooCategory } from "@/lib/products/product-filters";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface WooEditFormData {
  name: string;
  status: string;
  catalog_visibility: string;
  featured: boolean;
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
  purchase_note: string;
  menu_order: string;
  image_ids: WooImg[];
  category_ids: number[];
  tag_items: TagItem[];
  new_tags: string[];
  meta_data: Array<{ key: string; value: string }>;
}

export interface TagItem {
  id: number;
  name: string;
}

export interface WooImg {
  id?: number;
  src: string;
  name?: string;
  alt?: string;
  position?: number;
  title?: string;
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
function safeBool(val: unknown, fallback = false): boolean {
  return typeof val === "boolean" ? val : fallback;
}
function mediaResultToWooImg(r: MediaPickerResult): WooImg {
  return { id: r.id, src: r.source_url, title: r.title, alt: r.alt };
}

// ─────────────────────────────────────────────────────────────────
// Map WooProduct → WooEditFormData
// ─────────────────────────────────────────────────────────────────

function mapProductToForm(p: WooProduct): WooEditFormData {
  const images: WooImg[] = (p.images || []).map((img) => ({
    id: img.id,
    src: img.src,
    name: img.name,
    alt: img.alt,
    position: 0,
  }));
  const categoryIds: number[] = (p.categories || []).map((c) => c.id);
  const tagIds: number[] = (p.tags || []).map((t) => t.id);
  const tagItems: TagItem[] = (p.tags || []).map((t) => ({ id: t.id, name: safeString(t.name) }));
  const meta = (p as unknown as { metadata?: Record<string, string> }).metadata;
  return {
    name: safeString(p.name),
    status: safeString(p.status),
    catalog_visibility: "visible",
    featured: safeBool(p.featured),
    sku: safeString(p.sku),
    regular_price: safeNum(p.regular_price),
    sale_price: safeNum(p.sale_price),
    date_on_sale_from: "",
    date_on_sale_to: "",
    manage_stock: safeBool(p.manage_stock),
    stock_quantity: safeNum(p.stock_quantity),
    stock_status: safeString(p.stock_status),
    backorders: safeString(p.backorders),
    sold_individually: safeBool(p.sold_individually),
    short_description: safeString(p.short_description),
    description: safeString(p.description),
    purchase_note: safeString(meta?.purchase_note),
    menu_order: safeNum(meta?.menu_order || ((p as unknown as Record<string, unknown>).menu_order as string)),
    image_ids: images,
    category_ids: categoryIds,
    tag_items: tagItems,
    new_tags: [],
    meta_data: [],
  };
}

// ─────────────────────────────────────────────────────────────────
// Category tree
// ─────────────────────────────────────────────────────────────────

interface CatNode {
  id: number;
  name: string;
  parent: number;
  children: CatNode[];
}

function buildCatTree(cats: WooCategory[]): CatNode[] {
  const map = new Map<number, CatNode>();
  cats.forEach((c) => map.set(c.id, { id: c.id, name: c.name, parent: c.parent, children: [] }));
  const roots: CatNode[] = [];
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
// Tag suggestions
// ─────────────────────────────────────────────────────────────────

function getTagSuggestions(tags: WooTag[], productName: string, selectedIds: number[], categoryNames: string[]) {
  if (!tags.length) return [];
  const keywords = [
    ...productName.toLowerCase().split(/\s+/).filter((w) => w.length > 2),
    ...categoryNames.map((n) => n.toLowerCase()).filter((w) => w.length > 2),
  ];
  return tags
    .filter((t) => !selectedIds.includes(t.id))
    .map((t) => {
      const matchCount = keywords.filter(
        (kw) => t.name.toLowerCase().includes(kw)
      ).length;
      return { tag: t, score: matchCount };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((x) => x.tag);
}

// ─────────────────────────────────────────────────────────────────
// HTML Editor toolbar helper
// ─────────────────────────────────────────────────────────────────

function wrapSelection(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  before: string,
  after: string
) {
  const ta = textareaRef.current;
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.substring(start, end);
  const newValue =
    ta.value.substring(0, start) + before + selected + after + ta.value.substring(end);
  return { newValue, cursorStart: start + before.length, cursorEnd: end + before.length };
}

function insertAtCursor(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  text: string
) {
  const ta = textareaRef.current;
  if (!ta) return;
  const start = ta.selectionStart;
  const newValue = ta.value.substring(0, start) + text + ta.value.substring(start);
  return { newValue, cursorStart: start + text.length, cursorEnd: start + text.length };
}

function applyHtmlTag(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  tag: string,
  wrap: boolean
) {
  const ta = textareaRef.current;
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.substring(start, end);
  let newValue: string;
  let cursorStart: number;
  let cursorEnd: number;
  if (wrap && selected) {
    newValue =
      ta.value.substring(0, start) +
      `<${tag}>` + selected + `</${tag}>` +
      ta.value.substring(end);
    cursorStart = start + tag.length + 2;
    cursorEnd = cursorStart + selected.length;
  } else if (wrap) {
    newValue =
      ta.value.substring(0, start) +
      `<${tag}></${tag}>` +
      ta.value.substring(start);
    cursorStart = start + tag.length + 2;
    cursorEnd = cursorStart;
  } else {
    newValue =
      ta.value.substring(0, start) +
      `<${tag}>` +
      ta.value.substring(end);
    cursorStart = start + tag.length + 2;
    cursorEnd = cursorStart;
  }
  return { newValue, cursorStart, cursorEnd };
}

// ─────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────

interface WooProductEditPageFormProps {
  wooProduct: WooProduct;
  onSaved?: () => void;
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export function WooProductEditPageForm({ wooProduct, onSaved }: WooProductEditPageFormProps) {
  const updateProduct = useUpdateWooCommerceProduct();
  const { data: wooCategories } = useWooCommerceCategories({ per_page: 100 });
  const { data: wooTags } = useWooCommerceTags({ per_page: 100 });

  const [form, setForm] = useState<WooEditFormData>(() => mapProductToForm(wooProduct));
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [catSearch, setCatSearch] = useState("");

  // Media picker state
  const [featuredPickerOpen, setFeaturedPickerOpen] = useState(false);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);

  // Lightbox state
  const [lightboxImg, setLightboxImg] = useState<WooImg | null>(null);

  // Rebuild when product changes
  useEffect(() => {
    setForm(mapProductToForm(wooProduct));
    setIsDirty(false);
  }, [wooProduct]);

  useEffect(() => {
    const fresh = mapProductToForm(wooProduct);
    setIsDirty(JSON.stringify(form) !== JSON.stringify(fresh));
  }, [form, wooProduct]);

  const setField = useCallback(<K extends keyof WooEditFormData>(
    key: K,
    value: WooEditFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ─── Computed ─────────────────────────────────────────────────────
  const catTree = useMemo(() => buildCatTree(wooCategories || []), [wooCategories]);
  const selectedCatIds = useMemo(() => new Set(form.category_ids), [form.category_ids]);
  const selectedTagIds = useMemo(() => new Set(form.tag_items.map((t) => t.id)), [form.tag_items]);
  const regularPrice = parseFloat(form.regular_price || "0");
  const salePrice = parseFloat(form.sale_price || "0");
  const discountPct =
    regularPrice > 0 && salePrice > 0 && salePrice < regularPrice
      ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
      : 0;
  const featuredImage = form.image_ids[0];
  const galleryImages = form.image_ids.slice(1);
  const categoryNames = form.category_ids.map((id) =>
    wooCategories?.find((c) => c.id === id)?.name || String(id)
  );

  // Tag suggestions based on product name + category
  const tagSuggestions = useMemo(
    () => getTagSuggestions(wooTags || [], form.name ?? "", form.tag_items.map((t) => t.id), categoryNames),
    [wooTags, form.name, form.tag_items, categoryNames]
  );

  // Filtered category tree (search within tree)
  const filteredCatTree = useMemo(() => {
    if (!catSearch.trim()) return catTree;
    const q = catSearch.toLowerCase();
    const matches = (node: CatNode): CatNode | null => {
      const nameMatch = node.name.toLowerCase().includes(q);
      const childMatches = node.children.map(matches).filter((c): c is CatNode => c !== null);
      if (nameMatch || childMatches.length > 0) {
        return { ...node, children: childMatches };
      }
      return null;
    };
    return catTree.map(matches).filter((c): c is CatNode => c !== null);
  }, [catTree, catSearch]);

  const filteredWooTags = useMemo(() => {
    if (!wooTags) return [];
    const q = tagSearch.toLowerCase();
    return wooTags.filter(
      (t) =>
        !selectedTagIds.has(t.id) &&
        !form.new_tags.some((nt) => nt.toLowerCase() === t.name.toLowerCase()) &&
        !form.tag_items.some((ti) => ti.name.toLowerCase() === t.name.toLowerCase()) &&
        (q === "" || t.name.toLowerCase().includes(q))
    );
  }, [wooTags, tagSearch, selectedTagIds, form.new_tags, form.tag_items]);

  const getCatName = (id: number): string =>
    wooCategories?.find((c) => c.id === id)?.name || String(id);

  // ─── Category toggle ────────────────────────────────────────────
  const toggleCat = (id: number) => {
    if (form.category_ids.includes(id)) {
      setField("category_ids", form.category_ids.filter((cid) => cid !== id));
    } else {
      setField("category_ids", [...form.category_ids, id]);
    }
  };

  // ─── Tag management ────────────────────────────────────────────
  const removeTag = (id: number) => {
    setField("tag_items", form.tag_items.filter((t) => t.id !== id));
  };

  const addTagFromWooTag = (wooTag: WooTag) => {
    if (form.tag_items.some((t) => t.id === wooTag.id)) return;
    setField("tag_items", [...form.tag_items, { id: wooTag.id, name: wooTag.name }]);
  };

  const addNewTag = () => {
    const name = newTagInput.trim();
    if (!name) return;
    if (
      form.new_tags.some((t) => t.toLowerCase() === name.toLowerCase()) ||
      form.tag_items.some((t) => t.name.toLowerCase() === name.toLowerCase())
    ) {
      toast.error("Thẻ đã được thêm.");
      return;
    }
    setField("new_tags", [...form.new_tags, name]);
    setNewTagInput("");
  };

  // ─── Image management ──────────────────────────────────────────
  const setFeaturedFromMedia = (media: MediaPickerResult) => {
    const newImg = mediaResultToWooImg(media);
    const rest = form.image_ids.filter((img) => img.src !== media.source_url);
    setField("image_ids", [newImg, ...rest]);
  };

  const addGalleryFromMedia = (items: MediaPickerResult[]) => {
    const newImgs = items.map((m, i) => ({
      ...mediaResultToWooImg(m),
      position: form.image_ids.length + i,
    }));
    const existingSrcs = new Set(form.image_ids.map((img) => img.src));
    const unique = newImgs.filter((img) => !existingSrcs.has(img.src));
    if (unique.length === 0) { toast.info("Ảnh đã tồn tại trong album."); return; }
    setField("image_ids", [...form.image_ids, ...unique]);
  };

  const removeGalleryByIdx = (idx: number) => {
    setField("image_ids", form.image_ids.filter((_, i) => i !== idx + 1));
  };

  const setGalleryFeatured = (idx: number) => {
    const imgs = [...form.image_ids];
    const [item] = imgs.splice(idx + 1, 1);
    setField("image_ids", [item, ...imgs]);
  };

  const moveGalleryItem = (from: number, to: number) => {
    if (from === to) return;
    const imgs = [...form.image_ids];
    const [moved] = imgs.splice(from + 1, 1);
    imgs.splice(to + 1, 0, moved);
    setField("image_ids", imgs);
  };

  // ─── Save ──────────────────────────────────────────────────────
  const handleSave = async () => {
    const name = (form.name ?? "").trim();
    if (!name) { toast.error("Vui lòng nhập tên sản phẩm."); setActiveTab("general"); return; }
    const rp = (form.regular_price ?? "").trim();
    const sp = (form.sale_price ?? "").trim();
    if (sp && rp) {
      const rpv = parseFloat(rp); const spv = parseFloat(sp);
      if (!isNaN(rpv) && !isNaN(spv) && spv > rpv) {
        toast.error("Giá khuyến mãi không được lớn hơn giá gốc."); setActiveTab("general"); return;
      }
    }
    const payload: Record<string, unknown> = { name, status: form.status };
    if (rp) payload.regular_price = rp; else payload.regular_price = "";
    if (sp) payload.sale_price = sp; else payload.sale_price = "";
    if (form.catalog_visibility !== "visible") payload.catalog_visibility = form.catalog_visibility;
    payload.featured = form.featured;
    if ((form.sku ?? "").trim()) { payload.sku = (form.sku ?? "").trim(); }
    payload.manage_stock = form.manage_stock;
    payload.stock_status = form.stock_status;
    payload.backorders = form.backorders;
    payload.sold_individually = form.sold_individually;
    if (form.manage_stock && form.stock_quantity) {
      const qty = parseInt(form.stock_quantity, 10);
      if (!isNaN(qty)) payload.stock_quantity = qty;
    }
    if ((form.short_description ?? "").trim()) payload.short_description = (form.short_description ?? "").trim();
    if ((form.description ?? "").trim()) payload.description = (form.description ?? "").trim();
    if ((form.purchase_note ?? "").trim()) payload.purchase_note = (form.purchase_note ?? "").trim();
    if (form.menu_order) {
      const order = parseInt(form.menu_order, 10);
      if (!isNaN(order)) payload.menu_order = order;
    }
    if (form.category_ids.length > 0) payload.categories = form.category_ids.map((id) => ({ id }));
    if (form.tag_items.length > 0 || form.new_tags.length > 0) {
      payload.tags = [
        ...form.tag_items.map((t) => ({ id: t.id })),
        ...form.new_tags.map((name) => ({ name })),
      ];
    }
    if (form.image_ids.length > 0) {
      payload.images = form.image_ids.map((img, i) => ({
        position: i,
        ...(img.id ? { id: img.id } : { src: img.src }),
      }));
    }
    setIsSaving(true);
    try {
      await updateProduct.mutateAsync({ productId: String(wooProduct.id), data: payload as never });
      toast.success("Đã cập nhật sản phẩm trên WooCommerce!");
      setIsDirty(false);
      onSaved?.();
    } catch (err) {
      toast.error(`Lỗi WooCommerce: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* ── LEFT: Main content ─────────────────────────── */}
      <div className="min-w-0">
        {/* Tabs */}
        <div className="bg-card border rounded-xl p-1 mb-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-5 h-auto bg-transparent gap-0.5">
              <TabsTrigger
                value="general"
                className="flex-col gap-0.5 py-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Package className="size-4 shrink-0" />
                <span>Tổng quan</span>
              </TabsTrigger>
              <TabsTrigger
                value="categories"
                className="flex-col gap-0.5 py-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                <FolderTree className="size-4 shrink-0" />
                <span>Danh mục &amp; Thẻ</span>
              </TabsTrigger>
              <TabsTrigger
                value="images"
                className="flex-col gap-0.5 py-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                <ImageIcon className="size-4 shrink-0" />
                <span>Hình ảnh</span>
              </TabsTrigger>
              <TabsTrigger
                value="description"
                className="flex-col gap-0.5 py-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Code2 className="size-4 shrink-0" />
                <span>Mô tả</span>
              </TabsTrigger>
              <TabsTrigger
                value="advanced"
                className="flex-col gap-0.5 py-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Code2 className="size-4 shrink-0" />
                <span>Nâng cao</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-4">

              {/* ═══ TAB: TỔNG QUAN ═══ */}
              <TabsContent value="general" className="mt-0 space-y-4">

                {/* Section: Thông tin cơ bản */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Thông tin cơ bản</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="p-name">
                        Tên sản phẩm <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="p-name"
                        placeholder="Nhập tên sản phẩm..."
                        value={form.name ?? ""}
                        onChange={(e) => setField("name", e.target.value)}
                        className="h-11 text-base"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="p-sku">SKU</Label>
                        <Input
                          id="p-sku"
                          placeholder="SKU-001"
                          value={form.sku ?? ""}
                          onChange={(e) => setField("sku", e.target.value)}
                          className="h-10"
                        />
                        <p className="text-xs text-muted-foreground">Mã định danh sản phẩm</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Section: Giá bán */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Giá bán</CardTitle>
                    <CardDescription>Cài đặt giá gốc và giá khuyến mãi</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="p-reg-price">Giá gốc (VND)</Label>
                        <Input
                          id="p-reg-price"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={form.regular_price ?? ""}
                          onChange={(e) => setField("regular_price", e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="p-sale-price">Giá khuyến mãi (VND)</Label>
                        <Input
                          id="p-sale-price"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={form.sale_price ?? ""}
                          onChange={(e) => setField("sale_price", e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>
                    {discountPct > 0 && (
                      <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                        <p className="text-sm text-green-800 font-medium">
                          Giảm giá {discountPct}% — tiết kiệm {discountPct > 0 ? (
                            new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(regularPrice - salePrice)
                          ) : ""}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="p-sale-from">Giảm giá từ</Label>
                        <Input
                          id="p-sale-from"
                          type="datetime-local"
                          value={form.date_on_sale_from ?? ""}
                          onChange={(e) => setField("date_on_sale_from", e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="p-sale-to">Giảm giá đến</Label>
                        <Input
                          id="p-sale-to"
                          type="datetime-local"
                          value={form.date_on_sale_to ?? ""}
                          onChange={(e) => setField("date_on_sale_to", e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Section: Tồn kho */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Tồn kho</CardTitle>
                    <CardDescription>Quản lý số lượng và trạng thái tồn kho</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="p-stock-status">Trạng thái tồn kho</Label>
                      <Select value={form.stock_status} onValueChange={(v) => setField("stock_status", v)}>
                        <SelectTrigger id="p-stock-status" className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instock">Còn hàng</SelectItem>
                          <SelectItem value="outofstock">Hết hàng</SelectItem>
                          <SelectItem value="onbackorder">Chờ hàng (on backorder)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="p-manage-stock" className="text-sm font-medium">Quản lý tồn kho</Label>
                        <p className="text-xs text-muted-foreground">Bật để nhập số lượng tồn thực tế</p>
                      </div>
                      <Switch
                        id="p-manage-stock"
                        checked={form.manage_stock}
                        onCheckedChange={(v) => setField("manage_stock", v)}
                      />
                    </div>

                    {form.manage_stock && (
                      <div className="space-y-1.5">
                        <Label htmlFor="p-stock-qty">Số lượng tồn kho</Label>
                        <Input
                          id="p-stock-qty"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={form.stock_quantity ?? ""}
                          onChange={(e) => setField("stock_quantity", e.target.value)}
                          className="h-10"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="p-backorders">Cho phép đặt hàng trước</Label>
                        <Select value={form.backorders} onValueChange={(v) => setField("backorders", v)}>
                          <SelectTrigger id="p-backorders" className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no">Không cho phép</SelectItem>
                            <SelectItem value="notify">Cho phép, thông báo</SelectItem>
                            <SelectItem value="yes">Cho phép</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end pb-1">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="p-sold-individually"
                            checked={form.sold_individually}
                            onCheckedChange={(v) => setField("sold_individually", v)}
                          />
                          <Label htmlFor="p-sold-individually" className="cursor-pointer text-sm">Bán riêng lẻ</Label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ═══ TAB: DANH MỤC & THẺ ═══ */}
              <TabsContent value="categories" className="mt-0 space-y-4">

                {/* Categories */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Danh mục sản phẩm</CardTitle>
                    <CardDescription>Chọn một hoặc nhiều danh mục cho sản phẩm này</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        placeholder="Tìm kiếm danh mục..."
                        value={catSearch}
                        onChange={(e) => setCatSearch(e.target.value)}
                        className="pl-9 h-9 text-sm"
                      />
                    </div>
                    {catTree.length === 0 ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                        <RefreshCw className="size-4 animate-spin" />
                        Đang tải danh mục...
                      </div>
                    ) : filteredCatTree.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Không tìm thấy danh mục phù hợp
                      </p>
                    ) : (
                      <div className="space-y-0.5 max-h-64 overflow-y-auto border rounded-xl p-3">
                        {filteredCatTree.map((node) => (
                          <CatCheckItem
                            key={node.id}
                            node={node}
                            selected={selectedCatIds}
                            onToggle={toggleCat}
                          />
                        ))}
                      </div>
                    )}
                    {form.category_ids.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {form.category_ids.map((id) => (
                          <Badge key={id} variant="secondary" className="gap-1 text-xs pr-1.5">
                            {getCatName(id)}
                            <button
                              onClick={() => toggleCat(id)}
                              className="hover:text-destructive ml-0.5 rounded"
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tags */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Thẻ sản phẩm</CardTitle>
                    <CardDescription>Gắn thẻ để dễ tìm kiếm và phân loại sản phẩm</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Selected tags from WooCommerce */}
                    {form.tag_items.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {form.tag_items.map((t) => (
                          <Badge key={t.id} variant="default" className="gap-1 text-xs pr-1">
                            <Tag className="size-3 shrink-0" />
                            <span className="truncate max-w-[160px]">{t.name || `Tag #${t.id}`}</span>
                            <button onClick={() => removeTag(t.id)} className="hover:text-destructive ml-0.5 rounded shrink-0">
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    {form.new_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {form.new_tags.map((name) => (
                          <Badge key={name} variant="outline" className="gap-1 text-xs border-dashed pr-1">
                            <Tag className="size-3" />
                            {name} (mới)
                            <button
                              onClick={() => setField("new_tags", form.new_tags.filter((t) => t !== name))}
                              className="hover:text-destructive ml-0.5 rounded"
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Add new tag */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          placeholder="Thêm thẻ mới..."
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewTag(); } }}
                          className="pl-9 h-10"
                        />
                      </div>
                      <Button size="sm" variant="outline" onClick={addNewTag} className="h-10 gap-1.5">
                        <Plus className="size-3.5" /> Thêm
                      </Button>
                    </div>

                    {/* Tag suggestions */}
                    {(tagSuggestions.length > 0 || filteredWooTags.length > 0) && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Search className="size-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Gợi ý thẻ</span>
                        </div>
                        {/* Based on product name/category */}
                        {tagSuggestions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {tagSuggestions.map((tag) => (
                              <Badge
                                key={tag.id}
                                variant="outline"
                                className="cursor-pointer text-xs hover:bg-primary/10"
                                onClick={() => addTagFromWooTag(tag)}
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {/* Search / all */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Tìm thẻ..."
                            value={tagSearch}
                            onChange={(e) => setTagSearch(e.target.value)}
                            className="pl-9 h-9 text-xs"
                          />
                        </div>
                        {tagSearch && filteredWooTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto border rounded-lg p-2">
                            {filteredWooTags.slice(0, 30).map((tag) => (
                              <Badge
                                key={tag.id}
                                variant="outline"
                                className="cursor-pointer text-xs hover:bg-primary/10"
                                onClick={() => addTagFromWooTag(tag)}
                              >
                                {tag.name}
                              </Badge>
                            ))}
                            {filteredWooTags.length > 30 && (
                              <p className="text-xs text-muted-foreground w-full">
                                ...và {filteredWooTags.length - 30} thẻ khác
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ═══ TAB: HÌNH ẢNH ═══ */}
              <TabsContent value="images" className="mt-0">
                {/* 2-column layout: featured (45%) | gallery (55%) */}
                <div className="grid grid-cols-[45%_1fr] gap-4">

                  {/* ── LEFT: Ảnh đại diện ── */}
                  <Card className="flex flex-col">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Ảnh đại diện</CardTitle>
                      <CardDescription>Ảnh chính hiển thị trong danh sách sản phẩm</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 flex-1">
                      {/* Preview */}
                      <div
                        className="relative aspect-square rounded-xl border-2 border-dashed overflow-hidden bg-muted/30 group cursor-pointer flex items-center justify-center"
                        onClick={() => featuredImage && setLightboxImg(featuredImage)}
                      >
                        {featuredImage ? (
                          <>
                            <Image
                              src={featuredImage.src}
                              alt={featuredImage.alt || featuredImage.title || "Featured"}
                              fill
                              className="object-contain"
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                              <ZoomIn className="size-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                            </div>
                            {featuredImage.id && (
                              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded font-mono">
                                ID: {featuredImage.id}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <ImageIcon className="size-14 mb-2" />
                            <span className="text-sm font-medium">Chưa có ảnh đại diện</span>
                            <span className="text-xs mt-1">Click để thêm</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      {featuredImage?.id ? (
                        <Badge variant="outline" className="gap-1 text-green-700 border-green-300 bg-green-50 text-xs self-start">
                          <CheckCircle2 className="size-3" />
                          WordPress Media (ID: {featuredImage.id})
                        </Badge>
                      ) : featuredImage?.src ? (
                        <Badge variant="outline" className="gap-1 text-yellow-700 border-yellow-300 bg-yellow-50 text-xs self-start">
                          <AlertCircle className="size-3" />
                          URL (không có Media ID)
                        </Badge>
                      ) : null}

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setFeaturedPickerOpen(true)}
                          className="gap-1.5 flex-1"
                        >
                          <ImageIcon className="size-3.5" />
                          Chọn từ thư viện
                        </Button>
                        {featuredImage?.src && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setField("image_ids", form.image_ids.slice(1))}
                            className="gap-1.5 text-destructive hover:text-destructive"
                          >
                            <X className="size-3.5" />
                            Xoá
                          </Button>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Ảnh đầu tiên trong danh sách là ảnh đại diện. Lưu sản phẩm để cập nhật.
                      </p>
                    </CardContent>
                  </Card>

                  {/* ── RIGHT: Album ── */}
                  <Card className="flex flex-col">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Album ({galleryImages.length} ảnh)
                      </CardTitle>
                      <CardDescription>Kéo thả để sắp xếp. Click ảnh để phóng to.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 flex-1 flex flex-col min-h-0">
                      {galleryImages.length > 0 ? (
                        <>
                          {/* Grid thumbnails */}
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 overflow-y-auto max-h-64">
                            {galleryImages.map((img, idx) => (
                              <div
                                key={`${img.src}-${idx}`}
                                className="relative group aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer hover:ring-2 hover:ring-primary/60 transition-all"
                                onClick={() => setLightboxImg(img)}
                              >
                                <Image
                                  src={img.src}
                                  alt={img.alt || img.title || `Ảnh ${idx + 1}`}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                                {/* Overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <ZoomIn className="size-5 text-white drop-shadow-lg" />
                                </div>
                                {/* Number badge */}
                                <div className="absolute top-1 left-1 bg-black/60 text-white text-xs rounded px-1 font-mono">
                                  {idx + 1}
                                </div>
                                {/* Hover action buttons */}
                                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setGalleryFeatured(idx); }}
                                    className="size-5 rounded bg-black/60 text-white hover:bg-primary flex items-center justify-center transition-colors"
                                    title="Đặt làm đại diện"
                                  >
                                    <Package className="size-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); removeGalleryByIdx(idx); }}
                                    className="size-5 rounded bg-black/60 text-white hover:bg-destructive flex items-center justify-center transition-colors"
                                    title="Xoá"
                                  >
                                    <X className="size-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Reorder buttons */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs text-muted-foreground flex-1">Sắp xếp thứ tự:</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => galleryImages.length > 1 && moveGalleryItem(0, 1)}
                              disabled={galleryImages.length <= 1}
                              className="gap-1 h-7 text-xs"
                            >
                              <ChevronUp className="size-3" />
                              Lên đầu
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center flex-1 py-8 text-center border-2 border-dashed rounded-xl">
                          <ImageIcon className="size-10 text-muted-foreground/30 mb-3" />
                          <p className="text-sm text-muted-foreground">Chưa có ảnh trong album</p>
                          <p className="text-xs text-muted-foreground mt-1">Click bên dưới để thêm</p>
                        </div>
                      )}

                      {/* Add buttons */}
                      <div className="flex gap-2 mt-auto pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setGalleryPickerOpen(true)}
                          className="gap-1.5 flex-1"
                        >
                          <ImageIcon className="size-3.5" />
                          Thêm ảnh từ thư viện
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setGalleryPickerOpen(true)}
                          className="gap-1.5"
                          title="Tải ảnh mới lên WordPress Media Library"
                        >
                          <Upload className="size-3.5" />
                          Upload
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ═══ TAB: MÔ TẢ ═══ */}
              <TabsContent value="description" className="mt-0 space-y-4">

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Mô tả sản phẩm</CardTitle>
                    <CardDescription>Mô tả ngắn và mô tả đầy đủ. Hỗ trợ HTML.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Short description */}
                    <div className="space-y-2">
                      <Label htmlFor="p-short-desc">Mô tả ngắn</Label>
                      <HtmlEditor
                        value={form.short_description ?? ""}
                        onChange={(v) => setField("short_description", v)}
                        placeholder="Mô tả ngắn gọn về sản phẩm..."
                        minHeight={80}
                      />
                      <p className="text-xs text-muted-foreground">
                        Hiển thị bên dưới giá sản phẩm trong danh sách.
                      </p>
                    </div>

                    {/* Full description */}
                    <div className="space-y-2">
                      <Label htmlFor="p-full-desc">Mô tả đầy đủ</Label>
                      <HtmlEditor
                        value={form.description ?? ""}
                        onChange={(v) => setField("description", v)}
                        placeholder="Mô tả chi tiết sản phẩm..."
                        minHeight={300}
                      />
                      <p className="text-xs text-muted-foreground">
                        Hỗ trợ HTML đầy đủ. Sử dụng thanh công cụ để định dạng hoặc chuyển sang chế độ HTML.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ═══ TAB: NÂNG CAO ═══ */}
              <TabsContent value="advanced" className="mt-0 space-y-4">

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Nâng cao</CardTitle>
                    <CardDescription>Các tùy chỉnh bổ sung và metadata</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="p-menu-order">Thứ tự menu</Label>
                        <Input
                          id="p-menu-order"
                          type="number"
                          placeholder="0"
                          value={form.menu_order ?? ""}
                          onChange={(e) => setField("menu_order", e.target.value)}
                          className="h-10"
                        />
                        <p className="text-xs text-muted-foreground">Dùng để sắp xếp thứ tự trong menu.</p>
                      </div>
                      <div />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="p-purchase-note">Ghi chú mua hàng</Label>
                      <Textarea
                        id="p-purchase-note"
                        placeholder="Ghi chú hiển thị sau khi khách đặt hàng..."
                        value={form.purchase_note ?? ""}
                        onChange={(e) => setField("purchase_note", e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    </div>

                    {/* Metadata */}
                    <div className="border-t pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">Metadata tùy chỉnh</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setField("meta_data", [...form.meta_data, { key: "", value: "" }])}
                          className="gap-1"
                        >
                          <Plus className="size-3.5" /> Thêm trường
                        </Button>
                      </div>
                      {form.meta_data.map((meta, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <Input
                            placeholder="Key"
                            value={meta.key}
                            onChange={(e) => {
                              const u = [...form.meta_data];
                              u[idx] = { ...u[idx], key: e.target.value };
                              setField("meta_data", u);
                            }}
                            className="flex-1 h-9"
                          />
                          <Input
                            placeholder="Value"
                            value={meta.value}
                            onChange={(e) => {
                              const u = [...form.meta_data];
                              u[idx] = { ...u[idx], value: e.target.value };
                              setField("meta_data", u);
                            }}
                            className="flex-1 h-9"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="shrink-0 text-destructive h-9 w-9"
                            onClick={() => setField("meta_data", form.meta_data.filter((_, i) => i !== idx))}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ))}
                      {form.meta_data.length === 0 && (
                        <p className="text-sm text-muted-foreground py-2">
                          Chưa có metadata. Click &quot;Thêm trường&quot; để tạo.
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

      {/* ── RIGHT: Sidebar ─────────────────────────── */}
      <div className="space-y-4 shrink-0 w-[340px]">
        {/* Publish box */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="size-4 text-green-600" />
              Xuất bản
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Trạng thái</Label>
              <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="publish">Hoạt động (publish)</SelectItem>
                  <SelectItem value="draft">Bản nháp (draft)</SelectItem>
                  <SelectItem value="pending">Chờ duyệt (pending)</SelectItem>
                  <SelectItem value="private">Riêng tư (private)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Hiển thị</Label>
              <Select value={form.catalog_visibility} onValueChange={(v) => setField("catalog_visibility", v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visible">Hiển thị everywhere</SelectItem>
                  <SelectItem value="catalog">Chỉ danh mục</SelectItem>
                  <SelectItem value="search">Chỉ tìm kiếm</SelectItem>
                  <SelectItem value="hidden">Ẩn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="sb-featured"
                checked={form.featured}
                onCheckedChange={(v) => setField("featured", v)}
              />
              <Label htmlFor="sb-featured" className="text-sm cursor-pointer">Sản phẩm nổi bật</Label>
            </div>
            <div className="border-t pt-3 space-y-1">
              <p className="text-xs text-muted-foreground">
                ID: <span className="font-mono">{wooProduct.id}</span>
              </p>
              {wooProduct.date_created && (
                <p className="text-xs text-muted-foreground">
                  Ngày tạo: {new Date(wooProduct.date_created).toLocaleDateString("vi-VN")}
                </p>
              )}
              {wooProduct.date_modified && (
                <p className="text-xs text-muted-foreground">
                  Cập nhật: {new Date(wooProduct.date_modified).toLocaleDateString("vi-VN")}
                </p>
              )}
            </div>
            <div className="border-t pt-3 space-y-2">
              <Button
                className="w-full gap-1.5"
                onClick={handleSave}
                disabled={isSaving || !(form.name ?? "").trim()}
              >
                {isSaving ? (
                  <><Loader2 className="size-4 animate-spin" /> Đang lưu...</>
                ) : (
                  <>
                    <Save className="size-4" />
                    Lưu thay đổi
                    {isDirty && (
                      <span className="relative flex size-2 ml-1">
                        <span className="absolute inline-flex size-full rounded-full bg-yellow-400 opacity-75 animate-ping" />
                        <span className="relative inline-flex size-2 rounded-full bg-yellow-500" />
                      </span>
                    )}
                  </>
                )}
              </Button>
              <Button variant="outline" className="w-full gap-1.5" onClick={() => window.history.back()}>
                Hủy
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Product preview */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Xem trước</h3>
            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              {featuredImage ? (
                <Image
                  src={featuredImage.src}
                  alt={form.name}
                  fill
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageIcon className="size-10 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <h3 className="font-semibold text-sm line-clamp-2 leading-snug">
              {form.name || "Tên sản phẩm"}
            </h3>
            {form.regular_price && (
              <p className="text-base font-bold text-primary leading-tight">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(regularPrice)}
              </p>
            )}
            <div className="flex flex-wrap gap-1">
              <Badge
                variant={form.stock_status === "instock" ? "default" : form.stock_status === "outofstock" ? "secondary" : "outline"}
                className="text-xs"
              >
                {form.stock_status === "instock" ? "Còn hàng"
                  : form.stock_status === "outofstock" ? "Hết hàng"
                  : "Chờ hàng"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {form.status === "publish" ? "Hoạt động"
                  : form.status === "draft" ? "Bản nháp"
                  : form.status === "pending" ? "Chờ duyệt"
                  : "Riêng tư"}
              </Badge>
            </div>
            {form.category_ids.length > 0 && (
              <p className="text-xs text-muted-foreground truncate">
                {categoryNames.join(", ")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick stock */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tồn kho nhanh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Select value={form.stock_status} onValueChange={(v) => setField("stock_status", v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instock">Còn hàng</SelectItem>
                <SelectItem value="outofstock">Hết hàng</SelectItem>
                <SelectItem value="onbackorder">Chờ hàng</SelectItem>
              </SelectContent>
            </Select>
            {form.manage_stock && (
              <Input
                type="number"
                min="0"
                placeholder="SL tồn..."
                value={form.stock_quantity ?? ""}
                onChange={(e) => setField("stock_quantity", e.target.value)}
                className="h-8 text-xs"
              />
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        {wooProduct.permalink && (
          <Card>
            <CardContent className="p-3">
              <Button variant="outline" size="sm" className="w-full gap-1.5" asChild>
                <a href={wooProduct.permalink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  Xem trên web
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Media Pickers ── */}
      <MediaPicker
        open={featuredPickerOpen}
        onOpenChange={setFeaturedPickerOpen}
        mode="single"
        selected={featuredImage ? [{ id: featuredImage.id || 0, source_url: featuredImage.src, title: featuredImage.title || "", alt: featuredImage.alt || "" }] : []}
        onConfirm={(items) => { if (items.length > 0) setFeaturedFromMedia(items[0]); }}
      />
      <MediaPicker
        open={galleryPickerOpen}
        onOpenChange={setGalleryPickerOpen}
        mode="multiple"
        selected={galleryImages.map((g) => ({ id: g.id || 0, source_url: g.src, title: g.title || "", alt: g.alt || "" }))}
        onConfirm={(items) => { addGalleryFromMedia(items); }}
      />

      {/* ── Lightbox ── */}
      <LightboxDialog img={lightboxImg} onClose={() => setLightboxImg(null)} onSetFeatured={() => {
        if (!lightboxImg) return;
        const idx = galleryImages.findIndex((g) => g.src === lightboxImg.src);
        if (idx >= 0) setGalleryFeatured(idx);
        else setFeaturedFromMedia({ id: lightboxImg.id || 0, source_url: lightboxImg.src, title: lightboxImg.title || "", alt: lightboxImg.alt || "" });
        setLightboxImg(null);
      }} onRemove={() => {
        if (!lightboxImg) return;
        const idx = galleryImages.findIndex((g) => g.src === lightboxImg.src);
        if (idx >= 0) removeGalleryByIdx(idx);
        else setField("image_ids", form.image_ids.filter((img) => img.src !== lightboxImg.src));
        setLightboxImg(null);
      }} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

interface CatCheckItemProps {
  node: CatNode;
  selected: Set<number>;
  onToggle: (id: number) => void;
}

function CatCheckItem({ node, selected, onToggle }: CatCheckItemProps) {
  return (
    <div>
      <label className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/60 cursor-pointer">
        <input
          type="checkbox"
          checked={selected.has(node.id)}
          onChange={() => onToggle(node.id)}
          className="rounded"
        />
        <span className={`text-sm ${node.parent === 0 ? "font-medium" : ""}`}>
          {node.parent !== 0 ? `\u00A0\u00A0\u251C ` : ""}{node.name}
        </span>
      </label>
      {node.children.map((child) => (
        <CatCheckItem key={child.id} node={child} selected={selected} onToggle={onToggle} />
      ))}
    </div>
  );
}

interface LightboxDialogProps {
  img: WooImg | null;
  onClose: () => void;
  onSetFeatured: () => void;
  onRemove: () => void;
}

function LightboxDialog({ img, onClose, onSetFeatured, onRemove }: LightboxDialogProps) {
  if (!img) return null;
  return (
      <Dialog open={!!img} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden"
        aria-describedby="lightbox-desc"
      >
        <span id="lightbox-desc" className="sr-only">Xem ảnh sản phẩm</span>
        <DialogHeader className="px-6 pt-4 pb-2 border-b shrink-0 flex-row items-center justify-between space-y-0">
          <div>
            <DialogTitle className="text-base">
              {img.title || img.alt || "Xem ảnh"}
            </DialogTitle>
            {img.id && (
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Media ID: {img.id}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={onSetFeatured} className="gap-1.5 text-xs h-8">
              <Package className="size-3.5" />
              Đặt làm đại diện
            </Button>
            <Button variant="outline" size="sm" onClick={onRemove} className="gap-1.5 text-xs h-8 text-destructive hover:text-destructive">
              <X className="size-3.5" />
              Xoá
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="size-8">
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-black/95 p-4">
          <Image
            src={img.src}
            alt={img.alt || img.title || "Image"}
            width={800}
            height={600}
            className="max-w-full max-h-[70vh] object-contain rounded-lg"
            unoptimized
          />
        </div>
        <div className="px-6 py-3 border-t shrink-0">
          <p className="text-xs text-muted-foreground truncate">{img.src}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface HtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

function HtmlEditor({ value, onChange, placeholder, minHeight = 120 }: HtmlEditorProps) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [showPreview, setShowPreview] = useState(false);
  const [htmlDraft, setHtmlDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const initHtml = useCallback((v: string) => {
    if (!htmlDraft && v) setHtmlDraft(v);
  }, [htmlDraft]);

  const pushUndo = useCallback((v: string) => {
    setUndoStack((prev) => [...prev.slice(-20), v]);
    setRedoStack([]);
  }, []);

  const apply = useCallback(
    (result: { newValue: string; cursorStart: number; cursorEnd: number } | undefined) => {
      if (!result) return;
      pushUndo(value);
      onChange(result.newValue);
      setHtmlDraft(result.newValue);
      setTimeout(() => {
        const ta = textareaRef.current;
        if (ta) { ta.focus(); ta.setSelectionRange(result.cursorStart, result.cursorEnd); }
      }, 0);
    },
    [value, onChange, pushUndo]
  );

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, value]);
    setUndoStack((u) => u.slice(0, -1));
    onChange(prev);
    setHtmlDraft(prev);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, value]);
    setRedoStack((r) => r.slice(0, -1));
    onChange(next);
    setHtmlDraft(next);
  };

  const handleHtmlModeSwitch = () => {
    setHtmlDraft(value);
    setMode("html");
  };

  const handleVisualModeSwitch = () => {
    setMode("visual");
  };

  const emptyMsg = placeholder ? `Chưa có nội dung. Chuyển sang chế độ HTML để nhập.` : "";

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-muted/50 border-b flex-wrap">
        {/* Mode toggle */}
        <div className="flex rounded-md border overflow-hidden mr-3 text-xs">
          <button
            type="button"
            onClick={handleVisualModeSwitch}
            className={`px-3 py-1.5 ${mode === "visual" ? "bg-background font-medium shadow-sm" : "hover:bg-muted text-muted-foreground"}`}
          >
            Soạn
          </button>
          <button
            type="button"
            onClick={handleHtmlModeSwitch}
            className={`px-3 py-1.5 ${mode === "html" ? "bg-background font-medium shadow-sm" : "hover:bg-muted text-muted-foreground"}`}
          >
            HTML
          </button>
        </div>

        {/* HTML toolbar — always visible when in HTML mode */}
        {mode === "html" && (
          <>
            <ToolbarBtn title="Bold" onClick={() => apply(applyHtmlTag(textareaRef, "strong", true))}>
              <Bold className="size-3.5" />
            </ToolbarBtn>
            <ToolbarBtn title="Italic" onClick={() => apply(applyHtmlTag(textareaRef, "em", true))}>
              <Italic className="size-3.5" />
            </ToolbarBtn>
            <ToolbarBtn title="Heading 2" onClick={() => apply(applyHtmlTag(textareaRef, "h2", false))}>
              <Heading2 className="size-3.5" />
            </ToolbarBtn>
            <ToolbarBtn title="Paragraph" onClick={() => apply(applyHtmlTag(textareaRef, "p", false))}>
              <span className="text-xs font-medium">P</span>
            </ToolbarBtn>
            <ToolbarBtn title="Bullet list" onClick={() => apply(applyHtmlTag(textareaRef, "ul", false))}>
              <List className="size-3.5" />
            </ToolbarBtn>
            <ToolbarBtn title="Numbered list" onClick={() => apply(applyHtmlTag(textareaRef, "ol", false))}>
              <ListOrdered className="size-3.5" />
            </ToolbarBtn>
            <div className="w-px h-4 bg-border mx-0.5" />
            <ToolbarBtn title="Link" onClick={() => {
              const result = wrapSelection(textareaRef, '<a href="', '">link text</a>');
              apply(result);
            }}>
              <Link2 className="size-3.5" />
            </ToolbarBtn>
            <div className="w-px h-4 bg-border mx-0.5" />
            <ToolbarBtn title="Undo" onClick={handleUndo} disabled={undoStack.length === 0}>
              <Undo className="size-3.5" />
            </ToolbarBtn>
            <ToolbarBtn title="Redo" onClick={handleRedo} disabled={redoStack.length === 0}>
              <Redo className="size-3.5" />
            </ToolbarBtn>
          </>
        )}

        {/* Visual mode: preview button */}
        {mode === "visual" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs gap-1 ml-auto"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="size-3.5" />
            Xem trước
          </Button>
        )}
      </div>

      {/* ── Editor area ── */}
      {mode === "html" ? (
        <Textarea
          ref={textareaRef}
          value={htmlDraft}
          onChange={(e) => {
            pushUndo(value);
            setHtmlDraft(e.target.value);
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          className="resize-none border-0 rounded-none font-mono text-sm leading-relaxed"
          style={{ minHeight }}
        />
      ) : (
        /* Visual mode: rendered HTML preview */
        <div
          className="overflow-auto p-5"
          style={{ minHeight }}
        >
          {value ? (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: value }}
            />
          ) : (
            <p className="text-muted-foreground italic text-sm">{emptyMsg || placeholder || "Chưa có nội dung"}</p>
          )}
        </div>
      )}

      {/* ── Preview Dialog ── */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent
          className="max-w-2xl max-h-[85vh] flex flex-col"
          aria-describedby="preview-desc"
        >
          <span id="preview-desc" className="sr-only">Xem trước mô tả sản phẩm</span>
          <DialogHeader className="shrink-0">
            <DialogTitle>Xem trước mô tả</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-2 bg-muted/20 rounded-lg border">
            {value ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: value }}
              />
            ) : (
              <p className="text-muted-foreground italic text-sm">{emptyMsg || "Chưa có nội dung"}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowPreview(false)}>Đóng</Button>
            <Button size="sm" onClick={() => { setShowPreview(false); handleHtmlModeSwitch(); }}>
              Chỉnh sửa HTML
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToolbarBtn({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
