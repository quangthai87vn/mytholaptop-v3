"use client";

import { useState, useEffect } from "react";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Star,
  Loader2,
  AlertTriangle,
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { ProviderCard } from "@/types/ai-operating";

interface ProviderMenuProps {
  provider: ProviderCard;
  onEdit: (provider: ProviderCard) => void;
  onDeleted: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

interface DeleteCheck {
  isDefault: boolean;
  isInUse: boolean;
  reason?: string;
}

interface ReplacementOption {
  id: number;
  name: string;
  slug: string;
}

export function ProviderMenu({
  provider,
  onEdit,
  onDeleted,
  onRefresh,
  loading,
}: ProviderMenuProps) {
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCheck, setDeleteCheck] = useState<DeleteCheck | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [replacementId, setReplacementId] = useState<number | null>(null);
  const [allProviders, setAllProviders] = useState<ReplacementOption[]>([]);

  const isActive = provider.status === "active";
  const isDefault = provider.is_default;

  // Fetch all active providers for replacement dropdown
  useEffect(() => {
    if (!deleteDialogOpen) return;
    fetch("/api/ai/providers?status=active")
      .then((r) => r.json())
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setAllProviders(
            data
              .filter((p: { id: number }) => p.id !== provider.id)
              .map((p: { id: number; name: string; slug: string; display_name?: string }) => ({
                id: p.id,
                name: p.display_name || p.name || p.slug,
                slug: p.slug,
              }))
          );
        }
      })
      .catch(console.error);
  }, [deleteDialogOpen, provider.id]);

  // Fetch delete check when dialog opens
  useEffect(() => {
    if (!deleteDialogOpen) return;
    setLoadingCheck(true);
    setDeleteCheck(null);
    setReplacementId(null);

    fetch(`/api/ai/providers/${provider.id}`)
      .then((r) => r.json())
      .then(({ data }) => {
        setDeleteCheck({
          isDefault: provider.is_default ?? false,
          isInUse: data?.isInUse ?? false,
        });
      })
      .catch(() => {
        setDeleteCheck({ isDefault: false, isInUse: false });
      })
      .finally(() => setLoadingCheck(false));
  }, [deleteDialogOpen, provider.id, provider.is_default]);

  const handleToggleStatus = async () => {
    setToggling(true);
    try {
      const action = isActive ? "deactivate" : "activate";
      const res = await fetch(`/api/ai/providers/${provider.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Không thể thay đổi trạng thái");
      } else {
        toast.success(data.message);
        onDeleted();
      }
    } catch {
      toast.error("Lỗi khi thay đổi trạng thái");
    } finally {
      setToggling(false);
    }
  };

  const handleSetDefault = async () => {
    setSettingDefault(true);
    try {
      const res = await fetch(`/api/ai/providers/${provider.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-default" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Không thể đặt làm mặc định");
      } else {
        toast.success(data.message);
        onDeleted();
      }
    } catch {
      toast.error("Lỗi khi đặt mặc định");
    } finally {
      setSettingDefault(false);
    }
  };

  const openDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const body: { replacement_provider_id?: number } = {};
      if (replacementId) {
        body.replacement_provider_id = replacementId;
      }

      const res = await fetch(`/api/ai/providers/${provider.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Không thể xóa provider");
      } else if (data.alreadyDeleted) {
        toast.info(`Provider "${provider.name}" đã được xóa trước đó.`);
        setDeleteDialogOpen(false);
        onDeleted();
      } else {
        toast.success(`Đã xóa provider "${provider.name}"`);
        if (data.warning) {
          toast.warning(data.warning);
        }
        setDeleteDialogOpen(false);
        onDeleted();
      }
    } catch {
      toast.error("Lỗi khi xóa provider");
    } finally {
      setDeleting(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setDeleteCheck(null);
      setReplacementId(null);
    }
  };

  const busy = loading || deleting || toggling || settingDefault;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <MoreHorizontal className="size-3.5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onEdit(provider)} disabled={loading}>
            <Pencil className="size-3.5 mr-2 text-muted-foreground" />
            Chỉnh sửa
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleSetDefault}
            disabled={loading || settingDefault || isDefault}
          >
            <Star className="size-3.5 mr-2 text-muted-foreground" />
            {isDefault ? "★ Đang làm mặc định" : "Đặt làm mặc định"}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleToggleStatus} disabled={loading || toggling}>
            {isActive ? (
              <>
                <ToggleLeft className="size-3.5 mr-2 text-muted-foreground" />
                Tắt provider
              </>
            ) : (
              <>
                <ToggleRight className="size-3.5 mr-2 text-muted-foreground" />
                Bật provider
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={openDeleteDialog}
            disabled={loading || deleting}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="size-3.5 mr-2" />
            Xóa provider
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="size-5" />
              Xóa Provider
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa provider{" "}
              <strong>"{provider.name}"</strong>?
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Loading state */}
            {loadingCheck && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Warning: provider is default */}
            {deleteCheck && deleteCheck.isDefault && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
                <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    Provider này đang là mặc định.
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                    Sau khi xóa, hệ thống sẽ không có provider mặc định.
                    {allProviders.length > 0
                      ? " Bạn có thể chọn provider thay thế bên dưới."
                      : " Hãy thêm và bật provider khác."}
                  </p>
                </div>
              </div>
            )}

            {/* Warning: provider is in use */}
            {deleteCheck && deleteCheck.isInUse && (
              <div className="flex items-start gap-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-3">
                <AlertTriangle className="size-4 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-400">
                    Provider đang được sử dụng trong routing hoặc content generation.
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-500 mt-0.5">
                    Bạn có muốn chuyển các cấu hình liên quan sang provider khác không?
                  </p>
                </div>
              </div>
            )}

            {/* Replacement provider selector */}
            {(deleteCheck?.isDefault || deleteCheck?.isInUse) && allProviders.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Chọn provider thay thế (tùy chọn)
                </label>
                <Select
                  value={replacementId?.toString() ?? ""}
                  onValueChange={(v) => setReplacementId(v ? Number(v) : null)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Không chọn — hệ thống tự xử lý" />
                  </SelectTrigger>
                  <SelectContent>
                    {allProviders.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleDialogClose(false)}
              disabled={deleting}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || loadingCheck}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {deleting ? "Đang xóa..." : "Xóa Provider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
