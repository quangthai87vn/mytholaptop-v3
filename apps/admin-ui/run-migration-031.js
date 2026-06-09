/**
 * Run Migration 031: Add metadata column to pm_master_data, create pm_workflows, add workflow_id to pm_tasks
 * Usage: node run-migration-031.js
 */

const { Client } = require("pg");

const connStr = process.env.DATABASE_URL;
if (!connStr) {
  console.error("FATAL: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: connStr });
  await client.connect();
  console.log("Connected to database");

  // Step 1: Check if metadata column exists
  const { rows: cols } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'pm_master_data' AND column_name = 'metadata'
  `);
  const hasMetadata = cols.length > 0;
  console.log(`pm_master_data.metadata exists: ${hasMetadata}`);

  // Step 2: Add metadata column
  if (!hasMetadata) {
    console.log("Adding metadata JSONB column to pm_master_data...");
    try {
      await client.query(`
        ALTER TABLE pm_master_data
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb
      `);
      console.log("  OK - metadata column added");
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }
  } else {
    console.log("  metadata column already exists - OK");
  }

  // Step 3: Check if pm_workflows exists
  const { rows: wfTables } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pm_workflows'
  `);
  const hasWorkflows = wfTables.length > 0;
  console.log(`pm_workflows exists: ${hasWorkflows}`);

  if (!hasWorkflows) {
    console.log("Creating pm_workflows table...");
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS pm_workflows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workflow_type VARCHAR(50) NOT NULL,
          task_id UUID UNIQUE REFERENCES pm_tasks(id) ON DELETE CASCADE,
          title VARCHAR(500) NOT NULL,
          description TEXT,
          content_title VARCHAR(500),
          content_hook TEXT,
          content_goal VARCHAR(100),
          related_product VARCHAR(500),
          content_body TEXT,
          call_to_action VARCHAR(500),
          reference_links TEXT[],
          platform VARCHAR(50),
          published_url VARCHAR(1000),
          published_at TIMESTAMPTZ,
          status VARCHAR(50) NOT NULL DEFAULT 'idea',
          progress INTEGER DEFAULT 0,
          project_id UUID,
          campaign_id UUID,
          assignee_ids UUID[] DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          deleted_at TIMESTAMPTZ,
          CONSTRAINT pm_workflows_type_unique UNIQUE (task_id, workflow_type)
        )
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS pm_workflows_task_id_idx ON pm_workflows(task_id) WHERE deleted_at IS NULL`);
      await client.query(`CREATE INDEX IF NOT EXISTS pm_workflows_campaign_id_idx ON pm_workflows(campaign_id) WHERE deleted_at IS NULL AND campaign_id IS NOT NULL`);
      console.log("  OK - pm_workflows created");
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }
  } else {
    console.log("  pm_workflows already exists - OK");
  }

  // Step 4: Check if workflow_id column exists in pm_tasks
  const { rows: wfCol } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'pm_tasks' AND column_name = 'workflow_id'
  `);
  const hasWorkflowId = wfCol.length > 0;
  console.log(`pm_tasks.workflow_id exists: ${hasWorkflowId}`);

  if (!hasWorkflowId) {
    console.log("Adding workflow_id column to pm_tasks...");
    try {
      await client.query(`ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES pm_workflows(id) ON DELETE SET NULL`);
      await client.query(`CREATE INDEX IF NOT EXISTS pm_tasks_workflow_id_idx ON pm_tasks(workflow_id) WHERE workflow_id IS NOT NULL`);
      console.log("  OK - workflow_id column added");
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }
  } else {
    console.log("  workflow_id already exists - OK");
  }

  // Step 5: Seed task_type items
  console.log("Seeding task_type items with workflow config...");
  const seedSQL = `
    INSERT INTO pm_master_data (category, code, name, description, color, bg_color, icon, sort_order, is_active, is_system, metadata)
    VALUES
      ('task_type', 'facebook_post', 'Bài Facebook', 'Bài viết cho fanpage Mỹ Tho Laptop', '#3b82f6', '#eff6ff', 'Facebook', 10, TRUE, FALSE, '{"creates_workflow": true, "workflow_type": "facebook_post"}'),
      ('task_type', 'seo_article', 'Bài SEO', 'Bài viết SEO website mytholaptop.vn', '#22c55e', '#f0fdf4', 'Globe', 11, TRUE, FALSE, '{"creates_workflow": true, "workflow_type": "seo_article"}'),
      ('task_type', 'tiktok_video', 'Video TikTok', 'Video ngắn cho TikTok Mỹ Tho Laptop', '#ec4899', '#fdf2f8', 'Video', 12, TRUE, FALSE, '{"creates_workflow": true, "workflow_type": "tiktok_video"}'),
      ('task_type', 'youtube_video', 'Video YouTube', 'Video YouTube (review, unboxing, hướng dẫn)', '#ef4444', '#fef2f2', 'Youtube', 13, TRUE, FALSE, '{"creates_workflow": true, "workflow_type": "youtube_video"}'),
      ('task_type', 'design_image', 'Thiết kế hình ảnh', 'Banner, poster, quảng cáo đồ họa', '#f97316', '#fff7ed', 'Paintbrush', 14, TRUE, FALSE, '{"creates_workflow": true, "workflow_type": "image_design"}'),
      ('task_type', 'product_photo', 'Chụp ảnh sản phẩm', 'Ảnh chụp sản phẩm laptop, phụ kiện', '#eab308', '#fefce8', 'Camera', 15, TRUE, FALSE, '{"creates_workflow": true, "workflow_type": "product_photo"}'),
      ('task_type', 'livestream', 'Livestream', 'Livestream bán hàng, review, Q&A', '#a855f7', '#faf5ff', 'Radio', 16, TRUE, FALSE, '{"creates_workflow": true, "workflow_type": "livestream"}'),
      ('task_type', 'other', 'Khác', 'Loại công việc khác', '#6b7280', '#f9fafb', 'FileText', 90, TRUE, FALSE, '{"creates_workflow": false}'),
      ('task_type', 'train', 'Training', 'Đào tạo nhân viên, quy trình nội bộ', '#8b5cf6', '#f5f3ff', 'GraduationCap', 1, TRUE, FALSE, '{"creates_workflow": false}'),
      ('task_type', 'team_meeting', 'Họp team', 'Cuộc họp, standup, planning', '#06b6d4', '#ecfeff', 'Users', 2, TRUE, FALSE, '{"creates_workflow": false}'),
      ('task_type', 'inventory_check', 'Kiểm tra tồn kho', 'Kiểm tra, đối soát hàng tồn kho', '#eab308', '#fefce8', 'ListTodo', 3, TRUE, FALSE, '{"creates_workflow": false}'),
      ('task_type', 'technical_fix', 'Sửa lỗi website/app', 'Fix bug, maintain hệ thống', '#ef4444', '#fef2f2', 'Server', 4, TRUE, FALSE, '{"creates_workflow": false}'),
      ('task_type', 'product_data_entry', 'Nhập dữ liệu sản phẩm', 'Nhập/import sản phẩm vào hệ thống', '#22c55e', '#f0fdf4', 'Database', 5, TRUE, FALSE, '{"creates_workflow": false}')
    ON CONFLICT (category, code) DO UPDATE SET
      metadata = EXCLUDED.metadata,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      color = EXCLUDED.color,
      bg_color = EXCLUDED.bg_color,
      icon = EXCLUDED.icon,
      sort_order = EXCLUDED.sort_order
  `;
  try {
    await client.query(seedSQL);
    console.log("  OK - task_type items seeded/updated");
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
  }

  // Verify final state
  const { rows: taskTypes } = await client.query(`
    SELECT code, name, metadata FROM pm_master_data
    WHERE category = 'task_type'
    ORDER BY sort_order
  `);
  console.log("\n=== task_type items in pm_master_data ===");
  taskTypes.forEach((r) => {
    const meta = typeof r.metadata === "object" ? r.metadata : {};
    console.log(`  ${r.code}: ${r.name} | creates_workflow=${meta.creates_workflow} | workflow_type=${meta.workflow_type || "-"}`);
  });

  await client.end();
  console.log("\nMigration 031 complete!");
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
