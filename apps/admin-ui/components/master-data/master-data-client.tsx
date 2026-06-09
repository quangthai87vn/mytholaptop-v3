"use client";

import React, { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { adminFetch } from "@/lib/api/admin-fetch";
import type {
  MasterDataItem,
  MasterDataCategory,
  CreateMasterDataInput,
  UpdateMasterDataInput,
} from "@/lib/workspace/types-master-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Palette,
  Tag,
  ChevronDown,
  ChevronRight,
  Workflow,
} from "lucide-react";

const LUCIDE_ICONS = [
  "FileText", "Tag", "Users", "CheckCircle2", "XCircle", "AlertTriangle",
  "ArrowUp", "ArrowDown", "Minus", "Check", "Lightbulb", "PenLine",
  "Pencil", "Video", "Camera", "Paintbrush", "Radio", "Globe", "Mail",
  "Search", "Facebook", "Youtube", "Instagram", "Megaphone", "Building2",
  "Server", "ShoppingCart", "Hash", "Gauge", "GitBranch", "ListTodo",
  "Eye", "Loader", "Scissors", "CalendarCheck", "Archive", "CircleDot",
  "MessageCircle", "Shield",
];

// ── Helper Components ─────────────────────────────────────────────────

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const presets = [
    "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
    "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#1e293b",
    "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0891b2",
    "#2563eb", "#7c3aed", "#db2777", "#475569", "#0f172a",
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#6b7280"}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-9 rounded border border-slate-300 cursor-pointer"
        />
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#6b7280"
          className="flex-1 font-mono text-sm"
          maxLength={9}
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {presets.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className="w-6 h-6 rounded border border-slate-200 cursor-pointer hover:scale-110 transition-transform"
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>
    </div>
  );
}

function IconSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = LUCIDE_ICONS.filter((icon) =>
    icon.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tên icon (VD: FileText)"
          className="flex-1 font-mono text-sm"
        />
        <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
          <Tag className="size-4" />
        </Button>
      </div>
      {open ? (
        <div className="mt-2 border rounded-lg p-3 bg-white shadow-md max-h-[200px] overflow-y-auto">
          <Input
            placeholder="Tìm icon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 h-8 text-sm"
          />
          <div className="grid grid-cols-6 gap-1">
            {filtered.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => { onChange(icon); setOpen(false); setSearch(""); }}
                className={
                  "flex flex-col items-center justify-center py-1.5 rounded text-xs cursor-pointer border transition-colors " +
                  (value === icon
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-slate-200 hover:border-slate-400 text-slate-600")
                }
              >
                <span className="text-[10px] truncate w-full text-center">{icon}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── SortIcon (module-level) ──────────────────────────────────────────

function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: "name" | "sort_order";
  sortField: "name" | "sort_order";
  sortDir: "asc" | "desc";
}) {
  return (
    <span className="inline-flex ml-1">
      {sortField === field ? (
        sortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
      ) : (
        <span className="size-3 text-slate-300" />
      )}
    </span>
  );
}

// ── Workflow type options ────────────────────────────────────────────

const WORKFLOW_TYPE_OPTIONS = [
  { value: "facebook_post", label: "Bài Facebook" },
  { value: "seo_article", label: "Bài SEO" },
  { value: "tiktok_video", label: "Video TikTok" },
  { value: "youtube_video", label: "Video YouTube" },
  { value: "image_design", label: "Thiết kế hình ảnh" },
  { value: "product_photo", label: "Chụp ảnh sản phẩm" },
  { value: "livestream", label: "Livestream" },
  { value: "other", label: "Khác" },
];

// ── ItemFormDialog ───────────────────────────────────────────────────

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateMasterDataInput | UpdateMasterDataInput) => Promise<void>;
  item?: MasterDataItem | null;
  loading: boolean;
  category: MasterDataCategory;
}

function ItemFormDialog({
  open,
  onOpenChange,
  onSubmit,
  item,
  loading,
  category,
}: ItemFormDialogProps) {
  const getWorkflowConfig = (it: MasterDataItem | null | undefined) => {
    if (!it?.metadata || typeof it.metadata !== "object") {
      return { creates_workflow: false, workflow_type: "" };
    }
    const m = it.metadata as Record<string, unknown>;
    return {
      creates_workflow: m.creates_workflow === true,
      workflow_type: typeof m.workflow_type === "string" ? m.workflow_type : "",
    };
  };

  const defaultForm = () => {
    const wf = getWorkflowConfig(item);
    return {
      name: item?.name ?? "",
      code: item?.code ?? "",
      description: item?.description ?? "",
      color: item?.color ?? "#6b7280",
      bg_color: item?.bg_color ?? "#f3f4f6",
      icon: item?.icon ?? "",
      sort_order: item?.sort_order ?? 0,
      is_active: item?.is_active ?? true,
      creates_workflow: wf.creates_workflow,
      workflow_type: wf.workflow_type,
    };
  };

  const [form, setForm] = useState(defaultForm());
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(defaultForm());
      setShowDisplaySettings(false);
    }
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) return;
    if (!item && !form.code?.trim()) return;

    const metadata: Record<string, unknown> | undefined =
      category === "task_type"
        ? {
            creates_workflow: form.creates_workflow,
            ...(form.creates_workflow && form.workflow_type
              ? { workflow_type: form.workflow_type }
              : {}),
          }
        : undefined;

    const payload = item
      ? { ...form, metadata }
      : { ...form, category, metadata };
    await onSubmit(payload);
  };

  const isTaskType = category === "task_type";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Sửa danh mục" : "Thêm danh mục mới"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tên hiển thị <span className="text-red-500">*</span></Label>
              <Input
                value={form.name || ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="VD: Bài Facebook"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Code <span className="text-red-500">*</span>
                {item ? <span className="text-slate-400 font-normal ml-1">(không đổi được)</span> : null}
              </Label>
              <Input
                value={form.code || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toLowerCase().replace(/\s+/g, "_") }))
                }
                placeholder="VD: facebook_post"
                required
                disabled={!!item}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Mô tả</Label>
            <Textarea
              value={form.description || ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Mô tả ngắn về danh mục này..."
              rows={2}
            />
          </div>

          {isTaskType ? (
            <div className="border border-primary/20 bg-primary/5 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Workflow className="size-4" />
                Cấu hình Workflow tự động
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm cursor-pointer" htmlFor="creates_workflow">
                    Tạo Workflow khi giao việc
                  </Label>
                  <p className="text-xs text-slate-500">
                    Bật nếu loại công việc này tạo ra nội dung/media cần theo dõi trong Workflow.
                  </p>
                </div>
                <Switch
                  id="creates_workflow"
                  checked={form.creates_workflow}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, creates_workflow: v }))}
                />
              </div>

              {form.creates_workflow ? (
                <div className="space-y-1.5">
                  <Label htmlFor="workflow_type">Workflow type</Label>
                  <Select
                    value={form.workflow_type}
                    onValueChange={(v) => setForm((f) => ({ ...f, workflow_type: v }))}
                  >
                    <SelectTrigger id="workflow_type" className="w-full">
                      <SelectValue placeholder="Chọn loại workflow" />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKFLOW_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400">
                    Nếu bỏ trống, dùng chính code của loại công việc.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2 px-3 py-2 bg-white rounded border border-slate-200 text-xs text-slate-500">
                  <Workflow className="size-3.5 shrink-0 mt-0.5 text-slate-400" />
                  <span>Không tạo workflow — chỉ tạo công việc thông thường.</span>
                </div>
              )}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              onClick={() => setShowDisplaySettings((s) => !s)}
            >
              {showDisplaySettings ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              Tuỳ chỉnh hiển thị (màu, icon, thứ tự)
            </button>

            {showDisplaySettings ? (
              <div className="space-y-3 pt-1 border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="space-y-1.5">
                  <Label>Màu chính</Label>
                  <ColorInput
                    value={form.color || ""}
                    onChange={(v) => setForm((f) => ({ ...f, color: v }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Tên icon (Lucide)</Label>
                  <IconSelect
                    value={form.icon || ""}
                    onChange={(v) => setForm((f) => ({ ...f, icon: v }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Thứ tự</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.sort_order || 0}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))
                      }
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Trạng thái</Label>
                    <div className="flex items-center gap-3 h-9">
                      <Switch
                        checked={form.is_active ?? true}
                        onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                      />
                      <span className="text-sm text-slate-600">
                        {form.is_active ? "Đang hoạt động" : "Tạm ngưng"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Xem trước</Label>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium border"
                      style={{
                        color: form.color || "#6b7280",
                        backgroundColor: form.bg_color || "#f3f4f6",
                        borderColor: form.color || "#6b7280",
                      }}
                    >
                      {form.name || "Tên danh mục"}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading || !form.name?.trim() || (!item && !form.code?.trim())}
            >
              {loading ? "Đang lưu..." : item ? "Lưu thay đổi" : "Tạo mới"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── MasterDataClient ──────────────────────────────────────────────────

interface MasterDataClientProps {
  category: MasterDataCategory;
  items: MasterDataItem[];
  /** INTERN: no access to create/edit/delete */
  isIntern?: boolean;
}

export function MasterDataClient({
  category,
  items: initialItems,
  isIntern = false,
}: MasterDataClientProps) {
  const [items, setItems] = useState<MasterDataItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MasterDataItem | null>(null);
  const [pendingRestore, setPendingRestore] = useState<MasterDataItem | null>(null);
  const [sortField, setSortField] = useState<"name" | "sort_order">("sort_order");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const isTaskType = category === "task_type";

  const filtered = items
    .filter((item) => {
      if (!showInactive && !item.is_active) return false;
      if (
        search &&
        !item.name.toLowerCase().includes(search.toLowerCase()) &&
        !item.code.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aVal = sortField === "sort_order" ? a.sort_order : a.name;
      const bVal = sortField === "sort_order" ? b.sort_order : b.name;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

  const handleSort = (field: "name" | "sort_order") => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const handleSubmit = async (data: CreateMasterDataInput | UpdateMasterDataInput) => {
    setLoading(true);
    try {
      if (editingItem) {
        const res = await adminFetch(`/api/master-data?id=${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Cập nhật thất bại");
        }
        const result = await res.json();
        setItems((prev) => prev.map((i) => (i.id === editingItem.id ? result.data : i)));
        toast.success("Đã cập nhật danh mục");
      } else {
        const res = await adminFetch("/api/master-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, category }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Tạo thất bại");
        }
        const result = await res.json();
        setItems((prev) => [result.data, ...prev]);
        toast.success("Đã thêm danh mục mới");
      }
      setShowForm(false);
      setEditingItem(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (item: MasterDataItem) => {
    setPendingDelete(item);
  };

  const executeDelete = async () => {
    if (!pendingDelete) return;
    try {
      const res = await adminFetch(`/api/master-data?id=${pendingDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.code === "STATUS_IN_USE") {
          toast.error(err.error);
          setPendingDelete(null);
          return;
        }
        throw new Error(err.error || "Xóa thất bại");
      }
      setItems((prev) => prev.filter((i) => i.id !== pendingDelete.id));
      toast.success(`Đã xóa "${pendingDelete.name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    }
    setPendingDelete(null);
  };

  const handleRestore = (item: MasterDataItem) => {
    setPendingRestore(item);
  };

  const executeRestore = async () => {
    if (!pendingRestore) return;
    try {
      const res = await adminFetch(
        `/api/master-data?id=${pendingRestore.id}&action=restore`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Khôi phục thất bại");
      const updated = await (await adminFetch(`/api/master-data?category=${category}`)).json();
      setItems(updated.data);
      toast.success(`Đã khôi phục "${pendingRestore.name}"`);
    } catch {
      toast.error("Khôi phục thất bại");
    }
    setPendingRestore(null);
  };

  // Column count: always 7, but content differs by category
  const colSpan = 7;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Tìm kiếm theo tên hoặc code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showInactive ? "default" : "outline"}
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
            className="h-9 gap-1"
          >
            {showInactive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            {showInactive ? "Đã ẩn" : "Tất cả"}
          </Button>

          {!isIntern && (
            <Button
              onClick={() => {
                setEditingItem(null);
                setShowForm(true);
              }}
              className="gap-2 h-9"
            >
              <Plus className="size-4" />
              Thêm mới
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span>{filtered.length} danh mục</span>
        <span className="text-slate-300">|</span>
        <span className="text-green-600">{items.filter((i) => i.is_active).length} đang hoạt động</span>
        {!showInactive && items.some((i) => !i.is_active) ? (
          <>
            <span className="text-slate-300">|</span>
            <span className="text-orange-500">{items.filter((i) => !i.is_active).length} đã ẩn</span>
          </>
        ) : null}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[80px]" onClick={() => handleSort("sort_order")}>
                  Thứ tự <SortIcon field="sort_order" sortField={sortField} sortDir={sortDir} />
                </TableHead>
                <TableHead className="min-w-[160px]" onClick={() => handleSort("name")}>
                  Tên <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
                </TableHead>
                <TableHead className="w-[140px]">Code</TableHead>
                {isTaskType ? (
                  <React.Fragment>
                    <TableHead className="w-[100px]">Tạo Workflow</TableHead>
                    <TableHead className="w-[140px]">Workflow type</TableHead>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <TableHead className="w-[80px]">Màu</TableHead>
                    <TableHead className="w-[80px]">Icon</TableHead>
                  </React.Fragment>
                )}
                <TableHead className="w-[90px]">Trạng thái</TableHead>
                <TableHead className="w-[120px] text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="text-center py-12 text-slate-400">
                    Chưa có danh mục nào
                  </TableCell>
                </TableRow>
              ) : isTaskType ? (
                filtered.map((item) => {
                  const wfCfg = item.metadata && typeof item.metadata === "object"
                    ? (item.metadata as Record<string, unknown>)
                    : null;
                  const createsWorkflow = wfCfg?.creates_workflow === true;
                  const workflowType =
                    typeof wfCfg?.workflow_type === "string" ? wfCfg.workflow_type : null;
                  return (
                    <TableRow
                      key={item.id}
                      className={!item.is_active ? "opacity-50 bg-slate-50" : ""}
                    >
                      <TableCell className="font-mono text-sm text-slate-500">
                        {item.sort_order}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-slate-900">{item.name}</span>
                          {item.description ? (
                            <span className="text-xs text-slate-400 line-clamp-1">
                              {item.description}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">
                          {item.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        {createsWorkflow ? (
                          <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                            <Workflow className="size-3 mr-1" />
                            Có
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs text-slate-500">
                            Không
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {createsWorkflow ? (
                          <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">
                            {workflowType ?? item.code}
                          </code>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_active ? "default" : "secondary"} className="text-xs">
                          {item.is_active ? "Hoạt động" : "Tạm ngưng"}
                        </Badge>
                      </TableCell>
                      {!isIntern && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingItem(item);
                              setShowForm(true);
                            }}
                            title="Sửa"
                          >
                            <Pencil className="size-3.5 text-slate-500" />
                          </Button>
                          {!item.is_active ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleRestore(item)}
                              title="Khôi phục"
                            >
                              <RotateCcw className="size-3.5 text-green-500" />
                            </Button>
                          ) : null}
                          {item.is_active && !item.is_system ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDelete(item)}
                              title="Xóa"
                            >
                              <Trash2 className="size-3.5 text-red-500" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                      )}
                    </TableRow>
                  );
                })
              ) : (
                filtered.map((item) => (
                  <TableRow
                    key={item.id}
                    className={!item.is_active ? "opacity-50 bg-slate-50" : ""}
                  >
                    <TableCell className="font-mono text-sm text-slate-500">
                      {item.sort_order}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-slate-900">{item.name}</span>
                        {item.description ? (
                          <span className="text-xs text-slate-400 line-clamp-1">
                            {item.description}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">
                        {item.code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="size-4 rounded border border-slate-200"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs text-slate-500 font-mono">{item.color}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.icon ? (
                        <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                          {item.icon}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? "default" : "secondary"} className="text-xs">
                        {item.is_active ? "Hoạt động" : "Tạm ngưng"}
                      </Badge>
                    </TableCell>
                    {!isIntern && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setEditingItem(item);
                            setShowForm(true);
                          }}
                          title="Sửa"
                        >
                          <Pencil className="size-3.5 text-slate-500" />
                        </Button>
                        {!item.is_active ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleRestore(item)}
                            title="Khôi phục"
                          >
                            <RotateCcw className="size-3.5 text-green-500" />
                          </Button>
                        ) : null}
                        {item.is_active && !item.is_system ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDelete(item)}
                            title="Xóa"
                          >
                            <Trash2 className="size-3.5 text-red-500" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <ItemFormDialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditingItem(null);
          }
        }}
        onSubmit={handleSubmit}
        item={editingItem}
        loading={loading}
        category={category}
      />

      {/* Delete confirmation */}
      {pendingDelete ? (
        <ConfirmDialog
          open
          onOpenChange={() => setPendingDelete(null)}
          title="Xóa danh mục"
          description={`Bạn có chắc muốn xóa "${pendingDelete.name}"?`}
          warning="Hành động này sẽ ẩn danh mục khỏi hệ thống nhưng có thể khôi phục."
          confirmLabel="Xóa"
          variant="destructive"
          onConfirm={executeDelete}
        />
      ) : null}

      {/* Restore confirmation */}
      {pendingRestore ? (
        <ConfirmDialog
          open
          onOpenChange={() => setPendingRestore(null)}
          title="Khôi phục danh mục"
          description={`Bạn có chắc muốn khôi phục "${pendingRestore.name}"?`}
          confirmLabel="Khôi phục"
          variant="default"
          onConfirm={executeRestore}
        />
      ) : null}
    </div>
  );
}
