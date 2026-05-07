/**
 * PostgreSQL Database Connection
 * Kết nối đến Medusa PostgreSQL database
 */

import { Pool, PoolClient } from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:postgrespassword%261P%40ssw0rd%26Aimabiettaolaai@localhost:5433/mtl_medusa";

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected error on idle client:", err);
});

export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  
  if (process.env.NODE_ENV === "development") {
    console.debug("[DB] Query executed:", { text: text.substring(0, 100), duration, rows: result.rowCount });
  }
  
  return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
}

export async function exec(text: string, params?: unknown[]): Promise<void> {
  await pool.query(text, params);
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}

// Re-export pool for advanced use
export { pool };
