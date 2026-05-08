"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search,
  RefreshCw,
  Plus,
  Users,
  Pencil,
  Trash2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

const MOCK_GROUPS = [
  {
    id: "grp-1",
    name: "VIP Khách hàng",
    description: "Khách hàng chi tiêu trên 50 triệu/năm",
    color: "#ef4444",
    memberCount: 87,
    rule: "total_spent >= 50000000",
    autoAssign: true,
  },
  {
    id: "grp-2",
    name: "Khách hàng mới",
    description: "Đã đặt hàng lần đầu trong 30 ngày",
    color: "#22c55e",
    memberCount: 234,
    rule: "first_order_date >= 30_days_ago",
    autoAssign: true,
  },
  {
    id: "grp-3",
    name: "Khách hàng không hoạt động",
    description: "Không mua hàng trong 90 ngày",
    color: "#f59e0b",
    memberCount: 156,
    rule: "last_order_date < 90_days_ago",
    autoAssign: true,
  },
  {
    id: "grp-4",
    name: "Laptop Giá Rẻ",
    description: "Khách hàng mua laptop dưới 15 triệu",
    color: "#3b82f6",
    memberCount: 412,
    rule: "category:laptop AND price < 15000000",
    autoAssign: true,
  },
  {
    id: "grp-5",
    name: "Nhóm Test Nội Bộ",
    description: "Dùng để test hệ thống",
    color: "#8b5cf6",
    memberCount: 5,
    rule: "email LIKE %@mytholaptop.vn",
    autoAssign: false,
  },
];

export default function GroupsPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<typeof MOCK_GROUPS[0] | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
  });

  const filteredGroups = MOCK_GROUPS.filter(
    (group) =>
      search === "" ||
      group.name.toLowerCase().includes(search.toLowerCase()) ||
      group.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    toast.success("Đã tạo nhóm khách hàng");
    setCreateOpen(false);
    setFormData({ name: "", description: "", color: "#3b82f6" });
  };

  const handleEdit = () => {
    if (editGroup) {
      toast.success(`Đã cập nhật nhóm "${editGroup.name}"`);
      setEditGroup(null);
    }
  };

  const handleDelete = (group: typeof MOCK_GROUPS[0]) => {
    toast.success(`Đã xóa nhóm "${group.name}"`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nhóm khách hàng</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Phân loại khách hàng theo nhóm để marketing hiệu quả
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="gap-2"
        >
          <Plus className="size-4" />
          Tạo nhóm
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm nhóm..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGroups.map((group) => (
          <Card key={group.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="size-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: group.color + "20" }}
                  >
                    <Users
                      className="size-5"
                      style={{ color: group.color }}
                    />
                  </div>
                  <div>
                    <CardTitle className="text-base">{group.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {group.memberCount} thành viên
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setEditGroup(group)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    onClick={() => handleDelete(group)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {group.description}
              </p>
              <div className="flex items-center justify-between">
                <code className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                  {group.rule}
                </code>
                {group.autoAssign ? (
                  <Badge variant="success" className="text-xs">
                    <UserCheck className="size-3 mr-1" />
                    Tự động
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Thủ công
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo nhóm khách hàng</DialogTitle>
            <DialogDescription>
              Tạo nhóm mới để phân loại khách hàng
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên nhóm</label>
              <Input
                placeholder="VD: VIP Khách hàng"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mô tả</label>
              <Input
                placeholder="Mô tả ngắn về nhóm"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Màu sắc</label>
              <div className="flex gap-2">
                {[
                  "#ef4444",
                  "#f59e0b",
                  "#22c55e",
                  "#3b82f6",
                  "#8b5cf6",
                  "#ec4899",
                ].map((color) => (
                  <button
                    key={color}
                    className="size-8 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreate}>Tạo nhóm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editGroup} onOpenChange={() => setEditGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa nhóm</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin nhóm khách hàng
            </DialogDescription>
          </DialogHeader>
          {editGroup && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tên nhóm</label>
                <Input defaultValue={editGroup.name} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mô tả</label>
                <Input defaultValue={editGroup.description} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGroup(null)}>
              Hủy
            </Button>
            <Button onClick={handleEdit}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
