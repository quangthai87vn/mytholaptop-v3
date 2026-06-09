"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Shield, AlertCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo = "/workspace" }: LoginFormProps) {
  const router = useRouter();

  const { login, logout, checkSession, user, isLoading, error, clearError } =
    useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Check session on mount — redirect if already logged in
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Redirect if user is logged in
  useEffect(() => {
    if (user) {
      router.replace(redirectTo);
    }
  }, [user, router, redirectTo]);

  // Sync store error to local state
  useEffect(() => {
    if (error) {
      setSubmitError(error);
    }
  }, [error]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);
      clearError();

      if (!email.trim()) {
        setSubmitError("Vui lòng nhập email");
        return;
      }
      if (!password) {
        setSubmitError("Vui lòng nhập password");
        return;
      }

      try {
        await login(email.trim(), password);
        router.replace(redirectTo);
      } catch {
        // Error already in store
      }
    },
    [email, password, login, router, redirectTo, clearError]
  );

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (submitError) setSubmitError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (submitError) setSubmitError(null);
  };

  return (
    <div className="w-full max-w-sm space-y-8">
      {/* Header */}
      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold text-gray-900">Đăng nhập</h2>
        <p className="text-sm text-gray-500">
          Nhập thông tin đăng nhập để truy cập dashboard
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Error alert */}
        {submitError && (
          <div className="flex items-center gap-2.5 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            <AlertCircle className="size-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="admin@mtl.vn"
            className={cn(
              "flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm",
              "placeholder:text-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-colors"
            )}
            disabled={isLoading}
            required
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Mật khẩu
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="••••••••"
              className={cn(
                "flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-10 text-sm",
                "placeholder:text-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "transition-colors"
              )}
              disabled={isLoading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium text-sm rounded-lg gap-2 transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Đang đăng nhập...
            </>
          ) : (
            "Đăng nhập"
          )}
        </Button>
      </form>

      {/* Footer note */}
      <p className="text-center text-xs text-gray-400">
        Chỉ dành cho nhân viên được ủy quyền của Mỹ Tho Laptop.
        <br />
        Liên hệ IT nếu gặp vấn đề đăng nhập.
      </p>
    </div>
  );
}
