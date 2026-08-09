import { neon } from "@neondatabase/serverless";

export type ReferralRecord = {
  id: number;
  referrerName: string;
  referrerPhone: string;
  referrerEmail: string;
  supporterName: string;
  supporterPhone: string;
  supporterAddress: string;
  supporterPostal: string;
  ward: string;
  supportLevel: string;
  consentToContact: boolean;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type ReferralInput = {
  referrerName: string;
  referrerPhone: string;
  referrerEmail: string;
  supporterName: string;
  supporterPhone: string;
  supporterAddress: string;
  supporterPostal: string;
  ward: string;
  supportLevel: string;
  consentToContact: boolean;
  notes: string;
};

type DbRow = Record<string, unknown>;

let db: ReturnType<typeof neon> | null = null;

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add a free Neon or Supabase Postgres connection string in Vercel.");
  }

  db ??= neon(process.env.DATABASE_URL);
  return db;
}

function mapReferral(row: Record<string, unknown>): ReferralRecord {
  return {
    id: Number(row.id),
    referrerName: String(row.referrer_name ?? ""),
    referrerPhone: String(row.referrer_phone ?? ""),
    referrerEmail: String(row.referrer_email ?? ""),
    supporterName: String(row.supporter_name ?? ""),
    supporterPhone: String(row.supporter_phone ?? ""),
    supporterAddress: String(row.supporter_address ?? ""),
    supporterPostal: String(row.supporter_postal ?? ""),
    ward: String(row.ward ?? ""),
    supportLevel: String(row.support_level ?? ""),
    consentToContact: Boolean(row.consent_to_contact),
    status: String(row.status ?? ""),
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export async function ensureReferralSchema() {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS referrals (
      id BIGSERIAL PRIMARY KEY,
      referrer_name TEXT NOT NULL,
      referrer_phone TEXT NOT NULL,
      referrer_email TEXT NOT NULL DEFAULT '',
      supporter_name TEXT NOT NULL,
      supporter_phone TEXT NOT NULL,
      supporter_address TEXT NOT NULL,
      supporter_postal TEXT NOT NULL DEFAULT '',
      ward TEXT NOT NULL DEFAULT 'Ward 6 or 11',
      support_level TEXT NOT NULL DEFAULT 'Needs follow-up',
      consent_to_contact BOOLEAN NOT NULL DEFAULT false,
      status TEXT NOT NULL DEFAULT 'New',
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_referrals_status_ward ON referrals(status, ward)`;
}

export async function listReferrals(): Promise<ReferralRecord[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM referrals
    ORDER BY created_at DESC, id DESC
    LIMIT 500
  `) as DbRow[];
  return rows.map(mapReferral);
}

export async function listReferrerChain(phone: string): Promise<ReferralRecord[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM referrals
    WHERE referrer_phone = ${phone}
    ORDER BY created_at DESC, id DESC
    LIMIT 50
  `) as DbRow[];
  return rows.map(mapReferral);
}

export async function createReferral(values: ReferralInput): Promise<ReferralRecord> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO referrals (
      referrer_name,
      referrer_phone,
      referrer_email,
      supporter_name,
      supporter_phone,
      supporter_address,
      supporter_postal,
      ward,
      support_level,
      consent_to_contact,
      notes
    )
    VALUES (
      ${values.referrerName},
      ${values.referrerPhone},
      ${values.referrerEmail},
      ${values.supporterName},
      ${values.supporterPhone},
      ${values.supporterAddress},
      ${values.supporterPostal},
      ${values.ward},
      ${values.supportLevel},
      ${values.consentToContact},
      ${values.notes}
    )
    RETURNING *
  `) as DbRow[];
  return mapReferral(rows[0]);
}

export async function updateReferral(
  id: number,
  status: string,
  notes: string
): Promise<ReferralRecord | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE referrals
    SET status = ${status}, notes = ${notes}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `) as DbRow[];
  return rows[0] ? mapReferral(rows[0]) : null;
}
