/**
 * PostgreSQL Database Connection
 * Kết nối đến Medusa PostgreSQL database
 */

import { Pool, PoolClient } from "pg";

let _pool: Pool | null = null;

function getPool(): Pool {
  if (_pool) return _pool;

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error(
      "[ERROR] DATABASE_URL chưa được cấu hình.\n" +
      "Vui lòng tạo file .env trong thư mục admin-ui với:\n" +
      "  DATABASE_URL=postgres://user:password@host:5433/mtl_medusa\n" +
      "Hoặc đặt biến môi trường trước khi chạy:\n" +
      "  Windows (ps):  $env:DATABASE_URL='postgres://...'\n" +
      "  macOS/Linux:   export DATABASE_URL=postgres://..."
    );
  }

  _pool = new Pool({
    connectionString: DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  _pool.on("error", (err) => {
    console.error("[DB] Unexpected error on idle client:", err);
  });

  return _pool;
}

export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const pool = getPool();
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === "development") {
    console.debug("[DB] Query executed:", { text: text.substring(0, 100), duration, rows: result.rowCount });
  }

  return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
}

export async function exec(text: string, params?: unknown[]): Promise<void> {
  const pool = getPool();
  await pool.query(text, params);
}

export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return pool.connect();
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
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
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
