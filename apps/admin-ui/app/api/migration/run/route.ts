/**
 * Run SQL Migration API
 * POST /api/migration/run
 *
 * Body: { "sql": "ALTER TABLE ... ADD COLUMN ..." }
 *
 * Requires: Super Admin auth
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { transaction } from "@/lib/db";

export async function POST(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  try {
    const body = await req.json();
    const { sql } = body;

    if (!sql || typeof sql !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'sql' field" }, { status: 400 });
    }

    // Safety: only allow certain DDL/DML statements
    const allowedPrefixes = [
      "ALTER", "INSERT", "UPDATE", "DELETE", "CREATE", "DROP",
      "BEGIN", "COMMIT", "ROLLBACK", "DO", "COMMENT", "GRANT",
    ];
    const trimmed = sql.trim().toUpperCase();
    const isAllowed = allowedPrefixes.some((p) => trimmed.startsWith(p));

    if (!isAllowed) {
      return NextResponse.json(
        { error: `SQL statement not allowed: only DDL/DML statements are permitted.` },
        { status: 403 }
      );
    }

    // Execute in a transaction
    await transaction(async (client) => {
      await client.query(sql);
    });

    return NextResponse.json({ success: true, message: "SQL executed successfully" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Migration API] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
