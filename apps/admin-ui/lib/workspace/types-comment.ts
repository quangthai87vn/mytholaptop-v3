// ============================================================
// Comment Types — P6.7 Task Comments & Discussion
// ============================================================

export interface CommentPayload {
  content: string;
  parentCommentId?: string;
  mentions?: string[];
}

export interface CommentUpdatePayload {
  content: string;
}

// Build flat list with nested replies (client-side)
export function buildCommentTree<T extends {
  id: string;
  parent_comment_id?: string;
  [key: string]: unknown;
}>(comments: T[]): (T & { replies: T[] })[] {
  const map = new Map<string, T & { replies: T[] }>();
  const roots: (T & { replies: T[] })[] = [];

  for (const c of comments) {
    map.set(c.id as string, { ...c, replies: [] });
  }

  for (const c of comments) {
    const node = map.get(c.id as string)!;
    if (c.parent_comment_id && map.has(c.parent_comment_id)) {
      map.get(c.parent_comment_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// Extract @mentions from content
export function extractMentions(content: string): string[] {
  const matches = content.match(/@([a-zA-Z0-9_-]+)/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

// Sanitize dangerous HTML/scripts from content
export function sanitizeContent(content: string): string {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=/gi, "data-removed=")
    .replace(/javascript:/gi, "")
    .trim();
}
