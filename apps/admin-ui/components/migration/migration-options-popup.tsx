"use client";

import { useState } from "react";
import {
  Settings,
  Save,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { MigrationDataType, ConflictStrategy } from "@/types";
import type { MediaMigrationOptions } from "@/types/media-mapping";

const DATA_TYPE_OPTIONS: Array<{ id: MigrationDataType; label: string; description: string }> = [
  { id: "categories", label: "Danh mục sản phẩm", description: "Chuyển toàn bộ danh mục" },
  { id: "products", label: "Sản phẩm", description: "Chuyển thông tin sản phẩm, hình ảnh, biến thể, tồn kho, tags" },
];

interface MigrationOptionsPopupProps {
  selectedTypes: MigrationDataType[];
  conflictStrategy: ConflictStrategy;
  batchSize: number;
  skipOnError: boolean;
  preserveImages: boolean;
  mediaOptions: MediaMigrationOptions;
  onTypeToggle: (type: MigrationDataType) => void;
  onConflictChange: (strategy: ConflictStrategy) => void;
  onBatchSizeChange: (v: number) => void;
  onSkipOnErrorChange: (v: boolean) => void;
  onPreserveImagesChange: (v: boolean) => void;
  onMediaOptionsChange: (opts: MediaMigrationOptions) => void;
  onClearAll?: () => void;
  isRunning?: boolean;
}

export function MigrationOptionsPopup({
  selectedTypes,
  conflictStrategy,
  batchSize,
  skipOnError,
  preserveImages,
  mediaOptions,
  onTypeToggle,
  onConflictChange,
  onBatchSizeChange,
  onSkipOnErrorChange,
  onPreserveImagesChange,
  onMediaOptionsChange,
  isRunning,
}: MigrationOptionsPopupProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = () => {
    setIsOpen(false);
  };

  const selectedCount = selectedTypes.length;

  return (
    <>
      {/* Icon button in top-right corner */}
      <div className="flex items-center justify-end mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="gap-2"
          disabled={isRunning}
        >
          <Settings className="size-4" />
          <span>Tuỳ chọn</span>
          {selectedCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {selectedCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Popup Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <Settings className="size-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Tuỳ chọn Migration</DialogTitle>
                <DialogDescription>
                  Cấu hình chi tiết các tuỳ chọn đồng bộ dữ liệu
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Loại dữ liệu cần migrate */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Loại dữ liệu cần migrate</h3>
                <Badge variant="outline" className="text-xs">
                  {selectedCount} đã chọn
                </Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {DATA_TYPE_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className={cn(
                      "flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition-all hover:bg-accent",
                      selectedTypes.includes(option.id)
                        ? "border-primary bg-primary/5"
                        : "border-muted"
                    )}
                  >
                    <Checkbox
                      checked={selectedTypes.includes(option.id)}
                      onCheckedChange={() => onTypeToggle(option.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            {/* Tuỳ chọn nâng cao */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Tuỳ chọn nâng cao</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Số sản phẩm mỗi lô</p>
                    <p className="text-xs text-muted-foreground">Batch size (10-500)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="size-8 rounded border hover:bg-accent disabled:opacity-50"
                      onClick={() => onBatchSizeChange(Math.max(10, batchSize - 10))}
                      disabled={batchSize <= 10}
                    >
                      -
                    </button>
                    <span className="w-16 text-center font-mono text-sm">{batchSize}</span>
                    <button
                      className="size-8 rounded border hover:bg-accent"
                      onClick={() => onBatchSizeChange(Math.min(500, batchSize + 10))}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Tiếp tục khi gặp lỗi</p>
                    <p className="text-xs text-muted-foreground">Bỏ qua sản phẩm lỗi</p>
                  </div>
                  <Checkbox
                    checked={skipOnError}
                    onCheckedChange={(v) => onSkipOnErrorChange(!!v)}
                  />
                </div>

                {/* 2 checkbox độc lập - "Tải ảnh về Medusa" ưu tiên default */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg border border-primary/50 bg-primary/5 p-3">
                    <div>
                      <p className="text-sm font-medium">Tải ảnh về Medusa</p>
                      <p className="text-xs text-muted-foreground">Tải ảnh từ WooCommerce về server Medusa</p>
                    </div>
                    <Checkbox
                      checked={!preserveImages}
                      onCheckedChange={(v) => {
                        const newVal = !!v;
                        onPreserveImagesChange(!newVal);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">Giữ nguyên URL ảnh</p>
                      <p className="text-xs text-muted-foreground">Dùng URL gốc từ WooCommerce</p>
                    </div>
                    <Checkbox
                      checked={preserveImages}
                      onCheckedChange={(v) => {
                        const newVal = !!v;
                        onPreserveImagesChange(newVal);
                      }}
                    />
                  </div>
                </div>

                {/* Sub-options for download - chỉ hiện khi "Tải ảnh về Medusa" được chọn */}
                {!preserveImages && (
                  <div className="ml-6 space-y-2 rounded-lg border p-3 bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Tuỳ chọn tải ảnh:</p>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="inline-media"
                        checked={mediaOptions.inlineProductMedia ?? true}
                        onCheckedChange={(v) => onMediaOptionsChange({ ...mediaOptions, inlineProductMedia: !!v })}
                      />
                      <label htmlFor="inline-media" className="text-xs cursor-pointer font-medium">
                        Tải ảnh đồng bộ (từng sản phẩm + ảnh xong rồi mới qua sản phẩm kế tiếp)
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="download-thumbnails"
                        checked={mediaOptions.downloadThumbnails}
                        onCheckedChange={(v) => onMediaOptionsChange({ ...mediaOptions, downloadThumbnails: !!v })}
                      />
                      <label htmlFor="download-thumbnails" className="text-xs cursor-pointer">Tải ảnh chính (thumbnail)</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="download-gallery"
                        checked={mediaOptions.downloadGallery}
                        onCheckedChange={(v) => onMediaOptionsChange({ ...mediaOptions, downloadGallery: !!v })}
                      />
                      <label htmlFor="download-gallery" className="text-xs cursor-pointer">Tải ảnh gallery</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="download-category"
                        checked={mediaOptions.downloadCategoryImages}
                        onCheckedChange={(v) => onMediaOptionsChange({ ...mediaOptions, downloadCategoryImages: !!v })}
                      />
                      <label htmlFor="download-category" className="text-xs cursor-pointer">Tải ảnh danh mục</label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Đóng
            </Button>
            <Button onClick={handleSave}>
              <Save className="mr-2 size-4" />
              Lưu tuỳ chọn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
