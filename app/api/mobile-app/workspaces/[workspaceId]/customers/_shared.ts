import "server-only";
import { canViewCustomers } from "@/lib/customer";
import { MobileApiError, type MobileWorkspaceContext } from "@/lib/mobile-auth";
import type { CustomerServiceResult } from "@/lib/services/customer-service";

export function unwrapCustomerResult(
  result: CustomerServiceResult,
): Extract<CustomerServiceResult, { ok: true }>["customer"] {
  if (result.ok) return result.customer;
  switch (result.code) {
    case "forbidden":
    case "cannot_manage":
      throw new MobileApiError(403, "forbidden");
    case "customer_not_found":
      throw new MobileApiError(404, "customer_not_found");
    case "lead_not_found":
      throw new MobileApiError(404, "lead_not_found");
    case "already_converted":
      throw new MobileApiError(409, "already_converted");
    case "lead_stamp_failed":
      throw new MobileApiError(500, "lead_stamp_failed");
    case "validation":
      throw new MobileApiError(
        422,
        "validation_failed",
        result.fieldErrors as Record<string, string>,
      );
    case "save_failed":
      throw new MobileApiError(500, "save_failed");
  }
}

export function requireCustomerViewer(ctx: MobileWorkspaceContext): void {
  if (!canViewCustomers(ctx.role)) throw new MobileApiError(403, "forbidden");
}
