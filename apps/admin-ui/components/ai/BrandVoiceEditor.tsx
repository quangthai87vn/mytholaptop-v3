"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Palette, Plus, Trash2, AlertTriangle } from "lucide-react";
import type { BrandVoice, BrandPreset } from "@/types/ai-operating";

const PRESET_COLORS: Record<BrandPreset, string> = {
  professional: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  gaming: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  student: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  business: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  apple_premium: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  budget_friendly: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
};

const CTA_STYLES = [
  { value: "direct", label: "Trực tiếp" },
  { value: "friendly", label: "Thân thiện" },
  { value: "urgency", label: "Khẩn cấp" },
  { value: "soft", label: "Mềm nhẹ" },
];

const EMOJI_OPTIONS = [
  { value: "none", label: "Không emoji" },
  { value: "minimal", label: "Ít (1-2)" },
  { value: "moderate", label: "Vừa (3-4)" },
  { value: "heavy", label: "Nhiều (5+)" },
];

interface BrandVoiceEditorProps {
  voices: BrandVoice[];
  activePreset: BrandPreset | null;
  onActivate: (preset: BrandPreset) => void;
  onSave: (preset: BrandPreset, data: Partial<BrandVoice>) => void;
  onDelete?: (preset: BrandPreset) => void;
  activating?: boolean;
  saving?: boolean;
  deleting?: boolean;
}

export function BrandVoiceEditor({
  voices = [],
  activePreset,
  onActivate,
  onSave,
  onDelete,
  activating,
  saving,
  deleting,
}: BrandVoiceEditorProps) {
  const [editing, setEditing] = useState<BrandVoice | null>(null);
  const [creating, setCreating] = useState(false);
  const [newPreset, setNewPreset] = useState("");
  const [newName, setNewName] = useState("");

  const handleEdit = (voice: BrandVoice) => {
    setEditing(voice);
  };

  const handleSave = () => {
    if (!editing) return;
    onSave(editing.preset as BrandPreset, editing);
    setEditing(null);
    toast.success("Đã lưu brand voice!");
  };

  const handleCreate = () => {
    if (!newPreset.trim() || !newName.trim()) {
      toast.error("Vui lòng nhập preset key và tên hiển thị");
      return;
    }
    const safePreset = newPreset.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const data: Partial<BrandVoice> = {
      preset: safePreset as BrandPreset,
      name: newName.trim(),
      description: "",
      is_active: true,
      tone_professional_casual: 0,
      tone_luxury_affordable: 0,
      tone_technical_simple: 0,
      emoji_usage: "moderate",
      cta_style: "direct",
      keywords_to_use: [],
      keywords_to_avoid: [],
    };
    onSave(safePreset as BrandPreset, data);
    setCreating(false);
    setNewPreset("");
    setNewName("");
    toast.success("Đã thêm brand voice mới!");
  };

  const handleDelete = (preset: BrandPreset, name: string) => {
    if (confirm(`Xoá brand voice "${name}"? Hành động này không thể hoàn tác.`)) {
      onDelete?.(preset);
    }
  };

  return (
    <div className="space-y-6">
      {/* Preset Grid */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="size-4 text-primary" />
              Brand Presets
            </CardTitle>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setCreating(true)}
            >
              <Plus className="size-3.5" />
              Thêm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {voices.map((voice) => {
              const colorClass = PRESET_COLORS[voice.preset as BrandPreset] || "";
              return (
                <div
                  key={voice.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onActivate(voice.preset as BrandPreset)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onActivate(voice.preset as BrandPreset); }}
                  className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${
                    activePreset === voice.preset
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  } ${activating ? "opacity-50 pointer-events-none" : ""}`}
                >
                  {activePreset === voice.preset && (
                    <CheckCircle2 className="size-4 text-primary absolute top-2 right-2" />
                  )}
                  <Badge className={`text-xs font-medium ${colorClass}`}>
                    {voice.name}
                  </Badge>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {voice.description}
                  </p>
                  <div className="flex gap-1 mt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(voice);
                      }}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(voice.preset as BrandPreset, voice.name);
                      }}
                      disabled={deleting}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editing && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Chỉnh sửa: {editing.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tone Sliders */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Tone Adjustments</h4>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <Label className="text-xs">Chuyên nghiệp ↔ Thân mật</Label>
                    <span className="text-xs text-muted-foreground font-mono">
                      {editing.tone_professional_casual}
                    </span>
                  </div>
                  <Slider
                    value={[editing.tone_professional_casual ?? 0]}
                    min={-1}
                    max={1}
                    step={0.1}
                    onValueChange={([v]) =>
                      setEditing({ ...editing, tone_professional_casual: v })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <Label className="text-xs">Cao cấp ↔ Tiết kiệm</Label>
                    <span className="text-xs text-muted-foreground font-mono">
                      {editing.tone_luxury_affordable}
                    </span>
                  </div>
                  <Slider
                    value={[editing.tone_luxury_affordable ?? 0]}
                    min={-1}
                    max={1}
                    step={0.1}
                    onValueChange={([v]) =>
                      setEditing({ ...editing, tone_luxury_affordable: v })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <Label className="text-xs">Kỹ thuật ↔ Đơn giản</Label>
                    <span className="text-xs text-muted-foreground font-mono">
                      {editing.tone_technical_simple}
                    </span>
                  </div>
                  <Slider
                    value={[editing.tone_technical_simple ?? 0]}
                    min={-1}
                    max={1}
                    step={0.1}
                    onValueChange={([v]) =>
                      setEditing({ ...editing, tone_technical_simple: v })
                    }
                  />
                </div>
              </div>

              {/* Emoji & CTA */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Emoji Usage</Label>
                  <Select
                    value={editing.emoji_usage}
                    onValueChange={(v) =>
                      setEditing({ ...editing, emoji_usage: v as typeof editing.emoji_usage })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMOJI_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">CTA Style</Label>
                  <Select
                    value={editing.cta_style}
                    onValueChange={(v) =>
                      setEditing({ ...editing, cta_style: v as typeof editing.cta_style })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CTA_STYLES.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Audience + Tone Instruction */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Đối tượng mục tiêu</Label>
                  <Textarea
                    value={editing.target_audience || ""}
                    onChange={(e) => setEditing({ ...editing, target_audience: e.target.value })}
                    className="min-h-[60px] text-xs"
                    placeholder="VD: Sinh viên, doanh nhân..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Hướng dẫn giọng điệu</Label>
                  <Textarea
                    value={editing.tone_instruction || ""}
                    onChange={(e) => setEditing({ ...editing, tone_instruction: e.target.value })}
                    className="min-h-[60px] text-xs"
                    placeholder="VD: Giọng văn năng động, hào hứng..."
                  />
                </div>
              </div>

              {/* Keywords */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Từ khóa nên dùng</Label>
                  <Textarea
                    value={(editing.keywords_to_use || []).join(", ")}
                    onChange={(e) => setEditing({
                      ...editing,
                      keywords_to_use: e.target.value.split(",").map((k) => k.trim()).filter(Boolean),
                    })}
                    className="min-h-[60px] text-xs font-mono"
                    placeholder="VD: chất lượng, bảo hành, tin cậy (cách nhau bởi dấu phẩy)"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Từ khóa tránh dùng</Label>
                  <Textarea
                    value={(editing.keywords_to_avoid || []).join(", ")}
                    onChange={(e) => setEditing({
                      ...editing,
                      keywords_to_avoid: e.target.value.split(",").map((k) => k.trim()).filter(Boolean),
                    })}
                    className="min-h-[60px] text-xs font-mono"
                    placeholder="VD: rẻ, free, spam"
                  />
                </div>
              </div>

              {/* Example Output */}
              <div className="space-y-2">
                <Label className="text-xs">Ví dụ đầu ra mẫu</Label>
                <Textarea
                  value={editing.example_output || ""}
                  onChange={(e) => setEditing({ ...editing, example_output: e.target.value })}
                  className="min-h-[60px] text-xs"
                  placeholder="VD: MacBook Air M3 — mỏng nhẹ chưa từng thấy. Chip M3 thế hệ mới, pin 18 giờ."
                />
              </div>

              {/* Content Template */}
              <div className="space-y-2">
                <Label className="text-xs">Content Template</Label>
                <Textarea
                  value={editing.content_template || ""}
                  onChange={(e) => setEditing({ ...editing, content_template: e.target.value })}
                  className="min-h-[100px] font-mono text-sm"
                  placeholder="Mô tả giọng điệu mặc định..."
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Hủy
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-muted-foreground">Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap font-mono">
                {editing.content_template || "(preview sẽ hiển thị khi có nội dung)"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Create New Dialog ──────────────────────────────────────── */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-4 text-primary" />
              Thêm Brand Voice mới
            </DialogTitle>
            <DialogDescription>
              Tạo preset mới để sử dụng trong AI Task Routing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Preset Key <span className="text-red-500">*</span></Label>
              <Input
                className="h-9 text-xs font-mono"
                placeholder="VD: tech_news, laptop_review"
                value={newPreset}
                onChange={(e) => setNewPreset(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Key duy nhất, không trùng. Dùng underscore (_) thay khoảng trắng.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tên hiển thị <span className="text-red-500">*</span></Label>
              <Input
                className="h-9 text-xs"
                placeholder="VD: Tin công nghệ, Review Laptop"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Huỷ
            </Button>
            <Button onClick={handleCreate} disabled={!newPreset.trim() || !newName.trim()}>
              Thêm mới
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
