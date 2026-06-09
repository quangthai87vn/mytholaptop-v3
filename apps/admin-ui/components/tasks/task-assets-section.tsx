"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  FileText,
  Image,
  Video,
  Film,
  AlignLeft,
  Cpu,
  Palette,
  HardDrive,
  Link,
  File,
  FolderOpen,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import type { TaskAsset, AssetType } from "@/lib/workspace/types-asset";
import { ASSET_TYPE_LABELS } from "@/lib/workspace/types-asset";
import { adminFetch } from "@/lib/api/admin-fetch";

const ASSET_TYPE_ICON_MAP: Record<AssetType, React.ComponentType<{ className?: string }>> = {
  script: FileText,
  thumbnail: Image,
  raw_video: Video,
  final_video: Film,
  caption: AlignLeft,
  prompt: Cpu,
  canva_link: Palette,
  google_drive_link: HardDrive,
  reference: Link,
  other: File,
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface TaskAssetsSectionProps {
  taskId: string;
}

export function TaskAssetsSection({ taskId }: TaskAssetsSectionProps) {
  const [assets, setAssets] = useState<TaskAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Add form state
  const [assetType, setAssetType] = useState<AssetType>("other");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");

  useEffect(() => {
    fetchAssets();
  }, [taskId]);

  async function fetchAssets() {
    try {
      setLoading(true);
      const res = await adminFetch(`/api/tasks/${taskId}/assets`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.data || []);
      }
    } catch {
      toast.error("Không thể tải danh sách asset");
    } finally {
      setLoading(false);
    }
  }

  const [pendingDeleteAssetId, setPendingDeleteAssetId] = useState<string | null>(null);

  const confirmDeleteAsset = (assetId: string) => {
    setPendingDeleteAssetId(assetId);
  };

  const executeDeleteAsset = async () => {
    const assetId = pendingDeleteAssetId;
    if (!assetId) return;
    try {
      const res = await adminFetch(`/api/tasks/${taskId}/assets/${assetId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Đã xóa asset");
        fetchAssets();
      } else {
        throw new Error("Delete failed");
      }
    } catch {
      toast.error("Không thể xóa asset");
    } finally {
      setPendingDeleteAssetId(null);
    }
  };

  async function handleDelete(assetId: string) {
    // placeholder - actual delete triggered by confirmDeleteAsset + executeDeleteAsset
  }

  async function handleAddAsset() {
    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề asset");
      return;
    }

    const isLinkType = assetType === "canva_link" || assetType === "google_drive_link" || assetType === "reference";

    if (!isLinkType && !file) {
      toast.error("Vui lòng chọn file để upload");
      return;
    }

    if (isLinkType && !externalUrl.trim()) {
      toast.error("Vui lòng nhập URL bên ngoài");
      return;
    }

    try {
      setUploading(true);

      if (!isLinkType && file) {
        // Upload file first
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await adminFetch("/api/tasks/assets/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Upload failed");
        }

        const uploadData = await uploadRes.json();

        // Create asset record
        const assetRes = await adminFetch(`/api/tasks/${taskId}/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asset_type: assetType,
            title: title.trim(),
            file_name: file.name,
            file_url: uploadData.data?.file_url || uploadData.file_url,
            mime_type: file.type,
            file_size: file.size,
            storage_provider: uploadData.data?.storage_provider || "local",
          }),
        });

        if (!assetRes.ok) {
          throw new Error("Create asset failed");
        }
      } else if (isLinkType) {
        // Create link asset directly
        const assetRes = await adminFetch(`/api/tasks/${taskId}/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asset_type: assetType,
            title: title.trim(),
            file_name: externalUrl.split("/").pop() || externalUrl,
            original_url: externalUrl,
            storage_provider: assetType === "canva_link" ? "canva" : "google_drive",
          }),
        });

        if (!assetRes.ok) {
          throw new Error("Create asset failed");
        }
      }

      toast.success("Đã thêm asset mới");
      setShowAddModal(false);
      setTitle("");
      setFile(null);
      setExternalUrl("");
      setAssetType("other");
      fetchAssets();
    } catch {
      toast.error("Không thể thêm asset");
    } finally {
      setUploading(false);
    }
  }

  function resetForm() {
    setTitle("");
    setFile(null);
    setExternalUrl("");
    setAssetType("other");
  }

  const isLinkType = assetType === "canva_link" || assetType === "google_drive_link" || assetType === "reference";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700">
          <FolderOpen className="size-5" />
          <span className="font-medium">Tài liệu & Assets</span>
          {assets.length > 0 && (
            <span className="text-sm text-slate-500">({assets.length})</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="gap-2"
        >
          <Plus className="size-4" />
          Thêm file
        </Button>
      </div>

      {/* Asset List */}
      {loading ? (
        <div className="text-center py-8 text-slate-500">Đang tải...</div>
      ) : assets.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-lg">
          <FolderOpen className="size-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Chưa có asset nào</p>
          <p className="text-sm text-slate-400 mt-1">
            Nhấn "Thêm file" để upload tài liệu
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {assets.map((asset) => {
            const IconComponent = ASSET_TYPE_ICON_MAP[asset.asset_type] || File;
            return (
              <div
                key={asset.id}
                className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                    <IconComponent className="size-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="inline-block px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-600 mb-1">
                          {ASSET_TYPE_LABELS[asset.asset_type]}
                        </span>
                        <h4 className="text-sm font-medium text-slate-900 truncate">
                          {asset.title}
                        </h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDeleteAsset(asset.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-slate-500 truncate">
                        {asset.file_name}
                        {asset.mime_type && (
                          <span className="ml-1 text-slate-400">
                            ({asset.mime_type})
                          </span>
                        )}
                      </p>
                      {asset.file_size && (
                        <p className="text-xs text-slate-400">
                          {formatBytes(asset.file_size)}
                        </p>
                      )}
                      {asset.uploaded_by_name && (
                        <p className="text-xs text-slate-400">
                          {asset.uploaded_by_name} •{" "}
                          {new Date(asset.created_at).toLocaleDateString("vi-VN")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Asset Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm Asset mới</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Asset Type */}
            <div className="space-y-2">
              <Label>Loại asset</Label>
              <Select
                value={assetType}
                onValueChange={(value) => setAssetType(value as AssetType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSET_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề asset"
              />
            </div>

            {/* File Upload OR External URL */}
            {isLinkType ? (
              <div className="space-y-2">
                <Label>URL bên ngoài</Label>
                <Input
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder={
                    assetType === "canva_link"
                      ? "https://www.canva.com/..."
                      : assetType === "google_drive_link"
                      ? "https://drive.google.com/..."
                      : "https://..."
                  }
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>File</Label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:border-slate-300 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="image/*,video/*,.pdf,.doc,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    {file ? (
                      <>
                        <File className="size-8 text-slate-400" />
                        <span className="text-sm text-slate-600">{file.name}</span>
                        <span className="text-xs text-slate-400">
                          {formatBytes(file.size)}
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="size-8 text-slate-400" />
                        <span className="text-sm text-slate-500">
                          Chọn file hoặc kéo thả vào đây
                        </span>
                        <span className="text-xs text-slate-400">
                          Hỗ trợ: Ảnh, Video, PDF, DOC
                        </span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleAddAsset}
              disabled={uploading}
              className="w-full gap-2"
            >
              {uploading ? (
                "Đang xử lý..."
              ) : (
                <>
                  <Plus className="size-4" />
                  Thêm asset
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteAssetId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteAssetId(null); }}
        title="Xóa asset?"
        description="Asset này sẽ bị xóa vĩnh viễn."
        confirmLabel="Xóa"
        variant="destructive"
        onConfirm={executeDeleteAsset}
      />
    </div>
  );
}
