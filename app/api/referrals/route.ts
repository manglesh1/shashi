import { createReferral, ensureReferralSchema, listReferrals } from "../../../db";

const ADMIN_USER = process.env.ADMIN_USER?.trim() || "shyambhadauria@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim() || "Ward611!";

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanPhone(value: string) {
  return value.replace(/\D/g, "");
}

function requireAdmin(request: Request) {
  return (
    request.headers.get("x-admin-user")?.trim() === ADMIN_USER &&
    request.headers.get("x-admin-password")?.trim() === ADMIN_PASSWORD
  );
}

function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  return Response.json({ error: message }, { status: 500 });
}

export async function GET(request: Request) {
  if (!requireAdmin(request)) {
    return Response.json({ error: "Enter the admin user ID and password." }, { status: 401 });
  }

  try {
    await ensureReferralSchema();
    const rows = await listReferrals();
    return Response.json({ referrals: rows });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const referrerName = normalize(payload.referrerName);
    const referrerPhone = cleanPhone(normalize(payload.referrerPhone));
    const supporterName = normalize(payload.supporterName);
    const supporterPhone = cleanPhone(normalize(payload.supporterPhone));
    const supporterAddress = normalize(payload.supporterAddress);

    if (!referrerName || !referrerPhone || !supporterName || !supporterPhone || !supporterAddress) {
      return Response.json(
        { error: "Please include your name, your phone, the supporter's name, phone, and address." },
        { status: 400 }
      );
    }

    await ensureReferralSchema();
    const created = await createReferral({
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
    });

    return Response.json({ referral: created }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
