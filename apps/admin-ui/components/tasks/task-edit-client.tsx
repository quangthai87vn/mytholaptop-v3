"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Task, Project, Campaign, TaskStatus } from "@/lib/workspace/types";
import type { FormOption } from "@/lib/workspace/master-data-helpers";
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
import { Separator } from "@/components/ui/separator";
import { adminFetch } from "@/lib/api/admin-fetch";
import { toast } from "sonner";
import { toDateOnlyString } from "@/lib/workspace/date-utils";
import {
  CheckCircle2,
  ExternalLink,
  Upload,
  Clock,
  StickyNote,
  ArrowLeft,
  Globe,
  Youtube,
  Music2,
  Facebook,
  Save,
  Loader2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Link2,
  Code,
  RotateCcw,
  RotateCw,
  Palette,
} from "lucide-react";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import TiptapUnderline from "@tiptap/extension-underline";
import TiptapLink from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import TiptapColor from "@tiptap/extension-color";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";

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
            "flex items-center w-full min-h-10 px-3 py-2 border rounded-md cursor-pointer " +
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
            "flex items-center w-full min-h-10 px-3 py-2 border rounded-md cursor-pointer " +
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

// ── RichTextEditor (Tiptap) ─────────────────────────────────────────
interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

function RichTextEditor({ value, onChange, disabled, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      TiptapUnderline,
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-blue-600 underline" },
      }),
      TextStyle,
      TiptapColor,
      Placeholder.configure({
        placeholder: placeholder || "Nhập kịch bản / nội dung chính...",
        emptyEditorClass: "is-editor-empty",
      }),
      CharacterCount,
    ],
    content: value || "",
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Nhập URL:", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      {!disabled && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-slate-50 border-b border-slate-200">
        {/* Undo/Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Hoàn tác">
          <RotateCcw className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Làm lại">
          <RotateCw className="size-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
          className="font-bold text-xs px-2"
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
          className="font-bold text-xs px-2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
          className="font-bold text-xs px-2"
        >
          H3
        </ToolbarButton>

        <ToolbarDivider />

        {/* Text format */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="In đậm (Ctrl+B)"
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="In nghiêng (Ctrl+I)"
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Gạch chân (Ctrl+U)"
        >
          <Underline className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Gạch ngang"
        >
          <Strikethrough className="size-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Căn trái"
        >
          <AlignLeft className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Căn giữa"
        >
          <AlignCenter className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Căn phải"
        >
          <AlignRight className="size-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Danh sách không thứ tự"
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Danh sách có thứ tự"
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Trích dẫn"
        >
          <Quote className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="Mã nguồn"
        >
          <Code className="size-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Link */}
        <ToolbarButton
          onClick={setLink}
          active={editor.isActive("link")}
          title="Chèn liên kết"
        >
          <Link2 className="size-3.5" />
        </ToolbarButton>

        {/* Color */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-center size-7 rounded hover:bg-slate-200 transition-colors"
              title="Màu chữ"
              disabled={disabled}
            >
              <Palette className="size-3.5 text-slate-600" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="flex flex-wrap gap-1 w-36">
              {["#E60012", "#000000", "#374151", "#1D4ED8", "#047857", "#9333EA", "#C2410C", "#666666"].map((c) => (
                <button
                  key={c}
                  type="button"
                  className="size-6 rounded border border-slate-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  onClick={() => editor.chain().focus().setColor(c).run()}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <ToolbarDivider />

        {/* Character count */}
        <span className="text-xs text-slate-400 ml-1">
          {editor.storage.characterCount?.characters() ?? 0} ký tự
        </span>
      </div>
      )}

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className={
          "prose prose-sm max-w-none " +
          "px-4 py-3 min-h-[320px] max-h-[60vh] overflow-y-auto " +
          "focus-within:outline-none " +
          (disabled ? "bg-slate-50/40 text-slate-700" : "")
        }
      />
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
  className,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={
        "flex items-center justify-center size-7 rounded transition-colors " +
        (active
          ? "bg-slate-200 text-slate-900"
          : "text-slate-600 hover:bg-slate-200 hover:text-slate-900") +
        (disabled ? " opacity-40 cursor-not-allowed" : "") +
        (className ? " " + className : "")
      }
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-slate-200 mx-0.5" />;
}

// ── Props ────────────────────────────────────────────────────────
interface TaskEditClientProps {
  task: Task | null;
  projects: Project[];
  campaigns: Campaign[];
  statusOptions: FormOption[];
  taskTypeOptions: FormOption[];
  taskTypesWithMeta?: Array<{
    code: string;
    name: string;
    metadata?: Record<string, unknown> | null;
  }>;
  platformOptions: FormOption[];
  staff: Array<{ id: string; full_name: string; email: string; role: string }>;
  staffRoleMap: Record<string, string>;
  currentUser?: { id: string; role: string } | null;
  createMode?: boolean;
  defaultStatus?: string;
}

export function TaskEditClient({
  task,
  projects,
  campaigns,
  statusOptions,
  taskTypeOptions,
  taskTypesWithMeta = [],
  platformOptions,
  staff,
  staffRoleMap,
  currentUser,
  createMode = false,
  defaultStatus,
}: TaskEditClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"require" | "result">("require");

  const isAdmin =
    currentUser?.role === "super_admin" || currentUser?.role === "admin";
  const isCompletedTask = task?.status === "completed";
  const editDisabled = !createMode && isCompletedTask && !isAdmin;

  // ── Form state ────────────────────────────────────────────────
  const [formState, setFormState] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    project_id: task?.project_id ?? "",
    campaign_id: task?.campaign_id ?? "",
    status: task?.status ?? defaultStatus ?? "idea",
    start_date: task?.start_date ?? "",
    due_date: task?.due_date ?? "",
    task_type: task?.task_type ?? "",
    assignee_ids: task?.assignee_ids ?? [],
    assignee_note: ((task?.metadata as Record<string, unknown>)?.notes as string) ?? "",
    platforms: (() => {
      const meta = (task?.metadata as Record<string, unknown>) ?? {};
      const platformIds = meta.platform_ids as string[] | undefined;
      if (platformIds?.length) return platformIds;
      return task?.platform ? [task.platform] : [];
    })(),
    content_body: task?.content_body ?? "",
  });

  const [resultState, setResultState] = useState({
    website_url: task?.website_url ?? "",
    youtube_url: task?.youtube_url ?? "",
    tiktok_url: task?.tiktok_url ?? "",
    facebook_url: task?.facebook_url ?? "",
    output_links: (task?.output_links ?? []).join(", "),
    completion_note: task?.completion_note ?? "",
  });

  const filteredCampaigns = campaigns.filter(
    (c) => !formState.project_id || c.project_id === formState.project_id
  );

  const toggleAssignee = (id: string) => {
    setFormState((f) => ({
      ...f,
      assignee_ids: f.assignee_ids.includes(id)
        ? f.assignee_ids.filter((a) => a !== id)
        : [...f.assignee_ids, id],
    }));
  };

  const togglePlatform = (code: string) => {
    setFormState((f) => ({
      ...f,
      platforms: f.platforms.includes(code)
        ? f.platforms.filter((p) => p !== code)
        : [...f.platforms, code],
    }));
  };

  const handleSave = async () => {
    if (editDisabled) {
      return;
    }

    if (!formState.title.trim()) {
      toast.error("Tiêu đề không được để trống");
      return;
    }

    setLoading(true);
    try {
      const startDate = toDateOnlyString(formState.start_date);
      const dueDate = toDateOnlyString(formState.due_date);
      const outputLinks = resultState.output_links
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload: Record<string, unknown> = {
        title: formState.title,
        description: formState.description || undefined,
        project_id: formState.project_id || undefined,
        campaign_id: formState.campaign_id || undefined,
        status: formState.status as Task["status"],
        start_date: startDate ?? undefined,
        due_date: dueDate ?? undefined,
        task_type: formState.task_type || undefined,
        assignee_ids: formState.assignee_ids,
        metadata: {
          ...(formState.assignee_note ? { notes: formState.assignee_note } : {}),
          ...(formState.platforms.length > 0 ? { platform_ids: formState.platforms } : {}),
        },
        content_body: formState.content_body || undefined,
        output_links: outputLinks.length > 0 ? outputLinks : undefined,
        completion_note: resultState.completion_note || undefined,
        website_url: resultState.website_url || undefined,
        youtube_url: resultState.youtube_url || undefined,
        tiktok_url: resultState.tiktok_url || undefined,
        facebook_url: resultState.facebook_url || undefined,
      };

      const isCreate = createMode && !task;
      const endpoint = isCreate ? "/api/tasks" : `/api/tasks/${task!.id}`;
      const method = isCreate ? "POST" : "PUT";

      const res = await adminFetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Lỗi không xác định" }));
        throw new Error(err.error || (isCreate ? "Tạo thất bại" : "Lưu thất bại"));
      }

      toast.success(isCreate ? "Đã tạo công việc" : "Đã lưu công việc");
      router.push("/tasks");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
              <Link href="/tasks" className="text-slate-500 hover:text-slate-700 flex items-center gap-1 shrink-0">
                <ArrowLeft className="size-4" />
                Công việc
              </Link>
              <span className="text-slate-400 shrink-0">/</span>
              <span className="text-slate-900 font-medium shrink-0">{createMode ? "Tạo công việc mới" : `Sửa: ${task?.title ?? ""}`}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <Button variant="outline" size="sm" onClick={() => router.push("/tasks")} disabled={loading}>
                Quay lại
              </Button>
              <Button size="sm" onClick={handleSave} disabled={loading || editDisabled || !formState.title.trim()}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {loading ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {!createMode && editDisabled && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Công việc đã hoàn thành. Chỉ Admin mới được phép chỉnh sửa.
          </div>
        )}
        {/* Tab navigation */}
        <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("require")}
            className={
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors " +
              (activeTab === "require"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-700")
            }
          >
            <StickyNote className="size-4" />
            Yêu cầu
          </button>
          <button
            onClick={() => setActiveTab("result")}
            className={
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors " +
              (activeTab === "result"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-700")
            }
          >
            <CheckCircle2 className="size-4" />
            Kết quả
          </button>
        </div>

        {/* ── Tab: Yêu cầu ─────────────────────────────────────── */}
        <div className={activeTab !== "require" ? "hidden" : ""}>
          {/* 2-column layout: left 40% (info) + right 60% (editor) */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* LEFT: 40% — Task info */}
            <div className="xl:col-span-2 space-y-4">
              {/* Info card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="text-xs font-semibold text-slate-500 pb-2 border-b border-slate-100 uppercase tracking-wide">
                  Thông tin công việc
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="title">Tiêu đề <span className="text-red-500">*</span></Label>
                  <Input
                    id="title"
                    placeholder="VD: Viết bài Facebook về Summer Sale 2026"
                    value={formState.title}
                    onChange={(e) => setFormState((f) => ({ ...f, title: e.target.value }))}
                    disabled={editDisabled}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Mô tả / Yêu cầu</Label>
                  <Textarea
                    id="description"
                    placeholder="Chi tiết công việc..."
                    rows={3}
                    value={formState.description}
                    onChange={(e) => setFormState((f) => ({ ...f, description: e.target.value }))}
                    disabled={editDisabled}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Dự án</Label>
                    <Select
                      value={formState.project_id}
                      onValueChange={(v) => {
                        const campaignStillValid = formState.campaign_id &&
                          campaigns.some((c) => c.id === formState.campaign_id && c.project_id === v);
                        setFormState((f) => ({
                          ...f,
                          project_id: v,
                          campaign_id: campaignStillValid ? f.campaign_id : "",
                        }));
                      }}
                      disabled={editDisabled}
                    >
                      <SelectTrigger><SelectValue placeholder="Chọn dự án" /></SelectTrigger>
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
                      value={formState.campaign_id}
                      onValueChange={(v) => setFormState((f) => ({ ...f, campaign_id: v }))}
                      disabled={!formState.project_id || editDisabled}
                    >
                      <SelectTrigger><SelectValue placeholder={formState.project_id ? "Chọn chiến dịch" : "Chọn dự án trước"} /></SelectTrigger>
                      <SelectContent>
                        {filteredCampaigns.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Người phụ trách</Label>
                  <AssigneeSelector
                    assigneeIds={formState.assignee_ids}
                    staff={staff}
                    staffRoleMap={staffRoleMap}
                    disabled={editDisabled}
                    onToggle={toggleAssignee}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Ngày bắt đầu</Label>
                    <DatePicker
                      value={formState.start_date}
                      onChange={(v) => setFormState((f) => ({ ...f, start_date: v ?? "" }))}
                      disabled={editDisabled}
                      disablePastDates={!isAdmin}
                      placeholder="Chọn ngày"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Hạn chót</Label>
                    <DatePicker
                      value={formState.due_date}
                      onChange={(v) => setFormState((f) => ({ ...f, due_date: v ?? "" }))}
                      disabled={editDisabled}
                      disablePastDates={!isAdmin}
                      placeholder="Chọn ngày"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Loại công việc</Label>
                    <Select
                      value={formState.task_type}
                      onValueChange={(v) => {
                        const selectedType = taskTypesWithMeta.find((t) => t.code === v);
                        const meta = selectedType?.metadata as Record<string, unknown> | undefined;
                        const rawDefault = meta?.default_platform_ids as string[] | null | undefined;
                        const defaultIds: string[] | null = Array.isArray(rawDefault) ? rawDefault : null;
                        const newPlatforms = formState.platforms.length === 0 && defaultIds ? defaultIds : formState.platforms;
                        setFormState((f) => ({ ...f, task_type: v, platforms: newPlatforms }));
                      }}
                      disabled={editDisabled}
                    >
                      <SelectTrigger><SelectValue placeholder="Chọn loại" /></SelectTrigger>
                      <SelectContent>
                        {taskTypeOptions.map((opt) => (
                          <SelectItem key={opt.code} value={opt.code}>
                            <span className="flex items-center gap-2">
                              {opt.color && <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />}
                              {opt.name}
                            </span>
                          </SelectItem>
                        ))}
                        {/* Fallback: show saved value even if type is inactive */}
                        {formState.task_type &&
                         !taskTypeOptions.find((o) => o.code === formState.task_type) && (
                          <SelectItem key={formState.task_type} value={formState.task_type}>
                            <span className="flex items-center gap-2 text-amber-600">
                              <span className="size-2 rounded-full shrink-0 bg-amber-400" />
                              {formState.task_type} (không hoạt động)
                            </span>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Nền tảng</Label>
                    <PlatformMultiSelect
                      values={formState.platforms}
                      options={platformOptions}
                      disabled={editDisabled}
                      onToggle={togglePlatform}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Trạng thái</Label>
                  <Select
                    value={formState.status}
                    onValueChange={(v) => setFormState((f) => ({ ...f, status: v as TaskStatus }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Chọn trạng thái" /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((opt) => (
                        <SelectItem key={opt.code} value={opt.code}>
                          <span className="flex items-center gap-2">
                            {opt.color && <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />}
                            {opt.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="assignee_note">Ghi chú</Label>
                  <Textarea
                    id="assignee_note"
                    placeholder="Hướng dẫn chi tiết..."
                    rows={2}
                    value={formState.assignee_note}
                    disabled={editDisabled}
                    onChange={(e) => setFormState((f) => ({ ...f, assignee_note: e.target.value }))}
                  />
                </div>
              </div>

              {/* Quick info */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Thông tin</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Ngày tạo</span>
                    <span className="text-slate-700">{task?.created_at ? new Date(task.created_at).toLocaleDateString("vi-VN") : "—"}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Cập nhật lần cuối</span>
                    <span className="text-slate-700">{task?.updated_at ? new Date(task.updated_at).toLocaleDateString("vi-VN") : "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: 60% — Rich text editor */}
            <div className="xl:col-span-3">
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Kịch bản / Nội dung chính
                  </div>
                  <span className="text-xs text-slate-400">Lưu HTML</span>
                </div>
                <RichTextEditor
                  value={formState.content_body}
                  onChange={(html) => setFormState((f) => ({ ...f, content_body: html }))}
                  disabled={editDisabled}
                  placeholder={
                    formState.task_type === "video"
                      ? "0:00 - Mở đầu (hook 3s)\n0:03 - Giới thiệu sản phẩm\n0:30 - Demo tính năng\n1:00 - Call to action"
                      : formState.task_type === "image"
                      ? "Màu chủ đạo: đỏ trắng\nHình ảnh chính: laptop gaming\nText: Summer Sale - Giảm đến 30%\nLayout: 1:3:1"
                      : "1. Mở đầu\n2. Giới thiệu\n3. Nội dung chính\n4. Kết luận / Call to action"
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab: Kết quả ─────────────────────────────────────── */}
        <div className={activeTab !== "result" ? "hidden" : ""}>
          {/* Full-width 3-column layout for results */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Link platforms */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 pb-2 border-b border-slate-100 uppercase tracking-wide">
                <ExternalLink className="size-4" />
                Link nền tảng
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="website_url" className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Globe className="size-3.5" />
                    Website
                  </Label>
                  <Input
                    id="website_url"
                    placeholder="https://mytholaptop.vn/..."
                    value={resultState.website_url}
                    onChange={(e) => setResultState((r) => ({ ...r, website_url: e.target.value }))}
                    disabled={editDisabled}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="youtube_url" className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Youtube className="size-3.5 text-red-500" />
                    YouTube
                  </Label>
                  <Input
                    id="youtube_url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={resultState.youtube_url}
                    onChange={(e) => setResultState((r) => ({ ...r, youtube_url: e.target.value }))}
                    disabled={editDisabled}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tiktok_url" className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Music2 className="size-3.5" />
                    TikTok
                  </Label>
                  <Input
                    id="tiktok_url"
                    placeholder="https://tiktok.com/@user/video/..."
                    value={resultState.tiktok_url}
                    onChange={(e) => setResultState((r) => ({ ...r, tiktok_url: e.target.value }))}
                    disabled={editDisabled}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="facebook_url" className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Facebook className="size-3.5 text-blue-600" />
                    Fanpage/Facebook
                  </Label>
                  <Input
                    id="facebook_url"
                    placeholder="https://fb.com/mytholaptop/..."
                    value={resultState.facebook_url}
                    onChange={(e) => setResultState((r) => ({ ...r, facebook_url: e.target.value }))}
                    disabled={editDisabled}
                  />
                </div>
              </div>
            </div>

            {/* Assets / Output links */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 pb-2 border-b border-slate-100 uppercase tracking-wide">
                <Upload className="size-4" />
                File / Asset đã nộp
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="output_links" className="text-xs text-slate-500">Link tài liệu / Drive</Label>
                <Input
                  id="output_links"
                  placeholder="Nhiều link phân cách bằng dấu phẩy"
                  value={resultState.output_links}
                  onChange={(e) => setResultState((r) => ({ ...r, output_links: e.target.value }))}
                  disabled={editDisabled}
                />
                <p className="text-xs text-slate-400">Nhiều link phân cách bằng dấu phẩy</p>
              </div>
            </div>

            {/* Completion note */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 pb-2 border-b border-slate-100 uppercase tracking-wide">
                <Clock className="size-4" />
                Ghi chú hoàn thành
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="completion_note" className="text-xs text-slate-500">Mô tả kết quả</Label>
                <Textarea
                  id="completion_note"
                  placeholder="Mô tả kết quả đã hoàn thành..."
                  rows={5}
                  value={resultState.completion_note}
                  onChange={(e) => setResultState((r) => ({ ...r, completion_note: e.target.value }))}
                  disabled={editDisabled}
                />
              </div>
              {task?.submitted_at && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                  <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">Đã nộp: </span>
                    {new Date(task!.submitted_at).toLocaleString("vi-VN")}
                    {task?.submitted_by && <> bởi <span className="font-medium">{task!.submitted_by}</span></>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
