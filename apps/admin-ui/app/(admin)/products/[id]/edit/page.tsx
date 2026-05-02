"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProduct } from "@/hooks/use-medusa";
import { ProductEditForm } from "@/components/products/product-edit-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useProduct(id);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Sửa sản phẩm</h1>
          <p className="text-muted-foreground text-sm">
            Cập nhật thông tin sản phẩm, giá bán, danh mục, tồn kho và nội dung hiển thị.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/products" className="gap-2">
            <ArrowLeft className="size-4" />
            Quay lại danh sách
          </Link>
        </Button>
      </div>

      <Separator />

      {/* Breadcrumb nav */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/products" className="hover:text-foreground transition-colors">
          Sản phẩm
        </Link>
        <span>/</span>
        <span>
          {isLoading ? "Đang tải..." : data?.data?.title || "Sửa sản phẩm"}
        </span>
      </nav>

      {/* Content */}
      {isLoading && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="size-12 text-destructive mb-3" />
            <p className="text-base font-medium text-destructive">
              Không tìm thấy sản phẩm
            </p>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
              {(error as Error)?.message || "Sản phẩm này không tồn tại hoặc đã bị xoá."}
            </p>
            <Button variant="outline" asChild className="mt-4">
              <Link href="/products">Quay lại danh sách</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {data?.data && (
        <ProductEditForm product={data.data} />
      )}
    </div>
  );
}
