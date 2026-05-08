"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Settings2,
} from "lucide-react";
import { MOCK_ATTRIBUTES } from "@/lib/mock-data";
import type { ProductAttribute } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function AttributesPage() {
  const [attributes] = useState<ProductAttribute[]>(MOCK_ATTRIBUTES);
  const [search, setSearch] = useState("");
  const [expandedAttrs, setExpandedAttrs] = useState<Set<string>>(new Set());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newAttr, setNewAttr] = useState({ name: "", code: "" });

  const filtered = attributes.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.toLowerCase().includes(search.toLowerCase())
  );

  const toggleExpand = (id: string) => {
    setExpandedAttrs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddAttribute = () => {
    if (!newAttr.name.trim()) {
      toast.error("Vui lòng nhập tên thuộc tính");
      return;
    }
    toast.success(`Đã thêm thuộc tính "${newAttr.name}"`);
    setAddDialogOpen(false);
    setNewAttr({ name: "", code: "" });
  };

  const totalValues = attributes.reduce((sum, a) => sum + a.values.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Thuộc tính</h1>
          <p className="text-muted-foreground">Quản lý thuộc tính sản phẩm</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="size-4 mr-2" />
            Đồng bộ
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="size-4 mr-2" />
            Thêm thuộc tính
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{attributes.length}</div>
            <p className="text-sm text-muted-foreground">Tổng thuộc tính</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalValues}</div>
            <p className="text-sm text-muted-foreground">Tổng giá trị</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {attributes.reduce((sum, a) => sum + a.productCount, 0)}
            </div>
            <p className="text-sm text-muted-foreground">Sản phẩm sử dụng</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {attributes.filter((a) => a.syncStatus === "synced").length}
            </div>
            <p className="text-sm text-muted-foreground">Đã đồng bộ</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm thuộc tính..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Attributes List */}
      <div className="space-y-3">
        {filtered.map((attr) => {
          const isExpanded = expandedAttrs.has(attr.id);
          return (
            <Card key={attr.id}>
              <CardHeader className="py-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(attr.id)}
                    className="size-8 p-0"
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </Button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{attr.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {attr.code}
                      </Badge>
                      {attr.type === "select" && (
                        <Badge variant="secondary" className="text-xs">
                          Select
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {attr.values.length} giá trị • {attr.productCount} sản phẩm
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        attr.source === "woo"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-gray-50 text-gray-600 border-gray-200"
                      }
                    >
                      {attr.source === "woo" ? "WooCommerce" : "Thủ công"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toast.info("Chỉnh sửa thuộc tính")}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pt-0 pb-4">
                  <div className="pl-11">
                    <p className="text-sm font-medium mb-3 text-muted-foreground">Giá trị thuộc tính</p>
                    <div className="flex flex-wrap gap-2">
                      {attr.values.map((val) => (
                        <div
                          key={val.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full text-sm"
                        >
                          <span>{val.value}</span>
                          <Badge variant="outline" className="text-xs ml-1">
                            {val.productCount}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Settings2 className="size-12 mb-4" />
              <p>Không tìm thấy thuộc tính nào</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm thuộc tính mới</DialogTitle>
            <DialogDescription>
              Tạo thuộc tính mới để gán cho sản phẩm
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên thuộc tính</label>
              <Input
                placeholder="Ví dụ: CPU, RAM, Ổ cứng..."
                value={newAttr.name}
                onChange={(e) => setNewAttr({ ...newAttr, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mã</label>
              <Input
                placeholder="cpu, ram, storage..."
                value={newAttr.code}
                onChange={(e) =>
                  setNewAttr({ ...newAttr, code: e.target.value.toLowerCase().replace(/\s+/g, "_") })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleAddAttribute}>Thêm thuộc tính</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
