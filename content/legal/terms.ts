import { BRAND, OPERATOR_NOTE, LEGAL_ENTITY, PRODUCT_DESC, CONTACT } from "./_shared";

export const termsContent = `
${OPERATOR_NOTE}

These Terms of Service ("Terms") govern your access to and use of ${BRAND}, ${PRODUCT_DESC}. By creating an account or using the service you agree to these Terms. If you are accepting on behalf of an organisation, you represent that you are authorised to bind it.

## 1. The service

${BRAND} is a multi-tenant, cloud-based business management platform. We may add, change, or remove features over time. We provide the service on a subscription or contracted basis as agreed with you.

## 2. Accounts and eligibility

You must provide accurate registration details, keep your credentials secure, and are responsible for all activity under your account. You must be capable of forming a binding contract under applicable law. Workspace owners and admins control access for their team members.

## 3. Acceptable use

You agree to use the service only for lawful purposes and in line with our [Acceptable Use Policy](/acceptable-use). You must not misuse the platform — including using its calling and messaging features in violation of anti-spam, telemarketing, or do-not-call laws.

## 4. Customer data and ownership

As between you and us, **you own the data you and your team enter into the service** ("Customer Data"), including your leads, customers, vendors, employees, and transaction records. You grant us a limited licence to host and process Customer Data solely to provide and support the service. Our processing of personal data within Customer Data is governed by our [Privacy Policy](/privacy) and [Data Processing Agreement](/dpa). You are responsible for having a lawful basis to provide that data to us.

## 5. Our intellectual property

The service, including its software, design, and trademarks, is owned by ${LEGAL_ENTITY} and its licensors. These Terms grant you a non-exclusive, non-transferable right to use the service during your subscription; no other rights are granted.

## 6. AI features

The service includes AI-assisted features (proposal drafting and automated voice calling). AI output may be inaccurate and should be reviewed before use or reliance. You are responsible for how you use AI output and for obtaining any consents required for automated calls. See our [AI & Automated-Calling Disclosure](/ai-disclosure).

## 7. Fees and billing

Pricing is provided on a contract or invoice basis. Unless otherwise agreed in an order or invoice, fees are payable in advance and are exclusive of applicable taxes (including GST). Late or unpaid amounts may result in suspension.

## 8. Third-party services

The service integrates with third parties (for example, email, storage, calling, and AI providers). Your use of those integrations may be subject to their own terms, and we are not responsible for third-party services.

## 9. Confidentiality

Each party will protect the other's confidential information and use it only as needed to perform under these Terms.

## 10. Warranties and disclaimers

The service is provided "as is" and "as available". To the maximum extent permitted by law, we disclaim all implied warranties, including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the service will be uninterrupted or error-free.

## 11. Limitation of liability

To the maximum extent permitted by law, neither party is liable for indirect, incidental, special, or consequential damages, and our aggregate liability arising out of or relating to the service is limited to the amounts you paid to us for the service in the twelve months preceding the claim.

## 12. Suspension and termination

We may suspend or terminate access for breach of these Terms, non-payment, or to protect the service or other users. You may stop using the service at any time. On termination, your right to use the service ends; export and deletion of Customer Data is handled as described in the [DPA](/dpa).

## 13. Changes to the Terms

We may update these Terms from time to time. Material changes will be notified through the service or by email. Continued use after changes take effect constitutes acceptance.

## 14. Governing law

These Terms are governed by the laws of India, and the courts at Noida, Uttar Pradesh, India will have exclusive jurisdiction, without prejudice to any mandatory local consumer protections that apply to you.

## 15. Contact

Questions about these Terms: **${CONTACT.supportEmail}**.
`;
