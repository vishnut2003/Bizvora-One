import Eyebrow from "@/components/eyebrow";
import FaqAccordion, { type FaqItem } from "@/components/faq-accordion";

const faqs: FaqItem[] = [
  {
    q: "What exactly is a workspace?",
    a: "A workspace is your isolated tenant — your customers, deals, projects, vouchers, and employees all live inside it. Invite teammates, assign roles, and nothing leaks across workspaces.",
  },
  {
    q: "How is BizvoraOne different from a regular CRM?",
    a: "Most CRMs stop at deals and contacts. BizvoraOne also ships with Projects, Tally-style Accounts (sales/purchase vouchers, receipts, payments), and HR — all wired together in one workspace.",
  },
  {
    q: "What can the AI Proposals feature actually do?",
    a: "Chat-style proposal drafting. Describe the deal, iterate over messages, and export a polished PDF — without leaving the customer record. Built on Anthropic's Claude.",
  },
  {
    q: "Which roles are supported out of the box?",
    a: "Eight: Owner, Admin, Sales Manager, Sales Executive, Accounts, HR, Project Manager, and Team Member. Each gets a tailored sidebar and dashboard.",
  },
  {
    q: "Can I sign in with Google?",
    a: "Yes — sign up and sign in with Google or email/password.",
  },
  {
    q: "Is my data really isolated per workspace?",
    a: "Yes. Every record is scoped to a workspace ID at the data layer, and access checks run on every request. You can run multiple workspaces from the same account.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="border-b border-zinc-200 py-24 dark:border-zinc-800">
      <div className="mx-auto w-full max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Questions, answered.
          </h2>
          <p className="mt-4 text-balance text-zinc-600 dark:text-zinc-400">
            Still wondering? Reach out — we&apos;ll happily walk you through a
            workspace.
          </p>
        </div>

        <div className="mt-14">
          <FaqAccordion items={faqs} />
        </div>
      </div>
    </section>
  );
}
