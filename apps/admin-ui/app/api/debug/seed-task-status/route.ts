import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { query } from "@/lib/db";

/**
 * POST /api/debug/seed-task-status
 * Seeds standard Kanban task statuses into pm_master_data.
 * Run once to sync DB codes with frontend Kanban.
 */
export async function POST(req: Request) {
  const request = req as unknown as import("next/server").NextRequest;
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  const seedData = [
    { code: "idea",      name: "Ý tưởng",       description: "Công việc mới, ý tưởng cần thực hiện",       color: "#7c3aed", bg: "#f5f3ff", colBg: "#f5f3ff", colBorder: "#7c3aed", icon: "Lightbulb",   order: 1 },
    { code: "assigned",   name: "Đã giao",         description: "Đã được phân công cho người thực hiện",        color: "#3b82f6", bg: "#eff6ff", colBg: "#eff6ff", colBorder: "#3b82f6", icon: "UserCheck",  order: 2 },
    { code: "working",   name: "Đang thực hiện",  description: "Đang trong quá trình thực hiện",             color: "#0891b2", bg: "#ecfeff", colBg: "#ecfeff", colBorder: "#0891b2", icon: "Loader",      order: 3 },
    { code: "review",   name: "Chờ duyệt",        description: "Chờ được duyệt nội dung hoặc kết quả",          color: "#d97706", bg: "#fffbeb", colBg: "#fffbeb", colBorder: "#d97706", icon: "Eye",         order: 4 },
    { code: "rework",   name: "Cần sửa",          description: "Cần chỉnh sửa theo feedback",                  color: "#dc2626", bg: "#fef2f2", colBg: "#fef2f2", colBorder: "#dc2626", icon: "Pencil",      order: 5 },
    { code: "completed", name: "Hoàn thành",       description: "Đã hoàn thành công việc",                    color: "#16a34a", bg: "#f0fdf4", colBg: "#f0fdf4", colBorder: "#16a34a", icon: "CheckCircle2", order: 6 },
    { code: "cancelled", name: "Hủy",             description: "Công việc đã bị hủy hoặc lưu trữ",            color: "#64748b", bg: "#f3f4f6", colBg: "#f3f4f6", colBorder: "#64748b", icon: "XCircle",    order: 99 },
  ];

  try {
    for (const s of seedData) {
      await query(
        `INSERT INTO pm_master_data (category, code, name, description, color, bg_color, column_bg_color, column_border_color, icon, sort_order, is_active, is_system)
         VALUES ('task_status', $1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, TRUE)
         ON CONFLICT (category, code) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           color = EXCLUDED.color,
           bg_color = EXCLUDED.bg_color,
           column_bg_color = EXCLUDED.column_bg_color,
           column_border_color = EXCLUDED.column_border_color,
           icon = EXCLUDED.icon,
           sort_order = EXCLUDED.sort_order,
           is_active = EXCLUDED.is_active`,
        [s.code, s.name, s.description, s.color, s.bg, s.colBg, s.colBorder, s.icon, s.order]
      );
    }

    // Verify
    const { rows } = await query(
      `SELECT code, name, color, bg_color, column_bg_color, column_border_color, sort_order
       FROM pm_master_data WHERE category = 'task_status' AND deleted_at IS NULL
       ORDER BY sort_order ASC`
    );

    return NextResponse.json({
      success: true,
      message: "Đã seed task_status thành công",
      statuses: rows,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
