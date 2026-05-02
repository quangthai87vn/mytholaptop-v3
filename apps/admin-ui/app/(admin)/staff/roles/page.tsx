"use client";

import { useState } from "react";
import { Shield, Pencil, Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { roles as mockRoles, staff } from "@/lib/mock-data";
import { Role, StaffRole } from "@/types";
import { STAFF_ROLE_LABELS, STAFF_ROLES } from "@/lib/constants";

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>(mockRoles);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "" as StaffRole,
    description: "",
    status: "active" as "active" | "inactive",
    isSystem: false,
  });

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedRole(null);
    setFormData({
      name: "",
      code: "viewer",
      description: "",
      status: "active",
      isSystem: false,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (role: Role) => {
    setIsEditing(true);
    setSelectedRole(role);
    setFormData({
      name: role.name,
      code: role.code,
      description: role.description,
      status: role.status,
      isSystem: role.isSystem,
    });
    setDialogOpen(true);
  };

  const handleDelete = (roleId: string) => {
    setRoleToDelete(roleId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (roleToDelete) {
      setRoles((prev) => prev.filter((r) => r.id !== roleToDelete));
      setRoleToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleSave = () => {
    const now = new Date().toISOString();

    if (isEditing && selectedRole) {
      setRoles((prev) =>
        prev.map((r) =>
          r.id === selectedRole.id
            ? {
                ...r,
                name: formData.name,
                code: formData.code,
                description: formData.description,
                status: formData.status,
                updatedAt: now,
              }
            : r
        )
      );
    } else {
      const newRole: Role = {
        id: `role_${Date.now()}`,
        name: formData.name,
        code: formData.code,
        description: formData.description,
        status: formData.status,
        isSystem: false,
        staffCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      setRoles((prev) => [...prev, newRole]);
    }

    setDialogOpen(false);
    setFormData({
      name: "",
      code: "viewer",
      description: "",
      status: "active",
      isSystem: false,
    });
  };

  const getStaffCountForRole = (roleCode: string) => {
    return staff.filter((s) => s.role === roleCode).length;
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Vai trò
          </h1>
          <p className="text-muted-foreground">
            Quản lý vai trò và quyền hạn của nhân viên trong hệ thống.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 size-4" />
          Thêm vai trò
        </Button>
      </div>

      {/* Role cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <Card key={role.id} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Shield className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">
                      {role.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {STAFF_ROLE_LABELS[role.code]}
                    </CardDescription>
                  </div>
                </div>
                {role.isSystem && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    Hệ thống
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {role.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-primary" />
                    <span className="text-sm font-medium">
                      {getStaffCountForRole(role.code)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      nhân viên
                    </span>
                  </div>
                </div>
                <Badge
                  variant={role.status === "active" ? "success" : "secondary"}
                >
                  {role.status === "active" ? "Hoạt động" : "Tắt"}
                </Badge>
              </div>
              {!role.isSystem && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenEdit(role)}
                  >
                    <Pencil className="mr-1 size-4" />
                    Sửa
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive hover:text-destructive hover:border-destructive/50"
                    onClick={() => handleDelete(role.id)}
                  >
                    <Trash2 className="mr-1 size-4" />
                    Xoá
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        Tổng cộng {roles.length} vai trò • {roles.filter((r) => r.status === "active").length} đang hoạt động
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Sửa vai trò" : "Thêm vai trò mới"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Cập nhật thông tin vai trò."
                : "Tạo vai trò mới để phân quyền cho nhân viên."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Tên vai trò */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên vai trò</label>
              <Input
                placeholder="Nhập tên vai trò..."
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            {/* Mã vai trò */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mã vai trò</label>
              <Select
                value={formData.code}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    code: value as StaffRole,
                  }))
                }
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn mã vai trò" />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {STAFF_ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mô tả */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mô tả</label>
              <Textarea
                placeholder="Mô tả vai trò..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            {/* Trạng thái */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Trạng thái</label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: value as "active" | "inactive",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Hoạt động</SelectItem>
                  <SelectItem value="inactive">Tắt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* isSystem checkbox */}
            {isEditing && (
              <div className="flex items-center gap-2">
                <Checkbox id="isSystem" checked={formData.isSystem} disabled />
                <label
                  htmlFor="isSystem"
                  className="text-sm font-medium cursor-pointer"
                >
                  Vai trò hệ thống
                </label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Huỷ
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name.trim() || !formData.code}
            >
              {isEditing ? "Cập nhật" : "Tạo mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xoá vai trò</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xoá vai trò này? Nhân viên đang sử dụng
              vai trò này sẽ mất quyền.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Huỷ
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
