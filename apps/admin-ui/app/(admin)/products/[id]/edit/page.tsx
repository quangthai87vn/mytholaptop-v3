"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useProduct } from "@/hooks/use-medusa";
import { ProductEditForm } from "@/components/products/product-edit-form";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useProduct(id);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/products" className="hover:text-foreground transition-colors">
            Sản phẩm
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground font-medium">
            {isLoading ? "Đang tải..." : data?.data?.title || "Sửa sản phẩm"}
          </span>
        </nav>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Sửa sản phẩm
            </h1>
            <p className="text-muted-foreground text-sm hidden sm:block">
              Cập nhật thông tin sản phẩm, giá bán, danh mục, tồn kho và nội dung hiển thị.
            </p>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link href="/products" className="gap-2">
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Quay lại
            </Link>
          </Button>
        </div>

        <Separator />

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
            {/* Main Form Skeleton */}
            <div className="space-y-4">
              {/* Tabs Skeleton */}
              <div className="bg-background border rounded-lg p-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <Skeleton key={i} className="h-9 flex-1 rounded-md" />
                  ))}
                </div>
              </div>
              {/* Form Skeleton */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-10 w-1/2" />
                </CardContent>
              </Card>
            </div>
            {/* Sidebar Skeleton */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <Skeleton className="h-64 w-full rounded-xl" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <Card className="border-destructive/50 max-w-2xl">
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

        {/* Main Content */}
        {data?.data && (
          <ProductEditForm product={data.data} />
        )}
      </div>
    </div>
  );
}
