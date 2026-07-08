// Curated content for the public Help center (/help).
// Edit copy here — the page renders straight from these two exports.

import type { ReactNode } from "react";
import {
  BookOpen,
  CreditCard,
  LifeBuoy,
  PlugZap,
  ShieldCheck,
} from "lucide-react";
import type { FaqItem } from "@/components/faq-accordion";
import { BRAND, CONTACT } from "@/content/legal/_shared";

export type HelpTopic = {
  title: string;
  description: string;
  /** Real destination — a route, an in-page anchor, or a mailto: link. */
  href: string;
  icon: ReactNode;
};

export const helpTopics: HelpTopic[] = [
  {
    title: "Documentation",
    description: "Setup guides and how-tos for getting the most out of your CRM.",
    href: "/docs",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    title: "Integrations",
    description: "Connect Meta Ads, Google Ads, and web forms so leads flow in automatically.",
    href: "/docs/integrations",
    icon: <PlugZap className="h-5 w-5" />,
  },
  {
    title: "Account & security",
    description: "Signing in, resetting your password, roles, and per-workspace data isolation.",
    href: "#faq",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    title: "Plans & pricing",
    description: "One plan with every feature — see what's included and how to get started.",
    href: "/#pricing",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    title: "Contact support",
    description: `Can't find an answer? Email our team at ${CONTACT.supportEmail}.`,
    href: `mailto:${CONTACT.supportEmail}`,
    icon: <LifeBuoy className="h-5 w-5" />,
  },
];

export const helpFaqs: FaqItem[] = [
  {
    q: "What is a workspace?",
    a: `A workspace is your isolated tenant in ${BRAND} — your customers, leads, projects, vouchers, and employees all live inside it. You can run more than one workspace from the same account, and nothing leaks across them.`,
  },
  {
    q: "How do I sign in?",
    a: `You can sign in with Google or with your email and password. Create your account at /signup, then spin up a workspace in a few minutes.`,
  },
  {
    q: "I forgot my password — how do I reset it?",
    a: "On the login page, click “Forgot password?”. We email a 6-digit verification code to your address; enter it, then set a new password. The code is valid for 10 minutes. If you originally signed up with Google, setting a password simply adds email/password as a second way to sign in.",
  },
  {
    q: "How do I add teammates and set their roles?",
    a: "An Owner, Admin, or HR user adds teammates from Settings → Users by entering their name, email, and role (you can also pick an existing account). The new member is emailed to let them know they’ve been added. There are eight roles: Owner, Admin, Sales Manager, Sales Executive, Accounts, HR, Project Manager, and Team Member — each gets a tailored sidebar and access.",
  },
  {
    q: "What’s included in BizvoraOne?",
    a: "Everything, in one workspace: Customers & CRM, Leads & Prospects, AI Proposals and Quotations, Projects (with tasks, milestones, files, and a calendar), Tally-style Accounts (sales orders, invoices, receipts, payment recovery, purchase orders, payments, and vendors), and HR with Payroll. There are no locked modules or add-on tiers.",
  },
  {
    q: "How do integrations work?",
    a: "Integrations are per-workspace and use your own credentials — you bring your own app keys, and they’re stored encrypted on your workspace. Today you can connect Meta Ads (Facebook & Instagram Lead Ads), Google Ads Lead Forms, and a generic Web Form for lead capture, plus an AI Voice Agent (via Vapi). Set them up under Settings → Integrations.",
  },
  {
    q: "What can AI Proposals do?",
    a: "Describe a deal and let AI draft a polished proposal or quotation for you. Refine it conversationally in chat until it reads right, then export a branded PDF — all linked to the customer it belongs to. It’s built on Anthropic’s Claude.",
  },
  {
    q: "How much does it cost?",
    a: `${BRAND} is one plan with every feature — no tiers, no locked modules. To talk through pricing for your team, get in touch at ${CONTACT.supportEmail}.`,
  },
  {
    q: "Is my data really isolated per workspace?",
    a: "Yes. Every record is scoped to a workspace ID at the data layer, and access checks run on every request, so one workspace can never see another’s data.",
  },
  {
    q: "How do I report a bug or request a feature?",
    a: `Once you’re signed in, use “Send feedback” in the sidebar to send us a Bug, Idea, or other note — our team reviews every one. You can also email us any time at ${CONTACT.supportEmail}.`,
  },
];
