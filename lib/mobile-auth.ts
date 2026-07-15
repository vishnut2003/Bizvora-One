import "server-only";
import crypto from "crypto";
import mongoose from "mongoose";
import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import { connectDB } from "@/config/db";
import User from "@/models/user";
import Workspace from "@/models/workspace";
import MobileSession, {
  MOBILE_PLATFORMS,
  type MobilePlatform,
} from "@/models/mobile-session";
import type { UserRole } from "@/lib/user";
import { generateNonce } from "@/lib/integration";
import { isWorkspaceAccessible } from "@/lib/workspace";
import { getActorRole, type LeanWorkspace } from "@/lib/workspace-access";

// Thrown by guards/handlers; withMobile() maps it to a JSON error response.
export class MobileApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public fields?: Record<string, string>,
  ) {
    super(code);
    this.name = "MobileApiError";
  }
}

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function getMobileJwtSecret(): Uint8Array {
  const raw = process.env.MOBILE_JWT_SECRET;
  if (!raw) {
    throw new Error(
      "MOBILE_JWT_SECRET is not set. Generate one with `node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"` and add it to .env.",
    );
  }
  return new Uint8Array(Buffer.from(raw, "base64"));
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateRefreshToken(): string {
  return generateNonce(48);
}

export async function signAccessToken(
  userId: string,
  sessionId: string,
): Promise<string> {
  return new SignJWT({ typ: "access", sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getMobileJwtSecret());
}

export async function verifyAccessToken(
  token: string,
): Promise<{ userId: string; sessionId: string }> {
  let payload: Record<string, unknown>;
  try {
    ({ payload } = await jwtVerify(token, getMobileJwtSecret()));
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) {
      throw new MobileApiError(401, "token_expired");
    }
    throw new MobileApiError(401, "unauthorized");
  }
  if (
    payload.typ !== "access" ||
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string"
  ) {
    throw new MobileApiError(401, "unauthorized");
  }
  return { userId: payload.sub, sessionId: payload.sid };
}

export type MobileDeviceInput = {
  name?: string;
  platform?: MobilePlatform;
  appVersion?: string;
};

export function parseDeviceInput(value: unknown): MobileDeviceInput {
  if (!value || typeof value !== "object") return {};
  const raw = value as Record<string, unknown>;
  const platform =
    typeof raw.platform === "string" &&
    (MOBILE_PLATFORMS as readonly string[]).includes(raw.platform)
      ? (raw.platform as MobilePlatform)
      : "other";
  return {
    name: typeof raw.name === "string" ? raw.name.slice(0, 120) : "",
    platform,
    appVersion:
      typeof raw.appVersion === "string" ? raw.appVersion.slice(0, 40) : "",
  };
}

export async function createMobileSession(
  userId: string,
  opts: { familyId?: string; device?: MobileDeviceInput; ip?: string } = {},
): Promise<{ refreshToken: string; sessionId: string; familyId: string }> {
  const refreshToken = generateRefreshToken();
  const familyId = opts.familyId ?? generateNonce(16);
  const session = await MobileSession.create({
    user: userId,
    tokenHash: hashRefreshToken(refreshToken),
    familyId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    device: opts.device ?? {},
    ip: opts.ip ?? "",
    lastUsedAt: new Date(),
  });
  return { refreshToken, sessionId: session.id, familyId };
}

export function getRequestIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0]?.trim() ?? "";
}

export type MobileUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: UserRole;
  emailVerified: boolean;
};

export type MobileAuthContext = {
  userId: string;
  sessionId: string;
  user: MobileUser;
};

// Bearer guard: verifies the access JWT and loads a fresh user so disabled
// accounts are cut off without waiting for token expiry.
export async function requireMobileUser(
  req: Request,
): Promise<MobileAuthContext> {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (!token || scheme.toLowerCase() !== "bearer") {
    throw new MobileApiError(401, "unauthorized");
  }

  const { userId, sessionId } = await verifyAccessToken(token);

  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user) throw new MobileApiError(401, "unauthorized");
  if (user.disabled) throw new MobileApiError(403, "account_disabled");

  return {
    userId,
    sessionId,
    user: {
      id: userId,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
      role: user.role as UserRole,
      emailVerified: Boolean(user.emailVerified),
    },
  };
}

export type MobileWorkspaceContext = MobileAuthContext & {
  workspace: LeanWorkspace;
  role: UserRole;
};

// JSON mirror of requireWorkspaceAccess() (lib/workspace-access.ts): same
// membership/status/role checks, but throws MobileApiError instead of
// redirecting.
export async function requireMobileWorkspace(
  req: Request,
  workspaceId: string,
  opts: { allowedRoles?: UserRole[] } = {},
): Promise<MobileWorkspaceContext> {
  const auth = await requireMobileUser(req);

  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    throw new MobileApiError(400, "invalid_workspace");
  }

  const workspace = (await Workspace.findOne({
    _id: workspaceId,
    $or: [{ owner: auth.userId }, { "members.user": auth.userId }],
  }).lean()) as LeanWorkspace | null;

  if (!workspace) {
    const exists = await Workspace.exists({ _id: workspaceId });
    if (exists) throw new MobileApiError(403, "forbidden");
    throw new MobileApiError(404, "workspace_not_found");
  }

  if (!isWorkspaceAccessible(workspace.status)) {
    throw new MobileApiError(403, "workspace_not_active");
  }

  const role = getActorRole(workspace, auth.userId);

  if (opts.allowedRoles && !opts.allowedRoles.includes(role)) {
    throw new MobileApiError(403, "forbidden");
  }

  return { ...auth, workspace, role };
}
