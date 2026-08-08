import { desc, eq } from "drizzle-orm";
import { ensureReferralSchema, getDb } from "../../../db";
import { referrals } from "../../../db/schema";

function cleanPhone(value: string) {
  return value.replace(/\D/g, "");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const phone = cleanPhone(url.searchParams.get("phone") || "");

  if (phone.length < 7) {
    return Response.json({ error: "Enter a valid phone number." }, { status: 400 });
  }

  try {
    await ensureReferralSchema();
    const rows = await getDb()
      .select()
      .from(referrals)
      .where(eq(referrals.referrerPhone, phone))
      .orderBy(desc(referrals.createdAt), desc(referrals.id))
      .limit(50);

    return Response.json({
      referrer: rows[0]
        ? {
            name: rows[0].referrerName,
            phone: rows[0].referrerPhone,
            email: rows[0].referrerEmail,
          }
        : null,
      referrals: rows.map((row) => ({
        id: row.id,
        supporterName: row.supporterName,
        ward: row.ward,
        supportLevel: row.supportLevel,
        status: row.status,
        createdAt: row.createdAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
