"use client";

import { useState } from "react";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Plus, Star, ImageIcon, Upload } from "lucide-react";
import type { ProductEditFormData } from "./product-edit-form";

interface ProductImagesTabProps {
  form: ProductEditFormData;
  onChange: (form: ProductEditFormData) => void;
}

export function ProductImagesTab({ form, onChange }: ProductImagesTabProps) {
  const [newImageUrl, setNewImageUrl] = useState("");

  const setField = <K extends keyof ProductEditFormData>(
    key: K,
    value: ProductEditFormData[K]
  ) => {
    onChange({ ...form, [key]: value });
  };

  // Extract relative path from URL
  const extractRelativePath = (url: string | undefined | null): string => {
    if (!url) return "";
    const trimmed = url.trim();
    if (!trimmed || trimmed.length < 5) return "";
    if (trimmed.startsWith("/")) return trimmed;
    const match = trimmed.match(/\/wp-content\/uploads\/[^\s?#]+/);
    if (match) return match[0];
    try {
      return new URL(trimmed).pathname;
    } catch {
      return trimmed;
    }
  };

  const thumbnailDisplay = extractRelativePath(form.thumbnail);
  const galleryDisplayUrls = form.gallery_urls.map((url) => extractRelativePath(url));

  const setThumbnail = (url: string) => {
    setField("thumbnail", url);
  };

  const addGalleryImage = () => {
    const url = newImageUrl.trim();
    if (url && !form.gallery_urls.includes(url)) {
      setField("gallery_urls", [...form.gallery_urls, url]);
      setNewImageUrl("");
    }
  };

  const removeGalleryImage = (url: string) => {
    setField(
      "gallery_urls",
      form.gallery_urls.filter((u) => u !== url)
    );
  };

  const setAsThumbnail = (url: string) => {
    setField("thumbnail", url);
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* Thumbnail Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Ảnh đại diện</Label>
          {form.thumbnail && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setThumbnail("")}
            >
              <X className="size-3.5 mr-1" />
              Xóa
            </Button>
          )}
        </div>

        {/* Thumbnail Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative aspect-square rounded-xl border-2 border-dashed bg-muted/50 overflow-hidden group">
            {thumbnailDisplay ? (
              <>
                <Image
                  src={thumbnailDisplay}
                  alt="Thumbnail"
                  fill
                  className="object-contain"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="text-white text-sm font-medium">Preview</span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <ImageIcon className="size-12 mb-2" />
                <span className="text-sm">Chưa có ảnh đại diện</span>
              </div>
            )}
          </div>

          {/* Thumbnail URL Input */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="thumbnail_url" className="text-sm">
                URL ảnh đại diện
              </Label>
              <Input
                id="thumbnail_url"
                placeholder="https://... hoặc /wp-content/..."
                value={form.thumbnail || ""}
                onChange={(e) => setThumbnail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Nhập URL đầy đủ hoặc đường dẫn tương đối.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">
            Gallery ({form.gallery_urls.length} ảnh)
          </Label>
        </div>

        {/* Gallery Grid */}
        {form.gallery_urls.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {form.gallery_urls.map((url, idx) => (
              <div
                key={idx}
                className="relative group rounded-lg border bg-muted overflow-hidden aspect-square"
              >
                <Image
                  src={galleryDisplayUrls[idx]}
                  alt={`Gallery ${idx + 1}`}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  unoptimized
                />
                {/* Thumbnail indicator */}
                {form.thumbnail === url && (
                  <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full p-1">
                    <Star className="size-2.5" />
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="size-7 p-0"
                    onClick={() => setAsThumbnail(url)}
                    title="Đặt làm ảnh đại diện"
                  >
                    <Star className="size-3" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="size-7 p-0"
                    onClick={() => removeGalleryImage(url)}
                    title="Xoá ảnh"
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Image Form */}
        <div className="flex gap-2">
          <Input
            placeholder="URL ảnh gallery..."
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addGalleryImage();
              }
            }}
            className="flex-1 min-w-0"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addGalleryImage}
            className="gap-1.5 shrink-0"
          >
            <Plus className="size-3.5" />
            Thêm
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Nhấn Enter hoặc click Thêm để đưa vào gallery.
        </p>
      </div>

      {/* Upload Notice */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Upload className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Tính năng upload ảnh</p>
            <p className="text-xs text-muted-foreground">
              Upload ảnh trực tiếp sẽ được bổ sung trong phiên bản tiếp theo. Hiện tại chỉ hỗ trợ nhập URL ảnh.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
