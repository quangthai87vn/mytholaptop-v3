"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronRight, AlertCircle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWooCommerceProduct } from "@/hooks/use-medusa";
import { WooProductEditPageForm } from "@/components/products/woo-product-edit-page-form";

interface EditWooProductPageProps {
  params: Promise<{ id: string }>;
}

export default function EditWooProductPage({ params }: EditWooProductPageProps) {
  const { id } = use(params);
  const { data: wooProduct, isLoading, isError, error, refetch } = useWooCommerceProduct(id);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background border-b px-6 py-3 shrink-0">
        <div className="flex items-center justify-between gap-4">
          {/* Left: breadcrumb + product name */}
          <div className="flex items-center gap-3 min-w-0">
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
              <Link href="/products" className="hover:text-foreground transition-colors">
                Sản phẩm
              </Link>
              <ChevronRight className="size-3.5 shrink-0" />
            </nav>
            <h1 className="text-base font-semibold truncate flex items-center gap-2">
              {wooProduct ? (
                <>
                  <span className="text-muted-foreground font-normal truncate max-w-[300px]">
                    {wooProduct.name || "Sửa sản phẩm"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-normal text-green-600 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full shrink-0">
                    <Globe className="size-3" />
                    WooCommerce
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground font-normal">Đang tải...</span>
              )}
            </h1>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            {wooProduct?.permalink && (
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <a href={wooProduct.permalink} target="_blank" rel="noopener noreferrer">
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m6 4v6m-10-8h10a2 2 0 012 2v4a2 2 0 01-2 2h-2" />
                  </svg>
                  Xem trên web
                </a>
              </Button>
            )}
            <Button variant="outline" asChild size="sm" className="gap-1.5">
              <Link href="/products">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Quay lại
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Content — CSS grid, sidebar is fixed 340px, main is remaining width */}
      <div className="flex-1">
        {isLoading && (
          <div className="grid grid-cols-[1fr_340px] gap-6 px-6 py-6 items-start">
            {/* Main skeleton */}
            <div className="space-y-4 min-w-0">
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 flex-1 rounded-md" />
                ))}
              </div>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-11 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            </div>
            {/* Sidebar skeleton */}
            <div className="space-y-4 w-[340px] shrink-0">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-48 w-full rounded-xl" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center py-24">
            <Card className="border-destructive/50 max-w-md">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="size-12 text-destructive mb-4" />
                <p className="text-base font-medium text-destructive">Không tìm thấy sản phẩm</p>
                <p className="text-sm text-muted-foreground mt-1 text-center">
                  {(error as Error)?.message || "Sản phẩm không tồn tại hoặc đã bị xoá khỏi WooCommerce."}
                </p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" asChild>
                    <Link href="/products">Quay lại danh sách</Link>
                  </Button>
                  <Button variant="outline" onClick={() => refetch()}>Thử lại</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {wooProduct && (
          // grid-cols-[1fr_340px] = main takes remaining space, sidebar fixed 340px
          // items-start prevents sidebar from stretching to match main height
          <div className="grid grid-cols-[1fr_340px] gap-6 px-6 py-6 items-start">
            <WooProductEditPageForm
              wooProduct={wooProduct}
              onSaved={() => refetch()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
