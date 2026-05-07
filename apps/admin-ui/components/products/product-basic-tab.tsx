"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rewriteDescriptionImages } from "@/lib/products/product-filters";
import type { ProductEditFormData } from "./product-edit-form";

interface ProductBasicTabProps {
  form: ProductEditFormData;
  onChange: (form: ProductEditFormData) => void;
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

export function ProductBasicTab({ form, onChange }: ProductBasicTabProps) {
  const [descriptionTab, setDescriptionTab] = useState<"edit" | "preview">("edit");
  const setField = <K extends keyof ProductEditFormData>(
    key: K,
    value: ProductEditFormData[K]
  ) => {
    const next = { ...form, [key]: value };
    if (key === "title" && !form._handleManuallyEdited) {
      next.handle = generateHandle(value as string);
    }
    onChange(next);
  };

  const descriptionForPreview = form.description
    ? rewriteDescriptionImages(form.description)
    : "";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">
          Tên sản phẩm <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="Nhập tên sản phẩm..."
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtitle">Phụ đề</Label>
        <Input
          id="subtitle"
          placeholder="Phụ đề sản phẩm (tuỳ chọn)..."
          value={form.subtitle || ""}
          onChange={(e) => setField("subtitle", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="handle">Slug</Label>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onChange({ ...form, handle: generateHandle(form.title), _handleManuallyEdited: true })}
            >
              Reset
            </button>
          </div>
          <Input
            id="handle"
            placeholder="slug-san-pham"
            value={form.handle}
            onChange={(e) => setField("handle", e.target.value)}
            className={!form.handle || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.handle) ? "" : "border-yellow-500"}
          />
          {!form.handle || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.handle) ? (
            <p className="text-xs text-muted-foreground">
              URL thân thiện của sản phẩm. Dùng dấu gạch ngang.
            </p>
          ) : (
            <p className="text-xs text-yellow-600">
              Slug chỉ được chứa chữ thường, số và dấu gạch ngang (-).
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Trạng thái sản phẩm</Label>
          <Select
            value={form.status}
            onValueChange={(v) => setField("status", v as ProductEditFormData["status"])}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Nháp</SelectItem>
              <SelectItem value="published">Hoạt động</SelectItem>
              <SelectItem value="proposed">Đề xuất</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="short_description">Mô tả ngắn</Label>
        <Textarea
          id="short_description"
          placeholder="Mô tả ngắn về sản phẩm (hiển thị ở danh sách sản phẩm)..."
          value={form.short_description || ""}
          onChange={(e) => setField("short_description", e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description">Mô tả chi tiết</Label>
          <Tabs value={descriptionTab} onValueChange={(v) => setDescriptionTab(v as typeof descriptionTab)} className="w-auto">
            <TabsList className="h-7 gap-0 p-0 bg-transparent">
              <TabsTrigger value="edit" className="h-7 px-3 text-xs rounded-l-md border data-[state=active]:bg-muted">Soạn</TabsTrigger>
              <TabsTrigger value="preview" className="h-7 px-3 text-xs rounded-r-md border border-l-0 data-[state=active]:bg-muted">Xem trước</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <TabsContent value="edit" className="mt-0">
          <Textarea
            id="description"
            placeholder="Mô tả chi tiết sản phẩm..."
            value={form.description || ""}
            onChange={(e) => setField("description", e.target.value)}
            rows={6}
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <div className="min-h-[144px] rounded-md border p-4 bg-muted/30">
            {descriptionForPreview ? (
              <div
                className="prose prose-sm max-w-none [&_img]:max-w-full [&_img]:h-auto"
                dangerouslySetInnerHTML={{ __html: descriptionForPreview }}
              />
            ) : (
              <p className="text-sm text-muted-foreground italic">Chưa có mô tả</p>
            )}
          </div>
        </TabsContent>

        <p className="text-xs text-muted-foreground">
          Mô tả đầy đủ về sản phẩm, tính năng, thông số kỹ thuật. Dùng tab &quot;Xem trước&quot; để xem ảnh.
        </p>
      </div>
    </div>
  );
}
