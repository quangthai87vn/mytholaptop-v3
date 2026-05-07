"use client";

import { AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  const seoUrl = `/products/${form.handle || "san-pham"}`;

  const titleLength = seoTitle.length;
  const descLength = seoDesc.length;
  const titleStatus = titleLength <= 60 ? "good" : titleLength <= 70 ? "warning" : "bad";
  const descStatus = descLength <= 160 ? "good" : descLength <= 180 ? "warning" : "bad";

  return (
    <div className="space-y-6 min-w-0">
      {/* Google Search Preview */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Xem trước Google</Label>
        <div className="rounded-lg border bg-white p-4 space-y-1">
          {/* URL */}
          <div className="flex items-center gap-1 text-sm">
            <span className="text-green-700 truncate max-w-[200px]">mytholaptop.vn</span>
            <span className="text-gray-500">›</span>
            <span className="text-green-700 truncate">products</span>
            <span className="text-gray-500">›</span>
            <span className="text-gray-500 truncate max-w-[200px]">{seoUrl}</span>
          </div>
          {/* Title */}
          <h3 className="text-xl text-blue-700 hover:underline cursor-pointer line-clamp-2 break-words">
            {seoTitle || "Tiêu đề sản phẩm"}
          </h3>
          {/* Description */}
          <p className="text-sm text-gray-700 line-clamp-2 break-words">
            {seoDesc || "Mô tả sản phẩm sẽ hiển thị ở đây..."}
          </p>
        </div>
      </div>

      <Separator />

      {/* SEO Fields */}
      <div className="grid gap-6">
        {/* SEO Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="seo_title">SEO Title</Label>
            <span className={`text-xs font-medium ${
              titleStatus === "good" ? "text-green-600" :
              titleStatus === "warning" ? "text-yellow-600" : "text-red-600"
            }`}>
              {titleLength} / 60
            </span>
          </div>
          <Input
            id="seo_title"
            placeholder="SEO title cho công cụ tìm kiếm..."
            value={form.seo_title || ""}
            onChange={(e) => setField("seo_title", e.target.value)}
            className={titleStatus === "bad" ? "border-red-500" : titleStatus === "warning" ? "border-yellow-500" : ""}
          />
          {titleStatus === "bad" && (
            <p className="text-xs text-red-600">
              Tiêu đề quá dài ({titleLength}/60 ký tự). Google có thể cắt ngắn.
            </p>
          )}
        </div>

        {/* SEO Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="seo_description">SEO Description</Label>
            <span className={`text-xs font-medium ${
              descStatus === "good" ? "text-green-600" :
              descStatus === "warning" ? "text-yellow-600" : "text-red-600"
            }`}>
              {descLength} / 160
            </span>
          </div>
          <Textarea
            id="seo_description"
            placeholder="Mô tả ngắn cho SEO..."
            value={form.seo_description || ""}
            onChange={(e) => setField("seo_description", e.target.value)}
            rows={3}
            className={`resize-none ${descStatus === "bad" ? "border-red-500" : descStatus === "warning" ? "border-yellow-500" : ""}`}
          />
          {descStatus === "bad" && (
            <p className="text-xs text-red-600">
              Mô tả quá dài ({descLength}/160 ký tự). Google có thể cắt ngắn.
            </p>
          )}
        </div>

        {/* Handle/Slug */}
        <div className="space-y-2">
          <Label htmlFor="handle">Slug / URL</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">mytholaptop.vn</span>
            <Input
              id="handle"
              placeholder="slug-san-pham"
              value={form.handle}
              onChange={(e) => setField("handle", e.target.value)}
              className="flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            URL thân thiện của sản phẩm. Chỉ dùng chữ thường, số và dấu gạch ngang.
          </p>
        </div>
      </div>

      {/* Warning Alert */}
      {hasOldWpDomain && (
        <>
          <Separator />
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-800">Cảnh báo</p>
                <p className="text-sm text-amber-700">
                  Mô tả sản phẩm có thể chứa URL ảnh từ website WordPress cũ. 
                  Các link này cần được cập nhật để đảm bảo ảnh hiển thị đúng.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
