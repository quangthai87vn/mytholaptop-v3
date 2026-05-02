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
import type { CategoryNode } from "./category-tree";

interface CategoryTreeMobileProps {
  nodes: CategoryNode[];
  onEdit: (cat: CategoryNode) => void;
  onDelete: (cat: CategoryNode) => void;
}

interface CategoryTreeMobileRowProps {
  node: CategoryNode;
  depth: number;
  onToggle: (id: string) => void;
  expandedIds: Set<string>;
  onEdit: (cat: CategoryNode) => void;
  onDelete: (cat: CategoryNode) => void;
}

function CategoryTreeMobileRow({
  node,
  depth,
  onToggle,
  expandedIds,
  onEdit,
  onDelete,
}: CategoryTreeMobileRowProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const indentWidth = depth * 16 + 16;
  const isRoot = node.level === 0;

  return (
    <>
      <div
        className={cn(
          "flex items-start justify-between gap-3 py-3 pr-4 border-b last:border-b-0",
          "hover:bg-muted/30 transition-colors"
        )}
        style={{ paddingLeft: indentWidth }}
      >
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {hasChildren ? (
            <button
              onClick={() => onToggle(node.id)}
              className="mt-0.5 shrink-0 rounded p-0.5 hover:bg-muted transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="size-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="mt-0.5 block w-5 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
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
              <p
                className={cn(
                  "truncate",
                  isRoot ? "font-semibold text-sm" : "font-medium text-sm"
                )}
              >
                {node.name}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {node.handle || "—"}
              </code>
              {node.is_active ? (
                <Badge variant="success" className="text-xs">Hoạt động</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Không hoạt động</Badge>
              )}
              {hasChildren && (
                <span className="text-xs text-muted-foreground">
                  {node.children.length} con
                </span>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 shrink-0">
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
        </div>
      </div>
      {hasChildren && isExpanded && (
        <>
          {node.children.map((child) => (
            <CategoryTreeMobileRow
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

export function CategoryTreeMobile({
  nodes,
  onEdit,
  onDelete,
}: CategoryTreeMobileProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (nodes.length === 0) {
    return null;
  }

  return (
    <div className="divide-y">
      {nodes.map((node) => (
        <CategoryTreeMobileRow
          key={node.id}
          node={node}
          depth={0}
          onToggle={handleToggle}
          expandedIds={expandedIds}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
