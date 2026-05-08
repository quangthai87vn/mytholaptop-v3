"use client";

import { useState } from "react";
import { CheckCircle, Trash2, RotateCcw, AlertTriangle, RefreshCw, Loader2, ImageIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  MigrationDataType,
  ConflictStrategy,
  MigrationMode,
} from "@/types";
import type { MediaMigrationOptions } from "@/types/media-mapping";

const DATA_TYPE_OPTIONS: Array<{ id: MigrationDataType; label: string; description: string }> = [
  { id: "categories", label: "Danh mục sản phẩm", description: "Chuyển toàn bộ danh mục" },
  { id: "products", label: "Sản phẩm", description: "Chuyển thông tin sản phẩm" },
  { id: "mainImage", label: "Hình ảnh chính", description: "Hình đại diện sản phẩm" },
  { id: "gallery", label: "Thư viện ảnh", description: "Tất cả hình trong gallery" },
  { id: "shortDesc", label: "Mô tả ngắn", description: "Trường short description" },
  { id: "longDesc", label: "Mô tả dài", description: "Trường description đầy đủ" },
  { id: "variants", label: "Biến thể sản phẩm", description: "Các biến thể (màu sắc, kích thước...)" },
  { id: "inventory", label: "Tồn kho", description: "Số lượng tồn kho hiện tại" },
  { id: "tags", label: "Thẻ đánh dấu (Tags)", description: "Di chuyển tags để tối ưu SEO" },
];

const CONFLICT_OPTIONS: Array<{ id: ConflictStrategy; label: string; description: string }> = [
  {
    id: "skip",
    label: "Bỏ qua nếu trùng SKU",
    description: "Giữ nguyên sản phẩm đã có trong Medusa",
  },
  {
    id: "update",
    label: "Cập nhật nếu trùng SKU",
    description: "Ghi đè thông tin sản phẩm đã tồn tại",
  },
  {
    id: "create",
    label: "Tạo mới (xoá dữ liệu cũ)",
    description: "Xoá toàn bộ dữ liệu cũ, tạo mới hoàn toàn từ đầu",
  },
];

interface MigrationOptionsProps {
  selectedTypes: MigrationDataType[];
  conflictStrategy: ConflictStrategy;
  migrationMode: MigrationMode;
  allowDelete: boolean;
  batchSize: number;
  skipOnError: boolean;
  preserveImages: boolean;
  mediaOptions: MediaMigrationOptions;
  onTypeToggle: (type: MigrationDataType) => void;
  onConflictChange: (strategy: ConflictStrategy) => void;
  onMigrationModeChange: (mode: MigrationMode) => void;
  onAllowDeleteChange: (v: boolean) => void;
  onBatchSizeChange: (v: number) => void;
  onSkipOnErrorChange: (v: boolean) => void;
  onPreserveImagesChange: (v: boolean) => void;
  onMediaOptionsChange: (opts: MediaMigrationOptions) => void;
  onClearAll?: () => void;
  isRunning?: boolean;
}

export function MigrationOptions({
  selectedTypes,
  conflictStrategy,
  migrationMode,
  allowDelete,
  batchSize,
  skipOnError,
  preserveImages,
  mediaOptions,
  onTypeToggle,
  onConflictChange,
  onMigrationModeChange,
  onAllowDeleteChange,
  onBatchSizeChange,
  onSkipOnErrorChange,
  onPreserveImagesChange,
  onMediaOptionsChange,
  onClearAll,
  isRunning,
}: MigrationOptionsProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  return (
    <div className="space-y-6">
      {/* Data type selection */}
      <Card>
        <CardHeader>
          <CardTitle>Loại dữ liệu cần migrate</CardTitle>
          <CardDescription>
            Chọn loại dữ liệu bạn muốn di chuyển sang Medusa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {DATA_TYPE_OPTIONS.map((option) => (
              <label
                key={option.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-accent",
                  selectedTypes.includes(option.id) && "border-primary bg-primary/5"
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
        </CardContent>
      </Card>

      {/* Conflict strategy */}
      <Card>
        <CardHeader>
          <CardTitle>Tuỳ chọn chống trùng dữ liệu</CardTitle>
          <CardDescription>
            Chọn cách xử lý khi SKU hoặc ID đã tồn tại trong Medusa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {CONFLICT_OPTIONS.map((option) => (
            <label
              key={option.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-accent",
                conflictStrategy === option.id && "border-primary bg-primary/5"
              )}
            >
              <input
                type="radio"
                name="conflict"
                value={option.id}
                checked={conflictStrategy === option.id}
                onChange={() => onConflictChange(option.id)}
                className="accent-primary mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Migration mode */}
      <Card>
        <CardHeader>
          <CardTitle>Chế độ đồng bộ</CardTitle>
          <CardDescription>
            Chọn cách xử lý khi chạy lại migration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <label
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-accent",
              migrationMode === "continue" && "border-primary bg-primary/5"
            )}
          >
            <input
              type="radio"
              name="migrationMode"
              value="continue"
              checked={migrationMode === "continue"}
              onChange={() => onMigrationModeChange("continue")}
              className="accent-primary mt-0.5"
            />
            <div>
              <div className="flex items-center gap-2">
                <RefreshCw className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium">Tiếp tục đồng bộ</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Bỏ qua sản phẩm/danh mục đã đồng bộ, tiếp tục từ điểm dừng. Dùng khi migration bị gián đoạn giữa chừng.
              </p>
            </div>
          </label>
          <label
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-accent",
              migrationMode === "restart" && "border-primary bg-primary/5"
            )}
          >
            <input
              type="radio"
              name="migrationMode"
              value="restart"
              checked={migrationMode === "restart"}
              onChange={() => onMigrationModeChange("restart")}
              className="accent-primary mt-0.5"
            />
            <div>
              <div className="flex items-center gap-2">
                <RotateCcw className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium">Đồng bộ lại từ đầu</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Xoá toàn bộ dữ liệu đã migrate, sau đó đồng bộ lại hoàn toàn. Dùng khi muốn làm mới dữ liệu.
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Advanced options */}
      <Card>
        <CardHeader>
          <CardTitle>Tuỳ chọn nâng cao</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Số sản phẩm mỗi lote</p>
              <p className="text-xs text-muted-foreground">
                Batch size cho bulk API (100-500 recommended)
              </p>
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Tiếp tục khi gặp lỗi</p>
              <p className="text-xs text-muted-foreground">
                Bỏ qua sản phẩm lỗi và tiếp tục migration
              </p>
            </div>
            <Checkbox
              checked={skipOnError}
              onCheckedChange={(v) => onSkipOnErrorChange(!!v)}
            />
          </div>

          {/* Media Migration Options */}
          <div className="space-y-3 pt-1 border-t mt-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="size-4 text-muted-foreground" />
              <p className="text-sm font-medium">Tải ảnh về Medusa</p>
              <Badge variant="outline" className="text-xs ml-auto">Mới</Badge>
            </div>

            {/* Primary toggle: download to Medusa vs keep original URLs */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={!preserveImages}
                  onCheckedChange={(v) => onPreserveImagesChange(!v)}
                />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Tải ảnh về server Medusa
                  </p>
                  <p className="text-xs text-blue-700">
                    Download ảnh từ WordPress, lưu vào backend, dùng relative path. Không phụ thuộc WordPress cũ.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={preserveImages}
                  onCheckedChange={(v) => onPreserveImagesChange(!!v)}
                />
                <div>
                  <p className="text-sm font-medium text-blue-900">Giữ nguyên URL gốc</p>
                  <p className="text-xs text-blue-700">
                    Dùng URL từ WooCommerce, không tải về. Ảnh vẫn phụ thuộc WordPress cũ.
                  </p>
                </div>
              </label>
            </div>

            {/* Granular options - show only when downloading to Medusa */}
            {preserveImages === false && (
              <div className="space-y-2 pl-2 border-l-2 border-blue-200">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Chi tiết</p>
                {([
                  { key: "downloadThumbnails" as const, label: "Ảnh đại diện (thumbnail)", desc: "Hình đại diện chính của sản phẩm" },
                  { key: "downloadGallery" as const, label: "Ảnh thư viện (gallery)", desc: "Tất cả hình trong gallery sản phẩm" },
                  { key: "downloadCategoryImages" as const, label: "Ảnh danh mục", desc: "Hình minh hoạ cho danh mục sản phẩm" },
                  { key: "downloadDescriptionImages" as const, label: "Ảnh trong mô tả dài", desc: "Hình ảnh nhúng trong description sản phẩm" },
                  { key: "downloadShortDescImages" as const, label: "Ảnh trong mô tả ngắn", desc: "Hình ảnh nhúng trong short_description" },
                  { key: "rewriteHtmlDescriptions" as const, label: "Rewrite HTML mô tả", desc: "Thay link ảnh WordPress bằng relative path mới" },
                  { key: "reuseExistingMedia" as const, label: "Reuse ảnh đã tải trước", desc: "Nếu URL đã tải rồi thì dùng lại, không tải lại" },
                ] as const).map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Checkbox
                      checked={mediaOptions[key]}
                      onCheckedChange={(v) =>
                        onMediaOptionsChange({ ...mediaOptions, [key]: !!v })
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">Cho phép xoá dữ liệu đã migrate</p>
              <p className="text-xs text-muted-foreground">
                Bật tuỳ chọn rollback trong phần điều khiển
              </p>
            </div>
            <Checkbox
              checked={allowDelete}
              onCheckedChange={(v) => onAllowDeleteChange(!!v)}
            />
          </div>
          <Separator />
          {onClearAll && (
            <div className="space-y-3">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="size-4" />
                  <p className="text-sm font-medium">Xoá toàn bộ dữ liệu đã migrate</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Xoá toàn bộ sản phẩm và danh mục đã đồng bộ khỏi Medusa. Hành động này không thể hoàn tác.
                </p>
              </div>
              {!showClearConfirm ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowClearConfirm(true)}
                  disabled={isRunning}
                >
                  <Trash2 className="mr-2 size-4" />
                  Xoá toàn bộ dữ liệu
                </Button>
              ) : isRunning ? (
                <div className="flex items-center justify-center gap-2 rounded-md border border-orange-500/50 bg-orange-50 p-3 text-sm text-orange-700">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Đang xoá dữ liệu...</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      onClearAll();
                      setShowClearConfirm(false);
                    }}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Xác nhận xoá
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowClearConfirm(false)}
                  >
                    Huỷ
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
