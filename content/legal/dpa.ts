import { BRAND, OPERATOR_NOTE, LEGAL_ENTITY, CONTACT } from "./_shared";

export const dpaContent = `
${OPERATOR_NOTE}

This Data Processing Agreement ("DPA") forms part of the [Terms of Service](/terms) between you ("Customer", acting as data fiduciary/controller) and ${LEGAL_ENTITY} ("Processor", operating ${BRAND}). It governs our processing of personal data contained in Customer Data on your behalf and is designed to support compliance with India's DPDP Act, 2023 and the EU/UK GDPR.

> This is a template. For a signed DPA, or to add Standard Contractual Clauses for your organisation, contact us at ${CONTACT.privacyEmail}.

## 1. Roles

For personal data you upload or generate in the service about your own leads, customers, vendors, and employees, you are the controller/data fiduciary and we are the processor. We process such personal data only on your documented instructions, which include your use of the service and these Terms.

## 2. Scope and purpose

We process Customer personal data solely to provide, secure, and support the service. We will not use it for our own purposes, and we will not sell it.

## 3. Confidentiality

We ensure that personnel authorised to process personal data are bound by appropriate confidentiality obligations.

## 4. Security measures

We implement reasonable technical and organisational measures appropriate to the risk, as summarised on our [Security](/security) page, including encryption in transit, hashing of credentials, access controls, and tenant isolation.

## 5. Sub-processors

You authorise us to engage the sub-processors listed on our [Sub-processors](/subprocessors) page. We impose data-protection obligations on each sub-processor consistent with this DPA and remain responsible for their performance. We will provide a mechanism to notify you of changes so you may object on reasonable grounds.

## 6. Assistance to the Customer

Taking into account the nature of processing, we will provide reasonable assistance to help you respond to data-subject/data-principal requests and to meet your security, breach-notification, and impact-assessment obligations.

## 7. Personal-data breaches

We will notify you without undue delay after becoming aware of a personal-data breach affecting Customer personal data and provide information reasonably available to help you meet your notification obligations.

## 8. International transfers

Where Customer personal data is transferred internationally, we rely on appropriate safeguards such as Standard Contractual Clauses or equivalent mechanisms.

## 9. Return and deletion

On termination or expiry of the service, and on your request, we will delete or return Customer personal data within a reasonable period, except where retention is required by law.

## 10. Audits

We will make available information reasonably necessary to demonstrate compliance with this DPA and, subject to confidentiality and reasonable notice, allow for audits as required by applicable law.

## Contact

To execute or discuss this DPA: **${CONTACT.privacyEmail}**.
`;
