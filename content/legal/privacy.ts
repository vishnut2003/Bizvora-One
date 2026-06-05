import { BRAND, OPERATOR_NOTE, CONTACT, SUBPROCESSORS_TABLE } from "./_shared";

export const privacyContent = `
${OPERATOR_NOTE}

${BRAND} respects your privacy. This Privacy Policy explains what personal data we collect, why we collect it, how we use and share it, and the rights available to you. It is designed to comply with India's Digital Personal Data Protection Act, 2023 ("DPDP Act") and the Information Technology (Reasonable Security Practices) Rules, 2011, and — for customers and individuals in other regions — the EU/UK General Data Protection Regulation ("GDPR") and the California Consumer Privacy Act as amended ("CCPA/CPRA").

## Who this policy covers

- **Account users** — people who register for and use ${BRAND} (workspace owners, admins, and team members).
- **Business contacts** — leads, customers, vendors, and employees whose details our account users store in the platform. For this data our account users are the data fiduciary/controller and we act as a data processor on their behalf (see "Data we process on behalf of customers").

## Data we collect

**Account & identity data:** name, work email, hashed password, profile image, Google account identifier (if you sign in with Google), email-verification status.

**Workspace & business data:** company legal/display name, address, website, phone, and business identifiers you choose to enter such as GSTIN, PAN, CIN, IFSC, bank account, and UPI ID.

**Usage & device data:** log data, IP address, browser type, and actions taken in the app, used for security and to operate the service.

**Cookies:** strictly necessary cookies for authentication and session management. See our [Cookie Policy](/cookies).

## Data we process on behalf of customers

When you use ${BRAND}, you may store information about your own leads, customers, vendors, and employees — including names, contact details, company information, tax identifiers (e.g. GSTIN/PAN), notes, activity history, salary and payroll details, and transaction records. We process this data only to provide the service to you and under your instructions, as further described in our [Data Processing Agreement](/dpa).

## How we use your data

- To create and operate your account and workspace.
- To provide the platform's features (CRM, projects, accounting, HR/payroll, AI proposals, AI voice calling).
- To send transactional communications (verification, invitations, assignment and notification emails).
- To secure the service, prevent abuse, and comply with legal obligations.
- To improve and support the product.

**Legal bases (GDPR):** performance of a contract, our legitimate interests in operating and securing the service, your consent (where required, e.g. certain cookies or marketing), and compliance with legal obligations.

## Automated calling and AI features

${BRAND} can place **outbound AI voice calls** to leads via our sub-processor and uses AI to draft sales proposals. AI-driven calls identify themselves as automated, honour do-not-call requests, and may be recorded where lawful. See our [AI & Automated-Calling Disclosure](/ai-disclosure).

## Sharing and sub-processors

We do not sell your personal data. We share data with the vetted sub-processors below, strictly to operate the service:

${SUBPROCESSORS_TABLE}

The current list is maintained on our [Sub-processors](/subprocessors) page. We may also disclose data where required by law or to protect our rights.

## International transfers

Some sub-processors are located outside India and the EEA. Where we transfer personal data internationally, we rely on appropriate safeguards such as Standard Contractual Clauses and equivalent measures.

## Data retention

We retain personal data for as long as your account is active and as needed to provide the service, then for the period required to meet legal, tax, and accounting obligations, after which it is deleted or anonymised. Customer-controlled data is retained and deleted per the [DPA](/dpa).

## Security

We apply reasonable technical and organisational safeguards, including encryption in transit, hashing of passwords (bcrypt), role-based access controls, and tenant isolation. See our [Security](/security) page. No method of transmission or storage is completely secure.

## Your rights

Depending on your location, you may have the right to access, correct, update, delete, or port your personal data, to withdraw consent, to nominate another individual to exercise rights (under the DPDP Act), and to object to or restrict certain processing. California residents may exercise rights to know, delete, correct, and opt out of "sharing" as defined under CPRA. To exercise any right, contact us using the details below. You may also lodge a complaint with the Data Protection Board of India or your local supervisory authority.

## Grievance Officer (India)

In accordance with the DPDP Act and the IT Rules, 2011, you may contact our Grievance Officer:

- **Name:** ${CONTACT.grievanceOfficer}
- **Email:** ${CONTACT.grievanceEmail}
- **Address:** ${CONTACT.registeredAddress}

We will acknowledge and address grievances within the timelines required by applicable law.

## Children

The service is intended for business use and is not directed at children. We do not knowingly collect personal data from children.

## Changes to this policy

We may update this policy from time to time. Material changes will be notified through the service or by email, and the "Last updated" date above will change.

## Contact us

Questions about this policy or your data: **${CONTACT.privacyEmail}** or **${CONTACT.supportEmail}**.
`;
