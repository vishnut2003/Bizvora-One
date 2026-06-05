import { BRAND, OPERATOR_NOTE, CONTACT } from "./_shared";

export const securityContent = `
${OPERATOR_NOTE}

We take the security of your data seriously. This page summarises the technical and organisational measures we use to protect ${BRAND} and the data it holds. It is a summary, not a binding warranty; our commitments are set out in our [Terms of Service](/terms) and [Data Processing Agreement](/dpa).

## Encryption

- **In transit:** traffic to and from the service is encrypted using TLS/HTTPS.
- **At rest:** data is stored with encryption provided by our hosting and storage providers.
- **Credentials:** account passwords are never stored in plain text — they are hashed using the bcrypt algorithm.

## Access control and tenant isolation

- ${BRAND} is multi-tenant: each workspace's data is logically isolated, and access is scoped to the owning workspace.
- **Role-based access control** restricts what each member can see and do based on their assigned role (owner, admin, sales manager, sales executive, accounts, HR, project manager, and team member).
- Administrative access to production systems is limited to authorised personnel on a need-to-know basis.

## Authentication

- Sign-in supports email/password (with hashed credentials) and Google OAuth.
- Email verification and secure password-reset flows help protect accounts.

## Sensitive integrations

Credentials for connected services (such as AI calling provider keys) are stored encrypted and are not exposed to client browsers. AI proposal and email features run server-side.

## Infrastructure and sub-processors

We rely on reputable infrastructure and service providers. The third parties that may process data on our behalf are listed on our [Sub-processors](/subprocessors) page.

## Backups and availability

We use managed hosting with backup capabilities to support recovery. We continually work to improve resilience and uptime.

## Incident response and breach notification

We maintain processes to detect, investigate, and respond to security incidents. In the event of a personal-data breach, we will notify affected customers and the relevant authorities as required by applicable law, including the DPDP Act and GDPR.

## Reporting a vulnerability

If you believe you have found a security vulnerability, please contact us at **support@bizvoraone.com** so we can investigate. We appreciate responsible disclosure.

## Contact

General security questions: **${CONTACT.supportEmail}**.
`;
