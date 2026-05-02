"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, FolderOpen, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CategoryNode } from "@/components/categories/category-tree";

interface ProductCategoryTreeFilterProps {
  value: string;
  onChange: (value: string) => void;
  categories: CategoryNode[];
  allLabel?: string;
}

interface CategoryTreeNodeProps {
  node: CategoryNode;
  depth: number;
  selectedId: string;
  onSelect: (id: string) => void;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}

function CategoryTreeNode({
  node,
  depth,
  selectedId,
  onSelect,
  expandedIds,
  onToggle,
}: CategoryTreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const indent = depth * 20;

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors text-sm",
          isSelected
            ? "bg-primary text-primary-foreground font-medium"
            : "hover:bg-muted",
          node.level === 0 && "font-medium"
        )}
        style={{ paddingLeft: indent + 8 }}
        onClick={() => onSelect(node.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="shrink-0 p-0.5 rounded hover:bg-muted-foreground/10"
          >
            {isExpanded ? (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <FolderOpen
          className={cn(
            "shrink-0",
            node.level === 0 ? "size-4 text-amber-500" : "size-3.5 text-amber-400"
          )}
        />
        <span className="truncate">{node.name}</span>
        {hasChildren && (
          <span className="ml-auto text-xs text-muted-foreground shrink-0">
            {node.children.length}
          </span>
        )}
      </div>
      {hasChildren && isExpanded && (
        <>
          {node.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </>
      )}
    </>
  );
}

export function ProductCategoryTreeFilter({
  value,
  onChange,
  categories,
  allLabel = "Tất cả danh mục",
}: ProductCategoryTreeFilterProps) {
  const [open, setOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const selectedCategory = findCategoryById(categories, value);

  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange("all");
    setOpen(false);
    setSearch("");
  };

  const filteredCategories = search
    ? filterCategoriesBySearch(categories, search.toLowerCase())
    : categories;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-56 justify-between h-10 font-normal"
        >
          <span className={cn("truncate", !selectedCategory && "text-muted-foreground")}>
            {selectedCategory ? selectedCategory.name : allLabel}
          </span>
          {value && value !== "all" ? (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="ml-1 shrink-0"
            >
              <X className="size-3.5 text-muted-foreground hover:text-foreground" />
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="flex items-center gap-2 p-2 border-b">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Tìm danh mục..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-0 focus-visible:ring-0 p-0 text-sm"
          />
        </div>

        <div className="max-h-64 overflow-y-auto py-1">
          <div
            className={cn(
              "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors text-sm",
              value === "all" ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"
            )}
            onClick={() => handleSelect("all")}
          >
            <FolderOpen className="size-4 text-muted-foreground shrink-0" />
            <span>{allLabel}</span>
          </div>

          {filteredCategories.map((cat) => (
            <CategoryTreeNode
              key={cat.id}
              node={cat}
              depth={0}
              selectedId={value}
              onSelect={handleSelect}
              expandedIds={expandedIds}
              onToggle={handleToggle}
            />
          ))}

          {filteredCategories.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Không tìm thấy danh mục.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function findCategoryById(
  nodes: CategoryNode[],
  id: string
): CategoryNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findCategoryById(node.children, id);
    if (found) return found;
  }
  return null;
}

function filterCategoriesBySearch(
  nodes: CategoryNode[],
  search: string
): CategoryNode[] {
  const result: CategoryNode[] = [];
  for (const node of nodes) {
    const matches = node.name.toLowerCase().includes(search);
    const filteredChildren = filterCategoriesBySearch(node.children, search);
    if (matches || filteredChildren.length > 0) {
      result.push({
        ...node,
        children: filteredChildren,
      });
    }
  }
  return result;
}
