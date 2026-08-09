import { ensureReferralSchema, updateReferral } from "../../../../db";

const ADMIN_USER = process.env.ADMIN_USER?.trim() || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim() || "Ward611!";

function requireAdmin(request: Request) {
  return (
    request.headers.get("x-admin-user")?.trim() === ADMIN_USER &&
    request.headers.get("x-admin-password")?.trim() === ADMIN_PASSWORD
  );
}

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(request)) {
    return Response.json({ error: "Enter the admin user ID and password." }, { status: 401 });
  }

  const { id } = await params;
  const referralId = Number(id);

  if (!Number.isInteger(referralId) || referralId < 1) {
    return Response.json({ error: "Referral not found." }, { status: 404 });
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const status = normalize(payload.status) || "New";
    const notes = normalize(payload.notes);

    await ensureReferralSchema();
    const updated = await updateReferral(referralId, status, notes);

    if (!updated) {
      return Response.json({ error: "Referral not found." }, { status: 404 });
    }

    return Response.json({ referral: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
