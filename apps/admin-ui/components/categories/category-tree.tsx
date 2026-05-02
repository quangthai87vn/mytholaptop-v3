"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  Pencil,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type CategoryNode = {
  id: string;
  name: string;
  handle: string;
  description: string;
  is_active: boolean;
  parent_category_id: string;
  level: number;
  children: CategoryNode[];
  wooId?: string;
};

interface CategoryTreeProps {
  nodes: CategoryNode[];
  onEdit: (cat: CategoryNode) => void;
  onDelete: (cat: CategoryNode) => void;
  defaultExpandedIds?: Set<string>;
}

interface CategoryTreeRowProps {
  node: CategoryNode;
  depth: number;
  onToggle: (id: string) => void;
  expandedIds: Set<string>;
  onEdit: (cat: CategoryNode) => void;
  onDelete: (cat: CategoryNode) => void;
}

function CategoryTreeRow({
  node,
  depth,
  onToggle,
  expandedIds,
  onEdit,
  onDelete,
}: CategoryTreeRowProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const indentWidth = depth * 24;
  const isRoot = node.level === 0;
  const childCount = node.children.length;

  return (
    <>
      <tr className="group hover:bg-muted/30 transition-colors">
        <td className="w-10 px-4 py-3">
          <div style={{ paddingLeft: indentWidth }} className="flex items-center">
            {hasChildren ? (
              <button
                onClick={() => onToggle(node.id)}
                className="rounded p-0.5 hover:bg-muted transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </button>
            ) : (
              <span className="block w-5" />
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div style={{ paddingLeft: hasChildren ? 0 : 24 }}>
              {isRoot ? (
                hasChildren ? (
                  <FolderOpen className="size-5 text-amber-500 shrink-0" />
                ) : (
                  <Folder className="size-5 text-amber-400 shrink-0" />
                )
              ) : hasChildren ? (
                <FolderOpen className="size-4 text-amber-500 shrink-0" />
              ) : (
                <Folder className="size-4 text-amber-400 shrink-0" />
              )}
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span
                className={cn(
                  "truncate",
                  isRoot ? "font-semibold text-sm" : "font-medium text-sm"
                )}
              >
                {node.name}
              </span>
              {hasChildren && (
                <span className="text-xs text-muted-foreground">
                  {childCount} danh mục con
                </span>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {node.handle || "—"}
          </code>
        </td>
        <td className="px-4 py-3 hidden xl:table-cell">
          {node.is_active ? (
            <Badge variant="success" className="text-xs">Hoạt động</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">Không hoạt động</Badge>
          )}
        </td>
        <td className="px-4 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(node)}>
                <Pencil className="mr-2 size-4" />
                Sửa
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(node)}
              >
                <Trash2 className="mr-2 size-4" />
                Xoá
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
      {hasChildren && isExpanded && (
        <>
          {node.children.map((child) => (
            <CategoryTreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              onToggle={onToggle}
              expandedIds={expandedIds}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </>
      )}
    </>
  );
}

export function CategoryTree({
  nodes,
  onEdit,
  onDelete,
  defaultExpandedIds,
}: CategoryTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    defaultExpandedIds || new Set()
  );

  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (items: CategoryNode[]) => {
      items.forEach((item) => {
        if (item.children.length > 0) {
          allIds.add(item.id);
          collectIds(item.children);
        }
      });
    };
    collectIds(nodes);
    setExpandedIds(allIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  if (nodes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs text-muted-foreground">
          {nodes.length} danh mục gốc
        </span>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Mở rộng tất cả
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            onClick={collapseAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Thu gọn tất cả
          </button>
        </div>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 px-4 py-3"></th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Tên danh mục
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">
                Slug
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden xl:table-cell">
                Trạng thái
              </th>
              <th className="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {nodes.map((node) => (
              <CategoryTreeRow
                key={node.id}
                node={node}
                depth={0}
                onToggle={handleToggle}
                expandedIds={expandedIds}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
