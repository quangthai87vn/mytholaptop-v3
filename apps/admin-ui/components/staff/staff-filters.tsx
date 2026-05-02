"use client";

import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface StaffFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  role: string;
  onRoleChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  department?: string;
  onDepartmentChange?: (v: string) => void;
  roles?: string[];
  departments?: string[];
  onClearFilters?: () => void;
}

export function StaffFilters({
  search,
  onSearchChange,
  role,
  onRoleChange,
  status,
  onStatusChange,
  department = "",
  onDepartmentChange,
  roles = [],
  departments = [],
  onClearFilters,
}: StaffFiltersProps) {
  const hasActiveFilters =
    search || role !== "all" || status !== "all" || department !== "all";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm tên, email..."
              className="pl-9 h-10"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* Role filter */}
          <Select value={role} onValueChange={onRoleChange}>
            <SelectTrigger className="w-full sm:w-40 h-10">
              <SelectValue placeholder="Vai trò" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả vai trò</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full sm:w-36 h-10">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Hoạt động</SelectItem>
              <SelectItem value="inactive">Tắt</SelectItem>
              <SelectItem value="locked">Khoá</SelectItem>
              <SelectItem value="pending">Chờ mời</SelectItem>
            </SelectContent>
          </Select>

          {/* Department filter */}
          {onDepartmentChange && departments.length > 0 && (
            <Select value={department} onValueChange={onDepartmentChange}>
              <SelectTrigger className="w-full sm:w-40 h-10">
                <SelectValue placeholder="Phòng ban" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả phòng ban</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Clear filters */}
          {onClearFilters && hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-10 px-3"
            >
              <X className="mr-1 size-4" />
              <span className="hidden sm:inline">Xoá lọc</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
