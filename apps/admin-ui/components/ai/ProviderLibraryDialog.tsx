"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  Loader2,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { ProviderGroupSlug } from "@/types/ai-operating";
import { ProviderFormDialog } from "./ProviderFormDialog";

interface CatalogItem {
  slug: string;
  name: string;
  group_slug: ProviderGroupSlug;
  type: string;
  base_url: string;
  default_model: string;
  requires_key: boolean;
  description: string;
  tier: string;
}

interface CatalogGroup {
  label: string;
  icon: string;
  items: CatalogItem[];
}

export function ProviderLibraryDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (providerId: number) => void;
}) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [customFormOpen, setCustomFormOpen] = useState(false);

  // Fetch catalog from API
  useEffect(() => {
    if (!open) return;
    setLoadingCatalog(true);
    fetch("/api/ai/providers/catalog")
      .then((r) => r.json())
      .then(({ data }) => {
        setCatalog(data || []);
      })
      .catch(() => {
        setCatalog([]);
      })
      .finally(() => setLoadingCatalog(false));
  }, [open]);

  const filtered = search.trim()
    ? catalog.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.description.toLowerCase().includes(search.toLowerCase()) ||
          c.slug.toLowerCase().includes(search.toLowerCase())
      )
    : catalog;

  // Group catalog by group_slug
  const grouped: Record<string, CatalogItem[]> = {};
  for (const item of filtered) {
    if (!grouped[item.group_slug]) grouped[item.group_slug] = [];
    grouped[item.group_slug].push(item);
  }

  const groupMeta: Record<string, { label: string; icon: string }> = {
    cloud_api: { label: "Cloud APIs", icon: "Cloud" },
    ai_aggregator: { label: "AI Aggregators", icon: "Layers" },
    local_llm: { label: "Local LLMs", icon: "Cpu" },
    inference_platform: { label: "Inference Platforms", icon: "Zap" },
  };

  const selectedItem = catalog.find((c) => c.slug === selectedSlug) || null;

  const handleAddProvider = async () => {
    if (!selectedItem) return;

    setCreating(true);
    try {
      const res = await fetch("/api/ai/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedItem.name,
          slug: selectedItem.slug,
          group_slug: selectedItem.group_slug,
          type: selectedItem.type,
          base_url: selectedItem.base_url,
          model_name: selectedItem.default_model,
          status: "inactive",
          is_default: false,
          streaming_enabled: false,
          timeout_ms: 60000,
          retry_count: 3,
          temperature: 0.7,
          max_output_tokens: 2048,
          top_p: 1.0,
          frequency_penalty: 0.0,
          presence_penalty: 0.0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error || `Lỗi ${res.status}: Không thể tạo provider`;
        // 409 = provider already exists — close dialog and refresh list
        if (res.status === 409) {
          setCreating(false);
          onOpenChange(false);
          onCreated(0);
          toast.error(errMsg);
          return;
        }
        throw new Error(errMsg);
      }

      toast.success(`Đã thêm "${selectedItem.name}" vào AI Operating Center`);
      setSelectedSlug(null);
      setSearch("");
      onOpenChange(false);
      onCreated(data.data?.id ?? 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi tạo provider");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5 text-primary" />
            Thêm Provider mới
          </DialogTitle>
          <DialogDescription>
            Chọn provider từ thư viện. Provider sẽ được thêm vào sidebar và chưa kích hoạt.
          </DialogDescription>
        </DialogHeader>

        {/* Search + Create Custom */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm provider..."
              className="pl-9 h-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => setCustomFormOpen(true)}
          >
            <Pencil className="size-3.5" />
            Tạo Custom
          </Button>
        </div>

        {loadingCatalog ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden gap-4">
            {/* Catalog list */}
            <div className="w-1/2 overflow-y-auto space-y-4 pr-1">
              {Object.entries(grouped).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Không tìm thấy provider nào.
                </p>
              ) : (
                Object.entries(grouped)
                  .sort(([a], [b]) => {
                    const order = ["cloud_api", "ai_aggregator", "local_llm", "inference_platform"];
                    return order.indexOf(a) - order.indexOf(b);
                  })
                  .map(([group, items]) => {
                    const meta = groupMeta[group] || { label: group, icon: "Cloud" };
                    return (
                      <div key={group}>
                        <div className="flex items-center gap-2 mb-2">
                          <Cpu className="size-3 text-muted-foreground" />
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {meta.label}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {items.map((item) => {
                            const isSelected = selectedSlug === item.slug;
                            return (
                              <button
                                key={item.slug}
                                type="button"
                                onClick={() => setSelectedSlug(item.slug)}
                                className={`
                                  w-full text-left p-2.5 rounded-lg border transition-all
                                  ${isSelected
                                    ? "border-primary bg-primary/5 shadow-sm"
                                    : "border-border hover:border-muted-foreground/50 hover:bg-muted/40"
                                  }
                                `}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">{item.name}</span>
                                  {item.requires_key ? (
                                    <ShieldCheck className="size-3 text-muted-foreground shrink-0" />
                                  ) : (
                                    <span className="text-[10px] text-green-600 dark:text-green-400 shrink-0">
                                      Miễn phí
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                  {item.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Preview panel */}
            <div className="w-1/2 border-l pl-4 flex flex-col">
              {selectedItem ? (
                <>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">{selectedItem.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedItem.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {selectedItem.requires_key ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-800">
                          <ShieldCheck className="size-3" />
                          Cần API Key
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">
                          <Cpu className="size-3" />
                          Miễn phí API
                        </span>
                      )}
                      {selectedItem.base_url && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {selectedItem.base_url}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Config preview */}
                  <div className="flex-1 overflow-y-auto space-y-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Base URL</span>
                      <p className="font-mono text-[11px] bg-muted px-2 py-1.5 rounded border truncate">
                        {selectedItem.base_url || "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Default Model</span>
                      <p className="font-mono text-[11px] bg-muted px-2 py-1.5 rounded border truncate">
                        {selectedItem.default_model || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSlug(null)}
                      className="flex-1"
                    >
                      Hủy
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddProvider}
                      disabled={creating}
                      className="flex-1 gap-1.5"
                    >
                      {creating ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Plus className="size-3.5" />
                      )}
                      {creating ? "Đang thêm..." : "Thêm Provider"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Plus className="size-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Chọn một provider để xem chi tiết
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>

      {/* Custom Provider Form Dialog */}
      <ProviderFormDialog
        open={customFormOpen}
        onOpenChange={(v) => {
          setCustomFormOpen(v);
          if (!v) {
            // Refresh catalog list
            setLoadingCatalog(true);
            fetch("/api/ai/providers/catalog")
              .then((r) => r.json())
              .then(({ data }) => setCatalog(data || []))
              .catch(() => {})
              .finally(() => setLoadingCatalog(false));
          }
        }}
        onSaved={async () => {
          setCustomFormOpen(false);
          // Refresh sidebar provider list
          onCreated(0);
          // Close library dialog
          onOpenChange(false);
        }}
        editingProvider={null}
      />
    </Dialog>
  );
}
