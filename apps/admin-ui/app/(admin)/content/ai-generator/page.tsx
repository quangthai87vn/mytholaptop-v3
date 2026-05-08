"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Sparkles,
  Copy,
  Save,
  Send,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { AIProduct } from "@/types/content";

// Map Medusa product to AIProduct
function mapMedusaProduct(p: any): AIProduct {
  const variants = p.variants || [];
  const firstVariant = variants[0] || {};
  const price = firstVariant.prices?.[0]?.amount
    ? parseFloat(firstVariant.prices[0].amount) / 100
    : 0;
  const thumbnail = p.thumbnail || firstVariant.images?.[0] || null;
  const tags = (p.tags || []).map((t: any) => t.value || t).slice(0, 5);
  const category = p.category?.name || "";

  return {
    id: p.id,
    name: p.title || "San pham",
    sku: firstVariant.sku || p.id?.slice(-8) || "",
    description: p.description || "",
    price,
    image: thumbnail,
    brand: p.brand || "",
    category,
    tags,
  };
}

const CONTENT_TYPES = [
  { value: "facebook", label: "Bai viet Facebook", db: "facebook" },
  { value: "website", label: "Bai viet SEO Website", db: "website" },
  { value: "video", label: "Kich ban Video", db: "video" },
  { value: "image", label: "Prompt Hinh anh", db: "image" },
];

const TONES = [
  { value: "professional", label: "Chuyen nghiep" },
  { value: "friendly", label: "Gan gui" },
  { value: "gen_z", label: "Gen Z" },
  { value: "technical", label: "Ky thuat" },
  { value: "premium", label: "Cao cap" },
];

const AUDIENCES = [
  { value: "student", label: "Sinh vien" },
  { value: "office", label: "Van phong" },
  { value: "gaming", label: "Gaming" },
  { value: "business", label: "Doanh nghiep" },
  { value: "design", label: "Thiet ke do hoa" },
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(price);
}

export default function AIGeneratorPage() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<AIProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<AIProduct | null>(null);
  const [contentType, setContentType] = useState("facebook");
  const [tone, setTone] = useState("professional");
  const [audience, setAudience] = useState("office");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generationStats, setGenerationStats] = useState<{
    model?: string;
    tokens?: number;
    latency_ms?: number;
    contentItemId?: number;
  } | null>(null);

  const fetchProducts = useCallback(async (q = "") => {
    setProductsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (q) params.set("q", q);
      const res = await fetch(`/api/medusa/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.products || []).map(mapMedusaProduct);
        setProducts(mapped);
      } else {
        // Medusa not configured - show empty state
        setProducts([]);
      }
    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(search);
  }, [search, fetchProducts]);

  const filteredProducts = products;

  const handleGenerate = async () => {
    if (!selectedProduct) {
      toast.error("Vui long chon san pham");
      return;
    }

    setIsGenerating(true);
    setGeneratedContent("");
    setGeneratedTitle("");
    setGenerationStats(null);

    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          productDescription: selectedProduct.description,
          productThumbnail: selectedProduct.image,
          productPrice: selectedProduct.price,
          productTags: selectedProduct.tags,
          productCategory: selectedProduct.category,
          contentType,
          tone,
          audience,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Loi khi tao noi dung");
        setGeneratedContent("");
        return;
      }

      const result = data.data;
      setGeneratedTitle(
        `${selectedProduct.name} - ${CONTENT_TYPES.find(c => c.value === contentType)?.label || ""}`
      );
      setGeneratedContent(result.content || "");
      setGenerationStats({
        model: result.model,
        tokens: result.tokens_used,
        latency_ms: result.latency_ms,
        contentItemId: result.contentItemId,
      });
      toast.success("Da tao noi dung thanh cong!");
    } catch (err) {
      toast.error("Loi khi goi API tao noi dung");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!generatedContent) {
      toast.error("Chua co noi dung de luu");
      return;
    }
    toast.success("Da luu ban nhap!");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success("Da copy noi dung!");
  };

  const handleExport = () => {
    const blob = new Blob([generatedContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generatedTitle || "content"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Da export file!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Tao bai viet AI</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tao noi dung marketing tu san pham voi AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product Selection */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Chon san pham</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Tim san pham..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {productsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Khong co san pham nao
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedProduct?.id === product.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="relative size-12 rounded overflow-hidden bg-muted shrink-0">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="size-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                              SP
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.sku}</p>
                          <p className="text-xs font-semibold text-primary mt-1">
                            {formatPrice(product.price)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Product Info */}
          {selectedProduct && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Thong tin san pham</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative size-20 rounded overflow-hidden bg-muted mx-auto">
                  {selectedProduct.image ? (
                    <Image
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center text-muted-foreground text-xs">
                      Khong co anh
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="font-semibold">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">SKU: {selectedProduct.sku}</p>
                  <p className="text-lg font-bold text-primary mt-1">
                    {formatPrice(selectedProduct.price)}
                  </p>
                </div>
                <div className="space-y-1 text-xs">
                  {selectedProduct.category && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Danh muc:</span>
                      <span>{selectedProduct.category}</span>
                    </div>
                  )}
                  {selectedProduct.brand && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Thuong hieu:</span>
                      <span>{selectedProduct.brand}</span>
                    </div>
                  )}
                  {selectedProduct.tags.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 mt-2">
                      {selectedProduct.tags.slice(0, 4).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Generator Options & Output */}
        <div className="lg:col-span-2 space-y-4">
          {/* Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cau hinh noi dung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Loai noi dung</label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map((ct) => (
                        <SelectItem key={ct.value} value={ct.value}>
                          {ct.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Giong van</label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Doi tuong</label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCES.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleGenerate}
                  disabled={!selectedProduct || isGenerating}
                  className="flex-1 gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Dang tao...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Tao noi dung
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Output */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Noi dung tao duoc</CardTitle>
                {generatedContent && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
                      <Copy className="size-3" />Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
                      <Send className="size-3" />Export
                    </Button>
                    <Button size="sm" onClick={handleSaveDraft} className="gap-1">
                      <Save className="size-3" />Luu nhap
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="relative">
                    <Sparkles className="size-12 text-muted-foreground/30" />
                    <Sparkles className="size-4 text-primary animate-pulse absolute -top-1 -right-1" />
                    <Sparkles className="size-3 text-primary animate-pulse absolute -bottom-1 -left-1" />
                  </div>
                  <div>
                    <p className="font-medium">AI dang tao noi dung...</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vui long cho trong giay lat
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 200}ms` }}
                      />
                    ))}
                  </div>
                </div>
              ) : generatedContent ? (
                <div className="space-y-4">
                  <Input
                    value={generatedTitle}
                    onChange={(e) => setGeneratedTitle(e.target.value)}
                    placeholder="Tieu de bai viet..."
                    className="font-semibold"
                  />
                  <Textarea
                    value={generatedContent}
                    onChange={(e) => setGeneratedContent(e.target.value)}
                    className="min-h-[300px] font-mono text-sm whitespace-pre-wrap"
                  />
                  {generationStats && (
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {generationStats.model && (
                        <span>Model: {generationStats.model}</span>
                      )}
                      {generationStats.tokens && (
                        <span>Tokens: {generationStats.tokens}</span>
                      )}
                      {generationStats.latency_ms && (
                        <span>Thoi gian: {generationStats.latency_ms}ms</span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Sparkles className="size-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">
                    Chon san pham va bam &quot;Tao noi dung&quot; de bat dau
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
