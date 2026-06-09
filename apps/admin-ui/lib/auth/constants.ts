/**
 * Auth constants — Edge-compatible (không import Node.js modules).
 * Import được từ cả middleware (Edge) và route handlers (Node.js).
 */

export const SESSION_COOKIE_NAME = "admin_session" as const;
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
