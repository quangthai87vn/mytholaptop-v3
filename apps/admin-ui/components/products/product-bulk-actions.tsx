"use client";

import { useState } from "react";
import {
  CheckSquare,
  Square,
  X,
  RefreshCw,
  Trash2,
  Tag,
  Layers,
  Download,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface BulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
}

export function ProductBulkActions({
  selectedCount,
  onClearSelection,
}: BulkActionsProps) {
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  if (selectedCount === 0) return null;

  const handleSyncAll = async () => {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 1500));
    setSyncing(false);
    toast.success(`Đã đồng bộ lại ${selectedCount} sản phẩm`);
  };

  const handleExport = () => {
    toast.info(`Xuất dữ liệu ${selectedCount} sản phẩm (mock)`);
  };

  const handleDelete = async () => {
    if (!confirm(`Xoá ${selectedCount} sản phẩm đã chọn?`)) return;
    toast.success(`Đã xoá ${selectedCount} sản phẩm`);
    onClearSelection();
  };

  return (
    <>
      <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
        {/* Selection summary */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <CheckCircle className="size-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-primary">
              Đã chọn {selectedCount} sản phẩm
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="gap-1 text-muted-foreground hover:text-foreground h-7 px-2"
          >
            <X className="size-3" />
            Bỏ chọn
          </Button>
        </div>

        {/* Bulk actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Đổi trạng thái */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => setStatusDialogOpen(true)}
          >
            <Layers className="size-3.5" />
            <span className="hidden sm:inline">Đổi trạng thái</span>
          </Button>

          {/* Gán danh mục */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => setCategoryDialogOpen(true)}
          >
            <Layers className="size-3.5" />
            <span className="hidden sm:inline">Gán danh mục</span>
          </Button>

          {/* Gán thẻ */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => setTagDialogOpen(true)}
          >
            <Tag className="size-3.5" />
            <span className="hidden sm:inline">Gán thẻ</span>
          </Button>

          {/* Đồng bộ lại */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            onClick={handleSyncAll}
            disabled={syncing}
          >
            <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
            <span className="hidden sm:inline">Đồng bộ lại</span>
          </Button>

          {/* Xuất dữ liệu */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            onClick={handleExport}
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Xuất dữ liệu</span>
          </Button>

          {/* Xoá */}
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5 h-8"
            onClick={handleDelete}
          >
            <Trash2 className="size-3.5" />
            <span className="hidden sm:inline">Xoá</span>
          </Button>
        </div>
      </div>

      {/* Status dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Đổi trạng thái</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {["published", "draft", "proposed", "archived"].map((s) => (
              <Button
                key={s}
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  toast.success(`Đã đổi trạng thái ${selectedCount} sản phẩm`);
                  setStatusDialogOpen(false);
                }}
              >
                {s === "published"
                  ? "Hoạt động"
                  : s === "draft"
                  ? "Nháp"
                  : s === "proposed"
                  ? "Đề xuất"
                  : "Lưu trữ"}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Category dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Gán danh mục</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Chọn danh mục cho {selectedCount} sản phẩm đã chọn.
          </p>
          <DialogFooter>
            <Button
              onClick={() => {
                toast.success(`Đã gán danh mục`);
                setCategoryDialogOpen(false);
              }}
            >
              Áp dụng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Gán thẻ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Thêm thẻ cho {selectedCount} sản phẩm đã chọn.
          </p>
          <DialogFooter>
            <Button
              onClick={() => {
                toast.success(`Đã gán thẻ`);
                setTagDialogOpen(false);
              }}
            >
              Áp dụng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
