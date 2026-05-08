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
  Target,
  Users,
  ChevronRight,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

const MOCK_SEGMENTS = [
  {
    id: "seg-1",
    name: "Khách hàng mua MacBook",
    description: "Tất cả khách đã mua sản phẩm MacBook",
    memberCount: 45,
    matchCount: 156,
    lastSync: "2026-05-07T08:00:00Z",
    type: "product",
    criteria: 'product_category = "MacBook"',
  },
  {
    id: "seg-2",
    name: "Khách hàng tiềm năng Gaming",
    description: "Đã xem PC Gaming nhưng chưa mua",
    memberCount: 89,
    matchCount: 234,
    lastSync: "2026-05-07T08:00:00Z",
    type: "browse",
    criteria: 'viewed_category = "PC Gaming" AND purchased = false',
  },
  {
    id: "seg-3",
    name: "Khách hàng chi tiêu cao",
    description: "Đã chi tiêu tổng cộng trên 20 triệu",
    memberCount: 23,
    matchCount: 67,
    lastSync: "2026-05-07T08:00:00Z",
    type: "spending",
    criteria: "total_spent > 20000000",
  },
  {
    id: "seg-4",
    name: "Khách hàng mua phụ kiện",
    description: "Đã mua ít nhất 1 sản phẩm phụ kiện",
    memberCount: 312,
    matchCount: 890,
    lastSync: "2026-05-07T08:00:00Z",
    type: "product",
    criteria: 'product_category = "Phụ kiện"',
  },
  {
    id: "seg-5",
    name: "Khách hàng ở Mỹ Tho",
    description: "Địa chỉ giao hàng tại TP. Mỹ Tho",
    memberCount: 567,
    matchCount: 1200,
    lastSync: "2026-05-07T08:00:00Z",
    type: "location",
    criteria: 'city = "Mỹ Tho"',
  },
];

const TYPE_CONFIG = {
  product: { label: "Theo sản phẩm", variant: "default" as const, color: "text-blue-600" },
  browse: { label: "Theo hành vi", variant: "secondary" as const, color: "text-purple-600" },
  spending: { label: "Theo chi tiêu", variant: "default" as const, color: "text-green-600" },
  location: { label: "Theo vị trí", variant: "secondary" as const, color: "text-orange-600" },
};

export default function SegmentsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    criteria: "",
  });

  const filteredSegments = MOCK_SEGMENTS.filter((seg) => {
    const matchSearch =
      search === "" ||
      seg.name.toLowerCase().includes(search.toLowerCase()) ||
      seg.description.toLowerCase().includes(search.toLowerCase());

    const matchType = typeFilter === "all" || seg.type === typeFilter;

    return matchSearch && matchType;
  });

  const handleCreate = () => {
    toast.success("Đã tạo phân khúc khách hàng");
    setCreateOpen(false);
    setFormData({ name: "", description: "", criteria: "" });
  };

  const handleDuplicate = (seg: typeof MOCK_SEGMENTS[0]) => {
    setFormData({
      name: `${seg.name} (Copy)`,
      description: seg.description,
      criteria: seg.criteria,
    });
    setCreateOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Phân khúc khách hàng</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tạo phân khúc để gửi marketing campaign hiệu quả
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Tạo phân khúc
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Tổng phân khúc
                </p>
                <p className="text-2xl font-bold mt-1">
                  {MOCK_SEGMENTS.length}
                </p>
              </div>
              <Target className="size-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Tổng khách hàng
                </p>
                <p className="text-2xl font-bold mt-1">
                  {MOCK_SEGMENTS.reduce((sum, s) => sum + s.memberCount, 0)}
                </p>
              </div>
              <Users className="size-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Phân khúc nhiều nhất</p>
                <p className="text-lg font-semibold mt-1 truncate max-w-[150px]">
                  {MOCK_SEGMENTS.sort((a, b) => b.memberCount - a.memberCount)[0]?.name}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mới nhất</p>
                <p className="text-lg font-semibold mt-1 truncate max-w-[150px]">
                  {MOCK_SEGMENTS.sort(
                    (a, b) => new Date(b.lastSync).getTime() - new Date(a.lastSync).getTime()
                  )[0]?.name}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm phân khúc..."
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
              <option value="all">Tất cả loại</option>
              <option value="product">Theo sản phẩm</option>
              <option value="browse">Theo hành vi</option>
              <option value="spending">Theo chi tiêu</option>
              <option value="location">Theo vị trí</option>
            </select>
            <Button variant="outline" size="icon">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Segments Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {filteredSegments.length} phân khúc
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phân khúc</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead className="text-right">Khớp</TableHead>
                <TableHead className="text-right">Trong nhóm</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSegments.map((seg) => {
                const typeConfig = TYPE_CONFIG[seg.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.product;
                return (
                  <TableRow key={seg.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{seg.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">
                          {seg.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={typeConfig.variant} className={typeConfig.color}>
                        {typeConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {seg.matchCount}
                      </code>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold">{seg.memberCount}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleDuplicate(seg)}
                          title="Nhân bản"
                        >
                          <Copy className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8">
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tạo phân khúc mới</DialogTitle>
            <DialogDescription>
              Định nghĩa điều kiện để phân loại khách hàng
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên phân khúc</label>
              <Input
                placeholder="VD: Khách hàng tiềm năng Gaming"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mô tả</label>
              <Input
                placeholder="Mô tả ngắn"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Điều kiện</label>
              <Input
                placeholder="VD: product_category = 'Laptop' AND total_spent > 10000000"
                value={formData.criteria}
                onChange={(e) =>
                  setFormData({ ...formData, criteria: e.target.value })
                }
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Sử dụng AND, OR để kết hợp nhiều điều kiện
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreate}>Tạo phân khúc</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
