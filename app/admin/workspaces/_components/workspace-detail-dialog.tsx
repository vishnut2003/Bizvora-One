"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import { Clock, ExternalLink, History, User as UserIcon, Users } from "lucide-react";
import Button from "@/components/button";
import Popup from "@/components/popup";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/time";
import {
  WORKSPACE_STATUS_BADGE_CLASS,
  WORKSPACE_STATUS_LABEL,
  type WorkspaceColor,
  type WorkspaceStatus,
} from "@/lib/workspace";
import { ROLE_BADGE_CLASS, ROLE_LABEL, type UserRole } from "@/lib/user";
import WorkspaceStatusSelect from "./workspace-status-select";
import WorkspaceMaxMembers from "./workspace-max-members";

const swatch: Record<WorkspaceColor, string> = {
  violet: "bg-gradient-to-br from-violet-500 to-purple-700",
  fuchsia: "bg-gradient-to-br from-fuchsia-500 to-pink-700",
  blue: "bg-gradient-to-br from-blue-500 to-indigo-700",
  emerald: "bg-gradient-to-br from-emerald-500 to-teal-700",
  amber: "bg-gradient-to-br from-amber-500 to-orange-700",
  rose: "bg-gradient-to-br from-rose-500 to-red-700",
};

export type WorkspaceMemberDetail = {
  name: string;
  email: string;
  role: UserRole;
};

export type WorkspaceDetail = {
  id: string;
  name: string;
  description: string;
  color: WorkspaceColor;
  status: WorkspaceStatus;
  ownerName: string;
  ownerEmail: string;
  memberCount: number;
  maxMembers: number | null;
  members: WorkspaceMemberDetail[];
  createdAt: string;
  updatedAt: string;
};

function Meta({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/30">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="mt-1 truncate text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
      {sub ? (
        <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

export default function WorkspaceDetailDialog({
  workspace,
}: {
  workspace: WorkspaceDetail;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Open
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>

      <Popup
        open={open}
        onOpenChange={setOpen}
        header={
          <DialogHeader className="px-6 pt-6">
            <div className="flex items-start gap-3.5">
              <span
                className={cn(
                  "relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl text-[16px] font-semibold text-white shadow-sm",
                  swatch[workspace.color],
                )}
              >
                {workspace.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-[17px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                  {workspace.name}
                </DialogTitle>
                <span
                  className={cn(
                    "mt-1.5 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                    WORKSPACE_STATUS_BADGE_CLASS[workspace.status],
                  )}
                >
                  {WORKSPACE_STATUS_LABEL[workspace.status]}
                </span>
              </div>
            </div>
          </DialogHeader>
        }
      >
        <div className="space-y-5 px-6 pb-6 pt-4">
          {workspace.description ? (
            <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              {workspace.description}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2.5">
            <Meta
              icon={UserIcon}
              label="Owner"
              value={workspace.ownerName}
              sub={workspace.ownerEmail}
            />
            <Meta
              icon={Users}
              label="Members"
              value={`${workspace.memberCount}`}
            />
            <Meta
              icon={Clock}
              label="Created"
              value={timeAgo(workspace.createdAt)}
            />
            <Meta
              icon={History}
              label="Updated"
              value={timeAgo(workspace.updatedAt)}
            />
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Members
            </p>
            {workspace.members.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-zinc-500 dark:text-zinc-400">
                No members.
              </p>
            ) : (
              <div className="mt-2 max-h-48 divide-y divide-zinc-100 overflow-y-auto rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {workspace.members.map((m) => (
                  <div
                    key={m.email}
                    className="flex items-center gap-2.5 px-3 py-2"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-[11px] font-semibold text-white">
                      {(m.name || m.email).charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-zinc-900 dark:text-zinc-100">
                        {m.name || m.email}
                      </p>
                      <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                        {m.email}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                        ROLE_BADGE_CLASS[m.role],
                      )}
                    >
                      {ROLE_LABEL[m.role]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100">
                Status
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                Activate, suspend, or reject this workspace.
              </p>
            </div>
            <WorkspaceStatusSelect
              workspaceId={workspace.id}
              status={workspace.status}
            />
          </div>

          <div className="flex items-start justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100">
                Member limit
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                Cap how many members this workspace can have.
              </p>
            </div>
            <WorkspaceMaxMembers
              workspaceId={workspace.id}
              maxMembers={workspace.maxMembers}
              memberCount={workspace.memberCount}
            />
          </div>
        </div>
      </Popup>
    </>
  );
}
