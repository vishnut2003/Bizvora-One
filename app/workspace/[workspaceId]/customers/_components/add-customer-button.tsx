"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import Button from "@/components/button";
import { LEAD_SOURCES, type LeadSource } from "@/lib/customer";
import type { UserRole } from "@/lib/user";
import {
  createCustomer,
  createCustomerFromLead,
  type CustomerActionState,
} from "../actions";
import CustomerChooserPopup from "./customer-chooser-popup";
import CustomerFormPopup, {
  EMPTY_CUSTOMER_DEFAULTS,
  type CustomerFormDefaults,
  type CustomerFormMember,
} from "./customer-form-popup";
import LeadPickerPopup, {
  type ConvertibleLead,
} from "./lead-picker-popup";

type Step = "closed" | "chooser" | "lead-picker" | "form";

const SOURCES_SET = new Set<string>(LEAD_SOURCES);

export default function AddCustomerButton({
  workspaceId,
  actorRole,
  currentUserId,
  members,
  convertibleLeads,
}: {
  workspaceId: string;
  actorRole: UserRole;
  currentUserId: string;
  members: CustomerFormMember[];
  convertibleLeads: ConvertibleLead[];
}) {
  const [step, setStep] = useState<Step>("closed");
  const [formDefaults, setFormDefaults] = useState<CustomerFormDefaults>(() => ({
    ...EMPTY_CUSTOMER_DEFAULTS,
    assignedTo: actorRole === "sales_executive" ? currentUserId : "",
  }));
  const [fromLeadId, setFromLeadId] = useState<string | null>(null);
  const [fromLeadName, setFromLeadName] = useState<string | undefined>(
    undefined,
  );

  const openChooser = () => {
    setStep("chooser");
  };

  const pickManual = () => {
    setFromLeadId(null);
    setFromLeadName(undefined);
    setFormDefaults({
      ...EMPTY_CUSTOMER_DEFAULTS,
      assignedTo: actorRole === "sales_executive" ? currentUserId : "",
    });
    setStep("form");
  };

  const pickFromLead = () => {
    setStep("lead-picker");
  };

  const handleLeadPicked = (lead: ConvertibleLead) => {
    const source = SOURCES_SET.has(lead.source)
      ? (lead.source as LeadSource)
      : ("other" as LeadSource);
    const assignedTo =
      actorRole === "sales_executive" ? currentUserId : lead.assignedTo;
    setFromLeadId(lead.id);
    setFromLeadName(lead.name);
    setFormDefaults({
      ...EMPTY_CUSTOMER_DEFAULTS,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      jobTitle: lead.jobTitle,
      website: lead.website,
      city: lead.city,
      state: lead.state,
      country: lead.country,
      source,
      assignedTo,
      tags: lead.tags.join(", "),
    });
    setStep("form");
  };

  const closeAll = () => {
    setStep("closed");
    setFromLeadId(null);
    setFromLeadName(undefined);
  };

  const handleFormOpenChange = (next: boolean) => {
    if (!next) closeAll();
  };

  const handleChooserOpenChange = (next: boolean) => {
    if (!next) closeAll();
  };

  const handleLeadPickerOpenChange = (next: boolean) => {
    if (!next) closeAll();
  };

  const handleSubmit = async (
    formData: FormData,
    state: CustomerActionState,
  ) => {
    if (fromLeadId) {
      return createCustomerFromLead(workspaceId, fromLeadId, state, formData);
    }
    return createCustomer(workspaceId, state, formData);
  };

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={openChooser}
      >
        <UserPlus className="h-3.5 w-3.5" />
        Add customer
      </Button>

      <CustomerChooserPopup
        open={step === "chooser"}
        onOpenChange={handleChooserOpenChange}
        onPickManual={pickManual}
        onPickFromLead={pickFromLead}
        fromLeadDisabled={convertibleLeads.length === 0}
        fromLeadDisabledReason="No unconverted leads available to convert."
      />

      <LeadPickerPopup
        open={step === "lead-picker"}
        onOpenChange={handleLeadPickerOpenChange}
        leads={convertibleLeads}
        onPick={handleLeadPicked}
        onBack={() => setStep("chooser")}
      />

      <CustomerFormPopup
        open={step === "form"}
        onOpenChange={handleFormOpenChange}
        mode="create"
        defaults={formDefaults}
        members={members}
        currentUserId={currentUserId}
        actorRole={actorRole}
        fromLeadName={fromLeadName}
        onSubmit={handleSubmit}
      />
    </>
  );
}
