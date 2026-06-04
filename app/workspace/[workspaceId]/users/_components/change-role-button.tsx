"use client";

import { useState, useTransition } from "react";
import { UserCog } from "lucide-react";
import Button from "@/components/button";
import Popup from "@/components/popup";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignableRolesFor, ROLE_LABEL, type UserRole } from "@/lib/user";
import { updateEmployeeRole } from "../actions";

type ChangeRoleButtonProps = {
  workspaceId: string;
  actorRole: UserRole;
  employee: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
};

export default function ChangeRoleButton({
  workspaceId,
  actorRole,
  employee,
}: ChangeRoleButtonProps) {
  const assignableRoles = assignableRolesFor(actorRole);

  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(employee.role);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setFormError(undefined);
      setRole(employee.role);
    }
    setOpen(next);
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateEmployeeRole(workspaceId, employee.id, role);
      if (result?.ok) {
        handleOpenChange(false);
      } else {
        setFormError(result?.formError ?? "Couldn't update the role.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Change ${employee.name}'s role`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <UserCog className="h-3.5 w-3.5" />
      </button>

      <Popup open={open} onOpenChange={handleOpenChange}>
        <div className="px-6 pb-2 pt-6">
          <DialogTitle className="text-[17px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
            Change role
          </DialogTitle>
          <DialogDescription className="mt-1 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            Change the workspace role for{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {employee.name}
            </span>{" "}
            ({employee.email}).
          </DialogDescription>
        </div>

        <div className="px-6 pb-6 pt-4">
          <div>
            <label
              htmlFor="change-role-select"
              className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300"
            >
              Role
            </label>
            <div className="mt-2">
              <Select
                value={role}
                onValueChange={(v) => setRole(v as UserRole)}
              >
                <SelectTrigger id="change-role-select">
                  <SelectValue placeholder="Pick a role" />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formError ? (
            <p
              role="alert"
              className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {formError}
            </p>
          ) : null}

          <div className="-mx-6 mt-6 flex items-center justify-end gap-2 border-t border-zinc-100 px-6 pt-4 dark:border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={pending || role === employee.role}
              aria-busy={pending}
            >
              {pending ? "Saving…" : "Save role"}
            </Button>
          </div>
        </div>
      </Popup>
    </>
  );
}
