"use client";

import { useState } from "react";
import {
  Settings,
  Save,
  ImageIcon,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { MediaMigrationOptions, ImageUploadConfig } from "@/types/media-mapping";
import { DEFAULT_IMAGE_UPLOAD_CONFIG } from "@/types/media-mapping";

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
  imageConfig: ImageUploadConfig;
  onTypeToggle: (type: MigrationDataType) => void;
  onConflictChange: (strategy: ConflictStrategy) => void;
  onBatchSizeChange: (v: number) => void;
  onSkipOnErrorChange: (v: boolean) => void;
  onPreserveImagesChange: (v: boolean) => void;
  onMediaOptionsChange: (opts: MediaMigrationOptions) => void;
  onImageConfigChange: (cfg: ImageUploadConfig) => void;
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
  imageConfig,
  onTypeToggle,
  onConflictChange,
  onBatchSizeChange,
  onSkipOnErrorChange,
  onPreserveImagesChange,
  onMediaOptionsChange,
  onImageConfigChange,
  isRunning,
}: MigrationOptionsPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Local state for image config form (only applied on Save)
  const [localImageConfig, setLocalImageConfig] = useState<ImageUploadConfig>(imageConfig);
  const [configError, setConfigError] = useState<string | null>(null);
  const [showAbsoluteWarning, setShowAbsoluteWarning] = useState(false);

  // Sync local state when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setLocalImageConfig(imageConfig);
      setConfigError(null);
      setShowAbsoluteWarning(imageConfig.imageSaveMode === "absolute_url");
    }
    setIsOpen(open);
  };

  const handleSave = () => {
    // Validate image config
    const cfg = localImageConfig;

    if (!cfg.uploadRootDir || cfg.uploadRootDir.trim() === "") {
      setConfigError("Thư mục lưu ảnh không được để trống.");
      return;
    }

    if (!cfg.uploadPublicPath || !cfg.uploadPublicPath.startsWith("/")) {
      setConfigError("Đường dẫn public phải bắt đầu bằng dấu / (ví dụ: /uploads/medusa/products).");
      return;
    }

    if (cfg.imageSaveMode === "absolute_url") {
      setShowAbsoluteWarning(true);
    }

    setConfigError(null);
    onImageConfigChange(cfg);
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
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
                        id="only-wp-domain"
                        checked={mediaOptions.onlyFromWordpressDomain}
                        onCheckedChange={(v) => onMediaOptionsChange({ ...mediaOptions, onlyFromWordpressDomain: !!v })}
                      />
                      <label htmlFor="only-wp-domain" className="text-xs cursor-pointer font-medium">
                        Chỉ tải từ WordPress
                        <span className="ml-1 text-muted-foreground font-normal">
                          (bỏ qua ảnh từ CDN/hotlink khác)
                        </span>
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
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="download-description"
                        checked={mediaOptions.downloadDescriptionImages}
                        onCheckedChange={(v) => onMediaOptionsChange({ ...mediaOptions, downloadDescriptionImages: !!v })}
                      />
                      <label htmlFor="download-description" className="text-xs cursor-pointer">Tải ảnh trong mô tả</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="download-short-desc"
                        checked={mediaOptions.downloadShortDescImages}
                        onCheckedChange={(v) => onMediaOptionsChange({ ...mediaOptions, downloadShortDescImages: !!v })}
                      />
                      <label htmlFor="download-short-desc" className="text-xs cursor-pointer">Tải ảnh trong mô tả ngắn</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="rewrite-html"
                        checked={mediaOptions.rewriteHtmlDescriptions}
                        onCheckedChange={(v) => onMediaOptionsChange({ ...mediaOptions, rewriteHtmlDescriptions: !!v })}
                      />
                      <label htmlFor="rewrite-html" className="text-xs cursor-pointer">Viết lại HTML mô tả</label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cấu hình hình ảnh — chỉ hiện khi "Tải ảnh về Medusa" được chọn */}
            {!preserveImages && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">Cấu hình hình ảnh</h3>
                </div>

                {/* Enable/Disable */}
                <div className="flex items-center justify-between rounded-lg border border-primary/50 bg-primary/5 p-3">
                  <div>
                    <p className="text-sm font-medium">Bật migrate ảnh</p>
                    <p className="text-xs text-muted-foreground">Tải ảnh từ WooCommerce về server Medusa</p>
                  </div>
                  <Checkbox
                    checked={localImageConfig.enabled}
                    onCheckedChange={(v) =>
                      setLocalImageConfig((prev) => ({ ...prev, enabled: !!v }))
                    }
                  />
                </div>

                {localImageConfig.enabled && (
                  <div className="space-y-3 rounded-lg border p-3 bg-muted/30">

                    {/* uploadRootDir */}
                    <div className="space-y-1">
                      <Label htmlFor="upload-root-dir" className="text-xs font-medium">
                        Thư mục lưu ảnh trên server
                      </Label>
                      <Input
                        id="upload-root-dir"
                        value={localImageConfig.uploadRootDir}
                        onChange={(e) =>
                          setLocalImageConfig((prev) => ({ ...prev, uploadRootDir: e.target.value }))
                        }
                        placeholder="public/wp-content/uploads"
                        className="h-8 text-xs font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Thư mục vật lý trên server để lưu file ảnh. Mặc định: public/wp-content/uploads
                      </p>
                    </div>

                    {/* uploadPublicPath */}
                    <div className="space-y-1">
                      <Label htmlFor="upload-public-path" className="text-xs font-medium">
                        Đường dẫn public tương đối
                      </Label>
                      <Input
                        id="upload-public-path"
                        value={localImageConfig.uploadPublicPath}
                        onChange={(e) =>
                          setLocalImageConfig((prev) => ({ ...prev, uploadPublicPath: e.target.value }))
                        }
                        placeholder="/wp-content/uploads"
                        className="h-8 text-xs font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Đường dẫn lưu vào database. Phải bắt đầu bằng /. Mặc định: /wp-content/uploads
                      </p>
                    </div>

                    {/* imageFolderPattern */}
                    <div className="space-y-1">
                      <Label htmlFor="folder-pattern" className="text-xs font-medium">
                        Cấu trúc thư mục ảnh
                      </Label>
                      <Input
                        id="folder-pattern"
                        value={localImageConfig.imageFolderPattern}
                        onChange={(e) =>
                          setLocalImageConfig((prev) => ({ ...prev, imageFolderPattern: e.target.value }))
                        }
                        placeholder="{year}/{month}"
                        className="h-8 text-xs font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Hỗ trợ: {"{"}year{"}"}, {"{"}month{"}"}, {"{"}day{"}"}. Ví dụ: {"{"}year{"}"}/{"{"}month{"}"} → 2026/05
                      </p>
                    </div>

                    {/* imageFileNameMode */}
                    <div className="space-y-1">
                      <Label htmlFor="filename-mode" className="text-xs font-medium">
                        Quy tắc đặt tên file
                      </Label>
                      <Select
                        value={localImageConfig.imageFileNameMode}
                        onValueChange={(v) =>
                          setLocalImageConfig((prev) => ({
                            ...prev,
                            imageFileNameMode: v as ImageUploadConfig["imageFileNameMode"],
                          }))
                        }
                      >
                        <SelectTrigger id="filename-mode" className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="source-hash">source-hash (mã hash từ URL nguồn) — Khuyến nghị</SelectItem>
                          <SelectItem value="keep-original-name">keep-original-name (giữ nguyên tên file)</SelectItem>
                          <SelectItem value="product-slug">product-slug (dùng slug sản phẩm)</SelectItem>
                          <SelectItem value="product-sku">product-sku (dùng SKU sản phẩm)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* imageConflictStrategy */}
                    <div className="space-y-1">
                      <Label htmlFor="conflict-strategy" className="text-xs font-medium">
                        Khi ảnh đã tồn tại
                      </Label>
                      <Select
                        value={localImageConfig.imageConflictStrategy}
                        onValueChange={(v) =>
                          setLocalImageConfig((prev) => ({
                            ...prev,
                            imageConflictStrategy: v as ImageUploadConfig["imageConflictStrategy"],
                          }))
                        }
                      >
                        <SelectTrigger id="conflict-strategy" className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">skip — Bỏ qua nếu đã tồn tại (Khuyến nghị)</SelectItem>
                          <SelectItem value="overwrite">overwrite — Ghi đè file cũ</SelectItem>
                          <SelectItem value="rename">rename — Đổi tên file mới</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* imageSaveMode */}
                    <div className="space-y-1">
                      <Label htmlFor="save-mode" className="text-xs font-medium">
                        Lưu đường dẫn vào database dạng
                      </Label>
                      <Select
                        value={localImageConfig.imageSaveMode}
                        onValueChange={(v) => {
                          const mode = v as ImageUploadConfig["imageSaveMode"];
                          setLocalImageConfig((prev) => ({ ...prev, imageSaveMode: mode }));
                          setShowAbsoluteWarning(mode === "absolute_url");
                        }}
                      >
                        <SelectTrigger id="save-mode" className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relative_path">relative_path — /uploads/medusa/products/2026/05/abc.webp</SelectItem>
                          <SelectItem value="absolute_url">absolute_url — https://domain.com/uploads/...</SelectItem>
                        </SelectContent>
                      </Select>

                      {localImageConfig.imageSaveMode === "relative_path" ? (
                        <div className="flex items-start gap-1 rounded bg-green-50 border border-green-200 p-2">
                          <Info className="size-3 text-green-600 mt-0.5 shrink-0" />
                          <p className="text-[10px] text-green-700">
                            <strong>Khuyến nghị.</strong> Đường dẫn tương đối giúp chuyển server hoặc đổi domain dễ dàng, không cần sửa URL trong database.
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-start gap-1 rounded bg-orange-50 border border-orange-200 p-2">
                          <AlertTriangle className="size-3 text-orange-600 mt-0.5 shrink-0" />
                          <p className="text-[10px] text-orange-700">
                            <strong>Không khuyến nghị.</strong> Lưu URL tuyệt đối sẽ khó chuyển server hoặc đổi domain vì phải cập nhật toàn bộ URL trong database.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Preview path */}
                    <div className="rounded border border-dashed border-muted-foreground/30 bg-muted/20 p-2">
                      <p className="text-[10px] text-muted-foreground font-medium mb-1">Ví dụ đường dẫn lưu database:</p>
                      <code className="text-[10px] text-primary break-all">
                        {localImageConfig.uploadPublicPath || "/wp-content/uploads"}/{localImageConfig.imageFolderPattern || "{year}/{month}"}/abc.webp
                      </code>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Config error */}
            {configError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertTriangle className="size-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">{configError}</p>
              </div>
            )}
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
