"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Search } from "lucide-react";
import type { ProductEditFormData } from "./product-edit-form";

interface ProductSeoTabProps {
  form: ProductEditFormData;
  onChange: (form: ProductEditFormData) => void;
}

export function ProductSeoTab({ form, onChange }: ProductSeoTabProps) {
  const setField = <K extends keyof ProductEditFormData>(
    key: K,
    value: ProductEditFormData[K]
  ) => {
    onChange({ ...form, [key]: value });
  };

  const hasOldWpDomain =
    form.description &&
    (form.description.includes("mytholaptop.vn/wp-content") ||
      form.description.includes("mytholaptop.vn/wp-admin"));

  const seoTitle = form.seo_title || form.title;
  const seoDesc = form.seo_description || form.short_description || "";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="seo_title">SEO Title</Label>
        <Input
          id="seo_title"
          placeholder="SEO title cho công cụ tìm kiếm..."
          value={form.seo_title || ""}
          onChange={(e) => setField("seo_title", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Tiêu đề hiển thị trên Google. Nên dưới 60 ký tự. Hiện tại:{" "}
          {seoTitle.length} / 60
        </p>
        {seoTitle.length > 60 && (
          <p className="text-xs text-destructive">
            Tiêu đề quá dài, nên rút ngắn.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="seo_description">SEO Description</Label>
        <Textarea
          id="seo_description"
          placeholder="Mô tả ngắn cho SEO..."
          value={form.seo_description || ""}
          onChange={(e) => setField("seo_description", e.target.value)}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Mô tả hiển thị dưới tiêu đề trên Google. Nên 150-160 ký tự. Hiện
          tại: {seoDesc.length} / 160
        </p>
        {seoDesc.length > 160 && (
          <p className="text-xs text-destructive">
            Mô tả quá dài, nên rút ngắn.
          </p>
        )}
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="handle">Slug / Handle</Label>
        <Input
          id="handle"
          placeholder="slug-san-pham"
          value={form.handle}
          onChange={(e) => setField("handle", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          URL thân thiện của sản phẩm:{" "}
          <code className="bg-muted px-1 rounded">
            /products/{form.handle || "slug-san-pham"}
          </code>
        </p>
      </div>

      {hasOldWpDomain && (
        <>
          <Separator />
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="size-4 shrink-0" />
              <p className="text-sm font-medium">Cảnh báo: Link ảnh cũ</p>
            </div>
            <p className="text-sm text-amber-700">
              Mô tả sản phẩm có thể chứa URL ảnh từ website WordPress cũ. Các
              link này cần được cập nhật để đảm bảo ảnh hiển thị đúng.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-amber-800 border-amber-300"
              disabled
            >
              <Search className="size-3" />
              Kiểm tra link ảnh (Sắp có)
            </Button>
          </div>
        </>
      )}

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="description">Mô tả HTML / Nội dung</Label>
        <Textarea
          id="description"
          placeholder="Nội dung mô tả sản phẩm (HTML)..."
          value={form.description || ""}
          onChange={(e) => setField("description", e.target.value)}
          rows={8}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Nội dung mô tả chi tiết sản phẩm. Giữ nguyên định dạng HTML nếu có.
        </p>
      </div>
    </div>
  );
}
