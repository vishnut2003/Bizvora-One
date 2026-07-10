"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import Button from "@/components/button";
import type { UserRole } from "@/lib/user";
import {
  createLead,
  generateLeadNote,
  type LeadActionState,
} from "../actions";
import LeadFormPopup, {
  EMPTY_LEAD_DEFAULTS,
  type LeadFormMember,
} from "./lead-form-popup";

export default function AddLeadButton({
  workspaceId,
  actorRole,
  currentUserId,
  members,
}: {
  workspaceId: string;
  actorRole: UserRole;
  currentUserId: string;
  members: LeadFormMember[];
}) {
  const [open, setOpen] = useState(false);

  const defaults = {
    ...EMPTY_LEAD_DEFAULTS,
    assignedTo:
      actorRole === "sales_executive" ? currentUserId : "",
  };

  const handleSubmit = async (formData: FormData, state: LeadActionState) => {
    return createLead(workspaceId, state, formData);
  };

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="h-3.5 w-3.5" />
        Add lead
      </Button>

      <LeadFormPopup
        open={open}
        onOpenChange={setOpen}
        mode="create"
        defaults={defaults}
        members={members}
        currentUserId={currentUserId}
        actorRole={actorRole}
        onSubmit={handleSubmit}
        onGenerateNote={(input) => generateLeadNote(workspaceId, input)}
      />
    </>
  );
}
