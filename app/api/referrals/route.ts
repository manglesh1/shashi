import { desc } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { ensureReferralSchema, getDb } from "../../../db";
import { referrals } from "../../../db/schema";

const ADMIN_CODE =
  (env as unknown as { ADMIN_CODE?: string }).ADMIN_CODE?.trim() || "WARD611";

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function requireAdmin(request: Request) {
  return request.headers.get("x-admin-code")?.trim() === ADMIN_CODE;
}

function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  return Response.json({ error: message }, { status: 500 });
}

export async function GET(request: Request) {
  if (!requireAdmin(request)) {
    return Response.json({ error: "Enter the campaign access code." }, { status: 401 });
  }

  try {
    await ensureReferralSchema();
    const rows = await getDb()
      .select()
      .from(referrals)
      .orderBy(desc(referrals.createdAt), desc(referrals.id))
      .limit(500);

    return Response.json({ referrals: rows });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const referrerName = normalize(payload.referrerName);
    const referrerPhone = normalize(payload.referrerPhone);
    const supporterName = normalize(payload.supporterName);
    const supporterPhone = normalize(payload.supporterPhone);
    const supporterAddress = normalize(payload.supporterAddress);

    if (!referrerName || !referrerPhone || !supporterName || !supporterPhone || !supporterAddress) {
      return Response.json(
        { error: "Please include your name, your phone, the supporter's name, phone, and address." },
        { status: 400 }
      );
    }

    await ensureReferralSchema();
    const [created] = await getDb()
      .insert(referrals)
      .values({
        referrerName,
        referrerPhone,
        referrerEmail: normalize(payload.referrerEmail),
        supporterName,
        supporterPhone,
        supporterAddress,
        supporterPostal: normalize(payload.supporterPostal).toUpperCase(),
        ward: normalize(payload.ward) || "Ward 6 or 11",
        supportLevel: normalize(payload.supportLevel) || "Needs follow-up",
        consentToContact: Boolean(payload.consentToContact),
        notes: normalize(payload.notes),
      })
      .returning();

    return Response.json({ referral: created }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
