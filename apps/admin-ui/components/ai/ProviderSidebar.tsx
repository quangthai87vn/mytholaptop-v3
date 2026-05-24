"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Search,
  WifiOff,
  Zap,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProviderCard } from "@/types/ai-operating";
import { ProviderListItem } from "./ProviderListItem";
import { ProviderLibraryDialog } from "./ProviderLibraryDialog";
import { ProviderFormDialog } from "./ProviderFormDialog";

interface ProviderSidebarProps {
  providers: ProviderCard[];
  selectedProvider: ProviderCard | null;
  onSelect: (p: ProviderCard) => void;
  onRefresh: () => void;
}

type FilterStatus = "all" | "active" | "inactive" | "connected";

export function ProviderSidebar({
  providers,
  selectedProvider,
  onSelect,
  onRefresh,
}: ProviderSidebarProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<ProviderCard | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Apply filters on client side
  const filtered = providers.filter((p) => {
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = (p.name || "").toLowerCase();
      const slug = (p.slug || "").toLowerCase();
      if (!name.includes(q) && !slug.includes(q)) return false;
    }
    // Status filter
    if (filterStatus === "active" && p.status !== "active") return false;
    if (filterStatus === "inactive" && p.status !== "inactive") return false;
    if (filterStatus === "connected" && p.connection_status !== "connected") return false;
    return true;
  });

  const activeCount = providers.filter((p) => p.status === "active").length;
  const connectedCount = providers.filter((p) => p.connection_status === "connected").length;
  const defaultProvider = providers.find((p) => p.is_default);

  const handleEdit = (p: ProviderCard) => {
    setEditProvider(p);
    setEditOpen(true);
  };

  const handleCreated = (id: number) => {
    onRefresh();
  };

  const handleEditSaved = async (_data: { id: number; name: string }) => {
    setEditOpen(false);
    setEditProvider(null);
    onRefresh();
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-primary" />
              <span className="text-sm font-semibold">AI Providers</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="size-6"
              onClick={() => setLibraryOpen(true)}
              title="Thêm provider mới"
            >
              <Plus className="size-4" />
            </Button>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-green-500" />
              {connectedCount} connected
            </div>
            <div className="text-[10px] text-muted-foreground/50">·</div>
            <div className="text-[10px] text-muted-foreground">
              {activeCount} active
            </div>
            {defaultProvider && (
              <>
                <div className="text-[10px] text-muted-foreground/50">·</div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400">
                  ★ {defaultProvider.name}
                </div>
              </>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm provider..."
              className="pl-7 h-8 text-xs"
            />
          </div>

          {/* Filter */}
          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as FilterStatus)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SlidersHorizontal className="size-3 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="connected">Connected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Provider list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <WifiOff className="size-5 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                {providers.length === 0 ? "Chưa có provider nào" : "Không tìm thấy"}
              </p>
              {providers.length === 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs mt-3"
                  onClick={() => setLibraryOpen(true)}
                >
                  <Plus className="size-3.5" />
                  Thêm Provider
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered
                .sort((a, b) => {
                  // Default first, then by name
                  if (a.is_default && !b.is_default) return -1;
                  if (!a.is_default && b.is_default) return 1;
                  return (a.name || "").localeCompare(b.name || "");
                })
                .map((p) => (
                  <ProviderListItem
                    key={p.id}
                    provider={p}
                    isSelected={selectedProvider?.id === p.id}
                    isDefault={p.is_default ?? false}
                    onSelect={onSelect}
                    onEdit={handleEdit}
                    onDeleted={onRefresh}
                    onRefresh={onRefresh}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Footer: Add button */}
        <div className="px-3 py-2 border-t">
          <Button
            variant="outline"
            className="w-full gap-2 h-9 text-xs"
            onClick={() => setLibraryOpen(true)}
          >
            <Plus className="size-3.5" />
            Thêm Provider
          </Button>
        </div>
      </div>

      {/* Provider Library Dialog */}
      <ProviderLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onCreated={handleCreated}
      />

      {/* Edit Dialog */}
      {editOpen && (
        <ProviderFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={handleEditSaved}
          editingProvider={editProvider}
        />
      )}
    </>
  );
}
