/**
 * TUBALCAIN — LEAD LEAK DIAGNOSTIC
 * Configuration file. Edit values here — never in app.js or index.html.
 *
 * This mirrors the two-layer config pattern used across Tubalcain's other
 * instances (see the Rebuild Brief and Ghana Market Entry Spec): one file
 * holding every number, string and list that might change, so the rest of
 * the codebase never needs to be touched for a routine update.
 */

const CONFIG = {

  // ---- Business identity ----
  brandName: "Tubalcain Ads Enterprise",
  offerPageUrl: "https://tubalcainmy.github.io/pay-per-lead/offerv2.html",

  // ---- Founder / consultant identity ----
  // Powers the photo and name shown on the intro, calculating, and result
  // screens — the "personal consultation" framing. Change the photo path
  // if a new headshot is ever used; keep it a real photo, not a stock image.
  founder: {
    name: "Mystery",
    fullName: "Alajayibo Mystery",
    title: "Founder, Tubalcain Ads Enterprise",
    photo: "assets/founder.jpg"
  },

  // ---- Q1: Cities ----
  // status: "open"    -> territory available, Branch A eligible
  // status: "taken"   -> served city, but territory currently held by another installer, Branch B
  // Cities not in this list fall through to "somewhere else" -> Branch C
  cities: [
    { id: "lagos-mainland", label: "Lagos — Mainland / Ikeja", status: "open" },
    { id: "lagos-island",   label: "Lagos — Island / Lekki",   status: "open" },
    { id: "abuja",          label: "Abuja",                     status: "open" },
    { id: "port-harcourt",  label: "Port Harcourt",             status: "taken" },
    { id: "benin-city",     label: "Benin City",                status: "open" },
    { id: "warri",          label: "Warri",                     status: "taken" },
    { id: "ibadan",         label: "Ibadan",                    status: "open" },
    { id: "other",          label: "Somewhere else",            status: "unserved" }
  ],

  // ---- Q2: Monthly lead volume ----
  // Now a typed field, not a band select — see validation.leadVolume
  // (changed from option bands so the report can use the installer's
  // real number rather than a band midpoint)

  // ---- Q6: Average job value ----
  // Now a typed field, not a band select — see validation.jobValue

  // ---- Q8: Monthly install capacity ----
  // Now a typed field, not a band select — see validation.capacity
  // minCapacityForFullOffer: below this, route to Branch D (soft path)
  minCapacityForFullOffer: 4,

  // ---- Q9: Payment options offered ----
  paymentOptions: [
    { id: "full-range", label: "Yes, full range of options" },
    { id: "some",       label: "Some options" },
    { id: "full-only",  label: "Full payment only" },
    { id: "not-sure",   label: "Not sure" }
  ],

  // ---- Input validation ranges ----
  // Every typed numeric field is checked against these bounds before the
  // user can continue. Bounds are sanity checks, not hard business rules —
  // wide enough to admit any real installer, tight enough to catch fat-finger
  // typos (an extra zero, a decimal in the wrong place) before they reach
  // the calculation and produce a nonsense report.
  validation: {
    leadVolume:   { min: 0, max: 1000, label: "monthly leads" },
    dailyAdSpend: { min: 0, max: 1000000, label: "daily ad spend" },
    siteVisits:   { min: 0, max: 1000, label: "site visits" },
    signedJobs:   { min: 0, max: 1000, label: "signed jobs" },
    jobValue:     { min: 100000, max: 50000000, label: "average job value" },
    visitCost:    { min: 0, max: 500000, label: "wasted visit cost" },
    capacity:     { min: 0, max: 300, label: "monthly installations" }
  },

  // ---- Calculation assumptions ----
  // Every one of these is shown to the user on the result screen —
  // never presented as a measured fact, always as a stated estimate.
  calc: {
    defaultWastedVisitCost: 23000,       // ₦8,000 fuel + ₦15,000 technician half-day
    daysPerMonth: 30,                    // Q3 daily spend × this = monthly spend
    unqualifiedClickRate: 0.60,          // proportion of ad spend assumed wasted on unqualified clicks
    opportunityCaptureRate: 0.15         // conservative % of unreached leads assumed winnable with better qualification
  },

  // ---- Contact validation ----
  // Accepts Nigerian numbers: 0XXXXXXXXXX or +234XXXXXXXXXX, spaces/dashes allowed
  phoneRegex: /^(\+?234|0)[789][01]\d{8}$/,

  // ---- Webhook ----
  // Set this to the dedicated Make.com webhook for this tool.
  // MUST be a separate webhook/scenario from the homeowner qualifier's
  // installer-routing webhook — see Section 8 of the build spec.
  webhookUrl: "", // e.g. "https://hook.us1.make.com/xxxxxxxxxxxxxxxxxxxxx"

  // ---- Calculating-screen messages (cycled while the animation runs) ----
  // First-person, framed as the founder personally reviewing the numbers —
  // matches the consultation framing on the intro and result screens.
  calculatingMessages: [
    "Reviewing your numbers…",
    "Working out the wasted visits…",
    "Checking your ad spend…",
    "Cross-checking your funnel…",
    "Writing up your report…"
  ],

  // ---- Program cost, for the comparison chart on the result screen ----
  // All-in month-one cost of the 30-in-30 programme: ₦150,000 deposit + 30 × ₦5,000.
  // Shown against the installer's own monthly loss figure.
  programMonthlyCost: 300000,
  programName: "the 30-in-30 Verified Buyer Programme",

  // ---- Severity bands ----
  // Tier is determined by how many "average jobs worth" of value is leaking
  // each month (total monthly loss ÷ average job value). Purely a framing
  // device for the report — never presented as a diagnosis of anything
  // beyond what the installer themselves told us.
  severityBands: [
    { id: "minor",    max: 0.5, label: "Minor Leak",    color: "#1E9E5A" },
    { id: "moderate", max: 1.5, label: "Moderate Leak", color: "#E0A100" },
    { id: "severe",   max: 3,   label: "Severe Leak",   color: "#DC6B1F" },
    { id: "critical", max: Infinity, label: "Critical Leak", color: "#C0392B" }
  ],

  // ---- Problem diagnosis thresholds ----
  // Every installer's leak traces back to one of two root problems (or both):
  // a QUALITY problem (leads arrive but don't convert — price shoppers,
  // window shoppers, people who ask "how much" and vanish) or a VOLUME
  // problem (the funnel converts fine, there just aren't enough leads
  // entering it). These thresholds decide which the installer has.
  diagnosis: {
    goodVisitRate: 0.5,     // 50%+ of leads becoming a visit/quote is healthy
    goodCloseRate: 0.3,     // 30%+ of visits closing is healthy
    lowVolumeLeads: 15      // under this many monthly leads is a volume problem
  }
};
