import User from "@/models/user";
import { MobileApiError, requireMobileUser } from "@/lib/mobile-auth";
import { ok, readJsonBody, withMobile } from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withMobile(async (req) => {
  const { user } = await requireMobileUser(req);
  return ok({ user });
});

export const PATCH = withMobile(async (req) => {
  const { userId, user } = await requireMobileUser(req);
  const body = await readJsonBody(req);

  const updates: { name?: string; image?: string | null } = {};
  const fields: Record<string, string> = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 80) {
      fields.name = "Name must be between 2 and 80 characters.";
    } else {
      updates.name = name;
    }
  }

  if (body.image !== undefined) {
    if (body.image === null) {
      updates.image = null;
    } else if (
      typeof body.image === "string" &&
      /^https?:\/\//.test(body.image)
    ) {
      updates.image = body.image;
    } else {
      fields.image = "Image must be a valid URL or null.";
    }
  }

  if (Object.keys(fields).length > 0) {
    throw new MobileApiError(422, "validation_failed", fields);
  }
  if (Object.keys(updates).length === 0) {
    throw new MobileApiError(400, "invalid_body");
  }

  await User.updateOne({ _id: userId }, { $set: updates });

  return ok({ user: { ...user, ...updates } });
});
