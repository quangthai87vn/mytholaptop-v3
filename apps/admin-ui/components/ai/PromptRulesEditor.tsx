"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Globe, CheckCircle2 } from "lucide-react";

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

interface PromptRulesEditorProps {
  globalRules: PromptRule[];
  platformRules: Record<string, PromptRule[]>;
  onToggle: (id: number, isActive: boolean) => void;
  onDelete: (id: number) => void;
  onAdd: (rule: { scope: string; platform?: string; rule_key: string; rule_text: string }) => void;
}

const PLATFORMS = [
  { value: "facebook", label: "Facebook" },
  { value: "website", label: "Website / SEO" },
  { value: "video", label: "Video / TikTok" },
  { value: "image", label: "Hình ảnh" },
  { value: "zalo", label: "Zalo" },
];

const PLATFORM_BG: Record<string, string> = {
  facebook: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
  website: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300",
  video: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300",
  image: "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300",
  zalo: "bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300",
};

export function PromptRulesEditor({
  globalRules,
  platformRules,
  onToggle,
  onDelete,
  onAdd,
}: PromptRulesEditorProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [addScope, setAddScope] = useState<"global" | "platform">("global");
  const [addPlatform, setAddPlatform] = useState("facebook");
  const [addKey, setAddKey] = useState("");
  const [addText, setAddText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!addKey.trim() || !addText.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    setSaving(true);
    try {
      await onAdd({
        scope: addScope,
        platform: addScope === "platform" ? addPlatform : undefined,
        rule_key: addKey.trim(),
        rule_text: addText.trim(),
      });
      setAddOpen(false);
      setAddKey("");
      setAddText("");
      toast.success("Đã thêm rule!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Rules */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="size-4 text-primary" />
              Global Rules
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => { setAddScope("global"); setAddOpen(true); }}
            >
              <Plus className="size-3" />
              Thêm Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {globalRules.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Chưa có global rule nào
            </p>
          ) : (
            globalRules.map((rule) => (
              <RuleRow key={rule.id} rule={rule} onToggle={onToggle} onDelete={onDelete} />
            ))
          )}
        </CardContent>
      </Card>

      {/* Platform Rules */}
      {PLATFORMS.map((plat) => (
        <Card key={plat.value}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${PLATFORM_BG[plat.value] || ""}`}>
                  {plat.label}
                </span>
                {platformRules[plat.value]?.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {platformRules[plat.value].length} rules
                  </span>
                )}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setAddScope("platform");
                  setAddPlatform(plat.value);
                  setAddOpen(true);
                }}
              >
                <Plus className="size-3" />
                Thêm
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {(platformRules[plat.value] || []).map((rule) => (
              <RuleRow key={rule.id} rule={rule} onToggle={onToggle} onDelete={onDelete} />
            ))}
            {(platformRules[plat.value] || []).length === 0 && (
              <p className="text-sm text-muted-foreground py-2 text-center">
                Chưa có rule cho {plat.label}
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm Prompt Rule</DialogTitle>
            <DialogDescription>
              {addScope === "global"
                ? "Rule này áp dụng cho tất cả nội dung."
                : `Rule này chỉ áp dụng cho ${PLATFORMS.find((p) => p.value === addPlatform)?.label}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={addScope === "global" ? "default" : "outline"}
                size="sm"
                onClick={() => setAddScope("global")}
              >
                Global
              </Button>
              <Button
                variant={addScope === "platform" ? "default" : "outline"}
                size="sm"
                onClick={() => setAddScope("platform")}
              >
                Platform
              </Button>
            </div>

            {addScope === "platform" && (
              <div className="space-y-2">
                <Label>Nền tảng</Label>
                <Select value={addPlatform} onValueChange={setAddPlatform}>
                  <SelectTrigger>
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
            )}

            <div className="space-y-2">
              <Label>Tên Rule (key)</Label>
              <Input
                value={addKey}
                onChange={(e) => setAddKey(e.target.value)}
                placeholder="VD: has_cta, seo_heading..."
              />
            </div>

            <div className="space-y-2">
              <Label>Nội dung Rule</Label>
              <Textarea
                value={addText}
                onChange={(e) => setAddText(e.target.value)}
                placeholder="VD: Mỗi bài viết phải có Call-to-Action rõ ràng..."
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Hủy</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Đang thêm..." : "Thêm Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RuleRow({
  rule,
  onToggle,
  onDelete,
}: {
  rule: PromptRule;
  onToggle: (id: number, isActive: boolean) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border ${
        rule.is_active ? "bg-background" : "bg-muted/30 opacity-60"
      }`}
    >
      <Switch
        checked={rule.is_active}
        onCheckedChange={(v) => onToggle(rule.id, v)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{rule.rule_key}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{rule.rule_text}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground hover:text-destructive shrink-0"
        onClick={() => onDelete(rule.id)}
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  );
}
