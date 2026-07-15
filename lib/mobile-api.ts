import "server-only";
import mongoose from "mongoose";
import { MobileApiError } from "@/lib/mobile-auth";

export function ok(
  data: Record<string, unknown> = {},
  status = 200,
): Response {
  return Response.json({ ok: true, ...data }, { status });
}

export function fail(
  code: string,
  status: number,
  fields?: Record<string, string>,
): Response {
  return Response.json(
    fields ? { error: code, fields } : { error: code },
    { status },
  );
}

export async function readJsonBody<T = Record<string, unknown>>(
  req: Request,
): Promise<T> {
  try {
    const body = (await req.json()) as unknown;
    if (!body || typeof body !== "object") {
      throw new MobileApiError(400, "invalid_json");
    }
    return body as T;
  } catch (err) {
    if (err instanceof MobileApiError) throw err;
    throw new MobileApiError(400, "invalid_json");
  }
}

export type Pagination = { page: number; limit: number; skip: number };

export function parsePagination(
  url: URL,
  opts: { defaultLimit?: number; maxLimit?: number } = {},
): Pagination {
  const defaultLimit = opts.defaultLimit ?? 20;
  const maxLimit = opts.maxLimit ?? 100;

  const rawPage = Number(url.searchParams.get("page"));
  const rawLimit = Number(url.searchParams.get("limit"));

  const page =
    Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1
      ? Math.min(Math.floor(rawLimit), maxLimit)
      : defaultLimit;

  return { page, limit, skip: (page - 1) * limit };
}

// Whitelisted sort parsing: "?sort=-createdAt" -> { createdAt: -1 }.
export function parseSort(
  url: URL,
  allowedFields: readonly string[],
  fallback: Record<string, 1 | -1>,
): Record<string, 1 | -1> {
  const raw = url.searchParams.get("sort");
  if (!raw) return fallback;
  const desc = raw.startsWith("-");
  const field = desc ? raw.slice(1) : raw;
  if (!allowedFields.includes(field)) return fallback;
  return { [field]: desc ? -1 : 1 };
}

// Converts .lean() results into JSON-safe DTOs: ObjectId -> string,
// Date -> ISO string, `_id` -> `id`, `__v` dropped.
export function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof mongoose.Types.ObjectId) return String(value);
  if (Array.isArray(value)) return value.map(serialize);
  if (Buffer.isBuffer(value)) return value.toString("base64");
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (key === "__v") continue;
      out[key === "_id" ? "id" : key] = serialize(val);
    }
    return out;
  }
  return value;
}

export function listEnvelope(
  items: unknown[],
  pagination: Pagination,
  total: number,
): Record<string, unknown> {
  return {
    items: serialize(items),
    page: pagination.page,
    limit: pagination.limit,
    total,
    hasMore: pagination.skip + items.length < total,
  };
}

export function requireObjectId(value: string, code = "invalid_id"): string {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new MobileApiError(400, code);
  }
  return value;
}

// Route wrapper: keeps handlers thin by mapping thrown errors to the JSON
// error envelope. Unknown errors are logged and returned as 500s.
export function withMobile<Ctx>(
  handler: (req: Request, ctx: Ctx) => Promise<Response>,
): (req: Request, ctx: Ctx) => Promise<Response> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof MobileApiError) {
        return fail(err.code, err.status, err.fields);
      }
      if (err instanceof mongoose.Error.CastError) {
        return fail("invalid_id", 400);
      }
      console.error("[mobile-api]", req.method, new URL(req.url).pathname, err);
      return fail("internal_error", 500);
    }
  };
}
