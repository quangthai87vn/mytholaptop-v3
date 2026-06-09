/**
 * Admin Fetch Helper
 *
 * P4.Auth — hệ thống auth mới dùng session cookie (httpOnly).
 * P5.7 — CSRF Protection: auto-inject X-CSRF-Token cho write methods.
 * V3 Fix — retry 1 lần khi CSRF expired, không redirect khi 401/403 trong operation.
 *
 * adminFetch auto:
 * - Gửi credentials: 'include' để browser gửi session cookie
 * - Đọc csrf_token cookie và gắn X-CSRF-Token header cho POST/PUT/PATCH/DELETE
 * - GET requests không cần CSRF
 * - Khi gặp 403 CSRF, tự động refresh và retry 1 lần
 * - KHÔNG redirect — trả về response để caller xử lý
 */

const CSRF_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

interface AdminFetchOptions extends RequestInit {}

/**
 * Refresh CSRF token bằng cách gọi endpoint refresh.
 */
async function refreshCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/csrf-refresh", { credentials: "include" });
    if (!res.ok) return null;
    // Response sẽ set cookie mới, đọc lại từ cookie
    return getCsrfTokenFromCookie();
  } catch {
    return null;
  }
}

function getCsrfTokenFromCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1] ?? "") : "";
}

/**
 * Wrapper fetch — tự động gửi session cookie và CSRF token cho write requests.
 * Không redirect khi 401/403 — trả về response gốc.
 */
export async function adminFetch(
  input: RequestInfo,
  options: AdminFetchOptions = {}
): Promise<Response> {
  const rawMethod =
    typeof input === "string" ? options.method : input instanceof Request ? input.method : "GET";
  const method: string = rawMethod ?? "GET";

  const headers = new Headers(options.headers as HeadersInit);

  if (CSRF_METHODS.includes(method.toUpperCase())) {
    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }
  }

  const response = await fetch(input, {
    ...options,
    headers,
    credentials: "include",
  });

  // Nếu 403 CSRF, thử refresh token và retry 1 lần
  if (
    response.status === 403 &&
    CSRF_METHODS.includes(method.toUpperCase())
  ) {
    let body: string | undefined;
    if (options.body) {
      body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }
    const refreshed = await refreshCsrfToken();
    if (refreshed) {
      headers.set("X-CSRF-Token", refreshed);
      const retryResponse = await fetch(input, {
        ...options,
        headers,
        credentials: "include",
        body,
      });
      return retryResponse;
    }
  }

  return response;
}
