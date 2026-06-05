import { BRAND, OPERATOR_NOTE, CONTACT } from "./_shared";

export const aiDisclosureContent = `
${OPERATOR_NOTE}

${BRAND} includes artificial-intelligence features. This page explains how they work and the responsibilities that come with using them. It supplements our [Privacy Policy](/privacy), [Terms of Service](/terms), and [Acceptable Use Policy](/acceptable-use).

## AI-assisted sales proposals

The platform can generate draft sales proposals using a third-party AI model (Anthropic's Claude). The prompt content you provide is sent to the AI provider solely to produce the requested output. AI-generated text may contain errors or omissions and should be reviewed and edited before you rely on or send it. You are responsible for the final content.

## Automated (AI) voice calls

The platform can place **outbound voice calls to your leads using an AI voice agent** through our calling sub-processor. When you use this feature:

- **Disclosure:** the AI agent is configured to identify itself as an automated/AI assistant to the person it calls.
- **Do-not-call:** the agent is designed to recognise and honour requests to stop calling and do-not-contact preferences.
- **Recording & consent:** calls may be recorded where permitted. You are responsible for providing any notices and obtaining any consents required by applicable law in the jurisdictions you call.
- **Your responsibility:** you must have a lawful basis to contact each individual and must comply with telemarketing, anti-spam, and privacy laws, as set out in our [Acceptable Use Policy](/acceptable-use).

## Data sent to AI providers

Data sent to AI providers to power these features is processed in accordance with our [Privacy Policy](/privacy) and listed on our [Sub-processors](/subprocessors) page. We do not sell this data.

## Limitations

AI output is probabilistic and may be inaccurate, incomplete, or unsuitable for a given purpose. AI features are tools to assist your team, not a substitute for professional judgement or required human review.

## Contact

Questions about our AI features: **${CONTACT.supportEmail}**.
`;
