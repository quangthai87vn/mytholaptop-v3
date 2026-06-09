/**
 * Check existing v_workspace_activities view columns
 */
const { Client } = require('pg');

function parseDatabaseUrl(url) {
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) throw new Error('Invalid DATABASE_URL format');
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
}

const dbUrl = process.env.DATABASE_URL || 'postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop';
const dbConfig = parseDatabaseUrl(dbUrl);

const client = new Client({
  ...dbConfig,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function main() {
  try {
    await client.connect();

    // Get view definition
    const def = await client.query(`
      SELECT pg_get_viewdef('v_workspace_activities', true) AS definition
    `);
    console.log('=== v_workspace_activities definition ===');
    console.log(def.rows[0].definition);

    // Get column info
    const cols = await client.query(`
      SELECT column_name, ordinal_position
      FROM information_schema.columns
      WHERE table_name = 'v_workspace_activities'
      ORDER BY ordinal_position
    `);
    console.log('\n=== Columns ===');
    cols.rows.forEach(r => console.log(`  ${r.ordinal_position}. ${r.column_name}`));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
