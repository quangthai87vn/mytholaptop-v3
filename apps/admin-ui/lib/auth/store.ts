/**
 * Zustand store quản lý auth state ở client-side.
 *
 * KHÔNG lưu token/secret vào localStorage.
 * Chỉ cache user info trong memory (Zustand default).
 */

import { create } from "zustand";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  permissions?: string[];
  last_login_at?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isChecking: boolean;
  isAuthenticated: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isChecking: false,
  isAuthenticated: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.error || "Đăng nhập thất bại";
        throw new Error(errMsg);
      }

      const user: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.full_name,
        role: data.user.role,
      };

      set({ user, isLoading: false, isAuthenticated: true, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi đăng nhập";
      set({ isLoading: false, error: msg });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      set({ user: null, isLoading: false, isAuthenticated: false, error: null });
    }
  },

  checkSession: async () => {
    set((state) => ({ isChecking: true }));

    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        const user: AuthUser = {
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          permissions: data.permissions ?? [],
          last_login_at: data.last_login_at,
        };

        set({ user, isChecking: false, isAuthenticated: true });
      } else {
        // 401/403 from /api/auth/me means session expired — clear user
        if (res.status === 401 || res.status === 403) {
        set({ user: null, isChecking: false, isAuthenticated: false });
      }
        // For other errors (5xx), keep current user to avoid flicker
      }
    } catch {
      // Network error — keep current user to avoid flicker
    }
  },

  clearError: () => set({ error: null }),
}));
