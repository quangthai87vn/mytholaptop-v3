"use client";

import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Save,
  Star,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ListChecks,
  Sparkles,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────────

interface SystemPromptTemplate {
  id: number;
  name: string;
  description: string;
  prompt_text: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

interface PromptRule {
  id: number;
  scope: string;
  platform: string | null;
  rule_key: string;
  rule_text: string;
  priority: number;
  is_active: boolean;
  created_at: string;
}

interface SafetyRule {
  id: number;
  rule_key: string;
  rule_text: string;
  severity: "low" | "medium" | "high";
  is_active: boolean;
  created_at: string;
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: {
    label: "Thấp",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  },
  medium: {
    label: "Trung bình",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
  high: {
    label: "Cao",
    color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
};

const PLATFORMS = [
  { value: "global", label: "Toàn cục" },
  { value: "facebook", label: "Facebook" },
  { value: "website", label: "Website / SEO" },
  { value: "video", label: "Video / TikTok" },
  { value: "zalo", label: "Zalo" },
];

const SCOPES = [
  { value: "all", label: "Tất cả content" },
  { value: "facebook_content", label: "Bài viết Facebook" },
  { value: "seo_article", label: "Bài viết SEO" },
  { value: "video_script", label: "Kịch bản Video" },
  { value: "image_prompt", label: "Prompt Hình ảnh" },
  { value: "product_description", label: "Mô tả sản phẩm" },
  { value: "email_marketing", label: "Email Marketing" },
];

const BLACKLIST_DEFAULT = [
  "tố cáo",
  "vu khống",
  "phản động",
  "đảo chính",
  "fake",
  "giả mạo",
];

// ── System Prompts Sub-Component ───────────────────────────────────────────────

function SystemPromptEditor({
  templates,
  onSave,
  onDelete,
  onSetDefault,
}: {
  templates: SystemPromptTemplate[];
  onSave: (data: Partial<SystemPromptTemplate>, isNew: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onSetDefault: (id: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState<SystemPromptTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editing || !editing.name || !editing.prompt_text) return;
    setSaving(true);
    try {
      await onSave(editing, editing.id < 0);
      setEditing(null);
      toast.success("Đã lưu system prompt!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              System Prompts
            </CardTitle>
            <Button
              size="sm"
              className="gap-1"
              onClick={() =>
                setEditing({
                  id: -Date.now(),
                  name: "",
                  description: "",
                  prompt_text: "",
                  is_active: false,
                  is_default: false,
                  created_at: new Date().toISOString(),
                })
              }
            >
              <Plus className="size-3" />
              Thêm
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-22rem)]">
            <div className="space-y-2 pr-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    editing?.id === t.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                  onClick={() => setEditing(t)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm font-medium truncate">{t.name}</span>
                        {t.is_default && (
                          <Star className="size-3 text-yellow-500 fill-yellow-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {t.description || "(Không có mô tả)"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {t.is_active && (
                        <Badge variant="outline" className="text-[10px] border-green-300 text-green-600">
                          Active
                        </Badge>
                      )}
                      {t.id >= 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-1 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(t.id);
                          }}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Chưa có system prompt nào
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Panel */}
      {editing ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {editing.id < 0 ? "Tạo mới" : "Chỉnh sửa"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Tên hiển thị</Label>
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="VD: Chuyên gia kỹ thuật"
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mô tả</Label>
              <Input
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="Mô tả ngắn..."
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Prompt Text <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={editing.prompt_text}
                onChange={(e) => setEditing({ ...editing, prompt_text: e.target.value })}
                className="min-h-[200px] text-xs font-mono"
                placeholder="Nhập system prompt..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={editing.is_default}
                onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })}
                className="accent-primary"
              />
              <Label htmlFor="is_default" className="text-xs cursor-pointer">
                Đặt làm mặc định
              </Label>
            </div>
            <div className="flex gap-2">
              {editing.id >= 0 && !editing.is_default && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => onSetDefault(editing.id)}
                >
                  <Star className="size-3" />
                  Đặt mặc định
                </Button>
              )}
              <Button
                size="sm"
                className="gap-1 text-xs ml-auto"
                onClick={handleSave}
                disabled={saving || !editing.name || !editing.prompt_text}
              >
                {saving && <Loader2 className="size-3 animate-spin" />}
                Lưu
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center h-48">
            <p className="text-sm text-muted-foreground">
              Chọn một template để chỉnh sửa
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Prompt Rules Sub-Component ─────────────────────────────────────────────────

function PromptRulesEditor({
  rules,
  onSave,
  onDelete,
  onToggle,
}: {
  rules: PromptRule[];
  onSave: (data: Partial<PromptRule>, isNew: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onToggle: (id: number, isActive: boolean) => Promise<void>;
}) {
  const [editing, setEditing] = useState<PromptRule | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editing || !editing.rule_key || !editing.rule_text) return;
    setSaving(true);
    try {
      await onSave(editing, editing.id < 0);
      setEditing(null);
      toast.success("Đã lưu prompt rule!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ListChecks className="size-4 text-primary" />
              Prompt Rules
            </CardTitle>
            <Button
              size="sm"
              className="gap-1"
              onClick={() =>
                setEditing({
                  id: -Date.now(),
                  scope: "all",
                  platform: null,
                  rule_key: "",
                  rule_text: "",
                  priority: 10,
                  is_active: true,
                  created_at: new Date().toISOString(),
                })
              }
            >
              <Plus className="size-3" />
              Thêm
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Từ khóa bắt buộc, quy tắc viết theo nền tảng
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-22rem)]">
            <div className="space-y-2 pr-2">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className={`p-3 rounded-lg border transition-all ${
                    editing?.id === r.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                  onClick={() => setEditing(r)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm font-medium truncate">{r.rule_key}</span>
                        {r.platform && (
                          <Badge variant="outline" className="text-[10px]">
                            {PLATFORMS.find((p) => p.value === r.platform)?.label || r.platform}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {SCOPES.find((s) => s.value === r.scope)?.label || r.scope}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {r.rule_text}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch
                        checked={r.is_active}
                          onCheckedChange={(v) => {
                            onToggle(r.id, v);
                          }}
                        onClick={(e) => e.stopPropagation()}
                        className="scale-90"
                      />
                      {r.id >= 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-1 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(r.id);
                          }}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {rules.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Chưa có prompt rule nào
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Panel */}
      {editing ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {editing.id < 0 ? "Tạo mới" : "Chỉnh sửa"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Scope (loại content)</Label>
                <Select
                  value={editing.scope}
                  onValueChange={(v) => setEditing({ ...editing, scope: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nền tảng</Label>
                <Select
                  value={editing.platform || "global"}
                  onValueChange={(v) =>
                    setEditing({ ...editing, platform: v === "global" ? null : v })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Rule Key <span className="text-red-500">*</span>
              </Label>
              <Input
                value={editing.rule_key}
                onChange={(e) => setEditing({ ...editing, rule_key: e.target.value })}
                placeholder="VD: must_include_warranty"
                className="text-xs h-8 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Rule Text <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={editing.rule_text}
                onChange={(e) => setEditing({ ...editing, rule_text: e.target.value })}
                className="min-h-[120px] text-xs"
                placeholder="VD: Phải có thông tin bảo hành ít nhất 12 tháng"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="gap-1 text-xs ml-auto"
                onClick={handleSave}
                disabled={saving || !editing.rule_key || !editing.rule_text}
              >
                {saving && <Loader2 className="size-3 animate-spin" />}
                Lưu
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center h-48">
            <p className="text-sm text-muted-foreground">
              Chọn một rule để chỉnh sửa
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Safety Rules Sub-Component ─────────────────────────────────────────────────

function SafetyRulesSubEditor({
  rules,
  blacklist,
  onSaveRule,
  onDeleteRule,
  onToggleRule,
  onBlacklistChange,
}: {
  rules: SafetyRule[];
  blacklist: string[];
  onSaveRule: (data: Partial<SafetyRule>, isNew: boolean) => Promise<void>;
  onDeleteRule: (id: number) => Promise<void>;
  onToggleRule: (id: number, isActive: boolean) => Promise<void>;
  onBlacklistChange: (keywords: string[]) => void;
}) {
  const [editing, setEditing] = useState<SafetyRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [blacklistInput, setBlacklistInput] = useState(blacklist.join(", "));

  const handleSaveRule = async () => {
    if (!editing || !editing.rule_key || !editing.rule_text) return;
    setSaving(true);
    try {
      await onSaveRule(editing, editing.id < 0);
      setEditing(null);
      toast.success("Đã lưu safety rule!");
    } finally {
      setSaving(false);
    }
  };

  const handleBlacklistBlur = () => {
    const keywords = blacklistInput
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    onBlacklistChange(keywords);
    toast.success("Đã cập nhật blacklist!");
  };

  return (
    <div className="space-y-6">
      {/* Blacklist Keywords */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="size-4 text-destructive" />
            Blacklist Keywords
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Từ khóa bị cấm — AI sẽ không sử dụng trong nội dung
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={blacklistInput}
            onChange={(e) => setBlacklistInput(e.target.value)}
            onBlur={handleBlacklistBlur}
            className="min-h-[80px] text-xs font-mono"
            placeholder="tố cáo, vu khống, spam (cách nhau bởi dấu phẩy)"
          />
          <div className="flex flex-wrap gap-1">
            {blacklist.map((kw, i) => (
              <Badge
                key={i}
                variant="destructive"
                className="text-[10px]"
              >
                {kw}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Safety Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="size-4 text-primary" />
                Safety Rules
              </CardTitle>
              <Button
                size="sm"
                className="gap-1"
                onClick={() =>
                  setEditing({
                    id: -Date.now(),
                    rule_key: "",
                    rule_text: "",
                    severity: "medium",
                    is_active: true,
                    created_at: new Date().toISOString(),
                  })
                }
              >
                <Plus className="size-3" />
                Thêm
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-28rem)]">
              <div className="space-y-2 pr-2">
                {rules.map((r) => (
                  <div
                    key={r.id}
                    className={`p-3 rounded-lg border transition-all ${
                      editing?.id === r.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                    onClick={() => setEditing(r)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge
                            className={`text-[10px] ${SEVERITY_CONFIG[r.severity]?.color}`}
                          >
                            {SEVERITY_CONFIG[r.severity]?.label}
                          </Badge>
                          <span className="text-sm font-medium truncate">{r.rule_key}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {r.rule_text}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Switch
                          checked={r.is_active}
                          onClick={(e) => e.stopPropagation()}
                          className="scale-90"
                        />
                        {r.id >= 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-1 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteRule(r.id);
                            }}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {rules.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Chưa có safety rule nào
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Edit Panel */}
        {editing ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {editing.id < 0 ? "Tạo mới" : "Chỉnh sửa"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Mức độ nghiêm trọng</Label>
                <Select
                  value={editing.severity}
                  onValueChange={(v) =>
                    setEditing({ ...editing, severity: v as SafetyRule["severity"] })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        <span className="flex items-center gap-2">
                          <Badge className={`text-[10px] ${v.color}`}>{v.label}</Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Rule Key <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={editing.rule_key}
                  onChange={(e) => setEditing({ ...editing, rule_key: e.target.value })}
                  placeholder="VD: no_medical_claim"
                  className="text-xs h-8 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Rule Text <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={editing.rule_text}
                  onChange={(e) => setEditing({ ...editing, rule_text: e.target.value })}
                  className="min-h-[120px] text-xs"
                  placeholder="Mô tả quy tắc an toàn..."
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1 text-xs ml-auto"
                  onClick={handleSaveRule}
                  disabled={saving || !editing.rule_key || !editing.rule_text}
                >
                  {saving && <Loader2 className="size-3 animate-spin" />}
                  Lưu
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex items-center justify-center h-48">
              <p className="text-sm text-muted-foreground">
                Chọn một rule để chỉnh sửa
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Main ContentTemplatesEditor ────────────────────────────────────────────────

interface ContentTemplatesEditorProps {
  systemPrompts: SystemPromptTemplate[];
  promptRules: PromptRule[];
  safetyRules: SafetyRule[];
  blacklistKeywords?: string[];
}

export function ContentTemplatesEditor({
  systemPrompts: initialPrompts = [],
  promptRules: initialRules = [],
  safetyRules: initialSafety = [],
  blacklistKeywords = BLACKLIST_DEFAULT,
}: ContentTemplatesEditorProps) {
  const queryClient = useQueryClient();
  const [systemPrompts, setSystemPrompts] = useState(initialPrompts);
  const [promptRules, setPromptRules] = useState(initialRules);
  const [safetyRules, setSafetyRules] = useState(initialSafety);
  const [blacklist, setBlacklist] = useState<string[]>(blacklistKeywords);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/ai/system-prompts").then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/ai/prompt-rules").then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/ai/safety-rules").then((r) => r.json()).catch(() => ({ data: [] })),
    ])
      .then(([sp, pr, sr]) => {
        if (sp.data?.length) setSystemPrompts(sp.data);
        if (pr.data?.length) setPromptRules(pr.data);
        if (sr.data?.length) setSafetyRules(sr.data);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── System Prompts ──────────────────────────────────────────────────────────

  const handleSaveSystemPrompt = async (data: Partial<SystemPromptTemplate>, isNew: boolean) => {
    const res = await fetch("/api/ai/system-prompts", {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isNew
          ? data
          : { id: data.id, name: data.name, description: data.description, prompt_text: data.prompt_text, is_active: data.is_active, is_default: data.is_default }
      ),
    });
    if (res.ok) {
      const { data: saved } = await res.json() as { data: SystemPromptTemplate };
      setSystemPrompts((prev) => {
        const idx = prev.findIndex((t) => t.id === data.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
    }
  };

  const handleDeleteSystemPrompt = async (id: number) => {
    if (!confirm("Xoá template này?")) return;
    const res = await fetch(`/api/ai/system-prompts?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setSystemPrompts((prev) => prev.filter((t) => t.id !== id));
      await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
      toast.success("Đã xoá!");
    }
  };

  const handleSetDefaultSystemPrompt = async (id: number) => {
    const res = await fetch("/api/ai/system-prompts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_default: true }),
    });
    if (res.ok) {
      setSystemPrompts((prev) =>
        prev.map((t) => ({ ...t, is_default: t.id === id, is_active: t.id === id }))
      );
      await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
      toast.success("Đã đặt mặc định!");
    }
  };

  // ── Prompt Rules ───────────────────────────────────────────────────────────

  const handleSavePromptRule = async (data: Partial<PromptRule>, isNew: boolean) => {
    const res = await fetch("/api/ai/prompt-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { data: saved } = await res.json() as { data: PromptRule };
      setPromptRules((prev) => {
        const idx = prev.findIndex((r) => r.id === data.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
    }
  };

  const handleDeletePromptRule = async (id: number) => {
    if (!confirm("Xoá rule này?")) return;
    const res = await fetch(`/api/ai/prompt-rules?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setPromptRules((prev) => prev.filter((r) => r.id !== id));
      await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
      toast.success("Đã xoá!");
    }
  };

  const handleTogglePromptRule = async (id: number, isActive: boolean) => {
    const res = await fetch("/api/ai/prompt-rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: isActive }),
    });
    if (res.ok) {
      setPromptRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: isActive } : r))
      );
      await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
    }
  };

  // ── Safety Rules ────────────────────────────────────────────────────────────

  const handleSaveSafetyRule = async (data: Partial<SafetyRule>, isNew: boolean) => {
    const res = await fetch("/api/ai/safety-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { data: saved } = await res.json() as { data: SafetyRule };
      setSafetyRules((prev) => {
        const idx = prev.findIndex((r) => r.id === data.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
    }
  };

  const handleDeleteSafetyRule = async (id: number) => {
    if (!confirm("Xoá rule này?")) return;
    const res = await fetch(`/api/ai/safety-rules?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setSafetyRules((prev) => prev.filter((r) => r.id !== id));
      await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
      toast.success("Đã xoá!");
    }
  };

  const handleToggleSafetyRule = async (id: number, isActive: boolean) => {
    const res = await fetch("/api/ai/safety-rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: isActive }),
    });
    if (res.ok) {
      setSafetyRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: isActive } : r))
      );
      await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          Prompt Templates
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Quản lý System Prompts, Prompt Rules và Safety Rules cho AI generation
        </p>
      </div>

      <Tabs defaultValue="prompts" className="w-full">
        <TabsList className="grid grid-cols-3 w-auto">
          <TabsTrigger value="prompts" className="gap-1.5 text-xs">
            <FileText className="size-3.5" />
            System Prompts
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 text-xs">
            <ListChecks className="size-3.5" />
            Prompt Rules
          </TabsTrigger>
          <TabsTrigger value="safety" className="gap-1.5 text-xs">
            <ShieldAlert className="size-3.5" />
            Safety Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prompts" className="mt-4">
          <SystemPromptEditor
            templates={systemPrompts}
            onSave={handleSaveSystemPrompt}
            onDelete={handleDeleteSystemPrompt}
            onSetDefault={handleSetDefaultSystemPrompt}
          />
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <PromptRulesEditor
            rules={promptRules}
            onSave={handleSavePromptRule}
            onDelete={handleDeletePromptRule}
            onToggle={handleTogglePromptRule}
          />
        </TabsContent>

        <TabsContent value="safety" className="mt-4">
          <SafetyRulesSubEditor
            rules={safetyRules}
            blacklist={blacklist}
            onSaveRule={handleSaveSafetyRule}
            onDeleteRule={handleDeleteSafetyRule}
            onToggleRule={handleToggleSafetyRule}
            onBlacklistChange={setBlacklist}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
