const { Client } = require("pg");

const connStr = process.env.DATABASE_URL;
if (!connStr) {
  console.error("FATAL: DATABASE_URL is not set");
  process.exit(1);
}

const items = [
  ["campaign_type", "product_launch", "Khai trương sản phẩm", "Chiến dịch ra mắt sản phẩm mới", "#16a34a", "#f0fdf4", "Rocket", 1],
  ["campaign_type", "seasonal", "Theo mùa", "Chiến dịch theo dịp lễ, mùa", "#ea580c", "#fff7ed", "Calendar", 2],
  ["campaign_type", "social_media", "Mạng xã hội", "Chiến dịch trên mạng xã hội", "#1d4ed8", "#eff6ff", "Share2", 3],
  ["campaign_type", "seo", "SEO", "Chiến dịch tối ưu SEO", "#16a34a", "#f0fdf4", "Search", 4],
  ["campaign_type", "advertising", "Quảng cáo", "Chiến dịch quảng cáo", "#dc2626", "#fef2f2", "Zap", 5],
  ["campaign_type", "email_marketing", "Email Marketing", "Chiến dịch email marketing", "#7c3aed", "#f5f3ff", "Mail", 6],
  ["campaign_type", "influencer", "Influencer", "Chiến dịch influencer", "#db2777", "#fdf2f8", "Star", 7],
  ["campaign_status", "planning", "Lên kế hoạch", "Chiến dịch đang được lên kế hoạch", "#64748b", "#f8fafc", "ClipboardList", 1],
  ["campaign_status", "active", "Đang chạy", "Chiến dịch đang được triển khai", "#16a34a", "#f0fdf4", "Play", 2],
  ["campaign_status", "paused", "Tạm dừng", "Chiến dịch tạm dừng", "#ea580c", "#fff7ed", "Pause", 3],
  ["campaign_status", "completed", "Hoàn thành", "Chiến dịch đã hoàn thành", "#2563eb", "#eff6ff", "CheckCircle2", 4],
  ["campaign_status", "cancelled", "Đã hủy", "Chiến dịch đã bị hủy", "#dc2626", "#fef2f2", "XCircle", 5],
  ["project_status", "planning", "Lên kế hoạch", "Dự án đang trong giai đoạn lên kế hoạch", "#64748b", "#f8fafc", "ClipboardList", 1],
  ["project_status", "active", "Đang hoạt động", "Dự án đang được triển khai", "#16a34a", "#f0fdf4", "Play", 2],
  ["project_status", "on_hold", "Tạm dừng", "Dự án bị tạm dừng", "#ea580c", "#fff7ed", "Pause", 3],
  ["project_status", "completed", "Hoàn thành", "Dự án đã hoàn thành", "#2563eb", "#eff6ff", "CheckCircle2", 4],
  ["project_status", "archived", "Lưu trữ", "Dự án đã được lưu trữ", "#6b7280", "#f9fafb", "Archive", 5],
];

async function main() {
  const client = new Client({ connectionString: connStr });
  await client.connect();

  for (const [cat, code, name, desc, color, bg, icon, sort] of items) {
    await client.query(
      "INSERT INTO pm_master_data (category,code,name,description,color,bg_color,icon,sort_order,is_active,is_system) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,TRUE) ON CONFLICT (category,code) DO NOTHING",
      [cat, code, name, desc, color, bg, icon, sort]
    );
    console.log("OK: " + cat + "/" + code);
  }

  const res = await client.query(
    "SELECT category, COUNT(*) as cnt FROM pm_master_data GROUP BY category ORDER BY category"
  );
  console.log("\n--- Master data counts ---");
  for (const row of res.rows) {
    console.log("  " + row.category + ": " + row.cnt + " items");
  }

  await client.end();
  console.log("\nDone!");
}

main().catch(function(e) {
  console.error(e.message);
  process.exit(1);
});
