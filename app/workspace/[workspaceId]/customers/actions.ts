"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import { getActorRole } from "@/lib/workspace-access";
import {
  createCustomerForActor,
  parseCustomerInput,
  updateCustomerForActor,
  type CustomerFieldErrors,
  type CustomerServiceResult,
} from "@/lib/services/customer-service";

export type CustomerFormErrors = CustomerFieldErrors;

export type CustomerActionState =
  | {
      ok?: boolean;
      errors?: CustomerFormErrors;
      formError?: string;
    }
  | undefined;

const CUSTOMER_FORM_KEYS = [
  "name",
  "email",
  "phone",
  "company",
  "jobTitle",
  "website",
  "city",
  "state",
  "country",
  "billingLine1",
  "billingLine2",
  "billingCity",
  "billingState",
  "billingCountry",
  "billingPostalCode",
  "gstin",
  "pan",
  "status",
  "source",
  "assignedTo",
  "tags",
  "noteBody",
] as const;

function formDataToRecord(formData: FormData): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const key of CUSTOMER_FORM_KEYS) {
    record[key] = String(formData.get(key) ?? "");
  }
  return record;
}

function mapServiceFailure(
  result: Exclude<CustomerServiceResult, { ok: true }>,
  context: "create" | "convert" | "edit",
): CustomerActionState {
  switch (result.code) {
    case "forbidden":
      return {
        formError:
          context === "convert"
            ? "You don't have permission to convert leads."
            : context === "create"
              ? "You don't have permission to add customers."
              : "You don't have permission to edit customers.",
      };
    case "customer_not_found":
      return { formError: "Customer not found." };
    case "cannot_manage":
      return { formError: "You can't edit this customer." };
    case "lead_not_found":
      return { formError: "Lead not found." };
    case "already_converted":
      return {
        formError: "This lead has already been converted to a customer.",
      };
    case "lead_stamp_failed":
      return {
        formError:
          "Customer was created, but we couldn't update the originating lead. Please refresh.",
      };
    case "validation":
      return { errors: result.fieldErrors };
    case "save_failed":
      return { formError: `${result.message} Please try again.` };
  }
}

export async function createCustomer(
  workspaceId: string,
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }

  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return { formError: "Invalid workspace." };
  }

  const parsed = parseCustomerInput(formDataToRecord(formData));
  if (parsed.errors) return { errors: parsed.errors };
  const data = parsed.data!;

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { formError: "Workspace not found." };

  const result = await createCustomerForActor(
    {
      actorId: session.user.id,
      role: getActorRole(workspace, session.user.id),
      workspace,
    },
    data,
  );

  if (!result.ok) return mapServiceFailure(result, "create");

  revalidatePath(`/workspace/${workspaceId}/customers`);
  return { ok: true };
}

export async function createCustomerFromLead(
  workspaceId: string,
  leadId: string,
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }

  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(leadId)
  ) {
    return { formError: "Invalid identifier." };
  }

  const parsed = parseCustomerInput(formDataToRecord(formData));
  if (parsed.errors) return { errors: parsed.errors };
  const data = parsed.data!;

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { formError: "Workspace not found." };

  const result = await createCustomerForActor(
    {
      actorId: session.user.id,
      role: getActorRole(workspace, session.user.id),
      workspace,
    },
    data,
    { fromLeadId: leadId },
  );

  if (!result.ok) return mapServiceFailure(result, "convert");

  revalidatePath(`/workspace/${workspaceId}/customers`);
  revalidatePath(`/workspace/${workspaceId}/leads`);
  return { ok: true };
}

export async function updateCustomer(
  workspaceId: string,
  customerId: string,
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }

  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(customerId)
  ) {
    return { formError: "Invalid identifier." };
  }

  const parsed = parseCustomerInput(formDataToRecord(formData));
  if (parsed.errors) return { errors: parsed.errors };
  const data = parsed.data!;

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { formError: "Workspace not found." };

  const result = await updateCustomerForActor(
    {
      actorId: session.user.id,
      role: getActorRole(workspace, session.user.id),
      workspace,
    },
    customerId,
    data,
  );

  if (!result.ok) return mapServiceFailure(result, "edit");

  revalidatePath(`/workspace/${workspaceId}/customers`);
  return { ok: true };
}
