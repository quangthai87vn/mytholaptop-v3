"use client";

import { Suspense } from "react";
import { ShieldX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

function ForbiddenContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/30">
            <ShieldX className="size-12 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">403</h1>
          <h2 className="text-2xl font-semibold">Truy cập bị từ chối</h2>
          <p className="text-muted-foreground">
            {message || "Bạn không có quyền truy cập trang này."}
            {" "}Vui lòng liên hệ quản trị viên nếu bạn cần quyền truy cập.
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <Link href="/dashboard">
            <Button variant="default">Quay về Dashboard</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline">Đăng nhập lại</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ForbiddenLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/30">
            <ShieldX className="size-12 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">403</h1>
          <h2 className="text-2xl font-semibold">Truy cập bị từ chối</h2>
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    </div>
  );
}

export default function ForbiddenPage() {
  return (
    <Suspense fallback={<ForbiddenLoading />}>
      <ForbiddenContent />
    </Suspense>
  );
}
