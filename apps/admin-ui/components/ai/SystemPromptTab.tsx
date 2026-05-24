"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Save,
  CheckCircle2,
  Trash2,
  Sparkles,
  Star,
  Loader2,
} from "lucide-react";
import type { SystemPromptTemplate } from "@/types/ai-operating";

interface SystemPromptTabProps {
  activePreset?: string | null;
}

const DEFAULT_SYSTEM_PROMPTS: Omit<SystemPromptTemplate, "id" | "created_at">[] = [
  {
    name: "Mặc định Laptop",
    description: "Chuyên gia marketing laptop Mỹ Tho, trả lời ngắn gọn, chuyên nghiệp",
    prompt_text: `Bạn là chuyên gia tư vấn laptop của Mỹ Tho Laptop.

Quy tắc:
- Trả lời ngắn gọn, đi thẳng vào vấn đề
- Dùng ngôn ngữ chuyên nghiệp nhưng thân thiện
- Nhấn mạnh ưu điểm kỹ thuật cụ thể
- Có CTA rõ ràng ở cuối mỗi câu trả lời
- Không đưa ra claim chưa xác minh

Giọng điệu: Chuyên nghiệp, tự tin, thân thiện.`,
    is_active: true,
    is_default: true,
  },
  {
    name: "Kỹ thuật sâu",
    description: "Chế độ chuyên gia - chi tiết về specs, benchmark, so sánh chi tiết",
    prompt_text: `Bạn là kỹ sư laptop với 10 năm kinh nghiệm.

Phân tích theo:
- CPU: benchmark scores, generations, TDP
- GPU: VRAM, CUDA cores, performance tier
- RAM: speed, latency, capacity
- Storage: read/write speeds, type
- Display: color accuracy, brightness, refresh rate
- Thermal: TDP, cooling solution

Dùng số liệu cụ thể, so sánh với đối thủ cùng phân khúc.`,
    is_active: false,
    is_default: false,
  },
  {
    name: "Tư vấn bán hàng",
    description: "Hướng đến khách hàng mua laptop, nhấn mạnh giá trị và CTA mua hàng",
    prompt_text: `Bạn là nhân viên tư vấn bán hàng laptop của Mỹ Tho Laptop.

Mục tiêu: Giúp khách hàng tìm được laptop phù hợp nhất với nhu cầu và ngân sách.

Phong cách:
- Gần gũi, thân thiện, đáng tin cậy
- Lắng nghe trước khi tư vấn
- Đưa ra 2-3 gợi ý với ưu/nhược điểm
- Kết thúc bằng CTA rõ ràng: "Liên hệ ngay 0273.xxx.xxx để được tư vấn"

Ưu tiên: Giá trị, bảo hành, hậu mãi.`,
    is_active: false,
    is_default: false,
  },
];

export function SystemPromptTab({ activePreset }: SystemPromptTabProps) {
  const [templates, setTemplates] = useState<SystemPromptTemplate[]>([]);
  const [editing, setEditing] = useState<SystemPromptTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    fetch("/api/ai/system-prompts")
      .then((r) => r.json())
      .then((data) => {
        const fromApi = (data.data || []) as SystemPromptTemplate[];
        setTemplates(fromApi.length > 0 ? fromApi : DEFAULT_SYSTEM_PROMPTS.map((t, i) => ({ ...t, id: i, created_at: new Date().toISOString() })));
      })
      .catch(() => {
        setTemplates(DEFAULT_SYSTEM_PROMPTS.map((t, i) => ({ ...t, id: i, created_at: new Date().toISOString() })));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const isNew = editing.id < 0;
      const res = await fetch("/api/ai/system-prompts", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isNew
            ? { name: editing.name, description: editing.description, prompt_text: editing.prompt_text, is_active: editing.is_active, is_default: editing.is_default }
            : { id: editing.id, name: editing.name, description: editing.description, prompt_text: editing.prompt_text, is_active: editing.is_active, is_default: editing.is_default }
        ),
      });
        if (res.ok) {
        const { data } = await res.json() as { data: SystemPromptTemplate };
        setTemplates((prev) => {
          const idx = prev.findIndex((t) => t.id === editing!.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = data;
            return next;
          }
          return [...prev, data];
        });
        await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
        setEditing(null);
        toast.success("Đã lưu system prompt!");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    setSaving(true);
    try {
      const res = await fetch("/api/ai/system-prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_default: true }),
      });
      if (res.ok) {
        setTemplates((prev) => prev.map((t) => ({ ...t, is_default: t.id === id, is_active: t.id === id })));
        await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
        toast.success("Đã đặt làm mặc định!");
      }
    } catch {
      toast.error("Lỗi khi đặt mặc định");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Xoá template này? Hành động không thể hoàn tác.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ai/system-prompts?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
        if (editing?.id === id) setEditing(null);
        toast.success("Đã xoá system prompt!");
      }
    } catch {
      toast.error("Lỗi khi xoá system prompt");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            System Prompt Templates
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản lý các prompt mẫu được dùng làm system prompt mặc định
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
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
          Thêm mới
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Template list */}
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div className="space-y-2 pr-4">
            {templates.map((t) => (
              <div
                key={t.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  editing?.id === t.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 bg-card"
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
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {t.is_active && (
                      <Badge variant="outline" className="text-[10px] border-green-300 text-green-600">
                        Active
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-1.5 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(t.id);
                      }}
                      disabled={saving}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Edit panel */}
        {editing ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {editing.id < 0 ? "Tạo mới" : "Chỉnh sửa"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Tên</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="VD: Chuyên gia kỹ thuật"
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Mô tả</Label>
                <Input
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Mô tả ngắn..."
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Prompt</Label>
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
                  Đặt làm system prompt mặc định
                </Label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => {
                    if (editing.id >= 0) handleSetDefault(editing.id);
                  }}
                >
                  <Star className="size-3" />
                  Đặt mặc định
                </Button>
                <Button
                  size="sm"
                  className="gap-1 text-xs ml-auto"
                  onClick={handleSave}
                  disabled={saving || !editing.name || !editing.prompt_text}
                >
                  {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                  {saving ? "Đang lưu..." : "Lưu"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-48 rounded-lg border border-dashed text-muted-foreground">
            <p className="text-sm">Chọn một template để chỉnh sửa</p>
          </div>
        )}
      </div>
    </div>
  );
}
