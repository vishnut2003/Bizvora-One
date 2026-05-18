"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import Button from "@/components/button";
import Input from "@/components/input";
import Popup from "@/components/popup";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { USER_ROLES, type UserRole } from "@/lib/user";
import { updateEmployee, type UpdateEmployeeState } from "../actions";

const assignableRoles = USER_ROLES.filter((r) => r !== "owner");

const roleLabel: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  sales_manager: "Sales Manager",
  sales_executive: "Sales Executive",
  accounts: "Accounts",
  hr: "HR",
};

type EditEmployeeButtonProps = {
  workspaceId: string;
  employee: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  isSelf: boolean;
};

export default function EditEmployeeButton({
  workspaceId,
  employee,
  isSelf,
}: EditEmployeeButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(employee.name);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(employee.role);
  const [state, setState] = useState<UpdateEmployeeState>(undefined);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      formRef.current?.reset();
      setName(employee.name);
      setPassword("");
      setRole(employee.role);
      setState(undefined);
    }
    setOpen(next);
  };

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateEmployee(
        workspaceId,
        employee.id,
        state,
        formData,
      );
      if (result?.ok) {
        handleOpenChange(false);
      } else {
        setState(result);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${employee.name}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-white"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      <Popup open={open} onOpenChange={handleOpenChange}>
        <div className="px-6 pb-2 pt-6">
          <DialogTitle className="text-[17px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
            Edit employee
          </DialogTitle>
          <DialogDescription className="mt-1 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            Update {employee.name}&apos;s details. Leave the password blank to
            keep it unchanged.
          </DialogDescription>
        </div>

        <form ref={formRef} action={formAction} className="px-6 pb-6 pt-4">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="edit-employee-name"
                className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300"
              >
                Full name
              </label>
              <Input
                id="edit-employee-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                autoComplete="off"
                required
                aria-invalid={state?.errors?.name ? true : undefined}
                className={cn(
                  "mt-2",
                  state?.errors?.name &&
                    "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500",
                )}
              />
              {state?.errors?.name ? (
                <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                  {state.errors.name}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="edit-employee-email"
                className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300"
              >
                Email
              </label>
              <Input
                id="edit-employee-email"
                value={employee.email}
                readOnly
                disabled
                className="mt-2 cursor-not-allowed opacity-70"
              />
              <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-500">
                Email cannot be changed here.
              </p>
            </div>

            <div>
              <label
                htmlFor="edit-employee-password"
                className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300"
              >
                New password
              </label>
              <Input
                id="edit-employee-password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                autoComplete="new-password"
                minLength={8}
                aria-invalid={state?.errors?.password ? true : undefined}
                className={cn(
                  "mt-2",
                  state?.errors?.password &&
                    "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500",
                )}
              />
              {state?.errors?.password ? (
                <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                  {state.errors.password}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="edit-employee-role"
                className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300"
              >
                Role
              </label>
              <select
                id="edit-employee-role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={isSelf}
                aria-invalid={state?.errors?.role ? true : undefined}
                className={cn(
                  "mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100",
                  state?.errors?.role &&
                    "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500",
                )}
              >
                {assignableRoles.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel[r]}
                  </option>
                ))}
              </select>
              {isSelf ? (
                <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-500">
                  You can&apos;t change your own role.
                </p>
              ) : null}
              {state?.errors?.role ? (
                <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                  {state.errors.role}
                </p>
              ) : null}
            </div>
          </div>

          {state?.formError ? (
            <p
              role="alert"
              className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {state.formError}
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
              type="submit"
              variant="primary"
              size="sm"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Popup>
    </>
  );
}
