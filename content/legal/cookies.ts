import { BRAND, OPERATOR_NOTE, CONTACT } from "./_shared";

export const cookiesContent = `
${OPERATOR_NOTE}

This Cookie Policy explains how ${BRAND} uses cookies and similar technologies. It should be read together with our [Privacy Policy](/privacy).

## What are cookies?

Cookies are small text files stored on your device when you visit a website. They are widely used to make websites work, to keep you signed in, and to remember preferences.

## Cookies we use

${BRAND} currently uses only **strictly necessary cookies** required to operate the service. We do not use advertising cookies, and we do not sell information collected through cookies.

| Cookie | Purpose | Type | Retention |
| --- | --- | --- | --- |
| Authentication / session (set by our auth provider, NextAuth) | Keeps you securely signed in and protects against request forgery | Strictly necessary | Session / short-lived |
| Security & CSRF tokens | Protects forms and authenticated requests | Strictly necessary | Session |

If we introduce analytics or marketing cookies in future, we will update this page and, where required, request your consent through a cookie banner before such cookies are set.

## Managing cookies

Because the cookies we use are strictly necessary for the service to function (for example, to keep you logged in), disabling them in your browser may prevent the service from working correctly. You can control or delete cookies through your browser settings.

## Changes

We may update this Cookie Policy as our use of cookies changes. The "Last updated" date above reflects the latest revision.

## Contact

Questions about cookies: **${CONTACT.privacyEmail}**.
`;
