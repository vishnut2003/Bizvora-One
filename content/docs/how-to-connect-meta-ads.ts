import { BRAND } from "../legal/_shared";

export const howToConnectMetaAdsContent = `
When someone taps your Facebook or Instagram Lead Ad and submits the instant form, ${BRAND} creates the lead in your workspace automatically — usually within a few seconds. No spreadsheets, no CSV exports, no third-party connectors like Zapier.

This guide walks you through the one-time setup from start to finish. It takes about 15 minutes.

## How it works

${BRAND} connects to Meta through **your own Meta app**. You create a free app in the Meta developer portal, hand its credentials to ${BRAND}, and sign in with Facebook to pick your business Page. From then on:

1. Meta notifies your workspace's private webhook the moment a Lead Ads form is submitted.
2. ${BRAND} securely fetches the full submission from Meta and creates the lead with source **Meta Ads** and the tag \`meta-ads\`.
3. If you've enabled the AI voice agent, it can call the new lead right away (test leads are skipped).

Because the app belongs to you, your leads flow directly from Meta to your workspace — no shared credentials with other companies.

## Before you start

You'll need:

- **Owner or Admin** role in your ${BRAND} workspace (the Integrations page is restricted to these roles).
- **Admin access to the Facebook Page** that runs (or will run) your Lead Ads.
- A **Meta developer account** — sign up free at [developers.facebook.com](https://developers.facebook.com) with the same Facebook account that manages your Page.

## Step 1 — Create your Meta app

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) and click **Create App**.
2. Choose **Business** as the app type, give it a name (e.g. "Acme CRM Connector"), and create it.
3. From the app dashboard, add two products: **Facebook Login for Business** and **Webhooks**.

> Keep this browser tab open — you'll switch between the Meta dashboard and ${BRAND} during setup.

## Step 2 — Save the app credentials in BizvoraOne

1. In the Meta dashboard, open **App settings → Basic** and copy the **App ID** and **App Secret** (click *Show* to reveal the secret).
2. In ${BRAND}, go to **Workspace Settings → Integrations** and expand the **Meta Ads** card.
3. Paste the App ID and App Secret and click **Save credentials**.

Your App Secret is encrypted before it is stored and is never shown again in the UI. After saving, the card reveals two values you'll need in the next steps: your workspace's **Webhook callback URL** and **Webhook verify token**.

## Step 3 — Add the OAuth redirect URI

1. In the Meta dashboard, open **Facebook Login → Settings**.
2. In **Valid OAuth Redirect URIs**, paste the redirect URI shown in the Meta Ads card's setup guide (it ends with \`/api/integrations/meta-ads/oauth/callback\`).
3. Save the changes.

This tells Meta it's allowed to send you back to ${BRAND} after you sign in with Facebook.

## Step 4 — Configure the webhook

1. In the Meta dashboard, open **Webhooks** and select the **Page** object from the dropdown.
2. Click **Subscribe to this object** and enter:
   - **Callback URL** — the *Webhook callback URL* from your Meta Ads card (unique to your workspace).
   - **Verify token** — the *Webhook verify token* from the same card (use the copy button).
3. Confirm. Meta immediately pings the URL to verify it; if the token matches, the subscription is accepted.
4. In the Page object's field list, find **leadgen** and click **Subscribe**.

> If Meta says the callback URL couldn't be verified, double-check that you copied the verify token exactly and that your credentials were saved in Step 2 first.

## Step 5 — Connect with Facebook

1. Back in the ${BRAND} Meta Ads card, click **Connect with Facebook**.
2. Sign in with the Facebook account that manages your Page and approve the requested permissions (they let ${BRAND} list your Pages and retrieve leads — nothing else).
3. If you manage a single Page it is connected automatically. If you manage several, pick the one that runs your Lead Ads and click **Connect this page**.

The card now shows the connected account, the Page name, and live counters for leads received.

> A Facebook Page can be connected to only one ${BRAND} workspace at a time. If you see "already connected to another workspace", disconnect it there first.

## Step 6 — Send a test lead

1. Open Meta's [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing).
2. Select your Page and a form, then click **Create lead**.
3. Within a few seconds the lead appears in your **Leads** section, tagged \`test\`, and the card's **Leads received** counter increments.

Test leads never trigger the AI voice agent, so it's safe to test as often as you like. If you re-send the same test lead, ${BRAND} recognises the duplicate and skips it.

## What a Meta lead looks like in your CRM

- **Source** is set to **Meta Ads**, so you can filter and report on them separately from Google Ads or website leads.
- **Standard fields** (name, email, phone, company, job title, city, state, country, website) are mapped automatically from the form.
- **Custom questions** you added to the form are saved as a **note** on the lead, so nothing is lost.
- **Tags** include \`meta-ads\`, plus \`test\` for test submissions.
- **Duplicates are impossible** — every Meta lead carries a unique ID, and redelivered events are ignored.
- If your workspace has the **AI voice agent** enabled, it calls real (non-test) leads as soon as they arrive.

## Managing the connection

| Action | Where | What happens |
| --- | --- | --- |
| Pause / Resume | Meta Ads card | While paused, incoming leads are dropped (not queued). Resume to start receiving again. |
| Update app credentials | Meta Ads card | Rotate the App Secret any time. Changing the App **ID** resets the connection and you'll reconnect with Facebook. |
| Disconnect | Meta Ads card | Unsubscribes your Page and deletes the stored tokens. Existing leads stay in your CRM. |
| Reconnect | Banner in the card | If Facebook revokes access (password change, permission removal), the card shows a reconnect banner — one click restores the flow. |

## Going live: Meta App Review

While your Meta app is in **Development Mode**, the connection works only for people who have a role on the app (admin, developer, or tester). That is perfectly fine — and usually all you need — for connecting **your own** Page.

If you plan to switch the app to **Live Mode**, Meta requires [App Review](https://developers.facebook.com/docs/app-review) and business verification for the \`leads_retrieval\` permission. Most ${BRAND} customers never need this: keep the app in Development Mode and add teammates as app admins if required.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| "The URL couldn't be validated" when saving the webhook | Verify token mismatch, or credentials not saved yet | Re-copy the verify token from the card; make sure Step 2 is done first |
| Redirect error after clicking Connect with Facebook | OAuth redirect URI missing in the Meta app | Complete Step 3 exactly as shown in the card's setup guide |
| "We couldn't find any Facebook Pages" | Signed in with an account that doesn't manage the Page | Reconnect using the Facebook account with Page admin access |
| "Page already connected to another workspace" | The Page is linked elsewhere | Disconnect it in the other workspace, then retry |
| Test lead doesn't arrive | *leadgen* field not subscribed, or integration paused | Check Step 4's field subscription and the card's status pill |
| "Facebook revoked our access" banner | Password change or permission removal on Facebook | Click **Reconnect with Facebook** in the card |

## Security notes

- Your App Secret and all access tokens are stored **encrypted (AES-256-GCM)** — never in plain text.
- Every webhook delivery is **cryptographically verified** against your app's signature before it is processed; unsigned or tampered requests are discarded.
- Your webhook URL is unique to your workspace, and its verify token acts as a shared secret with Meta.
- Disconnecting removes the stored tokens and unsubscribes your Page from lead events.

Need help? Reach us at [support@bizvoraone.com](mailto:support@bizvoraone.com) — we're happy to walk through the setup with you.
`;
