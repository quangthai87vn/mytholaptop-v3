"use client";

import { useState, useEffect } from "react";
import type { Task, Project, Campaign } from "@/lib/workspace/types";
import type { FormOption } from "@/lib/workspace/master-data-helpers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CheckCircle2,
  Link2,
  Upload,
  ExternalLink,
  Clock,
  StickyNote,
} from "lucide-react";
import { toDateOnlyString } from "@/lib/workspace/date-utils";
import { toast } from "sonner";

// ── AssigneeSelector ──────────────────────────────────────────────
function AssigneeSelector({
  assigneeIds,
  staff,
  staffRoleMap,
  disabled,
  onToggle,
}: {
  assigneeIds: string[];
  staff: Array<{ id: string; full_name: string; email: string; role: string }>;
  staffRoleMap: Record<string, string>;
  disabled?: boolean;
  onToggle: (id: string) => void;
}) {
  if (staff.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic px-3 py-2 border border-dashed border-slate-200 rounded-md">
        Chưa có nhân viên nào.
      </p>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          className={
            "flex items-center w-full min-h-9 px-3 py-2 border rounded-md cursor-pointer " +
            "bg-background text-sm font-normal hover:bg-muted/50 transition-colors " +
            (disabled ? "opacity-50 cursor-not-allowed" : "")
          }
        >
          {assigneeIds.length > 0 ? (
            <div className="flex gap-1.5 flex-wrap">
              {assigneeIds.slice(0, 4).map((id) => {
                const s = staff.find((st) => st.id === id);
                if (!s) return null;
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="text-xs h-5 gap-1 font-normal"
                  >
                    {s.full_name.split(" ").slice(-1)[0]}
                    <span className="text-slate-400">·</span>
                    <span className="lowercase">{staffRoleMap[s.id] || s.role}</span>
                  </Badge>
                );
              })}
              {assigneeIds.length > 4 && (
                <Badge variant="secondary" className="text-xs h-5">
                  +{assigneeIds.length - 4}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-sm text-slate-400">Chọn người phụ trách</span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-2" align="start">
        <div className="space-y-1">
          {staff.map((s) => (
            <label
              key={s.id}
              className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-slate-50 cursor-pointer"
            >
              <Checkbox
                checked={assigneeIds.includes(s.id)}
                onCheckedChange={() => onToggle(s.id)}
                disabled={disabled}
              />
              <Avatar className="size-7">
                <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                  {s.full_name
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-700">{s.full_name}</span>
                <span className="text-xs text-slate-400 capitalize">{s.role}</span>
              </div>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── PlatformMultiSelect ──────────────────────────────────────────────
function PlatformMultiSelect({
  values,
  options,
  onToggle,
  disabled,
}: {
  values: string[];
  options: FormOption[];
  disabled?: boolean;
  onToggle: (code: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          className={
            "flex items-center w-full min-h-9 px-3 py-2 border rounded-md cursor-pointer " +
            "bg-background text-sm font-normal hover:bg-muted/50 transition-colors " +
            (disabled ? "opacity-50 cursor-not-allowed" : "")
          }
        >
          {values.length > 0 ? (
            <div className="flex gap-1.5 flex-wrap">
              {values.slice(0, 3).map((code) => {
                const opt = options.find((o) => o.code === code);
                return (
                  <Badge
                    key={code}
                    variant="secondary"
                    className="text-xs h-5 gap-1 font-normal"
                  >
                    {opt?.color && (
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: opt.color }}
                      />
                    )}
                    {opt?.name ?? code}
                  </Badge>
                );
              })}
              {values.length > 3 && (
                <Badge variant="secondary" className="text-xs h-5">
                  +{values.length - 3}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-sm text-slate-400">Chọn nền tảng</span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-2" align="start">
        <div className="space-y-1">
          {options.map((opt) => (
            <label
              key={opt.code}
              className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-slate-50 cursor-pointer"
            >
              <Checkbox
                checked={values.includes(opt.code)}
                onCheckedChange={() => !disabled && onToggle(opt.code)}
                disabled={disabled}
              />
              {opt.color && (
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: opt.color }}
                />
              )}
              <span className="text-sm text-slate-700">{opt.name}</span>
            </label>
          ))}
          {options.length === 0 && (
            <p className="text-xs text-slate-400 px-2 py-2">
              Chưa có nền tảng nào. Thêm trong Danh mục.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── SimpleHtmlEditor ─────────────────────────────────────────────────
// Basic textarea-based editor with HTML mode toggle
function HtmlEditor({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [htmlMode, setHtmlMode] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200">
        <span className="text-xs text-slate-500 font-medium">Kịch bản / Nội dung</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={htmlMode ? "ghost" : "secondary"}
            size="sm"
            className="h-6 text-[11px] px-2"
            onClick={() => setHtmlMode(false)}
          >
            Soạn thảo
          </Button>
          <Button
            type="button"
            variant={htmlMode ? "secondary" : "ghost"}
            size="sm"
            className="h-6 text-[11px] px-2"
            onClick={() => setHtmlMode(true)}
          >
            HTML
          </Button>
        </div>
      </div>
      {/* Editor */}
      {htmlMode ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="<p>Nhập nội dung HTML...</p>"
          rows={12}
          className="border-0 rounded-none font-mono text-sm min-h-[200px]"
        />
      ) : (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={
            placeholder ||
            "Nhập kịch bản nội dung...\n- Mở đầu\n- Nội dung chính\n- Kết luận"
          }
          rows={12}
          className="border-0 rounded-none text-sm min-h-[200px]"
        />
      )}
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────
interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Task>) => Promise<void>;
  task?: Task | null;
  projects?: Project[];
  campaigns?: Campaign[];
  defaultStatus?: string;
  statusOptions?: FormOption[];
  taskTypeOptions?: FormOption[];
  taskTypesWithMeta?: Array<{
    code: string;
    name: string;
    metadata?: Record<string, unknown> | null;
  }>;
  platformOptions?: FormOption[];
  staff?: Array<{
    id: string;
    full_name: string;
    email: string;
    role: string;
  }>;
  staffRoleMap?: Record<string, string>;
  currentUser?: { id: string; role: string } | null;
}

export function TaskForm({
  open,
  onOpenChange,
  onSubmit,
  task,
  projects = [],
  campaigns = [],
  defaultStatus = "idea",
  statusOptions = [],
  taskTypeOptions = [],
  taskTypesWithMeta = [],
  platformOptions = [],
  staff = [],
  staffRoleMap = {},
  currentUser = null,
}: TaskFormProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("require");

  // Tab "Yêu cầu" form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    project_id: "",
    campaign_id: "",
    status: defaultStatus,
    start_date: "",
    due_date: "",
    task_type: "",
    assignee_ids: [] as string[],
    assignee_note: "",
    platforms: [] as string[],
    content_body: "",
  });

  // Tab "Kết quả" form state
  const [result, setResult] = useState({
    website_url: "",
    youtube_url: "",
    tiktok_url: "",
    facebook_url: "",
    output_links: "",
    completion_note: "",
  });

  const isAdmin =
    currentUser?.role === "super_admin" || currentUser?.role === "admin";
  const isCompletedTask = task?.status === "completed";
  const editDisabled = !!task && isCompletedTask && !isAdmin;

  const filteredCampaigns = campaigns.filter(
    (c) => !form.project_id || c.project_id === form.project_id
  );

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const meta = (task?.metadata as Record<string, unknown>) ?? {};
      const platformIds = meta.platform_ids as string[] | undefined;
      setForm({
        title: task?.title ?? "",
        description: task?.description ?? "",
        project_id: task?.project_id ?? "",
        campaign_id: task?.campaign_id ?? "",
        status: task?.status ?? defaultStatus,
        start_date: task?.start_date ?? "",
        due_date: task?.due_date ?? "",
        task_type: task?.task_type ?? "",
        assignee_ids: task?.assignee_ids ?? [],
        assignee_note: (meta.notes as string) ?? "",
        platforms: platformIds?.length ? platformIds : task?.platform ? [task.platform] : [],
        content_body: task?.content_body ?? "",
      });
      setResult({
        website_url: task?.website_url ?? "",
        youtube_url: task?.youtube_url ?? "",
        tiktok_url: task?.tiktok_url ?? "",
        facebook_url: task?.facebook_url ?? "",
        output_links: (task?.output_links ?? []).join(", "),
        completion_note: task?.completion_note ?? "",
      });
      setActiveTab("require");
    }
  }, [open, task, defaultStatus]);

  const toggleAssignee = (id: string) => {
    setForm((f) => ({
      ...f,
      assignee_ids: f.assignee_ids.includes(id)
        ? f.assignee_ids.filter((a) => a !== id)
        : [...f.assignee_ids, id],
    }));
  };

  const togglePlatform = (code: string) => {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(code)
        ? f.platforms.filter((p) => p !== code)
        : [...f.platforms, code],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Tiêu đề không được để trống");
      return;
    }
    setLoading(true);
    try {
      const startDate = toDateOnlyString(form.start_date);
      const dueDate = toDateOnlyString(form.due_date);
      const outputLinks = result.output_links
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await onSubmit({
        title: form.title,
        description: form.description || undefined,
        project_id: form.project_id || undefined,
        campaign_id: form.campaign_id || undefined,
        status: (form.status || defaultStatus) as Task["status"],
        start_date: startDate ?? undefined,
        due_date: dueDate ?? undefined,
        task_type: form.task_type || undefined,
        assignee_ids: form.assignee_ids,
        metadata: {
          ...(form.assignee_note ? { notes: form.assignee_note } : {}),
          ...(form.platforms.length > 0 ? { platform_ids: form.platforms } : {}),
        },
        content_body: form.content_body || undefined,
        output_links: outputLinks.length > 0 ? outputLinks : undefined,
        completion_note: result.completion_note || undefined,
        website_url: result.website_url || undefined,
        youtube_url: result.youtube_url || undefined,
        tiktok_url: result.tiktok_url || undefined,
        facebook_url: result.facebook_url || undefined,
      } as Partial<Task>);

      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-7xl w-[98vw] max-h-[95vh] overflow-hidden flex flex-col p-0"
        aria-describedby="task-form-desc"
      >
        <span id="task-form-desc" className="sr-only">
          Form tạo hoặc chỉnh sửa công việc
        </span>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="contents">
          {/* Header — sticky */}
          <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-900">
                {task ? "Sửa công việc" : "Tạo công việc mới"}
              </DialogTitle>
              {!isAdmin && task && isCompletedTask && (
                <p className="text-xs text-amber-600 mt-0.5">
                  Công việc đã hoàn thành. Chỉ Admin mới được phép chỉnh sửa.
                </p>
              )}
            </div>
            {/* Footer buttons in header for fullscreen */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                type="button"
              >
                Huỷ
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={loading || (!editDisabled && !form.title.trim())}
                type="submit"
              >
                {loading ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </div>

          {/* Tab navigation */}
          <TabsList className="h-9 mt-3">
              <TabsTrigger value="require" className="gap-1.5 text-sm h-8">
                <StickyNote className="size-3.5" />
                Yêu cầu
              </TabsTrigger>
              <TabsTrigger value="result" className="gap-1.5 text-sm h-8">
                <CheckCircle2 className="size-3.5" />
                Kết quả
              </TabsTrigger>
            </TabsList>
          </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          {/* ── Tab: Yêu cầu ─────────────────────────────── */}
          <TabsContent value="require" className="px-6 py-5">
            {/* 2-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT: Yêu cầu nội dung */}
              <div className="space-y-5">
                <div className="text-xs font-semibold text-slate-500 pb-2 border-b border-slate-200">
                  YÊU CẦU NỘI DUNG
                </div>

                {/* Tiêu đề */}
                <div className="space-y-1.5">
                  <Label htmlFor="title">
                    Tiêu đề công việc <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="VD: Viết bài Facebook về Summer Sale 2026"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    disabled={editDisabled}
                    required
                  />
                </div>

                {/* Mô tả */}
                <div className="space-y-1.5">
                  <Label htmlFor="description">Mô tả / Yêu cầu chi tiết</Label>
                  <Textarea
                    id="description"
                    placeholder="Chi tiết công việc, hướng dẫn chung..."
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    disabled={editDisabled}
                  />
                </div>

                {/* Dự án + Chiến dịch */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Dự án</Label>
                    <Select
                      value={form.project_id}
                      onValueChange={(v) => {
                        const campaignStillValid = form.campaign_id &&
                          campaigns.some((c) => c.id === form.campaign_id && c.project_id === v);
                        setForm((f) => ({
                          ...f,
                          project_id: v,
                          campaign_id: campaignStillValid ? f.campaign_id : "",
                        }));
                      }}
                      disabled={editDisabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn dự án" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="flex items-center gap-2">
                              <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                              {p.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Chiến dịch</Label>
                    <Select
                      value={form.campaign_id}
                      onValueChange={(v) => setForm((f) => ({ ...f, campaign_id: v }))}
                      disabled={!form.project_id || editDisabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={form.project_id ? "Chọn chiến dịch" : "Chọn dự án trước"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCampaigns.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Người phụ trách */}
                <div className="space-y-1.5">
                  <Label>Người phụ trách</Label>
                  <AssigneeSelector
                    assigneeIds={form.assignee_ids}
                    staff={staff}
                    staffRoleMap={staffRoleMap}
                    disabled={editDisabled}
                    onToggle={toggleAssignee}
                  />
                </div>

                {/* Ngày bắt đầu + Hạn chót */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Ngày bắt đầu</Label>
                    <DatePicker
                      value={form.start_date}
                      onChange={(v) => setForm((f) => ({ ...f, start_date: v ?? "" }))}
                      disabled={editDisabled}
                      placeholder="Chọn ngày"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Hạn chót</Label>
                    <DatePicker
                      value={form.due_date}
                      onChange={(v) => setForm((f) => ({ ...f, due_date: v ?? "" }))}
                      disabled={editDisabled}
                      placeholder="Chọn ngày"
                    />
                  </div>
                </div>

                {/* Loại công việc + Nền tảng */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Loại công việc</Label>
                    <Select
                      value={form.task_type}
                      onValueChange={(v) => {
                        const selectedType = taskTypesWithMeta.find((t) => t.code === v);
                        const meta = selectedType?.metadata as Record<string, unknown> | undefined;
                        const rawDefault = meta?.default_platform_ids as string[] | null | undefined;
                        const defaultIds: string[] | null = Array.isArray(rawDefault) ? rawDefault : null;
                        const newPlatforms = form.platforms.length === 0 && defaultIds ? defaultIds : form.platforms;
                        setForm((f) => ({ ...f, task_type: v, platforms: newPlatforms }));
                      }}
                      disabled={editDisabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại" />
                      </SelectTrigger>
                      <SelectContent>
                        {taskTypeOptions.map((opt) => (
                          <SelectItem key={opt.code} value={opt.code}>
                            <span className="flex items-center gap-2">
                              {opt.color && (
                                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                              )}
                              {opt.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Nền tảng</Label>
                    <PlatformMultiSelect
                      values={form.platforms}
                      options={platformOptions}
                      disabled={editDisabled}
                      onToggle={togglePlatform}
                    />
                  </div>
                </div>

                {/* Ghi chú cho người thực hiện */}
                <div className="space-y-1.5">
                  <Label htmlFor="assignee_note">Ghi chú cho người thực hiện</Label>
                  <Textarea
                    id="assignee_note"
                    placeholder="Hướng dẫn chi tiết, lưu ý đặc biệt..."
                    rows={2}
                    value={form.assignee_note}
                    disabled={editDisabled}
                    onChange={(e) => setForm((f) => ({ ...f, assignee_note: e.target.value }))}
                  />
                </div>

                {/* Trạng thái */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Trạng thái</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((opt) => (
                        <SelectItem key={opt.code} value={opt.code}>
                          <span className="flex items-center gap-2">
                            {opt.color && (
                              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                            )}
                            {opt.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* RIGHT: Kịch bản */}
              <div className="space-y-5">
                <div className="text-xs font-semibold text-slate-500 pb-2 border-b border-slate-200">
                  KỊCH BẢN / NỘI DUNG CHÍNH
                </div>
                <HtmlEditor
                  value={form.content_body}
                  onChange={(v) => setForm((f) => ({ ...f, content_body: v }))}
                  disabled={editDisabled}
                  placeholder={
                    form.task_type === "video"
                      ? "0:00 - Mở đầu (hook 3s)\n0:03 - Giới thiệu sản phẩm\n0:30 - Demo tính năng\n1:00 - Call to action"
                      : form.task_type === "image"
                      ? "Màu chủ đạo: đỏ trắng\nHình ảnh chính: laptop gaming\nText: Summer Sale - Giảm đến 30%\nLayout: 1:3:1"
                      : "1. Mở đầu\n2. Giới thiệu\n3. Nội dung chính\n4. Kết luận / Call to action"
                  }
                />
                <p className="text-xs text-slate-400">
                  Dùng tab "Soạn thảo" để nhập nội dung thông thường, hoặc tab "HTML" để nhập mã HTML.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab: Kết quả ──────────────────────────────── */}
          <TabsContent value="result" className="px-6 py-5">
            <div className="max-w-2xl space-y-6">
              <div className="text-xs font-semibold text-slate-500 pb-2 border-b border-slate-200">
                LINK NỀN TẢNG ĐÃ XUẤT BẢN
              </div>

              {/* 4 platform link fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="website_url" className="flex items-center gap-1.5 text-xs text-slate-500">
                    <ExternalLink className="size-3" />
                    Website
                  </Label>
                  <Input
                    id="website_url"
                    placeholder="https://mytholaptop.vn/..."
                    value={result.website_url}
                    onChange={(e) => setResult((r) => ({ ...r, website_url: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="youtube_url" className="flex items-center gap-1.5 text-xs text-slate-500">
                    <ExternalLink className="size-3" />
                    YouTube
                  </Label>
                  <Input
                    id="youtube_url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={result.youtube_url}
                    onChange={(e) => setResult((r) => ({ ...r, youtube_url: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tiktok_url" className="flex items-center gap-1.5 text-xs text-slate-500">
                    <ExternalLink className="size-3" />
                    TikTok
                  </Label>
                  <Input
                    id="tiktok_url"
                    placeholder="https://tiktok.com/@user/video/..."
                    value={result.tiktok_url}
                    onChange={(e) => setResult((r) => ({ ...r, tiktok_url: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="facebook_url" className="flex items-center gap-1.5 text-xs text-slate-500">
                    <ExternalLink className="size-3" />
                    Fanpage/Facebook
                  </Label>
                  <Input
                    id="facebook_url"
                    placeholder="https://fb.com/mytholaptop/..."
                    value={result.facebook_url}
                    onChange={(e) => setResult((r) => ({ ...r, facebook_url: e.target.value }))}
                  />
                </div>
              </div>

              {/* File/Asset đã nộp */}
              <div className="space-y-1.5">
                <Label htmlFor="output_links" className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Upload className="size-3" />
                  File/Asset đã nộp
                </Label>
                <Input
                  id="output_links"
                  placeholder="Nhiều link phân cách bằng dấu phẩy"
                  value={result.output_links}
                  onChange={(e) => setResult((r) => ({ ...r, output_links: e.target.value }))}
                />
                <p className="text-xs text-slate-400">Nhiều link phân cách bằng dấu phẩy</p>
              </div>

              {/* Ghi chú hoàn thành */}
              <div className="space-y-1.5">
                <Label htmlFor="completion_note" className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="size-3" />
                  Ghi chú hoàn thành
                </Label>
                <Textarea
                  id="completion_note"
                  placeholder="Mô tả kết quả đã hoàn thành, thay đổi so với yêu cầu, link drive lưu file gốc..."
                  rows={3}
                  value={result.completion_note}
                  onChange={(e) => setResult((r) => ({ ...r, completion_note: e.target.value }))}
                />
              </div>

              {/* Previously submitted info */}
              {task?.submitted_at && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                  <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">Đã nộp: </span>
                    {new Date(task.submitted_at).toLocaleString("vi-VN")}
                    {task.submitted_by && <> bởi <span className="font-medium">{task.submitted_by}</span></>}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
