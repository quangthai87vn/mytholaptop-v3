"use client";

import { useState } from "react";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus, ImageIcon } from "lucide-react";
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
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Ảnh đại diện</Label>

        {form.thumbnail ? (
          <div className="relative w-full max-w-sm aspect-square rounded-lg border overflow-hidden bg-muted">
            <Image
              src={form.thumbnail}
              alt="Thumbnail"
              fill
              className="object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        ) : (
          <div className="w-full max-w-sm aspect-square rounded-lg border border-dashed flex flex-col items-center justify-center text-muted-foreground">
            <ImageIcon className="size-10 mb-2" />
            <p className="text-sm">Chưa có ảnh đại diện</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="thumbnail_url" className="text-xs">
            URL ảnh đại diện
          </Label>
          <Input
            id="thumbnail_url"
            placeholder="https://example.com/image.jpg"
            value={form.thumbnail || ""}
            onChange={(e) => setThumbnail(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Nhập URL của hình ảnh sản phẩm. Hỗ trợ JPG, PNG, WebP.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Gallery ảnh sản phẩm</Label>

        {form.gallery_urls.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {form.gallery_urls.map((url, idx) => (
              <div
                key={idx}
                className="relative group rounded-lg border overflow-hidden bg-muted aspect-square"
              >
                <Image
                  src={url}
                  alt={`Gallery ${idx + 1}`}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="size-7 p-0"
                    onClick={() => setAsThumbnail(url)}
                    title="Đặt làm ảnh đại diện"
                  >
                    <ImageIcon className="size-3" />
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
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addGalleryImage}
            className="gap-1"
          >
            <Plus className="size-3" />
            Thêm
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Thêm URL ảnh vào gallery. Nhấn Enter hoặc click Thêm.
        </p>
      </div>

      <div className="rounded-lg bg-muted/50 border p-4">
        <p className="text-sm text-muted-foreground">
          Tính năng upload ảnh mới sẽ được bổ sung trong phiên bản tiếp theo.
          Hiện tại chỉ hỗ trợ nhập URL ảnh.
        </p>
      </div>
    </div>
  );
}
