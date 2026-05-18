"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { UserRole } from "@/lib/user";
import { updateLead, type LeadActionState } from "../actions";
import LeadFormPopup, {
  type LeadFormDefaults,
  type LeadFormMember,
  type LeadFormNote,
} from "./lead-form-popup";

export default function EditLeadButton({
  workspaceId,
  leadId,
  leadName,
  defaults,
  notes,
  members,
  currentUserId,
  actorRole,
}: {
  workspaceId: string;
  leadId: string;
  leadName: string;
  defaults: LeadFormDefaults;
  notes: LeadFormNote[];
  members: LeadFormMember[];
  currentUserId: string;
  actorRole: UserRole;
}) {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (formData: FormData, state: LeadActionState) => {
    return updateLead(workspaceId, leadId, state, formData);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${leadName}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-white"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      <LeadFormPopup
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        defaults={defaults}
        notes={notes}
        members={members}
        currentUserId={currentUserId}
        actorRole={actorRole}
        onSubmit={handleSubmit}
      />
    </>
  );
}
