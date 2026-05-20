import type { Metadata } from "next";
import {
  Building2,
  CalendarClock,
  Mail,
  Phone,
  Receipt,
  Sparkles,
  Tag,
  TrendingDown,
  UserCircle2,
  UserPlus,
  Users,
} from "lucide-react";
import "@/lib/mongoose-filter";
import mongoose, { type FilterQuery } from "mongoose";
import Customer, {
  CUSTOMER_FIELD_LABEL,
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_BADGE_CLASS,
  CUSTOMER_STATUS_DOT_CLASS,
  CUSTOMER_STATUS_LABEL,
  LEAD_SOURCES,
  LEAD_SOURCE_LABEL,
  type CustomerActivityType,
  type CustomerStatus,
  type ICustomer,
  type LeadSource,
} from "@/models/customer";
import Lead, { type ILead } from "@/models/lead";
import User from "@/models/user";
import {
  CUSTOMER_VIEWER_ROLES,
  canConvertLeadToCustomer,
  canCreateCustomer,
  canManageAnyCustomer,
  canManageCustomer,
  canViewAllCustomers,
} from "@/lib/customer";
import type { WorkspaceColor } from "@/lib/workspace";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/time";
import DashboardLayout from "@/layouts/dashboard-layout";
import AddCustomerButton from "./_components/add-customer-button";
import EditCustomerButton from "./_components/edit-customer-button";
import HistoryButton, {
  type HistoryEntry,
} from "./_components/history-button";
import CustomersToolbar from "./_components/customers-toolbar";
import RemoveCustomerButton from "./_components/remove-customer-button";
import type {
  CustomerFormDefaults,
  CustomerFormMember,
  CustomerFormNote,
} from "./_components/customer-form-popup";
import type { ConvertibleLead } from "./_components/lead-picker-popup";

export const metadata: Metadata = {
  title: "Customers — WSS CRM",
};

type CustomersPageProps = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function isCustomerStatus(v: string): v is CustomerStatus {
  return (CUSTOMER_STATUSES as readonly string[]).includes(v);
}
function isLeadSource(v: string): v is LeadSource {
  return (LEAD_SOURCES as readonly string[]).includes(v);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatAbsoluteDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function resolveAssigneeName(
  id: string | null | undefined,
  userById: Map<string, { id: string; name: string }>,
): string {
  if (!id) return "Unassigned";
  return userById.get(String(id))?.name ?? "Someone";
}

function buildActivitySummary(
  type: CustomerActivityType,
  data: Record<string, unknown>,
  userById: Map<string, { id: string; name: string }>,
): string {
  switch (type) {
    case "created": {
      const fromLeadName = data.fromLeadName as string | undefined;
      if (fromLeadName)
        return `created the customer from lead ${fromLeadName}.`;
      return "created the customer.";
    }
    case "status_changed": {
      const from = data.from as CustomerStatus | undefined;
      const to = data.to as CustomerStatus | undefined;
      const fromLabel = from ? CUSTOMER_STATUS_LABEL[from] : "—";
      const toLabel = to ? CUSTOMER_STATUS_LABEL[to] : "—";
      return `moved the customer from ${fromLabel} → ${toLabel}.`;
    }
    case "assignee_changed": {
      const fromName = resolveAssigneeName(
        data.from as string | null,
        userById,
      );
      const toName = resolveAssigneeName(data.to as string | null, userById);
      return `reassigned the customer from ${fromName} → ${toName}.`;
    }
    case "note_added":
      return "added a note.";
    case "tags_changed": {
      const added = (data.added as string[] | undefined) ?? [];
      const removed = (data.removed as string[] | undefined) ?? [];
      const parts: string[] = [];
      if (added.length) parts.push(`added ${added.join(", ")}`);
      if (removed.length) parts.push(`removed ${removed.join(", ")}`);
      return `${parts.join(" · ") || "updated tags"}.`;
    }
    case "details_updated": {
      const fields = ((data.fields as string[] | undefined) ?? []).map(
        (f) => CUSTOMER_FIELD_LABEL[f] ?? f,
      );
      if (fields.length === 0) return "updated details.";
      if (fields.length === 1) return `updated ${fields[0]}.`;
      if (fields.length === 2) return `updated ${fields[0]} and ${fields[1]}.`;
      const last = fields[fields.length - 1];
      return `updated ${fields.slice(0, -1).join(", ")}, and ${last}.`;
    }
    case "billing_updated":
      return "updated billing details.";
  }
}

const STATUS_ACCENT_BORDER: Record<CustomerStatus, string> = {
  active: "before:bg-emerald-500",
  inactive: "before:bg-zinc-400 dark:before:bg-zinc-500",
  churned: "before:bg-rose-500",
};

type LeanCustomer = ICustomer & {
  _id: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
};

type LeanLead = ILead & {
  _id: { toString(): string };
};

export default async function CustomersPage({
  params,
  searchParams,
}: CustomersPageProps) {
  const { workspaceId } = await params;
  const sp = await searchParams;

  const {
    session,
    workspace: doc,
    role: myRole,
  } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: CUSTOMER_VIEWER_ROLES,
  });

  // Filters
  const qRaw = asString(sp.q)?.trim() ?? "";
  const statusRaw = asString(sp.status) ?? "all";
  const sourceRaw = asString(sp.source) ?? "all";
  const assigneeRaw = asString(sp.assignee) ?? "all";

  const visibilityScope: FilterQuery<ICustomer> = canViewAllCustomers(myRole)
    ? { workspace: workspaceId }
    : { workspace: workspaceId, assignedTo: session.user.id };

  const filter: FilterQuery<ICustomer> = { ...visibilityScope };

  if (statusRaw !== "all" && isCustomerStatus(statusRaw)) {
    filter.status = statusRaw;
  }
  if (isLeadSource(sourceRaw)) filter.source = sourceRaw;
  if (canViewAllCustomers(myRole)) {
    if (assigneeRaw === "me") filter.assignedTo = session.user.id;
    else if (assigneeRaw === "unassigned") filter.assignedTo = null;
    else if (assigneeRaw !== "all" && assigneeRaw.length > 0)
      filter.assignedTo = assigneeRaw;
  }

  if (qRaw.length > 0) {
    const re = new RegExp(escapeRegex(qRaw), "i");
    filter.$or = [
      { name: re },
      { email: re },
      { company: re },
      { phone: re },
      { tags: re },
    ];
  }

  const memberIds = [
    String(doc.owner),
    ...(doc.members ?? []).map((m) => String(m.user)),
  ];
  const uniqueMemberIds = Array.from(new Set(memberIds));

  const convertibleLeadsFilter: FilterQuery<ILead> = canViewAllCustomers(myRole)
    ? { workspace: workspaceId, convertedAt: null }
    : {
        workspace: workspaceId,
        convertedAt: null,
        assignedTo: session.user.id,
      };

  // Only fetch convertible leads when the actor can actually convert them.
  // Accounts can add customers manually but doesn't get a lead-conversion path.
  const convertibleLeadsQuery = canConvertLeadToCustomer(myRole)
    ? Lead.find(convertibleLeadsFilter)
        .select(
          "name email phone company jobTitle website source assignedTo tags address",
        )
        .sort({ updatedAt: -1 })
        .limit(500)
        .lean()
    : Promise.resolve([]);

  const [customersRaw, memberUsers, convertibleLeadsRaw] = await Promise.all([
    Customer.find(filter)
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean(),
    User.find({ _id: { $in: uniqueMemberIds } })
      .select("name email image")
      .lean(),
    convertibleLeadsQuery,
  ]);

  const customers = customersRaw as unknown as LeanCustomer[];
  const convertibleLeadsDocs = convertibleLeadsRaw as unknown as LeanLead[];

  const userById = new Map(
    memberUsers.map((u) => [
      String(u._id),
      {
        id: String(u._id),
        name: u.name as string,
        email: u.email as string,
        image: (u.image as string | null | undefined) ?? null,
      },
    ]),
  );

  const salesExecIds = new Set(
    (doc.members ?? [])
      .filter((m) => m.role === "sales_executive")
      .map((m) => String(m.user)),
  );

  const assignableMembers: CustomerFormMember[] = Array.from(salesExecIds)
    .map((id) => userById.get(id))
    .filter((m) => m !== undefined);

  const convertibleLeads: ConvertibleLead[] = convertibleLeadsDocs.map((l) => ({
    id: l._id.toString(),
    name: l.name,
    email: l.email ?? "",
    phone: l.phone ?? "",
    company: l.company ?? "",
    jobTitle: l.jobTitle ?? "",
    website: l.website ?? "",
    source: (l.source as string) ?? "other",
    assignedTo: l.assignedTo ? String(l.assignedTo) : "",
    tags: (l.tags ?? []) as string[],
    city: l.address?.city ?? "",
    state: l.address?.state ?? "",
    country: l.address?.country ?? "",
  }));

  // Stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);
  const restrictToSelf = !canViewAllCustomers(myRole);
  const aggMatch: Record<string, unknown> = { workspace: workspaceObjectId };
  if (restrictToSelf) {
    aggMatch.assignedTo = new mongoose.Types.ObjectId(session.user.id);
  }
  const scopeForCount: FilterQuery<ICustomer> = { ...visibilityScope };

  type StatusAgg = { _id: CustomerStatus; count: number };
  const [statusAggRaw, newThisMonth] = await Promise.all([
    Customer.aggregate<StatusAgg>([
      { $match: aggMatch },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Customer.countDocuments({
      ...scopeForCount,
      createdAt: { $gte: monthStart },
    }),
  ]);

  const statusCounts = new Map<CustomerStatus, number>();
  for (const row of statusAggRaw) statusCounts.set(row._id, row.count);
  const totalCount = CUSTOMER_STATUSES.reduce(
    (sum, s) => sum + (statusCounts.get(s) ?? 0),
    0,
  );
  const statusDistribution = CUSTOMER_STATUSES.map((s) => ({
    status: s,
    count: statusCounts.get(s) ?? 0,
  }));

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role: myRole,
  };

  const fullManager = canManageAnyCustomer(myRole);
  const canAddCustomer = canCreateCustomer(myRole);
  const canConvertFromLead = canConvertLeadToCustomer(myRole);

  const stats: Array<{
    label: string;
    value: string;
    sub?: string;
    icon: typeof UserCircle2;
    accent: string;
  }> = [
    {
      label: "Total customers",
      value: String(totalCount),
      sub: newThisMonth > 0 ? `${newThisMonth} new this month` : undefined,
      icon: Users,
      accent: "from-violet-500 to-purple-700",
    },
    {
      label: "Active",
      value: String(statusCounts.get("active") ?? 0),
      icon: Sparkles,
      accent: "from-emerald-500 to-teal-700",
    },
    {
      label: "Inactive",
      value: String(statusCounts.get("inactive") ?? 0),
      icon: CalendarClock,
      accent: "from-zinc-500 to-zinc-700",
    },
    {
      label: "Churned",
      value: String(statusCounts.get("churned") ?? 0),
      icon: TrendingDown,
      accent: "from-rose-500 to-red-700",
    },
  ];

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
    >
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-white to-secondary/[0.05] dark:from-primary/[0.14] dark:via-zinc-900 dark:to-secondary/[0.10]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-primary/25 to-secondary/15 opacity-40 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-gradient-to-tr from-secondary/15 to-primary/10 opacity-30 blur-3xl"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4 p-6">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
                />
                <Users className="relative h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                  Accounts
                </p>
                <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                  Customers
                </h1>
                <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                  {canViewAllCustomers(myRole)
                    ? "Manage every customer account in "
                    : "Your assigned customers in "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {workspace.name}
                  </span>
                  .
                </p>
              </div>
            </div>
            {canAddCustomer ? (
              <AddCustomerButton
                workspaceId={workspace.id}
                actorRole={myRole}
                currentUserId={session.user.id}
                members={assignableMembers}
                convertibleLeads={convertibleLeads}
                canConvertFromLead={canConvertFromLead}
              />
            ) : null}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-gradient-to-br opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.14] ${stat.accent}`}
                />
                <div className="relative flex items-start justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {stat.label}
                  </p>
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br text-white shadow-sm ${stat.accent}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="relative mt-3 text-[22px] font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
                  {stat.value}
                </p>
                {stat.sub ? (
                  <p className="relative mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    {stat.sub}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Status distribution */}
        {totalCount > 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="relative grid h-7 w-7 place-items-center overflow-hidden rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
                  />
                  <Users className="relative h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
                    Customers by status
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
                    {totalCount} total{" "}
                    {totalCount === 1 ? "customer" : "customers"}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              {statusDistribution
                .filter((s) => s.count > 0)
                .map((s) => {
                  const pct = (s.count / totalCount) * 100;
                  return (
                    <div
                      key={s.status}
                      className={cn(
                        "h-full first:rounded-l-full last:rounded-r-full transition-all",
                        CUSTOMER_STATUS_DOT_CLASS[s.status],
                      )}
                      style={{ width: `${pct}%` }}
                      title={`${CUSTOMER_STATUS_LABEL[s.status]}: ${s.count}`}
                    />
                  );
                })}
            </div>
            <ul className="mt-3.5 grid grid-cols-3 gap-x-4 gap-y-1.5">
              {statusDistribution.map((s) => (
                <li
                  key={s.status}
                  className="flex items-center gap-1.5 text-[11.5px]"
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      CUSTOMER_STATUS_DOT_CLASS[s.status],
                    )}
                  />
                  <span className="truncate text-zinc-500 dark:text-zinc-400">
                    {CUSTOMER_STATUS_LABEL[s.status]}
                  </span>
                  <span className="ml-auto font-medium tabular-nums text-zinc-700 dark:text-zinc-200">
                    {s.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <CustomersToolbar
          members={assignableMembers.map(({ id, name }) => ({ id, name }))}
          currentUserId={session.user.id}
          showAssigneeFilter={canViewAllCustomers(myRole)}
        />

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                {customers.length}{" "}
                {customers.length === 1 ? "customer" : "customers"}
              </h2>
              {customers.length > 0 ? (
                <span className="inline-flex h-5 items-center rounded-full bg-zinc-100 px-2 text-[10.5px] font-medium tabular-nums text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  Newest first
                </span>
              ) : null}
            </div>
          </div>

          {customers.length === 0 ? (
            <div className="relative overflow-hidden">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-secondary/[0.04] dark:from-primary/[0.08] dark:to-secondary/[0.06]"
              />
              <div className="relative flex flex-col items-center px-5 py-14 text-center">
                <span className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"
                  />
                  <UserPlus className="relative h-6 w-6" />
                </span>
                <p className="mt-4 text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                  No customers match these filters.
                </p>
                <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {canAddCustomer
                    ? "Clear filters from the toolbar above, or add your first customer to get started."
                    : "Clear filters from the toolbar above to see customers."}
                </p>
                {canAddCustomer ? (
                  <div className="mt-5">
                    <AddCustomerButton
                      workspaceId={workspace.id}
                      actorRole={myRole}
                      currentUserId={session.user.id}
                      members={assignableMembers}
                      convertibleLeads={convertibleLeads}
                      canConvertFromLead={canConvertFromLead}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {customers.map((customer) => {
                const customerId = customer._id.toString();
                const assignedToId = customer.assignedTo
                  ? String(customer.assignedTo)
                  : null;
                const assignee = assignedToId
                  ? userById.get(assignedToId)
                  : null;
                const canEdit = canManageCustomer(
                  myRole,
                  session.user.id,
                  assignedToId,
                );

                const status = customer.status as CustomerStatus;
                const source = customer.source as LeadSource;
                const hasBilling = Boolean(
                  customer.billingAddress?.line1 ||
                    customer.billingAddress?.city ||
                    customer.gstin ||
                    customer.pan,
                );

                const defaultsForEdit: CustomerFormDefaults = {
                  name: customer.name,
                  email: customer.email ?? "",
                  phone: customer.phone ?? "",
                  company: customer.company ?? "",
                  jobTitle: customer.jobTitle ?? "",
                  website: customer.website ?? "",
                  city: customer.address?.city ?? "",
                  state: customer.address?.state ?? "",
                  country: customer.address?.country ?? "",
                  billingLine1: customer.billingAddress?.line1 ?? "",
                  billingLine2: customer.billingAddress?.line2 ?? "",
                  billingCity: customer.billingAddress?.city ?? "",
                  billingState: customer.billingAddress?.state ?? "",
                  billingCountry: customer.billingAddress?.country ?? "",
                  billingPostalCode:
                    customer.billingAddress?.postalCode ?? "",
                  gstin: customer.gstin ?? "",
                  pan: customer.pan ?? "",
                  status,
                  source,
                  assignedTo: assignedToId ?? "",
                  tags: (customer.tags ?? []).join(", "),
                };

                const notesForEdit: CustomerFormNote[] = (customer.notes ?? [])
                  .slice()
                  .reverse()
                  .map((n, idx) => {
                    const authorId = String(n.author);
                    return {
                      id: `${customerId}-note-${idx}`,
                      body: n.body,
                      authorName:
                        userById.get(authorId)?.name ?? "Unknown",
                      createdAt: timeAgo(n.createdAt as Date),
                    };
                  });

                const historyEntries: HistoryEntry[] = (
                  customer.activity ?? []
                )
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.at as Date).getTime() -
                      new Date(a.at as Date).getTime(),
                  )
                  .map((a, idx) => {
                    const actor = userById.get(String(a.actor));
                    const actorName = actor?.name ?? "Someone";
                    const type = a.type as CustomerActivityType;
                    const data =
                      (a.data as Record<string, unknown> | undefined) ?? {};
                    const at = new Date(a.at as Date);
                    return {
                      id: `${customerId}-act-${idx}`,
                      type,
                      actorName,
                      actorInitial:
                        actorName.trim().charAt(0).toUpperCase() || "?",
                      at: timeAgo(at),
                      atAbs: formatAbsoluteDateTime(at),
                      summary: buildActivitySummary(type, data, userById),
                      body:
                        type === "note_added"
                          ? (data.body as string | undefined)
                          : undefined,
                    };
                  });

                return (
                  <li
                    key={customerId}
                    className={cn(
                      "group relative px-5 py-4 pl-6 transition-colors before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:content-[''] hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30",
                      STATUS_ACCENT_BORDER[status],
                    )}
                  >
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="relative shrink-0">
                        <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-secondary text-[14px] font-semibold text-white shadow-sm shadow-primary/20">
                          <span
                            aria-hidden
                            className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
                          />
                          <span className="relative">
                            {customer.name.charAt(0).toUpperCase()}
                          </span>
                        </span>
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="truncate text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                            {customer.name}
                          </p>
                          {customer.company ? (
                            <p className="inline-flex items-center gap-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
                              <Building2 className="h-3 w-3" />
                              {customer.company}
                              {customer.jobTitle
                                ? ` · ${customer.jobTitle}`
                                : ""}
                            </p>
                          ) : null}
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-zinc-500 dark:text-zinc-400">
                          {customer.email ? (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <a
                                href={`mailto:${customer.email}`}
                                className="hover:text-zinc-800 dark:hover:text-zinc-200"
                              >
                                {customer.email}
                              </a>
                            </span>
                          ) : null}
                          {customer.phone ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <a
                                href={`tel:${customer.phone}`}
                                className="hover:text-zinc-800 dark:hover:text-zinc-200"
                              >
                                {customer.phone}
                              </a>
                            </span>
                          ) : null}
                          <span>Source: {LEAD_SOURCE_LABEL[source]}</span>
                          {hasBilling ? (
                            <span className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500">
                              <Receipt className="h-3 w-3" />
                              Billing on file
                            </span>
                          ) : null}
                        </div>

                        {(customer.tags ?? []).length > 0 ? (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {(customer.tags ?? []).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10.5px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                              >
                                <Tag className="h-2.5 w-2.5" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
                            CUSTOMER_STATUS_BADGE_CLASS[status],
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              CUSTOMER_STATUS_DOT_CLASS[status],
                            )}
                          />
                          {CUSTOMER_STATUS_LABEL[status]}
                        </span>
                        {customer.convertedFromLead ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/25">
                            From lead
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 text-[11.5px] dark:border-zinc-800">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-zinc-500 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1.5">
                          <UserCircle2 className="h-3.5 w-3.5" />
                          {assignee ? (
                            <>
                              <span className="text-zinc-700 dark:text-zinc-300">
                                {assignee.name}
                              </span>
                              {assignee.id === session.user.id ? (
                                <span className="text-zinc-400 dark:text-zinc-500">
                                  (you)
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <span className="italic">Unassigned</span>
                          )}
                        </span>

                        <span>
                          Added {timeAgo(new Date(customer.createdAt as Date))}
                        </span>

                        {(customer.notes?.length ?? 0) > 0 ? (
                          <span className="text-zinc-400 dark:text-zinc-500">
                            {customer.notes!.length}{" "}
                            {customer.notes!.length === 1 ? "note" : "notes"}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <HistoryButton
                          customerName={customer.name}
                          entries={historyEntries}
                        />
                        {canEdit ? (
                          <>
                            <EditCustomerButton
                              workspaceId={workspace.id}
                              customerId={customerId}
                              customerName={customer.name}
                              defaults={defaultsForEdit}
                              notes={notesForEdit}
                              members={assignableMembers}
                              currentUserId={session.user.id}
                              actorRole={myRole}
                            />
                            {fullManager ? (
                              <RemoveCustomerButton
                                workspaceId={workspace.id}
                                customerId={customerId}
                                customerName={customer.name}
                              />
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
