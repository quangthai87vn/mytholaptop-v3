"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  RefreshCw,
  Copy,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Facebook,
  Globe,
  Video,
  ImageIcon,
  Loader2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import type { ContentTemplate, ContentType } from "@/types/content";

// Map DB template to UI type
interface UITemplate {
  id: string;
  name: string;
  description: string;
  type: ContentType;
  template: string;
  variables: string[];
  tone_options: string[];
  is_active: boolean;
  usage_count: number;
  created_at: string;
  system_prompt?: string;
  _dbId?: number;
}

const DB_TYPE_MAP: Record<string, ContentType> = {
  facebook: "facebook_post",
  website: "seo_article",
  video: "video_script",
  image: "image_prompt",
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  facebook_post: { label: "Facebook", icon: Facebook, color: "text-blue-600", bg: "bg-blue-100" },
  seo_article: { label: "Website", icon: Globe, color: "text-green-600", bg: "bg-green-100" },
  video_script: { label: "Video", icon: Video, color: "text-red-600", bg: "bg-red-100" },
  image_prompt: { label: "Anh", icon: ImageIcon, color: "text-purple-600", bg: "bg-purple-100" },
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<UITemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewTemplate, setViewTemplate] = useState<UITemplate | null>(null);
  const [editTemplate, setEditTemplate] = useState<UITemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Create form state
  const [form, setForm] = useState({
    template_name: "",
    content_type: "facebook",
    system_prompt: "",
    user_template: "",
    variables: "",
    tone_options: "",
  });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("content_type", typeFilter);
      const res = await fetch(`/api/content/templates?${params}`);
      if (res.ok) {
        const result = await res.json();
        const mapped: UITemplate[] = (result.data || []).map((t: any) => ({
          id: String(t.id),
          name: t.template_name,
          description: t.system_prompt?.slice(0, 80) || t.template_name,
          type: DB_TYPE_MAP[t.content_type] || "facebook_post",
          template: t.user_template,
          variables: Array.isArray(t.variables) ? t.variables : [],
          tone_options: Array.isArray(t.tone_options) ? t.tone_options : [],
          is_active: t.is_active,
          usage_count: t.usage_count || 0,
          created_at: t.created_at,
          system_prompt: t.system_prompt,
          _dbId: t.id,
        }));
        setTemplates(mapped);
      }
    } catch {
      toast.error("Loi khi lay danh sach template");
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filteredTemplates = templates.filter((tmpl) => {
    const matchSearch =
      search === "" ||
      tmpl.name.toLowerCase().includes(search.toLowerCase()) ||
      tmpl.description.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || tmpl.type === typeFilter;
    return matchSearch && matchType;
  });

  const handleCopy = (t: UITemplate) => {
    navigator.clipboard.writeText(t.template);
    toast.success("Da copy template!");
  };

  const handleDelete = async (t: UITemplate) => {
    if (!t._dbId) return;
    if (!confirm(`Xoa template "${t.name}"?`)) return;
    try {
      const res = await fetch(`/api/content/templates/${t._dbId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Da xoa template!");
        await fetchTemplates();
      } else {
        toast.error("Loi khi xoa template");
      }
    } catch {
      toast.error("Loi khi xoa template");
    }
  };

  const handleSaveCreate = async () => {
    if (!form.template_name || !form.user_template) {
      toast.error("Ten va noi dung template la bat buoc");
      return;
    }
    setSaving(true);
    try {
      const variables = form.variables
        ? form.variables.split(",").map((v) => v.trim()).filter(Boolean)
        : [];
      const res = await fetch("/api/content/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_name: form.template_name,
          content_type: form.content_type,
          system_prompt: form.system_prompt || undefined,
          user_template: form.user_template,
          variables,
          tone_options: form.tone_options ? form.tone_options.split(",").map(v => v.trim()).filter(Boolean) : [],
        }),
      });
      if (res.ok) {
        toast.success("Da tao template thanh cong!");
        setCreateOpen(false);
        setForm({ template_name: "", content_type: "facebook", system_prompt: "", user_template: "", variables: "", tone_options: "" });
        await fetchTemplates();
      } else {
        const err = await res.json();
        toast.error(err.error || "Loi khi tao template");
      }
    } catch {
      toast.error("Loi khi tao template");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTemplate?._dbId) return;
    if (!form.template_name || !form.user_template) {
      toast.error("Ten va noi dung template la bat buoc");
      return;
    }
    setSaving(true);
    try {
      const variables = form.variables
        ? form.variables.split(",").map((v) => v.trim()).filter(Boolean)
        : [];
      const res = await fetch(`/api/content/templates/${editTemplate._dbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_name: form.template_name,
          content_type: form.content_type,
          system_prompt: form.system_prompt || undefined,
          user_template: form.user_template,
          variables,
          tone_options: form.tone_options ? form.tone_options.split(",").map(v => v.trim()).filter(Boolean) : [],
          is_active: form.template_name !== "",
        }),
      });
      if (res.ok) {
        toast.success("Da cap nhat template!");
        setEditTemplate(null);
        await fetchTemplates();
      } else {
        toast.error("Loi khi cap nhat template");
      }
    } catch {
      toast.error("Loi khi cap nhat template");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (t: UITemplate) => {
    setForm({
      template_name: t.name,
      content_type: t.type === "facebook_post" ? "facebook" : t.type === "seo_article" ? "website" : t.type === "video_script" ? "video" : "image",
      system_prompt: t.system_prompt || "",
      user_template: t.template,
      variables: t.variables.join(", "),
      tone_options: t.tone_options.join(", "),
    });
    setEditTemplate(t);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mau noi dung</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quan ly template cho bai viet AI
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Tao mau
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tim mau..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">Tat ca loai</option>
              <option value="facebook">Facebook</option>
              <option value="website">Website</option>
              <option value="video">Video</option>
              <option value="image">Anh</option>
            </select>
            <Button variant="outline" size="icon" onClick={fetchTemplates}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
              <FileCode className="size-8" />
              <p className="text-sm">Chua co template nao</p>
              <Button size="sm" onClick={() => setCreateOpen(true)}>Tao template dau tien</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ten</TableHead>
                  <TableHead>Loai</TableHead>
                  <TableHead>Bien</TableHead>
                  <TableHead>Su dung</TableHead>
                  <TableHead>Ngay tao</TableHead>
                  <TableHead className="text-right">Thao tac</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((tmpl) => {
                  const typeCfg = TYPE_CONFIG[tmpl.type] || TYPE_CONFIG.facebook_post;
                  const TypeIcon = typeCfg.icon;
                  return (
                    <TableRow key={tmpl.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`size-8 rounded flex items-center justify-center ${typeCfg.bg}`}>
                            <TypeIcon className={`size-4 ${typeCfg.color}`} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{tmpl.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                              {tmpl.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{typeCfg.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {tmpl.variables.slice(0, 2).map((v) => (
                            <Badge key={v} variant="secondary" className="text-xs">{`{${v}}`}</Badge>
                          ))}
                          {tmpl.variables.length > 2 && (
                            <Badge variant="secondary" className="text-xs">+{tmpl.variables.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{tmpl.usage_count}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(tmpl.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewTemplate(tmpl)}>
                              <Eye className="mr-2 size-4" />Xem
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopy(tmpl)}>
                              <Copy className="mr-2 size-4" />Copy
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(tmpl)}>
                              <Pencil className="mr-2 size-4" />Sua
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(tmpl)}>
                              <Trash2 className="mr-2 size-4" />Xoa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewTemplate} onOpenChange={() => setViewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewTemplate?.name}</DialogTitle>
            <DialogDescription>
              {viewTemplate?.type && TYPE_CONFIG[viewTemplate.type]?.label}
            </DialogDescription>
          </DialogHeader>
          {viewTemplate && (
            <div className="space-y-4 py-4">
              {viewTemplate.system_prompt && (
                <div>
                  <p className="text-sm font-medium mb-2">System Prompt:</p>
                  <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                    {viewTemplate.system_prompt}
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm font-medium mb-2">Bien ({viewTemplate.variables.length}):</p>
                <div className="flex gap-2 flex-wrap">
                  {viewTemplate.variables.map((v) => (
                    <Badge key={v} variant="outline">{`{${v}}`}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Template:</p>
                <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap font-mono max-h-[300px] overflow-y-auto">
                  {viewTemplate.template}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTemplate(null)}>Dong</Button>
            <Button onClick={() => viewTemplate && handleCopy(viewTemplate)}>
              <Copy className="mr-2 size-4" />Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Dialog */}
      <Dialog
        open={createOpen || !!editTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditTemplate(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editTemplate ? "Sua template" : "Tao mau noi dung moi"}</DialogTitle>
            <DialogDescription>
              Tao template de tai su dung cho viec tao noi dung AI
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ten mau *</label>
                <Input
                  value={form.template_name}
                  onChange={(e) => setForm((f) => ({ ...f, template_name: e.target.value }))}
                  placeholder="VD: Bai viet Facebook Sales"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Loai noi dung *</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={form.content_type}
                  onChange={(e) => setForm((f) => ({ ...f, content_type: e.target.value }))}
                >
                  <option value="facebook">Facebook</option>
                  <option value="website">Website</option>
                  <option value="video">Video</option>
                  <option value="image">Anh</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">System Prompt</label>
              <Textarea
                value={form.system_prompt}
                onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
                placeholder="Huong dan cho AI ve cach viet noi dung nay..."
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Template *</label>
              <Textarea
                value={form.user_template}
                onChange={(e) => setForm((f) => ({ ...f, user_template: e.target.value }))}
                className="min-h-[200px] font-mono text-sm"
                placeholder={'{{product_name}}\n\n{{product_highlights}}\n\nGia: {{price}}\n\n{{cta}}'}
              />
              <p className="text-xs text-muted-foreground">
                Su dung {"{TEN_BIEN}"} de danh dau bien thay the
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bien (cach nhau dau phay)</label>
                <Input
                  value={form.variables}
                  onChange={(e) => setForm((f) => ({ ...f, variables: e.target.value }))}
                  placeholder="product_name, price, cta"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Giong van (cach nhau dau phay)</label>
                <Input
                  value={form.tone_options}
                  onChange={(e) => setForm((f) => ({ ...f, tone_options: e.target.value }))}
                  placeholder="chuyen nghiep, than thien"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditTemplate(null); }}>
              Huy
            </Button>
            <Button onClick={editTemplate ? handleSaveEdit : handleSaveCreate} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {editTemplate ? "Luu thay doi" : "Tao mau"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Missing import
function FileCode({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <path d="m10 13-2 2 2 2" />
      <path d="m14 17 2-2-2-2" />
    </svg>
  );
}
