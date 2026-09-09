/**
 * TUBALCAIN — LEAD LEAK DIAGNOSTIC
 * Analytics module. Wraps GA4 (gtag) and Meta Pixel (fbq) behind one
 * interface so every event fires to both platforms consistently.
 *
 * RULE: never pass name, business name, or WhatsApp number into any event
 * parameter. Both GA4 and Meta prohibit sending PII in plaintext event
 * params — only categorical/numeric business metrics (city, branch,
 * severity, naira values) are ever tracked here.
 *
 * Both gtag and fbq are loaded in the <head> before this file runs (GTM,
 * Meta Pixel, and GA4 snippets). Every call below is defensive — if either
 * script is blocked (ad blocker, consent tool, slow network), tracking
 * fails silently and never breaks the diagnostic itself.
 */

const Analytics = (function () {
  "use strict";

  function safeGtag(name, params) {
    try {
      if (typeof gtag === "function") gtag("event", name, params || {});
    } catch (e) { /* tracking must never break the app */ }
  }

  function safeFbq(name, params, isCustom) {
    try {
      if (typeof fbq === "function") fbq(isCustom ? "trackCustom" : "track", name, params || {});
    } catch (e) { /* tracking must never break the app */ }
  }

  return {
    /** Fired once, when the person taps "Start the diagnostic". */
    diagnosticStart() {
      safeGtag("diagnostic_start", { engagement_time_msec: 1 });
      safeFbq("StartDiagnostic", {}, true); // no Meta standard event fits "started a quiz/tool"
    },

    /**
     * Fired every time a question screen becomes visible — gives a full
     * funnel in GA4 (Explore > Funnel exploration) showing exactly which
     * question people abandon on, without needing a separate "answered"
     * event for drop-off analysis. GA4 only; too granular to be useful
     * on the Meta Pixel side, and firing 10 Meta events per session dilutes
     * the signal Meta's delivery algorithm optimises against.
     */
    stepView(stepName, stepNumber) {
      safeGtag("diagnostic_step", { step_name: stepName, step_number: stepNumber });
    },

    /**
     * Fired once contact details are validated and accepted, before the
     * calculating animation runs. This is the real conversion moment — a
     * usable WhatsApp number now exists — so it carries the estimated
     * value and fires Meta's standard "Lead" event, which is what the ad
     * account's delivery and bidding actually optimise against.
     */
    leadCaptured({ branch, city, totalMonthlyLoss, marketingConsent }) {
      safeGtag("generate_lead", {
        currency: "NGN",
        value: totalMonthlyLoss,
        branch: branch,
        city: city,
        marketing_consent: !!marketingConsent
      });
      safeFbq("Lead", {
        currency: "NGN",
        value: totalMonthlyLoss,
        content_name: "lead_leak_diagnostic",
        content_category: branch
      });
    },

    /**
     * Fired when the result report finishes rendering. Distinct from
     * leadCaptured because a person could theoretically capture as a lead
     * but close the tab during the calculating animation — this confirms
     * they actually saw their number.
     */
    resultViewed({ branch, city, diagnosisType, severity, totalMonthlyLoss }) {
      safeGtag("view_result", {
        currency: "NGN",
        value: totalMonthlyLoss,
        branch: branch,
        city: city,
        diagnosis_type: diagnosisType,
        severity: severity
      });
      safeFbq("ViewContent", {
        currency: "NGN",
        value: totalMonthlyLoss,
        content_name: "lead_leak_result",
        content_category: branch
      });
    },

    /**
     * Fired on every branch-panel CTA click. Branch A goes to the offer
     * page — real purchase intent, tracked as Meta's InitiateCheckout.
     * Branches B/C/D go to a WhatsApp waitlist/soft-path link — tracked
     * as Meta's Contact, its standard event for exactly this action.
     */
    ctaClick({ branch, destinationType, totalMonthlyLoss }) {
      safeGtag("select_content", {
        content_type: "cta",
        branch: branch,
        destination_type: destinationType
      });
      if (destinationType === "offer_page") {
        safeFbq("InitiateCheckout", { currency: "NGN", value: totalMonthlyLoss, content_category: branch });
      } else {
        safeFbq("Contact", { content_category: branch });
      }
    },

    /** Fired when someone restarts the diagnostic from the result screen. */
    restart() {
      safeGtag("diagnostic_restart", {});
    }
  };
})();
