/**
 * TUBALCAIN — LEAD LEAK DIAGNOSTIC
 * Calculation logic. Pure functions — no DOM access here.
 * See "The Lead Leak Diagnostic — Build Spec" Section 4 for the
 * reasoning behind each formula and default.
 */

const Calculator = {

  /**
   * Bucket 1 — Wasted site visits
   * (site visits/quotes) - (signed jobs) = wasted visits
   * wasted visits × cost per wasted visit = monthly cost
   */
  wastedVisits(answers) {
    const visits = Number(answers.q4) || 0;
    const closed = Number(answers.q5) || 0;
    const costPerVisit = answers.q7 && Number(answers.q7) > 0
      ? Number(answers.q7)
      : CONFIG.calc.defaultWastedVisitCost;

    const wastedCount = Math.max(visits - closed, 0);
    const monthlyCost = wastedCount * costPerVisit;

    return {
      wastedCount,
      costPerVisit,
      monthlyCost,
      usedDefault: !(answers.q7 && Number(answers.q7) > 0)
    };
  },

  /**
   * Bucket 2 — Wasted ad spend
   * Only calculated where the installer runs paid ads.
   * daily spend × 30 = monthly spend
   * monthly spend × unqualified click rate = wasted spend
   */
  wastedAdSpend(answers) {
    if (answers.q3_noAds || !answers.q3 || Number(answers.q3) <= 0) {
      return { active: false, dailySpend: 0, monthlySpend: 0, monthlyCost: 0 };
    }
    const dailySpend = Number(answers.q3);
    const monthlySpend = dailySpend * CONFIG.calc.daysPerMonth;
    const monthlyCost = monthlySpend * CONFIG.calc.unqualifiedClickRate;

    return { active: true, dailySpend, monthlySpend, monthlyCost };
  },

  /**
   * Bucket 3 — Opportunity cost
   * (monthly leads) - (site visits/quotes) = leads that never reached a quote
   * that number × capture rate × average job value = monthly opportunity cost
   */
  opportunityCost(answers) {
    const leads = Number(answers.q2) || 0;
    const visits = Number(answers.q4) || 0;
    const jobValue = Number(answers.q6) || 0;

    const unreached = Math.max(leads - visits, 0);
    const winnable = unreached * CONFIG.calc.opportunityCaptureRate;
    const monthlyCost = winnable * jobValue;

    return { unreached, winnable: Math.round(winnable * 10) / 10, monthlyCost };
  },

  /**
   * Full result object combining all three buckets.
   */
  computeResult(answers) {
    const visits = this.wastedVisits(answers);
    const ads = this.wastedAdSpend(answers);
    const opp = this.opportunityCost(answers);

    const total = visits.monthlyCost + ads.monthlyCost + opp.monthlyCost;
    const annual = total * 12;

    return {
      visits,
      ads,
      opp,
      total: Math.round(total),
      annual: Math.round(annual)
    };
  },

  /**
   * Determine which branch (A/B/C/D) the installer falls into.
   * See Build Spec Section 5.
   */
  determineBranch(answers) {
    const city = CONFIG.cities.find(c => c.id === answers.q1);
    const capacity = Number(answers.q8) || 0;
    const fitsCapacity = capacity >= CONFIG.minCapacityForFullOffer;

    if (!city || city.status === "unserved") {
      return "C"; // not yet served
    }
    if (city.status === "taken") {
      return "B"; // territory currently held by another installer
    }
    if (!fitsCapacity) {
      return "D"; // capacity too small for the full offer
    }
    return "A"; // strong fit
  },

  formatNaira(n) {
    n = Math.round(n);
    return "₦" + n.toLocaleString("en-NG");
  },

  /**
   * Severity tier — how many "average jobs worth" of value is leaking
   * per month. Framing device only; always shown alongside the installer's
   * own numbers, never as an independent measurement.
   */
  severity(totalMonthlyLoss, avgJobValue) {
    const jobsWorth = avgJobValue > 0 ? totalMonthlyLoss / avgJobValue : 0;
    const band = CONFIG.severityBands.find((b) => jobsWorth <= b.max) || CONFIG.severityBands[CONFIG.severityBands.length - 1];
    return { jobsWorth, ...band };
  },

  /**
   * Diagnose the root problem: QUALITY, VOLUME, MIXED, or HEALTHY.
   *
   * Quality problem  — leads arrive but don't convert (low visit rate
   *                     and/or low close rate). The "price shopper" signature.
   * Volume problem   — the funnel converts fine, there just aren't
   *                     enough leads entering it in the first place.
   * Mixed            — both are true at once: too few leads, and the
   *                     few that arrive still don't convert well.
   * Healthy          — neither threshold is breached. Rare, but real
   *                     for a well-run funnel with a small underlying leak.
   */
  diagnoseProblem(answers) {
    const leads = Number(answers.q2) || 0;
    const visits = Number(answers.q4) || 0;
    const closed = Number(answers.q5) || 0;
    const t = CONFIG.diagnosis;

    const visitRate = leads > 0 ? visits / leads : 0;
    const closeRate = visits > 0 ? closed / visits : 0;

    const hasQualityProblem = visitRate < t.goodVisitRate || closeRate < t.goodCloseRate;
    const hasVolumeProblem = leads < t.lowVolumeLeads;

    let type;
    if (hasQualityProblem && hasVolumeProblem) type = "mixed";
    else if (hasQualityProblem) type = "quality";
    else if (hasVolumeProblem) type = "volume";
    else type = "healthy";

    return {
      type,
      visitRate,
      closeRate,
      visitRatePct: Math.round(visitRate * 100),
      closeRatePct: Math.round(closeRate * 100),
      leads,
      visits,
      closed
    };
  },

  /**
   * Funnel stages for the visual — leads / site visits / signed jobs,
   * each with a percentage of the top-of-funnel lead count.
   */
  funnelStages(answers) {
    const leads = Number(answers.q2) || 0;
    const visits = Number(answers.q4) || 0;
    const closed = Number(answers.q5) || 0;
    const base = leads > 0 ? leads : 1;
    return [
      { label: "Leads", count: leads, pct: 100 },
      { label: "Site visits / quotes", count: visits, pct: Math.round((visits / base) * 100) },
      { label: "Signed jobs", count: closed, pct: Math.round((closed / base) * 100) }
    ];
  }
};
