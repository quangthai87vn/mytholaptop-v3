"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductEditFormData } from "./product-edit-form";
import type { CategoryNode } from "@/components/categories/category-tree";

interface ProductCategoriesTabProps {
  form: ProductEditFormData;
  onChange: (form: ProductEditFormData) => void;
  categories: CategoryNode[];
}

export function ProductCategoriesTab({
  form,
  onChange,
  categories,
}: ProductCategoriesTabProps) {
  const [newTag, setNewTag] = useState("");

  const setField = <K extends keyof ProductEditFormData>(
    key: K,
    value: ProductEditFormData[K]
  ) => {
    onChange({ ...form, [key]: value });
  };

  const addCategory = (catId: string) => {
    if (!form.category_ids.includes(catId)) {
      setField("category_ids", [...form.category_ids, catId]);
    }
  };

  const removeCategory = (catId: string) => {
    setField(
      "category_ids",
      form.category_ids.filter((id) => id !== catId)
    );
  };

  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !form.tags.includes(tag)) {
      setField("tags", [...form.tags, tag]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setField(
      "tags",
      form.tags.filter((t) => t !== tag)
    );
  };

  const getCategoryName = (id: string): string => {
    const all: CategoryNode[] = [];
    const collect = (nodes: CategoryNode[]) => {
      nodes.forEach((n) => {
        all.push(n);
        collect(n.children);
      });
    };
    collect(categories);
    return all.find((c) => c.id === id)?.name || id;
  };

  const availableCategories = categories.filter(
    (c) => !form.category_ids.includes(c.id)
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Danh mục sản phẩm</Label>

        {form.category_ids.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.category_ids.map((catId) => (
              <Badge key={catId} variant="secondary" className="gap-1 pr-1">
                {getCategoryName(catId)}
                <button
                  onClick={() => removeCategory(catId)}
                  className="ml-1 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {availableCategories.length > 0 && (
          <Select onValueChange={addCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Thêm danh mục..." />
            </SelectTrigger>
            <SelectContent>
              {availableCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <p className="text-xs text-muted-foreground">
          Chọn danh mục phù hợp để sản phẩm dễ tìm thấy.
        </p>
      </div>

      {form.woo_category_names && (
        <div className="space-y-2">
          <Label className="text-muted-foreground">Danh mục từ WordPress</Label>
          <div className="flex flex-wrap gap-2">
            {form.woo_category_names.split(",").filter(Boolean).map((cat, i) => (
              <Badge key={i} variant="outline">
                {cat.trim()}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Label>Thẻ sản phẩm</Label>

        {form.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="gap-1 pr-1">
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-1 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Nhập tên thẻ..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            className="max-w-xs"
          />
          <Button variant="outline" size="sm" onClick={addTag} className="gap-1">
            <Plus className="size-3" />
            Thêm
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Thẻ giúp phân loại sản phẩm. Nhấn Enter hoặc click Thêm để tạo thẻ.
        </p>
      </div>

      {form.woo_tag_names && (
        <div className="space-y-2">
          <Label className="text-muted-foreground">Thẻ từ WordPress</Label>
          <div className="flex flex-wrap gap-2">
            {form.woo_tag_names.split(",").filter(Boolean).map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {tag.trim()}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
