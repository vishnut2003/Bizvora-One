"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, UserPlus, X } from "lucide-react";
import Button from "@/components/button";
import Input from "@/components/input";
import Popup from "@/components/popup";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { assignableRolesFor, ROLE_LABEL, type UserRole } from "@/lib/user";
import {
  addEmployee,
  searchWorkspaceCandidates,
  type AddEmployeeState,
  type WorkspaceCandidate,
} from "../actions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AddEmployeeButton({
  workspaceId,
  actorRole,
}: {
  workspaceId: string;
  actorRole: UserRole;
}) {
  const assignableRoles = assignableRolesFor(actorRole);
  const defaultRole = assignableRoles[0] ?? "sales_executive";

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(defaultRole);

  const [results, setResults] = useState<WorkspaceCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedUser, setSelectedUser] = useState<WorkspaceCandidate | null>(
    null,
  );

  const [state, setState] = useState<AddEmployeeState>(undefined);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const trimmedEmail = email.trim();
  const emailValid = EMAIL_RE.test(trimmedEmail);
  const newMode = !selectedUser && emailValid;

  // Debounced search of the user directory by email (skipped once a user is
  // locked in). Auto-selects when an exact email match comes back.
  useEffect(() => {
    if (selectedUser) return;
    const q = email.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = window.setTimeout(async () => {
      const res = await searchWorkspaceCandidates(workspaceId, q);
      setLoading(false);
      if (res.ok) {
        setResults(res.results);
        const exact = res.results.find(
          (r) => r.email.toLowerCase() === q.toLowerCase(),
        );
        if (exact) {
          setSelectedUser(exact);
          setShowResults(false);
        }
      }
    }, 200);
    return () => window.clearTimeout(handle);
  }, [email, workspaceId, selectedUser]);

  const reset = () => {
    formRef.current?.reset();
    setEmail("");
    setName("");
    setPassword("");
    setRole(defaultRole);
    setResults([]);
    setLoading(false);
    setShowResults(false);
    setSelectedUser(null);
    setState(undefined);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    setOpen(next);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setShowResults(true);
    if (selectedUser && value !== selectedUser.email) {
      setSelectedUser(null);
    }
  };

  const selectCandidate = (c: WorkspaceCandidate) => {
    setSelectedUser(c);
    setEmail(c.email);
    setShowResults(false);
    setResults([]);
    setState(undefined);
  };

  const clearSelection = () => {
    setSelectedUser(null);
    setEmail("");
    setShowResults(false);
  };

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await addEmployee(workspaceId, state, formData);
      if (result?.ok) {
        handleOpenChange(false);
      } else {
        setState(result);
      }
    });
  };

  const effectiveEmail = selectedUser?.email ?? trimmedEmail;
  const canSubmit = Boolean(selectedUser) || emailValid;

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="h-3.5 w-3.5" />
        Add employee
      </Button>

      <Popup open={open} onOpenChange={handleOpenChange}>
        <div className="px-6 pb-2 pt-6">
          <DialogTitle className="text-[17px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
            Add an employee
          </DialogTitle>
          <DialogDescription className="mt-1 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            Search by email to add an existing account, or enter a new email to
            create one.
          </DialogDescription>
        </div>

        <form ref={formRef} action={formAction} className="px-6 pb-6 pt-4">
          <input type="hidden" name="email" value={effectiveEmail} />
          <input type="hidden" name="role" value={role} />

          <div className="space-y-4">
            <div className="relative">
              <label
                htmlFor="employee-email"
                className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300"
              >
                Email
              </label>
              <div className="relative mt-2">
                <Input
                  id="employee-email"
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onFocus={() => {
                    if (!selectedUser) setShowResults(true);
                  }}
                  onBlur={() => {
                    // Delay so a result click registers before hiding.
                    window.setTimeout(() => setShowResults(false), 120);
                  }}
                  placeholder="jane@example.com"
                  required
                  aria-invalid={state?.errors?.email ? true : undefined}
                  className={cn(
                    state?.errors?.email &&
                      "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500",
                  )}
                />
                {loading && !selectedUser ? (
                  <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-zinc-400" />
                ) : null}
              </div>

              {!selectedUser && showResults && results.length > 0 ? (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                  <ul className="max-h-56 overflow-y-auto py-1">
                    {results.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectCandidate(r)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                        >
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-[11px] font-semibold text-white">
                            {(r.name || r.email).charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                              {r.name || r.email}
                            </span>
                            <span className="block truncate text-[11.5px] text-zinc-500 dark:text-zinc-400">
                              {r.email}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {state?.errors?.email ? (
                <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                  {state.errors.email}
                </p>
              ) : null}

              {!selectedUser && !loading && newMode && results.length === 0 ? (
                <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-500">
                  No existing account found — fill in the details below to create
                  one.
                </p>
              ) : null}
            </div>

            {selectedUser ? (
              <div className="flex items-center gap-2.5 rounded-md border border-primary/30 bg-primary/[0.04] px-3 py-2 dark:border-primary/40 dark:bg-primary/10">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-[11px] font-semibold text-white">
                  {(selectedUser.name || selectedUser.email)
                    .charAt(0)
                    .toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-zinc-900 dark:text-zinc-100">
                    {selectedUser.name || selectedUser.email}
                  </p>
                  <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                    Existing account · will be added to this workspace
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearSelection}
                  aria-label="Clear selection"
                  className="shrink-0 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}

            {selectedUser ? (
              <div>
                <label
                  htmlFor="employee-name"
                  className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Full name
                </label>
                <Input
                  id="employee-name"
                  name="name"
                  value={selectedUser.name}
                  readOnly
                  className="mt-2 cursor-not-allowed bg-zinc-50 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300"
                />
              </div>
            ) : newMode ? (
              <>
                <div>
                  <label
                    htmlFor="employee-name"
                    className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Full name
                  </label>
                  <Input
                    id="employee-name"
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
                    htmlFor="employee-password"
                    className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Temporary password
                  </label>
                  <Input
                    id="employee-password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    minLength={8}
                    aria-invalid={state?.errors?.password ? true : undefined}
                    className={cn(
                      "mt-2",
                      state?.errors?.password &&
                        "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500",
                    )}
                  />
                  <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-500">
                    Share it with the employee so they can sign in.
                  </p>
                  {state?.errors?.password ? (
                    <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                      {state.errors.password}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}

            {selectedUser || newMode ? (
              <div>
                <label
                  htmlFor="employee-role"
                  className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Role
                </label>
                <div className="mt-2">
                  <Select
                    value={role}
                    onValueChange={(v) => setRole(v as UserRole)}
                  >
                    <SelectTrigger
                      id="employee-role"
                      invalid={Boolean(state?.errors?.role)}
                    >
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
                {state?.errors?.role ? (
                  <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                    {state.errors.role}
                  </p>
                ) : null}
              </div>
            ) : null}
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
              disabled={pending || !canSubmit}
              aria-busy={pending}
            >
              {pending ? "Adding…" : "Add employee"}
            </Button>
          </div>
        </form>
      </Popup>
    </>
  );
}
