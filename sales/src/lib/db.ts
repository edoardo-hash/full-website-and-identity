import "server-only";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";

/**
 * The sales tables and the villa snapshot. Two kinds of database are accepted (1 Nov 2026):
 * - Neon (the portal's dev/ihtest database): a DATABASE_URL on *.neon.tech, queried over HTTP.
 * - Any other Postgres, e.g. the netcup server (postgres:17, database "invenio"): a normal connection pool.
 *   SSL follows the URL (?sslmode=require); add DATABASE_SSL=0 only for a server without SSL.
 * This app only reads the villa snapshot and the sales tables and writes CRM rows (contacts, requests, activities).
 * It never changes the schema.
 */
export const hasDb = () => !!process.env.DATABASE_URL;

const isNeon = (url: string) => { try { return new URL(url).hostname.endsWith(".neon.tech"); } catch { return false; } };

let pool: Pool | null = null;
function getPool(url: string): Pool {
  if (!pool) {
    const ssl = process.env.DATABASE_SSL === "0" ? false : /sslmode=(require|verify)/.test(url) ? { rejectUnauthorized: /verify/.test(url) } : undefined;
    // Serverless: few connections per instance, closed quickly when idle.
    pool = new Pool({ connectionString: url, ssl, max: Number(process.env.DATABASE_POOL_MAX || 3), idleTimeoutMillis: 10_000, connectionTimeoutMillis: 8_000 });
  }
  return pool;
}

export async function q<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const url = process.env.DATABASE_URL as string;
  if (isNeon(url)) return (await neon(url).query(text, params)) as T[];
  return (await getPool(url).query(text, params)).rows as T[];
}

/** Who this app writes as in the CRM for website forms (visitors have no login). */
export const ACTOR = { email: "sales-site", name: "Sales website" };
