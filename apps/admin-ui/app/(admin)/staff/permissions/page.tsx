"use client";

import { useState } from "react";
import { Save, RotateCcw, Copy, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { roles as mockRoles } from "@/lib/mock-data";
import { Role, PermissionAction } from "@/types";
import {
  STAFF_ROLE_LABELS,
  PERMISSION_ACTION_LABELS,
  PERMISSION_ACTIONS,
} from "@/lib/constants";

const PERMISSION_MODULES = [
  { id: "dashboard", name: "Dashboard", code: "dashboard" },
  { id: "migration", name: "Migration", code: "migration" },
  { id: "products", name: "Sản phẩm", code: "products" },
  { id: "product_categories", name: "Danh mục sản phẩm", code: "product_categories" },
  { id: "product_tags", name: "Thẻ sản phẩm", code: "product_tags" },
  { id: "orders", name: "Đơn hàng", code: "orders" },
  { id: "customers", name: "Khách hàng", code: "customers" },
  { id: "staff", name: "Nhân viên", code: "staff" },
  { id: "roles", name: "Vai trò", code: "roles" },
  { id: "permissions", name: "Phân quyền", code: "permissions" },
  { id: "settings", name: "Cài đặt", code: "settings" },
  { id: "reports", name: "Báo cáo", code: "reports" },
  { id: "media", name: "Hình ảnh", code: "media" },
];

const DEFAULT_PERMISSIONS: Record<string, Record<string, PermissionAction[]>> = {
  super_admin: Object.fromEntries(
    PERMISSION_MODULES.map((m) => [
      m.code,
      [...PERMISSION_ACTIONS] as PermissionAction[],
    ])
  ),
  admin: Object.fromEntries(
    PERMISSION_MODULES.map((m) => [
      m.code,
      [...PERMISSION_ACTIONS] as PermissionAction[],
    ])
  ),
  manager: Object.fromEntries(
    PERMISSION_MODULES.map((m) => [
      m.code,
      m.code === "permissions"
        ? (["view"] as PermissionAction[])
        : (["view", "create", "update"] as PermissionAction[]),
    ])
  ),
  sales: Object.fromEntries([
    ["dashboard", ["view"] as PermissionAction[]],
    ["migration", []],
    ["products", ["view"] as PermissionAction[]],
    ["product_categories", ["view"] as PermissionAction[]],
    ["product_tags", ["view"] as PermissionAction[]],
    ["orders", ["view", "create", "update"] as PermissionAction[]],
    ["customers", ["view", "create"] as PermissionAction[]],
    ["staff", []],
    ["roles", []],
    ["permissions", []],
    ["settings", []],
    ["reports", ["view"] as PermissionAction[]],
    ["media", ["view", "create"] as PermissionAction[]],
  ]),
  warehouse: Object.fromEntries([
    ["dashboard", ["view"] as PermissionAction[]],
    ["migration", []],
    ["products", ["view", "update"] as PermissionAction[]],
    ["product_categories", ["view"] as PermissionAction[]],
    ["product_tags", ["view"] as PermissionAction[]],
    ["orders", ["view"] as PermissionAction[]],
    ["customers", []],
    ["staff", []],
    ["roles", []],
    ["permissions", []],
    ["settings", []],
    ["reports", []],
    ["media", ["view"] as PermissionAction[]],
  ]),
  marketing: Object.fromEntries([
    ["dashboard", ["view"] as PermissionAction[]],
    ["migration", ["view", "create", "update", "sync"] as PermissionAction[]],
    ["products", ["view", "create", "update"] as PermissionAction[]],
    ["product_categories", ["view"] as PermissionAction[]],
    ["product_tags", ["view", "create", "update"] as PermissionAction[]],
    ["orders", ["view"] as PermissionAction[]],
    ["customers", ["view"] as PermissionAction[]],
    ["staff", []],
    ["roles", []],
    ["permissions", []],
    ["settings", []],
    ["reports", ["view", "export"] as PermissionAction[]],
    ["media", ["view", "create", "update", "delete"] as PermissionAction[]],
  ]),
  accountant: Object.fromEntries([
    ["dashboard", ["view"] as PermissionAction[]],
    ["migration", []],
    ["products", ["view"] as PermissionAction[]],
    ["product_categories", []],
    ["product_tags", []],
    ["orders", ["view"] as PermissionAction[]],
    ["customers", ["view"] as PermissionAction[]],
    ["staff", []],
    ["roles", []],
    ["permissions", []],
    ["settings", []],
    ["reports", ["view", "export"] as PermissionAction[]],
    ["media", []],
  ]),
  viewer: Object.fromEntries(
    PERMISSION_MODULES.map((m) => [m.code, ["view"] as PermissionAction[]])
  ),
};

export default function PermissionsPage() {
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    mockRoles.find((r) => r.code === "manager")?.id || mockRoles[0].id
  );
  const [permissions, setPermissions] = useState<
    Record<string, Record<string, PermissionAction[]>>
  >(() => {
    const initial: Record<string, Record<string, PermissionAction[]>> = {};
    mockRoles.forEach((role) => {
      initial[role.id] =
        DEFAULT_PERMISSIONS[role.code] ||
        Object.fromEntries(
          PERMISSION_MODULES.map((m) => [m.code, ["view"] as PermissionAction[]])
        );
    });
    return initial;
  });

  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyFromRoleId, setCopyFromRoleId] = useState<string>("");
  const [showWarning, setShowWarning] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const selectedRole = mockRoles.find((r) => r.id === selectedRoleId);
  const selectedPermissions = permissions[selectedRoleId] || {};
  const isSuperAdmin = selectedRole?.code === "super_admin";

  const hasPermission = (moduleCode: string, action: PermissionAction) => {
    return selectedPermissions[moduleCode]?.includes(action) || false;
  };

  const togglePermission = (moduleCode: string, action: PermissionAction) => {
    const current = selectedPermissions[moduleCode] || [];

    // Check if removing this would leave no permissions
    const wouldBeEmpty =
      current.includes(action) &&
      current.length === 1 &&
      action === "view";

    if (isSuperAdmin && wouldBeEmpty) {
      setShowWarning(true);
      return;
    }

    const newPermissions = current.includes(action)
      ? current.filter((a) => a !== action)
      : [...current, action];

    setPermissions((prev) => ({
      ...prev,
      [selectedRoleId]: {
        ...prev[selectedRoleId],
        [moduleCode]: newPermissions,
      },
    }));
  };

  const handleReset = () => {
    if (!selectedRole) return;
    const defaultPerms = DEFAULT_PERMISSIONS[selectedRole.code];
    if (defaultPerms) {
      setPermissions((prev) => ({
        ...prev,
        [selectedRoleId]: { ...defaultPerms },
      }));
    }
  };

  const handleCopy = () => {
    if (!copyFromRoleId) return;
    const sourcePermissions = permissions[copyFromRoleId];
    if (sourcePermissions) {
      setPermissions((prev) => ({
        ...prev,
        [selectedRoleId]: { ...sourcePermissions },
      }));
    }
    setCopyDialogOpen(false);
    setCopyFromRoleId("");
  };

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Ma trận phân quyền
        </h1>
        <p className="text-muted-foreground">
          Thiết lập quyền hạn chi tiết cho từng vai trò trong hệ thống.
        </p>
      </div>

      {/* Role selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">
                Chọn vai trò:
              </label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  {mockRoles
                    .filter((r) => r.status === "active")
                    .map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          <span>{role.name}</span>
                          {role.isSystem && (
                            <Badge variant="secondary" className="text-xs">
                              Hệ thống
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedRole && (
                <Badge variant="outline">
                  {STAFF_ROLE_LABELS[selectedRole.code]}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setCopyDialogOpen(true)}>
                <Copy className="mr-2 size-4" />
                Copy quyền từ vai trò khác
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 size-4" />
                Reset mặc định
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 size-4" />
                Lưu quyền
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save success message */}
      {saveSuccess && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="p-4">
            <p className="text-green-700 dark:text-green-400 font-medium">
              Đã lưu quyền hạn thành công!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Security warning for super_admin */}
      {showWarning && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  Cảnh báo bảo mật
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Vai trò Super Admin phải có ít nhất quyền Xem. Bạn không thể
                  xoá toàn bộ quyền của vai trò này.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permission Matrix Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px] sticky left-0 bg-background z-10">
                  Module
                </TableHead>
                {PERMISSION_ACTIONS.map((action) => (
                  <TableHead
                    key={action}
                    className="text-center min-w-[80px]"
                  >
                    {PERMISSION_ACTION_LABELS[action]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSION_MODULES.map((module) => (
                <TableRow key={module.id}>
                  <TableCell className="font-medium sticky left-0 bg-background z-10">
                    {module.name}
                  </TableCell>
                  {PERMISSION_ACTIONS.map((action) => (
                    <TableCell key={action} className="text-center">
                      <Checkbox
                        checked={hasPermission(module.code, action)}
                        onCheckedChange={() =>
                          togglePermission(module.code, action)
                        }
                        disabled={
                          isSuperAdmin &&
                          module.code === "permissions" &&
                          action === "view"
                        }
                        className="mx-auto"
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="size-4 border rounded bg-primary/10 flex items-center justify-center">
                <Checkbox checked disabled />
              </div>
              <span>Có quyền</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-4 border rounded" />
              <span>Không có quyền</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Hệ thống
              </Badge>
              <span>Vai trò mặc định, không thể xoá</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Copy permissions dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy quyền từ vai trò khác</DialogTitle>
            <DialogDescription>
              Chọn một vai trò để copy toàn bộ quyền hạn sang vai trò{" "}
              <strong>{selectedRole?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={copyFromRoleId} onValueChange={setCopyFromRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn vai trò nguồn" />
              </SelectTrigger>
              <SelectContent>
                {mockRoles
                  .filter((r) => r.id !== selectedRoleId)
                  .map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Huỷ
            </Button>
            <Button onClick={handleCopy} disabled={!copyFromRoleId}>
              Copy quyền
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
