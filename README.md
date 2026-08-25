# Lead Leak Diagnostic

A self-facing ROI diagnostic tool for Tubalcain Ads Enterprise's own client acquisition. Same qualify-and-route pattern as the 9-gate homeowner qualifier, pointed at solar installers: it quantifies what unqualified leads and wasted site visits are costing them every month, then routes qualified installers to the 30-in-30 offer page.

Built from `Tubalcain-Lead-Leak-Diagnostic-Spec.docx` — read that document for the reasoning behind every question, formula, and branch. This repo is the working implementation of that spec.

**Live structure:** 10 questions → calculating animation → personalised result (3-bucket monthly loss breakdown) → branch-specific call to action (offer page, waitlist, or soft path).

---

## Files

| File | Purpose |
|---|---|
| `index.html` | All screens (intro, 10 questions, calculating, result) |
| `styles.css` | Full stylesheet — matches the existing Tubalcain brand system (navy `#001B3D`, blue `#0081CC`) |
| `config.js` | **Every editable value** — cities, price bands, calculation assumptions, webhook URL. Edit here first. |
| `calculator.js` | Pure calculation logic (no DOM) — the three-bucket formula and branch logic |
| `app.js` | Screen flow, rendering, validation, webhook submission |

No build step. No framework. No dependencies beyond the Inter font from Google Fonts. Open `index.html` in a browser and it runs.

---

## Before you deploy — required setup

### 1. Set the webhook URL

Open `config.js` and set:

```js
webhookUrl: "https://hook.us1.make.com/xxxxxxxxxxxxxxxxxxxxx"
```

**This must be a separate webhook or Make.com scenario from the one used for homeowner-to-installer routing.** This tool's submissions are Tubalcain's own sales leads — they go to Tubalcain's CRM, not to a client installer. Mixing the two pipelines will send your prospecting data into a client-facing scenario.

Until this is set, the tool works fully in the browser but submissions are not sent anywhere — check your browser's Network tab locally to confirm the payload shape before going live (see "Payload shape" below).

### 2. Set your Meta Pixel and GA4

This campaign targets installers, not homeowners, and should be tracked separately from every other Tubalcain page. Add your pixel/GA4 snippets to the `<head>` of `index.html`, using dedicated IDs for this tool — not the homeowner qualifier's IDs and not the offer page's IDs.

### 3. Review the city list

`config.js` → `cities` array. Each city has a `status`:

- `"open"` — territory available, routes to Branch A (full offer)
- `"taken"` — served city, currently held by another installer, routes to Branch B (waitlist)
- `"unserved"` — not on your served list, routes to Branch C (expansion waitlist)

**Update this whenever a territory changes hands.** It is the single most important thing to keep current — an installer routed to Branch A for a city that's actually taken will apply for an offer page. Note: this deploy included the existing `taken` status for Port Harcourt and Warri per your last update — check that both are still accurate before launch, since I don't have a live read on your current territory sheet.

### 4. Review the calculation defaults

`config.js` → `calc` object:

```js
calc: {
  defaultWastedVisitCost: 23000,      // used if Q7 is left blank
  daysPerMonth: 30,                    // Q3 daily spend × this
  unqualifiedClickRate: 0.60,          // assumed % of ad spend wasted
  opportunityCaptureRate: 0.15         // conservative % of unreached leads assumed winnable
}
```

These are stated as estimates on the result screen, never as measured facts — see the disclaimer line at the bottom of the result screen. Once real submissions come in, revisit `opportunityCaptureRate` and `unqualifiedClickRate` against what installers tell you in follow-up conversations; they're conservative starting points, not fixed constants.

### 5. Set the WhatsApp number in the branch panels

`app.js` → search for `2348029234994` (three places, in `renderBranchPanel`). This is currently set to the installer-facing number used elsewhere in your system. Confirm it's the right one for this tool before launch — you may want a distinct number to keep this funnel's replies separate from existing installer support traffic.

---

## Deploying to GitHub Pages

Same pattern as your other tools (`pay-per-lead`, `8-gate`, `C-code`):

1. Create a new repository — e.g. `lead-leak-diagnostic`.
2. Push all five files in this folder to the repository root (or to a subfolder if you want it under an existing repo, matching your `C-code/offer-v2` pattern).
3. In repo Settings → Pages, set the source to the branch and folder containing `index.html`.
4. Your live URL will be `https://<username>.github.io/<repo-name>/` (or with a subpath, if nested).

No other configuration needed — it's a static site.

---

## Payload shape sent to the webhook

```json
{
  "tool": "lead-leak-diagnostic",
  "submittedAt": "2026-08-25T10:00:00.000Z",
  "city": "lagos-mainland",
  "monthlyLeads": 25,
  "dailyAdSpend": 3000,
  "runsAds": true,
  "siteVisitsPerMonth": 12,
  "signedJobsPerMonth": 3,
  "avgJobValue": 2000000,
  "wastedVisitCostInput": null,
  "capacityBand": "c2",
  "paymentOptions": "full-range",
  "name": "Adewale",
  "businessName": "Wale Solar Solutions",
  "whatsapp": "08031234567",
  "branch": "A",
  "result": {
    "wastedVisitsCost": 207000,
    "wastedAdSpendCost": 54000,
    "opportunityCost": 3900000,
    "totalMonthly": 4161000,
    "totalAnnual": 49932000
  }
}
```

Route this into a Make.com scenario that logs it to a sheet and, ideally, fires an instant WhatsApp or email alert to you for Branch A submissions — those are hot leads and worth a fast follow-up, same principle as the 24-hour contact window built into the GreenerAfrik SLA.

---

## Testing before launch

The calculation logic has been verified against several scenarios (typical installer, no-ads installer, unserved city, and the edge case where signed jobs exceed site visits — which shouldn't happen in honest data entry but is handled safely regardless). Before sending traffic:

1. Open `index.html` directly in a mobile browser (not just resized desktop) and complete the full flow.
2. Submit one test entry for each branch (A/B/C/D) by choosing an open city, a taken city, "somewhere else," and a low-capacity band respectively — confirm each shows the right panel and CTA.
3. Confirm the webhook payload arrives correctly once `webhookUrl` is set.
4. Check the WhatsApp deep links open correctly on both Android and iOS.

## What this does NOT include (by design, per the spec)

- No backend, database, or admin panel — all state lives in the browser during the session and is sent once, on submission, to your webhook.
- No A/B testing or multivariate logic — one flow, one set of copy.
- No follow-up automation — that lives in your Make.com scenario and the WhatsApp AI Agent knowledge base, not in this tool.
