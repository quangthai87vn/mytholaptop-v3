"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Loader2, Plus, Trash2, ShieldAlert, ShieldCheck } from "lucide-react";

interface SafetyRule {
  id: number;
  rule_key: string;
  rule_text: string;
  severity: "low" | "medium" | "high";
  is_active: boolean;
  created_at: string;
}

interface SafetyRulesEditorProps {
  rules: SafetyRule[];
  blacklistKeywords: string[];
  onToggle: (id: number, isActive: boolean) => void;
  onDelete: (id: number) => void;
  onAdd: (data: { rule_key: string; rule_text: string; severity?: "low" | "medium" | "high" }) => void;
  onBlacklistChange: (keywords: string[]) => void;
  onRefresh?: () => void;
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Thấp", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" },
  medium: { label: "Trung bình", color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  high: { label: "Cao", color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

export function SafetyRulesEditor({
  rules,
  blacklistKeywords,
  onToggle,
  onDelete,
  onAdd,
  onBlacklistChange,
}: SafetyRulesEditorProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [addKey, setAddKey] = useState("");
  const [addText, setAddText] = useState("");
  const [addSeverity, setAddSeverity] = useState<"low" | "medium" | "high">("medium");
  const [saving, setSaving] = useState(false);
  const [blacklistInput, setBlacklistInput] = useState(blacklistKeywords.join(", "));

  const handleSaveBlacklist = () => {
    const keywords = blacklistInput
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    onBlacklistChange(keywords);
    toast.success("Đã lưu blacklist!");
  };

  const handleAdd = async () => {
    if (!addKey.trim() || !addText.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    setSaving(true);
    try {
      await onAdd({ rule_key: addKey.trim(), rule_text: addText.trim(), severity: addSeverity });
      setAddOpen(false);
      setAddKey("");
      setAddText("");
      toast.success("Đã thêm safety rule!");
    } finally {
      setSaving(false);
    }
  };

  const activeCount = rules.filter((r) => r.is_active).length;

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-4 text-center">
            <ShieldCheck className="size-6 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Rules đang bật</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="p-4 text-center">
            <ShieldAlert className="size-6 mx-auto mb-1 text-red-600" />
            <p className="text-2xl font-bold">{rules.filter((r) => r.severity === "high" && r.is_active).length}</p>
            <p className="text-xs text-muted-foreground">High severity</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{blacklistKeywords.length}</p>
            <p className="text-xs text-muted-foreground">Blacklist keywords</p>
          </CardContent>
        </Card>
      </div>

      {/* Blacklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Blacklist Keywords</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Danh sách từ khóa bị cấm. Mỗi từ cách nhau bằng dấu phẩy.
          </p>
          <div className="flex gap-2">
            <Input
              value={blacklistInput}
              onChange={(e) => setBlacklistInput(e.target.value)}
              placeholder="VD: rẻ nhất, tốt nhất, deal sốc..."
              className="font-mono text-sm"
            />
            <Button onClick={handleSaveBlacklist} size="sm">
              Lưu
            </Button>
          </div>
          {blacklistKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {blacklistKeywords.map((kw) => (
                <Badge key={kw} variant="outline" className="text-xs font-mono bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-300">
                  {kw}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rules */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="size-4 text-primary" />
              Safety Rules
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="size-3" />
              Thêm Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {rules.map((rule) => {
            const sev = SEVERITY_CONFIG[rule.severity] || SEVERITY_CONFIG.medium;
            return (
              <div
                key={rule.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${rule.is_active ? "bg-background" : "bg-muted/30 opacity-60"}`}
              >
                <Switch
                  checked={rule.is_active}
                  onCheckedChange={(v) => onToggle(rule.id, v)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{rule.rule_text}</p>
                    <Badge className={`text-xs font-normal ${sev.color}`}>
                      {sev.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{rule.rule_key}</p>
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
          })}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm Safety Rule</DialogTitle>
            <DialogDescription>
              Thêm rule mới để kiểm soát nội dung AI tạo ra
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tên Rule</Label>
              <Input
                value={addKey}
                onChange={(e) => setAddKey(e.target.value)}
                placeholder="VD: no_false_claim"
              />
            </div>

            <div className="space-y-2">
              <Label>Nội dung Rule</Label>
              <Textarea
                value={addText}
                onChange={(e) => setAddText(e.target.value)}
                placeholder="VD: Không đưa ra claim vượt quá khả năng sản phẩm"
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Mức độ nghiêm trọng</Label>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as const).map((sev) => (
                  <Button
                    key={sev}
                    variant={addSeverity === sev ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAddSeverity(sev)}
                    className="flex-1"
                  >
                    {SEVERITY_CONFIG[sev].label}
                  </Button>
                ))}
              </div>
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
