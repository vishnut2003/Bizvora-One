import { CalendarPlus, IdCard, ShieldCheck, UserPlus, Users } from "lucide-react";
import { format } from "date-fns";
import mongoose from "mongoose";
import Workspace from "@/models/workspace";
import User from "@/models/user";
import {
  ROLE_BADGE_CLASS,
  ROLE_LABEL,
  USER_ROLES,
  type UserRole,
} from "@/lib/user";
import { timeAgo } from "@/lib/time";
import {
  DistributionList,
  EmptyRow,
  SectionCard,
  type StatTile,
} from "./overview-widgets";
import { SecondaryStatStrip, StatGrid } from "./executive-overview";

export default async function HrOverview({
  workspaceId,
}: {
  workspaceId: string;
}) {
  // The workspace doc holds the membership map. Fetch it fresh + pull
  // user details for each member so we can show roles, names, and join times.
  const workspace = await Workspace.findById(workspaceId)
    .select({ owner: 1, members: 1 })
    .lean();

  if (!workspace) return null;

  const ws = workspace as unknown as {
    owner: { toString(): string };
    members?: Array<{ user: { toString(): string }; role: UserRole; _id?: { toString(): string } }>;
  };

  const memberRows = ws.members ?? [];

  const memberIds = [String(ws.owner), ...memberRows.map((m) => String(m.user))];
  const uniqueIds = Array.from(new Set(memberIds));
  const users = (await User.find({ _id: { $in: uniqueIds } })
    .select({ name: 1, email: 1, image: 1, createdAt: 1 })
    .lean()) as unknown as Array<{
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    image?: string | null;
    createdAt: Date;
  }>;
  const userById = new Map(users.map((u) => [String(u._id), u]));

  // Role distribution including the owner.
  const roleCounts: Record<UserRole, number> = USER_ROLES.reduce(
    (acc, r) => ({ ...acc, [r]: 0 }),
    {} as Record<UserRole, number>,
  );
  roleCounts.owner += 1;
  for (const m of memberRows) {
    if ((USER_ROLES as readonly string[]).includes(m.role)) {
      roleCounts[m.role] += 1;
    }
  }

  const totalCount = uniqueIds.length;

  // Recent additions: members sorted by user createdAt descending.
  const recentMembers = [...memberRows]
    .map((m) => {
      const u = userById.get(String(m.user));
      return u
        ? {
            id: String(m.user),
            name: u.name ?? u.email ?? "Member",
            email: u.email,
            image: u.image ?? null,
            role: m.role,
            joinedAt: u.createdAt,
          }
        : null;
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime())
    .slice(0, 8);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = users.filter((u) => u.createdAt >= monthStart).length;

  const tiles: StatTile[] = [
    {
      label: "Team size",
      value: String(totalCount),
      hint: `${memberRows.length} members + owner`,
      icon: Users,
      accent: "from-violet-500 to-purple-700",
      href: `/workspace/${workspaceId}/users`,
    },
    {
      label: "Roles in use",
      value: String(
        USER_ROLES.filter((r) => roleCounts[r] > 0).length,
      ),
      hint: "Distinct role types",
      icon: ShieldCheck,
      accent: "from-blue-500 to-indigo-700",
    },
    {
      label: "Joined this month",
      value: String(newThisMonth),
      hint: format(monthStart, "MMMM yyyy"),
      icon: CalendarPlus,
      accent: "from-emerald-500 to-teal-600",
    },
    {
      label: "Admins + owner",
      value: String(roleCounts.owner + roleCounts.admin),
      hint: "Full-access teammates",
      icon: IdCard,
      accent: "from-amber-500 to-orange-600",
    },
  ];

  return (
    <>
      <StatGrid tiles={tiles} />

      <SecondaryStatStrip
        items={[
          {
            label: "Sales team",
            value: String(roleCounts.sales_manager + roleCounts.sales_executive),
            icon: Users,
          },
          { label: "Accounts", value: String(roleCounts.accounts), icon: Users },
          {
            label: "Project team",
            value: String(roleCounts.project_manager + roleCounts.team_member),
            icon: Users,
          },
          { label: "HR", value: String(roleCounts.hr), icon: Users },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <SectionCard
            icon={ShieldCheck}
            title="Role distribution"
            subtitle="Members by role across the workspace"
            accent="from-violet-500 to-purple-700"
          >
            <DistributionList
              rows={USER_ROLES.map((r) => ({
                label: ROLE_LABEL[r],
                count: roleCounts[r],
                color: ROLE_DOT[r] ?? "bg-zinc-400",
              }))}
              empty="No team members yet."
            />
          </SectionCard>
        </div>

        <div className="lg:col-span-3">
          <SectionCard
            icon={UserPlus}
            title="Newest teammates"
            subtitle="Most recently added members"
            accent="from-emerald-500 to-teal-600"
            actionLabel="Open users"
            actionHref={`/workspace/${workspaceId}/users`}
          >
            {recentMembers.length === 0 ? (
              <EmptyRow>No members yet besides you.</EmptyRow>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {recentMembers.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 px-5 py-3 text-[13px]"
                  >
                    {m.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.image}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
                      />
                    ) : (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-[11px] font-semibold text-white">
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                        {m.name}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                        {m.email}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider ${ROLE_BADGE_CLASS[m.role]}`}
                    >
                      {ROLE_LABEL[m.role]}
                    </span>
                    <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">
                      {timeAgo(m.joinedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}

const ROLE_DOT: Record<UserRole, string> = {
  owner: "bg-primary",
  admin: "bg-zinc-700 dark:bg-zinc-300",
  sales_manager: "bg-blue-500",
  sales_executive: "bg-emerald-500",
  accounts: "bg-amber-500",
  hr: "bg-rose-500",
  project_manager: "bg-indigo-500",
  team_member: "bg-slate-500",
};
