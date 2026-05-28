import type { Metadata } from "next";
import Link from "next/link";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import Vendor, { type IVendor, type VendorStatus } from "@/models/vendor";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { VENDOR_MANAGER_ROLES } from "@/lib/voucher";
import type { WorkspaceColor } from "@/lib/workspace";
import DashboardLayout from "@/layouts/dashboard-layout";
import VendorForm from "../../_components/vendor-form";

export const metadata: Metadata = {
  title: "Edit Vendor — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string; vendorId: string }>;
};

type LeanVendor = IVendor & { _id: { toString(): string } };

export default async function EditVendorPage({ params }: Props) {
  const { workspaceId, vendorId } = await params;

  if (!mongoose.Types.ObjectId.isValid(vendorId)) notFound();

  const { session, workspace: doc, role } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: VENDOR_MANAGER_ROLES,
  });

  const vendor = (await Vendor.findOne({
    _id: vendorId,
    workspace: workspaceId,
  }).lean()) as LeanVendor | null;

  if (!vendor) notFound();

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  const defaults = {
    name: vendor.name,
    displayName: vendor.displayName ?? "",
    email: vendor.email ?? "",
    phone: vendor.phone ?? "",
    contactPerson: vendor.contactPerson ?? "",
    line1: vendor.address?.line1 ?? "",
    line2: vendor.address?.line2 ?? "",
    city: vendor.address?.city ?? "",
    state: vendor.address?.state ?? "",
    country: vendor.address?.country ?? "",
    postalCode: vendor.address?.postalCode ?? "",
    gstin: vendor.gstin ?? "",
    pan: vendor.pan ?? "",
    status: (vendor.status ?? "active") as VendorStatus,
    notes: vendor.notes ?? "",
  };

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
    >
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/workspace/${workspace.id}/vendors`}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Vendors
          </Link>
        </div>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
            <Pencil className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
              Edit vendor
            </h1>
            <p className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
              {vendor.displayName || vendor.name}
            </p>
          </div>
        </div>

        <VendorForm
          mode="edit"
          workspaceId={workspace.id}
          vendorId={String(vendor._id)}
          defaults={defaults}
        />
      </div>
    </DashboardLayout>
  );
}
