"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit3, CheckCircle2, XCircle, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminFetch } from "@/lib/api/admin-fetch";

export default function ProfileSettingsPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [initialName, setInitialName] = useState("");

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/profile/me", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tải hồ sơ");
      setFullName(data.user.full_name);
      setInitialName(data.user.full_name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi khi tải hồ sơ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("Họ tên phải có ít nhất 2 ký tự.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await adminFetch("/api/profile/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Lỗi khi cập nhật hồ sơ.");
        return;
      }

      setInitialName(fullName.trim());
      setSuccess(true);
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  const hasChanged = fullName.trim() !== initialName;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="size-8 shrink-0">
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cài đặt tài khoản</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cập nhật thông tin cá nhân của bạn</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <XCircle className="size-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-start gap-3">
          <CheckCircle2 className="size-4 text-green-600 mt-0.5 shrink-0" />
          <p className="text-sm text-green-700">Cập nhật hồ sơ thành công!</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="size-4 text-gray-400" />
            Thông tin cá nhân
          </CardTitle>
          <CardDescription>
            Họ tên sẽ hiển thị trên toàn hệ thống. Không thể thay đổi vai trò hoặc email tại đây.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 bg-gray-100 rounded animate-pulse" />
              <div className="h-10 bg-gray-100 rounded animate-pulse" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Họ tên</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ tên của bạn"
                  maxLength={255}
                  required
                />
                {fullName.length > 0 && fullName.trim().length < 2 && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="size-3" /> Họ tên phải có ít nhất 2 ký tự
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setFullName(initialName); setSuccess(false); }}
                  className="flex-1"
                  disabled={!hasChanged}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={!hasChanged || submitting || fullName.trim().length < 2}
                  className="flex-1 gap-1.5"
                >
                  {submitting ? (
                    <><Loader2 className="size-4 animate-spin" /> Đang lưu...</>
                  ) : (
                    <><Edit3 className="size-4" /> Lưu thay đổi</>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin không thể thay đổi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-500">Vai trò</span>
            <span className="font-medium text-gray-800">Được gán bởi quản trị viên</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-gray-500">Email</span>
            <span className="font-medium text-gray-800">Liên hệ quản trị viên để thay đổi</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
