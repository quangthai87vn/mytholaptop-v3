/**
 * Migration 029: Sync Kanban status codes
 * - Update existing tasks: in_progress→working, done→completed, backlog→idea
 * - Upsert correct task_status items into pm_master_data
 * - Deactivate legacy codes in pm_master_data
 *
 * Run: npx tsx apps/admin-ui/lib/workspace/migrate-029-task-status-sync.ts
 */

import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL ?? "";

if (!DATABASE_URL) {
  console.error("[ERROR] DATABASE_URL not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  console.log("=== Migration 029: Task Status Sync ===\n");

  try {
    await client.query("BEGIN");

    // ── Step 1: Update existing tasks to new status codes ──────────
    const statusMap: Record<string, string> = {
      in_progress: "working",
      done: "completed",
      backlog: "idea",
      todo: "assigned",
    };

    console.log("Step 1: Update existing tasks...");
    for (const [oldCode, newCode] of Object.entries(statusMap)) {
      const r = await client.query(
        `UPDATE pm_tasks SET status = $1 WHERE status = $2 RETURNING id`,
        [newCode, oldCode]
      );
      if (r.rowCount && r.rowCount > 0) {
        console.log(`  ${oldCode} → ${newCode}: ${r.rowCount} tasks updated`);
      }
    }

    // ── Step 2: Upsert correct task_status items ─────────────────
    console.log("\nStep 2: Upsert task_status into pm_master_data...");
    const statuses = [
      { code: "idea",      name: "Ý tưởng",       desc: "Công việc mới, ý tưởng cần thực hiện",         color: "#7c3aed", bg: "#f5f3ff", colBg: "#f5f3ff", colBorder: "#7c3aed", icon: "Lightbulb",   sort: 1 },
      { code: "assigned",  name: "Đã giao",         desc: "Đã được phân công cho người thực hiện",           color: "#3b82f6", bg: "#eff6ff", colBg: "#eff6ff", colBorder: "#3b82f6", icon: "UserCheck",  sort: 2 },
      { code: "working",   name: "Đang thực hiện",  desc: "Đang trong quá trình thực hiện",              color: "#0891b2", bg: "#ecfeff", colBg: "#ecfeff", colBorder: "#0891b2", icon: "Loader",      sort: 3 },
      { code: "review",   name: "Chờ duyệt",        desc: "Chờ được duyệt nội dung hoặc kết quả",            color: "#d97706", bg: "#fffbeb", colBg: "#fffbeb", colBorder: "#d97706", icon: "Eye",         sort: 4 },
      { code: "rework",   name: "Cần sửa",          desc: "Cần chỉnh sửa theo feedback",                  color: "#dc2626", bg: "#fef2f2", colBg: "#fef2f2", colBorder: "#dc2626", icon: "Pencil",      sort: 5 },
      { code: "completed",name: "Hoàn thành",       desc: "Đã hoàn thành công việc",                      color: "#16a34a", bg: "#f0fdf4", colBg: "#f0fdf4", colBorder: "#16a34a", icon: "CheckCircle2", sort: 6 },
      { code: "cancelled",name: "Hủy",             desc: "Công việc đã bị hủy hoặc lưu trữ",              color: "#64748b", bg: "#f3f4f6", colBg: "#f3f4f6", colBorder: "#64748b", icon: "XCircle",    sort: 99 },
    ];

    for (const s of statuses) {
      await client.query(
        `INSERT INTO pm_master_data
           (category, code, name, description, color, bg_color, column_bg_color, column_border_color, icon, sort_order, is_active, is_system)
         VALUES ('task_status', $1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, TRUE)
         ON CONFLICT (category, code) DO UPDATE SET
           name = EXCLUDED.name, description = EXCLUDED.description,
           color = EXCLUDED.color, bg_color = EXCLUDED.bg_color,
           column_bg_color = EXCLUDED.column_bg_color, column_border_color = EXCLUDED.column_border_color,
           icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order,
           is_active = EXCLUDED.is_active, is_system = EXCLUDED.is_system`,
        [s.code, s.name, s.desc, s.color, s.bg, s.colBg, s.colBorder, s.icon, s.sort]
      );
      console.log(`  [${s.code}] upserted`);
    }

    // ── Step 3: Deactivate legacy codes in pm_master_data ──────────
    console.log("\nStep 3: Deactivate legacy codes in pm_master_data...");
    const legacyCodes = ["backlog", "todo", "in_progress", "done"];
    for (const code of legacyCodes) {
      await client.query(
        `UPDATE pm_master_data SET is_active = FALSE
         WHERE category = 'task_status' AND code = $1`,
        [code]
      );
      console.log(`  [${code}] deactivated`);
    }

    await client.query("COMMIT");

    // ── Verify ───────────────────────────────────────────────────
    console.log("\n=== Verification ===");
    const { rows: taskRows } = await client.query(
      `SELECT status, COUNT(*) as cnt FROM pm_tasks GROUP BY status ORDER BY cnt DESC`
    );
    console.log("pm_tasks status distribution:");
    for (const r of taskRows) console.log(`  ${r.status}: ${r.cnt}`);

    const { rows: mdRows } = await client.query(
      `SELECT code, name, sort_order, is_active
       FROM pm_master_data
       WHERE category = 'task_status' AND deleted_at IS NULL
       ORDER BY sort_order ASC`
    );
    console.log("\npm_master_data task_status (active only):");
    for (const r of mdRows) {
      if (r.is_active) console.log(`  ${r.sort_order}. ${r.code} — ${r.name}`);
    }

    console.log("\n✓ Migration 029 complete! Refresh Tasks page.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[ERROR]", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
