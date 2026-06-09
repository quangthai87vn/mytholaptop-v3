import { query } from "../lib/db";

async function main() {
  const cols = await query(
    "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'pm_tasks' AND column_name IN ('priority','thumbnail_url') ORDER BY column_name"
  );

  console.log("COLUMNS");
  console.log(JSON.stringify(cols.rows, null, 2));

  const sample = await query(
    "SELECT id, title, priority, thumbnail_url, youtube_url FROM pm_tasks ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 5"
  );

  console.log("SAMPLE_TASKS");
  console.log(JSON.stringify(sample.rows, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
