"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  AlertTriangle,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/lib/auth/store";
import { adminFetch } from "@/lib/api/admin-fetch";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RoleInfo {
  code: string;
  name: string;
  description: string;
  role_type: "system" | "custom";
  is_active: boolean;
  staffCount: number;
  permissions?: string[];
}

interface RolesResponse {
  data: RoleInfo[];
  total: number;
}

// ─── System Role Templates (for clone feature) ─────────────────────────────────

const SYSTEM_ROLE_TEMPLATES = [
  { code: "super_admin", name: "Super Admin",    description: "Toàn quyền quản trị hệ thống. Không giới hạn." },
  { code: "admin",       name: "Quản trị viên",  description: "Quản lý workspace, nội dung, nhân viên. Không quản lý credentials hệ thống." },
  { code: "editor",      name: "Biên tập viên",  description: "Tạo/sửa project, campaign, task, nội dung. Không xóa. Không chỉnh settings." },
  { code: "viewer",      name: "Người xem",       description: "Chỉ xem dữ liệu. Không tạo, sửa, xóa gì." },
  { code: "intern",      name: "Thực tập sinh",    description: "Làm việc theo task được giao, tạo nội dung cơ bản." },
];

// ─── Role color map ────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  admin:       "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  editor:      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  viewer:      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  intern:      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

// ─── Create form ───────────────────────────────────────────────────────────

interface RoleFormData {
  code: string;
  name: string;
  description: string;
  fromTemplate: string; // "" means blank, otherwise system role code
}

function RoleFormModal({
  open,
  onClose,
  onSuccess,
  editingRole,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingRole: RoleInfo | null;
}) {
  const [form, setForm] = useState<RoleFormData>({
    code: "", name: "", description: "", fromTemplate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editingRole) {
        setForm({ code: editingRole.code, name: editingRole.name, description: editingRole.description, fromTemplate: "" });
      } else {
        setForm({ code: "", name: "", description: "", fromTemplate: "" });
      }
      setError(null);
    }
  }, [open, editingRole]);

  const isEditing = !!editingRole;
  const hasTemplate = form.fromTemplate !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const template = SYSTEM_ROLE_TEMPLATES.find((t) => t.code === form.fromTemplate);
      const url = isEditing ? `/api/roles/${editingRole.code}` : "/api/roles";
      const method = isEditing ? "PUT" : "POST";

      const payload: Record<string, unknown> = isEditing
        ? { name: form.name, description: form.description }
        : { code: form.code, name: form.name, description: form.description };

      if (!isEditing && hasTemplate && template) {
        payload.permissions = getSystemRolePermissions(template.code);
      }

      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Lỗi không xác định.");
        return;
      }

      toast.success(isEditing ? "Đã cập nhật vai trò." : "Đã tạo vai trò mới.");
      onSuccess();
      onClose();
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  function setTemplate(code: string) {
    const t = SYSTEM_ROLE_TEMPLATES.find((x) => x.code === code);
    if (!t) return;
    setForm({
      ...form,
      fromTemplate: code,
      name: `${t.name} (bản sao)`,
      description: `Dựa trên vai trò "${t.name}". ${t.description}`,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Sửa vai trò" : "Tạo vai trò mới"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Chỉnh sửa tên và mô tả vai trò."
              : "Tạo vai trò tùy chỉnh. Có thể chọn mẫu từ vai trò hệ thống."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <>
              {/* Template selector */}
              <div className="space-y-1.5">
                <Label>Tạo từ mẫu</Label>
                <Select
                  value={form.fromTemplate}
                  onValueChange={setTemplate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="— Tạo vai trò trống —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__blank__">— Tạo vai trò trống —</SelectItem>
                    {SYSTEM_ROLE_TEMPLATES.map((t) => (
                      <SelectItem key={t.code} value={t.code}>
                        <div className="flex items-center gap-2">
                          <Shield className="size-3.5 shrink-0" />
                          <span>{t.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasTemplate && (
                  <p className="text-xs text-green-700 flex items-center gap-1">
                    <Check className="size-3" />
                    Đã áp dụng quyền từ mẫu "{SYSTEM_ROLE_TEMPLATES.find((t) => t.code === form.fromTemplate)?.name}"
                  </p>
                )}
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="role-code">Mã vai trò</Label>
                  <Input
                    id="role-code"
                    value={form.code}
                    onChange={(e) =>
                      setForm({ ...form, code: e.target.value.toLowerCase().replace(/\s+/g, "_") })
                    }
                    placeholder="vd: marketing_staff"
                    required
                    maxLength={50}
                    pattern="^[a-z0-9_]+$"
                  />
                  <p className="text-xs text-muted-foreground">
                    Chỉ chữ thường, số và dấu gạch dưới. VD: <code>content_editor</code>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="role-name">Tên vai trò</Label>
                  <Input
                    id="role-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="VD: Nhân viên Content"
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="role-desc">Mô tả</Label>
                  <Textarea
                    id="role-desc"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Mô tả ngắn về vai trò này..."
                    rows={3}
                    maxLength={500}
                  />
                </div>
              </div>
            </>
          )}

          {isEditing && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="role-name-e">Tên vai trò</Label>
                <Input
                  id="role-name-e"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role-desc-e">Mô tả</Label>
                <Textarea
                  id="role-desc-e"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  maxLength={500}
                />
              </div>
            </>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {isEditing ? "Lưu thay đổi" : "Tạo vai trò"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── System role permissions map ─────────────────────────────────────────────────

function getSystemRolePermissions(code: string): string[] {
  const MAP: Record<string, string[]> = {
    super_admin: [
      "users.read","users.create","users.update","users.delete",
      "roles.read","roles.manage","permissions.read",
      "settings.manage","credentials.manage",
      "ai_engine.manage","ai_generate","ai_providers.manage",
      "projects.read","projects.manage","projects.create","projects.update","projects.delete",
      "campaigns.read","campaigns.manage","campaigns.create","campaigns.update","campaigns.delete",
      "tasks.read","tasks.create","tasks.update","tasks.delete",
      "interns.manage","media.manage","migration.manage",
      "content.read","content.create","content.update","content.delete",
      "comments.read","comments.create","comments.update","comments.delete",
      "assets.read","assets.create","assets.update","assets.delete",
      "notifications.read",
    ],
    admin: [
      "users.read","roles.read","permissions.read","ai_generate",
      "projects.read","projects.manage","projects.create","projects.update",
      "campaigns.read","campaigns.manage","campaigns.create","campaigns.update",
      "tasks.read","tasks.create","tasks.update","tasks.delete",
      "interns.manage","media.manage","migration.manage",
      "content.read","content.create","content.update","content.delete",
      "comments.read","comments.create","comments.update","comments.delete",
      "assets.read","assets.create","assets.update","assets.delete",
      "notifications.read",
    ],
    editor: [
      "ai_generate",
      "tasks.read","tasks.create","tasks.update",
      "projects.read","projects.create","projects.update",
      "campaigns.read","campaigns.create","campaigns.update",
      "content.read","content.create","content.update",
      "comments.read","comments.create",
      "assets.read","assets.create",
      "notifications.read",
    ],
    viewer: [
      "tasks.read","projects.read","campaigns.read","content.read",
      "comments.read","assets.read",
      "notifications.read",
    ],
    intern: [
      "tasks.read","tasks.update",
      "comments.read","comments.create",
      "assets.read","assets.create",
      "notifications.read",
      "ai_generate",
    ],
  };
  return MAP[code] ?? [];
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteRoleModal({
  open,
  onClose,
  role,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  role: RoleInfo | null;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  if (!role) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/roles/${role.code}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể xóa vai trò.");
        return;
      }
      toast.success(`Đã xóa vai trò "${role.name}".`);
      onSuccess();
      onClose();
    } catch {
      setError("Lỗi kết nối.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            Xóa vai trò
          </DialogTitle>
          <DialogDescription>
            Bạn có chắc muốn xóa vai trò <strong>{role.name}</strong> ({role.code}) không?
          </DialogDescription>
        </DialogHeader>

        {role.staffCount > 0 && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm">
            <strong>Không thể xóa:</strong> Vai trò này đang có {role.staffCount} người dùng.
            Chuyển họ sang vai trò khác trước.
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading || role.staffCount > 0}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Xóa vai trò
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function RolesPage() {
  const currentUser = useAuthStore((s) => s.user);
  const canManage = currentUser?.role === "super_admin" || currentUser?.role === "admin";

  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [cloneFrom, setCloneFrom] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<RoleInfo | null>(null);
  const [deleteRole, setDeleteRole] = useState<RoleInfo | null>(null);

  const fetchRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/roles");
      if (!res.ok) {
        setError(res.status === 403 ? "Bạn không có quyền xem vai trò." : "Lỗi khi tải vai trò.");
        return;
      }
      const data: RolesResponse = await res.json();
      setRoles(data.data);
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const systemRoles = roles.filter((r) => r.role_type === "system");
  const customRoles = roles.filter((r) => r.role_type === "custom");

  function handleClone(roleCode: string) {
    setCloneFrom(roleCode);
    setCreateOpen(true);
  }

  function openCreateModal() {
    setCloneFrom(null);
    setCreateOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Vai trò</h1>
          <p className="text-muted-foreground">
            Danh sách vai trò. Vai trò hệ thống không thể xóa — dùng &ldquo;Nhân bản&rdquo; để tạo phiên bản tùy chỉnh.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => openCreateModal()} className="gap-2">
            <Plus className="size-4" />
            Thêm vai trò
          </Button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Đang tải vai trò...</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {!loading && error && (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-destructive font-medium">{error}</p>
            <button className="mt-4 text-sm text-primary underline" onClick={fetchRoles}>Thử lại</button>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* System roles */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Vai trò hệ thống
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {systemRoles.map((role) => (
                <Card key={role.code} className="relative overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Shield className="size-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-sm truncate">{role.name}</CardTitle>
                          <p className="text-[10px] text-muted-foreground font-mono">{role.code}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">Hệ thống</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground line-clamp-3">{role.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge className={ROLE_COLORS[role.code] || "bg-gray-100 text-gray-700"}>
                        {role.staffCount} người
                      </Badge>
                    </div>
                    {canManage && (
                      <div className="pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-1.5 h-8 text-xs"
                          onClick={() => handleClone(role.code)}
                        >
                          <Copy className="size-3.5" />
                          Nhân bản
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom roles */}
          {customRoles.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Vai trò tùy chỉnh
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {customRoles.map((role) => (
                  <Card key={role.code} className="relative overflow-hidden border-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Shield className="size-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-sm truncate">{role.name}</CardTitle>
                            <p className="text-[10px] text-muted-foreground font-mono">{role.code}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px] border-primary/40 text-primary">
                          Tùy chỉnh
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground line-clamp-3">{role.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={ROLE_COLORS[role.code] || "bg-gray-100 text-gray-700"}>
                          {role.staffCount} người
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {role.permissions?.length ?? 0} quyền
                        </Badge>
                      </div>
                      {canManage && (
                        <div className="flex gap-1.5 pt-2 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs gap-1"
                            onClick={() => setEditRole(role)}
                          >
                            <Pencil className="size-3" />Sửa
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs gap-1 text-destructive hover:text-destructive"
                            onClick={() => setDeleteRole(role)}
                          >
                            <Trash2 className="size-3" />Xóa
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {customRoles.length === 0 && canManage && (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <Shield className="size-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-4">
                Chưa có vai trò tùy chỉnh nào.
              </p>
              <Button variant="outline" size="sm" onClick={() => openCreateModal()} className="gap-2">
                <Plus className="size-4" />
                Tạo vai trò đầu tiên
              </Button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <RoleFormModal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCloneFrom(null); }}
        onSuccess={fetchRoles}
        editingRole={null}
      />
      <RoleFormModal
        open={!!editRole}
        onClose={() => setEditRole(null)}
        onSuccess={fetchRoles}
        editingRole={editRole}
      />
      <DeleteRoleModal
        open={!!deleteRole}
        onClose={() => setDeleteRole(null)}
        role={deleteRole}
        onSuccess={fetchRoles}
      />
    </div>
  );
}
