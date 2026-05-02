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

interface MigrationOptionsPopupProps {
  selectedTypes: MigrationDataType[];
  conflictStrategy: ConflictStrategy;
  allowDelete: boolean;
  batchSize: number;
  skipOnError: boolean;
  preserveImages: boolean;
  onTypeToggle: (type: MigrationDataType) => void;
  onConflictChange: (strategy: ConflictStrategy) => void;
  onAllowDeleteChange: (v: boolean) => void;
  onBatchSizeChange: (v: number) => void;
  onSkipOnErrorChange: (v: boolean) => void;
  onPreserveImagesChange: (v: boolean) => void;
  onClearAll?: () => void;
  isRunning?: boolean;
}

export function MigrationOptionsPopup({
  selectedTypes,
  conflictStrategy,
  allowDelete,
  batchSize,
  skipOnError,
  preserveImages,
  onTypeToggle,
  onConflictChange,
  onAllowDeleteChange,
  onBatchSizeChange,
  onSkipOnErrorChange,
  onPreserveImagesChange,
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

            {/* Tuỳ chọn chống trùng dữ liệu */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Tuỳ chọn chống trùng dữ liệu</h3>
              <div className="grid gap-2 sm:grid-cols-3">
                {CONFLICT_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border p-3 cursor-pointer transition-all hover:bg-accent text-center justify-center",
                      conflictStrategy === option.id
                        ? "border-primary bg-primary/5"
                        : "border-muted"
                    )}
                  >
                    <input
                      type="radio"
                      name="conflict-popup"
                      value={option.id}
                      checked={conflictStrategy === option.id}
                      onChange={() => onConflictChange(option.id)}
                      className="accent-primary mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium">{option.label}</p>
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

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Giữ nguyên URL ảnh</p>
                    <p className="text-xs text-muted-foreground">Dùng URL gốc từ WooCommerce</p>
                  </div>
                  <Checkbox
                    checked={preserveImages}
                    onCheckedChange={(v) => onPreserveImagesChange(!!v)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-3">
                  <div>
                    <p className="text-sm font-medium text-destructive">Cho phép xoá dữ liệu</p>
                    <p className="text-xs text-muted-foreground">Bật tuỳ chọn rollback trong trang chính</p>
                  </div>
                  <Checkbox
                    checked={allowDelete}
                    onCheckedChange={(v) => onAllowDeleteChange(!!v)}
                  />
                </div>
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
