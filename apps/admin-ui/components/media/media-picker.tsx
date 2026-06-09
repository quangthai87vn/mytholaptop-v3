"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Upload,
  ImageIcon,
  Search,
  X,
  Check,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  useWordPressMediaLibrary,
  useWordPressMediaUpload,
  WpMediaItem,
} from "@/hooks/use-medusa";

export interface MediaPickerResult {
  id: number;
  source_url: string;
  title: string;
  alt: string;
}

interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "single" = pick one, "multiple" = pick many */
  mode?: "single" | "multiple";
  /** Pre-selected items (for gallery editing) */
  selected?: MediaPickerResult[];
  /** Min number of items required (0 = optional) */
  minItems?: number;
  /** Called when user confirms selection */
  onConfirm: (items: MediaPickerResult[]) => void;
}

export function MediaPicker({
  open,
  onOpenChange,
  mode = "single",
  selected: initialSelected = [],
  minItems = 0,
  onConfirm,
}: MediaPickerProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "library">("library");
  const [selectedItems, setSelectedItems] = useState<MediaPickerResult[]>(initialSelected);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [uploadTitle, setUploadTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedId, setUploadedId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const perPage = 36;

  const { data, isLoading, isError, error, refetch, isFetching } =
    useWordPressMediaLibrary({
      page,
      perPage,
      search: searchQuery,
      enabled: open && activeTab === "library",
    });

  const uploadMutation = useWordPressMediaUpload();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedItems(initialSelected);
      setActiveTab("library");
      setSearchQuery("");
      setPage(1);
      setUploadedId(null);
    }
  }, [open, initialSelected]);

  const toggleSelect = useCallback(
    (item: WpMediaItem) => {
      const result: MediaPickerResult = {
        id: item.id,
        source_url: item.source_url,
        title: typeof item.title === "object" ? item.title?.rendered || "" : item.title,
        alt: item.alt_text || "",
      };

      if (mode === "single") {
        setSelectedItems([result]);
      } else {
        setSelectedItems((prev) => {
          const exists = prev.find((p) => p.id === item.id);
          if (exists) return prev.filter((p) => p.id !== item.id);
          return [...prev, result];
        });
      }
    },
    [mode]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) {
        toast.error("Vui lòng thả tệp hình ảnh (jpg, png, gif, webp, svg)");
        return;
      }
      for (const file of imageFiles) {
        await uploadFile(file, imageFiles.indexOf(file) === imageFiles.length - 1);
      }
    },
    [uploadTitle]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) {
        toast.error("Vui lòng chọn tệp hình ảnh");
        return;
      }
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const title = uploadTitle || file.name.replace(/\.[^.]+$/, "");
        await uploadMutation.mutateAsync(
          { file, title },
          {
            onSuccess: (result) => {
              setUploadedId(result.id);
              const resultItem: MediaPickerResult = {
                id: result.id,
                source_url: result.source_url,
                title: result.title || title,
                alt: result.alt || "",
              };
              if (mode === "single") {
                setSelectedItems([resultItem]);
              } else {
                setSelectedItems((prev) => {
                  if (prev.find((p) => p.id === result.id)) return prev;
                  return [...prev, resultItem];
                });
              }
              toast.success(`Đã tải lên: ${result.title || file.name}`);
            },
            onError: (err) => {
              toast.error(`Upload thất bại: ${err.message}`);
            },
          }
        );
        if (imageFiles.length > 1) await new Promise((r) => setTimeout(r, 500));
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [uploadMutation, uploadTitle, mode]
  );

  const uploadFile = async (file: File, isLast: boolean) => {
    const title = uploadTitle || file.name.replace(/\.[^.]+$/, "");
    try {
      const result = await uploadMutation.mutateAsync({ file, title });
      setUploadedId(result.id);
      const resultItem: MediaPickerResult = {
        id: result.id,
        source_url: result.source_url,
        title: result.title || title,
        alt: result.alt || "",
      };
      if (mode === "single") {
        setSelectedItems([resultItem]);
      } else {
        setSelectedItems((prev) => {
          if (prev.find((p) => p.id === result.id)) return prev;
          return [...prev, resultItem];
        });
      }
      if (isLast) toast.success(`Đã tải lên: ${result.title || file.name}`);
    } catch (err) {
      toast.error(`Upload thất bại: ${(err as Error).message}`);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 400);
  };

  const handleConfirm = () => {
    if (minItems > 0 && selectedItems.length < minItems) {
      toast.error(`Vui lòng chọn ít nhất ${minItems} ảnh.`);
      return;
    }
    onConfirm(selectedItems);
    onOpenChange(false);
  };

  const totalPages = data?.totalPages || 1;
  const totalItems = data?.totalItems || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>Chọn ảnh từ WordPress Media</DialogTitle>
          <DialogDescription>
            {mode === "single"
              ? "Chọn một ảnh làm ảnh đại diện."
              : `Chọn nhiều ảnh cho album. Đã chọn: ${selectedItems.length} ảnh.`}
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="px-6 pt-2 shrink-0">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "upload" | "library")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="library" className="gap-1.5">
                <ImageIcon className="size-4" />
                Thư viện ảnh
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-1.5">
                <Upload className="size-4" />
                Tải lên tệp mới
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">

          {/* ── LIBRARY TAB ── */}
          <div className={`flex-1 overflow-hidden flex flex-col ${activeTab !== "library" ? "hidden" : ""}`}>
            {/* Search bar */}
            <div className="px-6 py-3 border-b shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm ảnh..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading && (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              )}

              {isError && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertCircle className="size-10 text-destructive mb-3" />
                  <p className="text-sm font-medium text-destructive">Không tải được thư viện</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(error as Error)?.message || "Lỗi kết nối WordPress Media API."}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => refetch()}
                  >
                    <RefreshCw className="size-3.5 mr-1.5" /> Thử lại
                  </Button>
                </div>
              )}

              {!isLoading && !isError && data && (
                <>
                  {data.items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <ImageIcon className="size-12 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? "Không tìm thấy ảnh nào." : "Thư viện ảnh trống."}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tải lên ảnh mới hoặc thử từ khóa khác.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                        {data.items.map((item) => {
                          const isSelected = selectedItems.some((s) => s.id === item.id);
                          const title =
                            typeof item.title === "object"
                              ? item.title?.rendered || ""
                              : item.title;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggleSelect(item)}
                              className={`
                                relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                                group cursor-pointer bg-muted/50
                                ${isSelected
                                  ? "border-primary ring-2 ring-primary/30"
                                  : "border-transparent hover:border-muted-foreground/30"}
                              `}
                              title={title}
                            >
                              {/* Image */}
                              <Image
                                src={item.source_url}
                                alt={item.alt_text || title || "Media"}
                                fill
                                className="object-cover"
                                unoptimized
                              />

                              {/* Selected overlay */}
                              {isSelected && (
                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                  <div className="size-7 rounded-full bg-primary flex items-center justify-center shadow-md">
                                    <Check className="size-4 text-primary-foreground" />
                                  </div>
                                </div>
                              )}

                              {/* Hover overlay */}
                              <div
                                className={`absolute inset-0 transition-opacity ${
                                  isSelected
                                    ? "opacity-0 group-hover:opacity-0"
                                    : "bg-black/0 group-hover:bg-black/20"
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="gap-1"
                          >
                            <ChevronLeft className="size-4" />
                            Trước
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Trang {page} / {totalPages}
                            {" "}
                            <span className="hidden sm:inline">
                              ({totalItems} ảnh)
                            </span>
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            className="gap-1"
                          >
                            Sau
                            <ChevronRight className="size-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── UPLOAD TAB ── */}
          <div className={`flex-1 overflow-hidden flex flex-col ${activeTab !== "upload" ? "hidden" : ""}`}>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="upload-title" className="text-sm">Tiêu đề ảnh (tùy chọn)</Label>
                <Input
                  id="upload-title"
                  placeholder="Nhập tiêu đề..."
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer
                  transition-all min-h-[200px]
                  ${isDragging
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : "border-muted-foreground/30 hover:border-muted-foreground/60 bg-muted/30"}
                  ${uploadMutation.isPending ? "pointer-events-none opacity-60" : ""}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {uploadMutation.isPending ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="size-10 text-primary animate-spin" />
                    <p className="text-sm font-medium">Đang tải lên...</p>
                    <p className="text-xs text-muted-foreground">Vui lòng chờ</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 p-8 text-center">
                    <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="size-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Kéo thả ảnh vào đây hoặc click để chọn
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Hỗ trợ: JPG, PNG, GIF, WebP, SVG
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Uploaded preview */}
              {uploadedId && selectedItems.find((s) => s.id === uploadedId) && (
                <div className="space-y-2">
                  <Label className="text-sm">Ảnh vừa tải lên</Label>
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                    <Image
                      src={selectedItems.find((s) => s.id === uploadedId)!.source_url}
                      alt="Uploaded"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <p className="text-xs text-green-600 font-medium">
                    {selectedItems.find((s) => s.id === uploadedId)?.title || "Đã tải lên thành công!"}
                  </p>
                </div>
              )}

              {/* Selected from upload */}
              {selectedItems.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Đã chọn ({selectedItems.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedItems.map((item) => (
                      <div
                        key={item.id}
                        className="relative w-16 h-16 rounded-lg overflow-hidden border group"
                      >
                        <Image
                          src={item.source_url}
                          alt={item.alt || item.title || "Selected"}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItems((prev) => prev.filter((s) => s.id !== item.id));
                          }}
                          className="absolute -top-1 -right-1 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Ảnh sẽ được tải lên WordPress Media Library. Sau khi tải lên thành công, ảnh sẽ
                được gán vào sản phẩm với Media ID.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t shrink-0 gap-2">
          {selectedItems.length > 0 && (
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">
                {selectedItems.length} ảnh đã chọn
              </p>
            </div>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              selectedItems.length === 0 ||
              (minItems > 0 && selectedItems.length < minItems) ||
              uploadMutation.isPending
            }
            className="gap-1.5"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Đang tải lên...
              </>
            ) : (
              <>
                <Check className="size-4" />
                Xác nhận
                {mode === "multiple" && selectedItems.length > 0
                  ? ` (${selectedItems.length})`
                  : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
