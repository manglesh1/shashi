import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

export async function ensureReferralSchema() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB`."
    );
  }

  await env.DB.batch([
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS referrals (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        referrer_name TEXT NOT NULL,
        referrer_phone TEXT NOT NULL,
        referrer_email TEXT NOT NULL DEFAULT '',
        supporter_name TEXT NOT NULL,
        supporter_phone TEXT NOT NULL,
        supporter_address TEXT NOT NULL,
        supporter_postal TEXT NOT NULL DEFAULT '',
        ward TEXT NOT NULL DEFAULT 'Ward 6 or 11',
        support_level TEXT NOT NULL DEFAULT 'Needs follow-up',
        consent_to_contact INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'New',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_referrals_created_at
      ON referrals(created_at)
    `),
    env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_referrals_status_ward
      ON referrals(status, ward)
    `),
  ]);
}
