/**
 * Reusable Staff Users Tab Content
 * Tách ra khỏi page.tsx để dùng trong /settings/users tabs
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  MoreHorizontal,
  UserPlus,
  Shield,
  Trash2,
  Pencil,
  Loader2,
  AlertCircle,
  Mail,
  UserRound,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { adminFetch } from "@/lib/api/admin-fetch";
import {
  ROLE_LABELS,
  ROLE_BADGE_COLORS,
  canViewActionMenu,
  type Role,
} from "@/lib/auth/permissions";
import { useAuthStore } from "@/lib/auth/store";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StaffMember {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  status: "active" | "inactive";
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

interface StaffListResponse {
  data: StaffMember[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ─── Create Dialog ────────────────────────────────────────────────────────────

interface CreateFormData {
  email: string;
  full_name: string;
  role: Role;
  password: string;
  confirm_password: string;
  status: "active" | "inactive";
}

function CreateUserDialog({
  open,
  onClose,
  onSuccess,
  currentUserRole,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserRole: string | undefined;
}) {
  const [form, setForm] = useState<CreateFormData>({
    email: "",
    full_name: "",
    role: "intern",
    password: "",
    confirm_password: "",
    status: "active",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({ email: "", full_name: "", role: "intern", password: "", confirm_password: "", status: "active" });
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (form.password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      setLoading(false);
      return;
    }
    if (form.password !== form.confirm_password) {
      setError("Mật khẩu xác nhận không khớp.");
      setLoading(false);
      return;
    }

    try {
      const res = await adminFetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          full_name: form.full_name,
          role: form.role,
          password: form.password,
          status: form.status,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || "Tạo nhân viên thất bại.";
        if (data.code === "FORBIDDEN") {
          setError("Bạn không có quyền tạo tài khoản với vai trò này.");
        } else if (data.code === "VALIDATION_ERROR") {
          const fieldErrors = data.details?.fieldErrors as Record<string, string[]> | undefined;
          const firstErr = Object.values(fieldErrors || {})[0]?.[0];
          setError(firstErr || msg);
        } else if (data.code === "DUPLICATE_EMAIL") {
          setError("Email đã tồn tại trong hệ thống.");
        } else {
          setError(msg);
        }
        return;
      }

      toast.success("Đã tạo nhân viên thành công.");
      onSuccess();
      onClose();
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo tài khoản nhân viên</DialogTitle>
          <DialogDescription>Tạo tài khoản nội bộ cho nhân viên mới.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-email">Email</Label>
            <Input
              id="create-email"
              type="email"
              placeholder="user@mytholaptop.vn"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-name">Họ tên</Label>
            <Input
              id="create-name"
              placeholder="Nguyễn Văn A"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
              minLength={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-role">Vai trò</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
              <SelectTrigger id="create-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentUserRole === "super_admin" && (
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                )}
                <SelectItem value="admin">Quản trị viên</SelectItem>
                <SelectItem value="editor">Biên tập viên</SelectItem>
                <SelectItem value="viewer">Người xem</SelectItem>
                <SelectItem value="intern">Thực tập sinh</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-password">Mật khẩu tạm</Label>
            <Input
              id="create-password"
              type="password"
              placeholder="Ít nhất 8 ký tự"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-confirm-password">Nhập lại mật khẩu</Label>
            <Input
              id="create-confirm-password"
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={form.confirm_password}
              onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
              required
              minLength={8}
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Huỷ
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !form.email ||
                !form.full_name ||
                !form.password ||
                !form.confirm_password
              }
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Tạo tài khoản
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Dialog ─────────────────────────────────────────────────────────────

interface EditFormData {
  full_name: string;
  role: Role;
  status: "active" | "inactive";
  password: string;
}

function EditUserDialog({
  open,
  onClose,
  member,
  onSuccess,
  currentUserRole,
}: {
  open: boolean;
  onClose: () => void;
  member: StaffMember | null;
  onSuccess: () => void;
  currentUserRole: string | undefined;
}) {
  const [form, setForm] = useState<EditFormData>({
    full_name: "",
    role: "intern",
    status: "active",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member && open) {
      setForm({
        full_name: member.full_name,
        role: member.role,
        status: member.status,
        password: "",
      });
      setError(null);
    }
  }, [member, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    setLoading(true);
    setError(null);

    const body: Record<string, string> = {};
    if (form.full_name !== member.full_name) body.full_name = form.full_name;
    if (form.status !== member.status) body.status = form.status;
    if (form.password) body.password = form.password;
    if (currentUserRole === "super_admin" && form.role !== member.role) {
      body.role = form.role;
    }

    if (Object.keys(body).length === 0) {
      onClose();
      setLoading(false);
      return;
    }

    try {
      const res = await adminFetch(`/api/staff/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || "Cập nhật thất bại.";
        if (data.code === "FORBIDDEN") {
          setError("Bạn không có quyền thực hiện thay đổi này.");
        } else if (data.code === "SELF_DEACTIVATE") {
          setError("Bạn không thể tự vô hiệu hoá tài khoản của chính mình.");
        } else if (data.code === "LAST_SUPER_ADMIN") {
          setError("Không thể thay đổi vai trò của Super Admin cuối cùng.");
        } else {
          setError(msg);
        }
        return;
      }

      toast.success("Đã cập nhật nhân viên.");
      onSuccess();
      onClose();
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (!open || !member) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa nhân viên</DialogTitle>
          <DialogDescription>Cập nhật thông tin tài khoản của {member.full_name}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={member.email} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Họ tên</Label>
            <Input
              id="edit-name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
              minLength={2}
            />
          </div>
          {currentUserRole === "super_admin" && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-role">Vai trò</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Quản trị viên</SelectItem>
                  <SelectItem value="editor">Biên tập viên</SelectItem>
                  <SelectItem value="viewer">Người xem</SelectItem>
                  <SelectItem value="intern">Thực tập sinh</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="edit-status">Trạng thái</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "active" | "inactive" })}>
              <SelectTrigger id="edit-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Tắt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-password">Mật khẩu mới (để trống = giữ nguyên)</Label>
            <Input
              id="edit-password"
              type="password"
              placeholder="Ít nhất 8 ký tự"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={8}
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Huỷ
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Dialog ──────────────────────────────────────────────────────────

function DeleteUserDialog({
  open,
  onClose,
  member,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  member: StaffMember | null;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !member) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/staff/${member.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể vô hiệu hoá nhân viên.");
        return;
      }
      toast.success("Đã vô hiệu hoá nhân viên.");
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
          <DialogTitle>Xác nhận vô hiệu hoá</DialogTitle>
          <DialogDescription>
            Bạn có chắc muốn vô hiệu hoá tài khoản của{" "}
            <strong>{member.full_name}</strong>? Họ sẽ không thể đăng nhập.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Huỷ
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Vô hiệu hoá
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Staff Table Component ───────────────────────────────────────────────────

function StaffTable({
  staff,
  total,
  loading,
  loadError,
  onRetry,
  onFetch,
  page,
  totalPages,
  currentUser,
  onCreateOpen,
  onEditMember,
  onDeleteMember,
  canCreate,
}: {
  staff: StaffMember[];
  total: number;
  loading: boolean;
  loadError: string | null;
  onRetry: () => void;
  onFetch: (pg: number) => void;
  page: number;
  totalPages: number;
  currentUser: { id: string; role: string } | null;
  onCreateOpen: () => void;
  onEditMember: (m: StaffMember) => void;
  onDeleteMember: (m: StaffMember) => void;
  canCreate: boolean;
}) {
  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getStatusBadge = (status: string) =>
    status === "active"
      ? <Badge variant="success">Hoạt động</Badge>
      : <Badge variant="secondary">Tắt</Badge>;

  if (loadError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
          <AlertCircle className="size-8 text-destructive" />
          <p className="text-destructive font-medium">{loadError}</p>
          <Button variant="outline" onClick={onRetry}>Thử lại</Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Đang tải danh sách...</p>
        </CardContent>
      </Card>
    );
  }

  if (staff.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="size-10 text-muted-foreground mb-3" />
          <p className="text-base font-medium text-muted-foreground">
            Không tìm thấy nhân viên nào.
          </p>
          {canCreate && (
            <Button variant="outline" className="mt-4" onClick={onCreateOpen}>
              Tạo tài khoản đầu tiên
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {staff.length} / {total} nhân viên
      </p>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nhân viên</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead className="hidden sm:table-cell">Trạng thái</TableHead>
                <TableHead className="hidden sm:table-cell">Đăng nhập cuối</TableHead>
                <TableHead className="hidden sm:table-cell">Ngày tạo</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => {
                const showMenu = canViewActionMenu(
                  currentUser?.role || "",
                  currentUser?.id || "",
                  member.id,
                  member.role
                );
                const isMe = currentUser?.id === member.id;

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="text-xs">
                            {getInitials(member.full_name || member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{member.full_name || "—"}</p>
                            {isMe && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                (Bạn)
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="size-3" />
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={ROLE_BADGE_COLORS[member.role] || "bg-gray-100 text-gray-700"}>
                        <Shield className="size-3 mr-1" />
                        {ROLE_LABELS[member.role] || member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {getStatusBadge(member.status)}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell text-sm">
                      {member.last_login_at
                        ? new Date(member.last_login_at).toLocaleDateString("vi-VN")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell text-sm">
                      {new Date(member.created_at).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell>
                      {showMenu && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/settings/users/${member.id}`}>
                                <UserRound className="mr-2 size-4" />
                                Xem hồ sơ
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEditMember(member)}>
                              <Pencil className="mr-2 size-4" />
                              Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => onDeleteMember(member)}
                            >
                              <Trash2 className="mr-2 size-4" />
                              Vô hiệu hoá
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onFetch(page - 1)}>
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onFetch(page + 1)}>
            Sau
          </Button>
        </div>
      )}
    </>
  );
}

// ─── Staff Users Tab (default export) ────────────────────────────────────────

export default function StaffUsersTab() {
  const currentUser = useAuthStore((s) => s.user);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editMember, setEditMember] = useState<StaffMember | null>(null);
  const [deleteMember, setDeleteMember] = useState<StaffMember | null>(null);

  const limit = 50;
  const isSuperAdmin = currentUser?.role === "super_admin";
  const isAdmin = currentUser?.role === "admin";
  const canCreate = isSuperAdmin || isAdmin;

  const fetchStaff = useCallback(async (pg = 1) => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(limit) });
      if (search) params.set("search", search);
      if (role !== "all") params.set("role", role);
      if (status !== "all") params.set("status", status);

      const res = await adminFetch(`/api/staff?${params}`);
      if (!res.ok) {
        setLoadError("Không thể tải danh sách nhân viên.");
        return;
      }
      const data: StaffListResponse = await res.json();
      setStaff(data.data);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.pages);
    } catch {
      setLoadError("Lỗi kết nối khi tải danh sách.");
    } finally {
      setLoading(false);
    }
  }, [search, role, status, limit]);

  useEffect(() => { fetchStaff(1); }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchStaff(1), 350);
    return () => clearTimeout(timer);
  }, [search, fetchStaff]);

  return (
    <div className="space-y-4">
      {/* Filters + Create */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm tên, email..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={role} onValueChange={(v) => { setRole(v); fetchStaff(1); }}>
            <SelectTrigger className="w-40 h-10">
              <SelectValue placeholder="Vai trò" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả vai trò</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="admin">Quản trị viên</SelectItem>
              <SelectItem value="editor">Biên tập viên</SelectItem>
              <SelectItem value="viewer">Người xem</SelectItem>
              <SelectItem value="intern">Thực tập sinh</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); fetchStaff(1); }}>
            <SelectTrigger className="w-36 h-10">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Hoạt động</SelectItem>
              <SelectItem value="inactive">Tắt</SelectItem>
            </SelectContent>
          </Select>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <UserPlus className="size-4" />
              Tạo tài khoản
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <StaffTable
        staff={staff}
        total={total}
        loading={loading}
        loadError={loadError}
        onRetry={() => fetchStaff(page)}
        onFetch={fetchStaff}
        page={page}
        totalPages={totalPages}
        currentUser={currentUser}
        onCreateOpen={() => setCreateOpen(true)}
        onEditMember={setEditMember}
        onDeleteMember={setDeleteMember}
        canCreate={canCreate}
      />

      {/* Dialogs */}
      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => fetchStaff(1)}
        currentUserRole={currentUser?.role}
      />
      <EditUserDialog
        open={!!editMember}
        onClose={() => setEditMember(null)}
        member={editMember}
        onSuccess={() => fetchStaff(page)}
        currentUserRole={currentUser?.role}
      />
      <DeleteUserDialog
        open={!!deleteMember}
        onClose={() => setDeleteMember(null)}
        member={deleteMember}
        onSuccess={() => fetchStaff(page)}
      />
    </div>
  );
}
