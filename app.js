/**
 * TUBALCAIN — LEAD LEAK DIAGNOSTIC
 * App controller. Handles screen flow, rendering options from CONFIG,
 * validation, calculation trigger, and result rendering.
 */

(function () {
  "use strict";

  const FLOW = ["intro", "q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10", "calc", "result"];
  const QUESTION_SCREENS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"];

  let currentIndex = 0;
  let answers = {};

  const el = (id) => document.getElementById(id);
  const screenEl = (name) => document.getElementById("screen-" + name);

  function showScreen(name) {
    FLOW.forEach((s) => {
      const node = screenEl(s);
      if (!node) return;
      node.hidden = s !== name;
    });
    updateProgress(name);
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  function updateProgress(name) {
    const qIndex = QUESTION_SCREENS.indexOf(name);
    let pct = 0;
    if (name === "intro") pct = 0;
    else if (qIndex >= 0) pct = ((qIndex + 1) / QUESTION_SCREENS.length) * 92;
    else if (name === "calc") pct = 96;
    else if (name === "result") pct = 100;
    el("progressFill").style.width = pct + "%";
  }

  function goTo(name) {
    currentIndex = FLOW.indexOf(name);
    showScreen(name);
  }

  function next() {
    currentIndex += 1;
    showScreen(FLOW[currentIndex]);
  }

  // ---------- Option rendering (single-select cards) ----------
  function renderOptions(containerId, items, labelKey, onSelect) {
    const container = el(containerId);
    container.innerHTML = "";
    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "option";
      btn.type = "button";
      btn.innerHTML = `<span>${item[labelKey]}</span><span class="opt-arrow">→</span>`;
      btn.addEventListener("click", () => onSelect(item, btn, container));
      container.appendChild(btn);
    });
  }

  function selectSingle(container, btn) {
    Array.from(container.children).forEach((c) => c.classList.remove("selected"));
    btn.classList.add("selected");
  }

  // ---------- Shared numeric field validator ----------
  // Validates a typed number field against CONFIG.validation bounds, with
  // an optional cross-field ceiling (e.g. site visits can't exceed leads).
  // Shows an inline error and blocks Continue until the value is valid.
  function bindNumberField(opts) {
    const input = el(opts.inputId);
    const error = el(opts.errorId);
    const btn = el(opts.btnId);
    const rules = CONFIG.validation[opts.rule];

    input.value = "";
    error.hidden = true;
    input.classList.remove("input-error");

    function showError(msg) {
      error.textContent = msg;
      error.hidden = false;
      input.classList.add("input-error");
    }
    function clearError() {
      error.hidden = true;
      input.classList.remove("input-error");
    }

    function validate() {
      const raw = input.value.trim();

      if (opts.allowEmptyDefault && raw === "") {
        clearError();
        return { valid: true, value: 0 };
      }
      if (raw === "") {
        showError(`Please enter your ${rules.label}.`);
        return { valid: false };
      }
      const val = Number(raw);
      if (!Number.isFinite(val) || /[^0-9.]/.test(raw)) {
        showError("Numbers only, please — no letters or symbols.");
        return { valid: false };
      }
      if (val < rules.min) {
        showError(`${capitalize(rules.label)} can't be negative.`);
        return { valid: false };
      }
      if (val > rules.max) {
        showError(`That seems too high — check the number and try again.`);
        return { valid: false };
      }
      const ceiling = opts.getCeiling ? opts.getCeiling() : null;
      if (ceiling !== null && val > ceiling.value) {
        showError(`Can't be more than your ${ceiling.label} (${ceiling.value}).`);
        return { valid: false };
      }
      clearError();
      return { valid: true, value: val };
    }

    // Live feedback: clear the error as soon as the field looks valid again.
    input.addEventListener("input", () => {
      if (!error.hidden) validate();
    });

    btn.onclick = () => {
      const result = validate();
      if (!result.valid) { input.focus(); return; }
      answers[opts.answerKey] = result.value;
      next();
    };
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------- Q1: City ----------
  function initQ1() {
    renderOptions("q1-options", CONFIG.cities, "label", (item, btn, container) => {
      selectSingle(container, btn);
      answers.q1 = item.id;
      setTimeout(next, 220);
    });
  }

  // ---------- Q2: Lead volume ----------
  function initQ2() {
    bindNumberField({ inputId: "q2-input", errorId: "q2-error", btnId: "q2-next", rule: "leadVolume", answerKey: "q2" });
  }

  // ---------- Q3: Daily ad spend ----------
  function initQ3() {
    const input = el("q3-input");
    const error = el("q3-error");
    const checkbox = el("q3-noads");
    input.value = "";
    checkbox.checked = false;
    input.disabled = false;
    error.hidden = true;
    input.classList.remove("input-error");

    checkbox.onchange = () => {
      input.disabled = checkbox.checked;
      if (checkbox.checked) { input.value = ""; error.hidden = true; input.classList.remove("input-error"); }
    };

    el("q3-next").onclick = () => {
      if (checkbox.checked) {
        answers.q3 = 0;
        answers.q3_noAds = true;
        next();
        return;
      }
      const rules = CONFIG.validation.dailyAdSpend;
      const raw = input.value.trim();
      if (raw === "" || /[^0-9.]/.test(raw)) {
        error.textContent = raw === "" ? "Please enter your typical daily spend, or tick the box above." : "Numbers only, please.";
        error.hidden = false; input.classList.add("input-error"); input.focus();
        return;
      }
      const val = Number(raw);
      if (val < rules.min || val > rules.max) {
        error.textContent = "That seems too high — check the number and try again.";
        error.hidden = false; input.classList.add("input-error"); input.focus();
        return;
      }
      error.hidden = true; input.classList.remove("input-error");
      answers.q3 = val;
      answers.q3_noAds = false;
      next();
    };
  }

  // ---------- Q4: Site visits ----------
  function initQ4() {
    bindNumberField({
      inputId: "q4-input", errorId: "q4-error", btnId: "q4-next", rule: "siteVisits", answerKey: "q4",
      getCeiling: () => (answers.q2 != null ? { value: answers.q2, label: "monthly leads" } : null)
    });
  }

  // ---------- Q5: Close rate ----------
  function initQ5() {
    bindNumberField({
      inputId: "q5-input", errorId: "q5-error", btnId: "q5-next", rule: "signedJobs", answerKey: "q5",
      getCeiling: () => (answers.q4 != null ? { value: answers.q4, label: "site visits" } : null)
    });
  }

  // ---------- Q6: Job value ----------
  function initQ6() {
    bindNumberField({ inputId: "q6-input", errorId: "q6-error", btnId: "q6-next", rule: "jobValue", answerKey: "q6" });
  }

  // ---------- Q7: Wasted visit cost (optional — defaults if left blank) ----------
  function initQ7() {
    bindNumberField({
      inputId: "q7-input", errorId: "q7-error", btnId: "q7-next", rule: "visitCost", answerKey: "q7",
      allowEmptyDefault: true
    });
  }

  // ---------- Q8: Capacity ----------
  function initQ8() {
    bindNumberField({ inputId: "q8-input", errorId: "q8-error", btnId: "q8-next", rule: "capacity", answerKey: "q8" });
  }

  // ---------- Q9: Payment options ----------
  function initQ9() {
    renderOptions("q9-options", CONFIG.paymentOptions, "label", (item, btn, container) => {
      selectSingle(container, btn);
      answers.q9 = item.id;
      setTimeout(next, 220);
    });
  }

  // ---------- Q10: Contact ----------
  function initQ10() {
    const nameInput = el("q10-name");
    const bizInput = el("q10-business");
    const waInput = el("q10-whatsapp");
    const errorEl = el("q10-error");
    [nameInput, bizInput, waInput].forEach((i) => (i.value = ""));
    errorEl.hidden = true;

    el("q10-submit").onclick = () => {
      const name = nameInput.value.trim();
      const biz = bizInput.value.trim();
      const wa = waInput.value.trim().replace(/[\s-]/g, "");

      if (!name || !biz || !CONFIG.phoneRegex.test(wa)) {
        errorEl.hidden = false;
        return;
      }
      errorEl.hidden = true;
      answers.q10_name = name;
      answers.q10_business = biz;
      answers.q10_whatsapp = wa;

      runCalculation();
    };
  }

  // ---------- Calculating screen ----------
  function runCalculation() {
    goTo("calc");
    const line = el("calcLine");
    let i = 0;
    const messages = CONFIG.calculatingMessages;
    line.textContent = messages[0];
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      line.style.opacity = 0;
      setTimeout(() => {
        line.textContent = messages[i];
        line.style.opacity = 1;
      }, 200);
    }, 650);

    setTimeout(() => {
      clearInterval(interval);
      const result = Calculator.computeResult(answers);
      const branch = Calculator.determineBranch(answers);
      submitToWebhook(answers, result, branch);
      renderResult(result, branch);
      goTo("result");
    }, 2200);
  }

  // ---------- Live-typing effect ----------
  // Reveals HTML content character-by-character, but consumes any HTML tag
  // atomically (never freezes mid-tag) — used for the diagnosis and verdict
  // text so the report feels hand-written in real time rather than dumped
  // on screen instantly. Respects prefers-reduced-motion.
  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function typeHTML(target, html, opts) {
    opts = opts || {};
    if (prefersReducedMotion()) {
      target.innerHTML = html;
      if (opts.onDone) opts.onDone();
      return;
    }
    const charsPerTick = opts.charsPerTick || 2;
    const tickMs = opts.tickMs || 14;
    target.innerHTML = "";
    let i = 0;
    const len = html.length;

    function tick() {
      let budget = charsPerTick;
      while (budget > 0 && i < len) {
        if (html[i] === "<") {
          const close = html.indexOf(">", i);
          if (close === -1) { i = len; break; }
          i = close + 1; // whole tag consumed instantly — never split a tag mid-reveal
        } else {
          i++;
          budget--;
        }
      }
      target.innerHTML = html.slice(0, i) + '<span class="type-cursor"></span>';
      if (i < len) {
        setTimeout(tick, tickMs);
      } else {
        target.innerHTML = html; // drop the cursor once done
        if (opts.onDone) opts.onDone();
      }
    }
    tick();
  }

  // ---------- Result rendering ----------
  function renderResult(result, branch) {
    const fmt = Calculator.formatNaira;

    renderReportHead();
    renderSeverity(result);

    el("result-total").textContent = fmt(result.total);
    el("result-annual").textContent = `That's roughly ${fmt(result.annual)} a year — based on what you told us about your funnel.`;

    renderFunnel(result);

    const diag = Calculator.diagnoseProblem(answers);
    renderDiagnosis(diag);
    renderBenefits(diag);

    // Wasted visits
    el("val-visits").textContent = fmt(result.visits.monthlyCost) + "/mo";
    el("detail-visits").textContent = result.visits.wastedCount > 0
      ? `${Math.round(result.visits.wastedCount)} visit${result.visits.wastedCount === 1 ? "" : "s"} that didn't close, at ${fmt(result.visits.costPerVisit)} each${result.visits.usedDefault ? " (typical estimate)" : ""}.`
      : "No wasted visits based on what you told us — good sign.";

    // Wasted ad spend
    const adsRow = el("row-ads");
    const adsDetail = el("detail-ads");
    if (result.ads.active) {
      adsRow.style.display = "";
      adsDetail.style.display = "";
      el("val-ads").textContent = fmt(result.ads.monthlyCost) + "/mo";
      adsDetail.textContent = `Based on typical unqualified-click rates for unfiltered campaigns, applied to your estimated ${fmt(result.ads.monthlySpend)}/month spend.`;
    } else {
      adsRow.style.display = "none";
      adsDetail.style.display = "none";
    }

    // Opportunity cost
    el("val-opp").textContent = fmt(result.opp.monthlyCost) + "/mo";
    el("detail-opp").textContent = result.opp.unreached > 0
      ? `${Math.round(result.opp.unreached)} leads a month never even reached a quote — conservatively, some were winnable.`
      : "Nearly all your leads are reaching a quote — the leak is further down the funnel.";

    renderComparison(result, branch);
    renderVerdict(result, branch);
    renderBranchPanel(branch, result);
  }

  // ---------- Report header ----------
  function renderReportHead() {
    const cityObj = CONFIG.cities.find((c) => c.id === answers.q1);
    const cityLabel = cityObj ? cityObj.label : "your city";
    const biz = answers.q10_business || "Your business";
    const name = answers.q10_name ? `, ${answers.q10_name}` : "";
    el("report-for").textContent = `Prepared for ${biz}${name} — ${cityLabel}`;
    el("bylineName").textContent = `Your diagnosis, from ${CONFIG.founder.name}`;
    el("bylineSub").textContent = CONFIG.founder.title;

    // Deterministic-looking report ID from the WhatsApp number + date, not random —
    // purely cosmetic, gives the report a "generated document" feel.
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const suffix = (answers.q10_whatsapp || "0000").slice(-4);
    el("report-id").textContent = `#LLD-${stamp}-${suffix}`;
  }

  // ---------- Severity ----------
  function renderSeverity(result) {
    const jobValue = Number(answers.q6) || 0;
    const sev = Calculator.severity(result.total, jobValue);

    const badge = el("severity-badge");
    badge.style.background = sev.color + "1A"; // ~10% tint
    badge.style.borderColor = sev.color;
    badge.style.color = sev.color;
    el("severity-dot").style.background = sev.color;
    el("severity-label").textContent = sev.label;

    const jobsWorthRounded = Math.round(sev.jobsWorth * 10) / 10;
    el("severity-sub").textContent = jobValue > 0
      ? `That's the equivalent of roughly ${jobsWorthRounded} average job${jobsWorthRounded === 1 ? "" : "s"} worth of value leaking out of your business every month.`
      : "Based on your funnel numbers.";
  }

  // ---------- Funnel visualization ----------
  function renderFunnel(result) {
    const stages = Calculator.funnelStages(answers);
    const container = el("funnel");
    container.innerHTML = "";
    const classes = ["f-leads", "f-visits", "f-closed"];

    stages.forEach((stage, i) => {
      const wrap = document.createElement("div");
      wrap.className = "funnel-stage";

      const row = document.createElement("div");
      row.className = "funnel-row";
      row.innerHTML = `<span class="funnel-name">${stage.label}</span><span class="funnel-count">${stage.count}${i === 0 ? "/mo" : ""}</span>`;

      const track = document.createElement("div");
      track.className = "funnel-track";
      const fill = document.createElement("div");
      fill.className = "funnel-fill " + classes[i];
      fill.innerHTML = `<span class="funnel-pct">${stage.pct}%</span>`;
      track.appendChild(fill);

      wrap.appendChild(row);
      wrap.appendChild(track);

      if (i > 0) {
        const prevPct = stages[i - 1].pct;
        const drop = Math.max(prevPct - stage.pct, 0);
        if (drop > 0) {
          const dropLine = document.createElement("p");
          dropLine.className = "funnel-drop";
          dropLine.textContent = `↓ ${drop}% lost at this step`;
          wrap.appendChild(dropLine);
        }
      }

      container.appendChild(wrap);
      // animate width on next frame
      requestAnimationFrame(() => { fill.style.width = stage.pct + "%"; });
    });

    const closedPct = stages[2].pct;
    el("funnel-caption").textContent = `Out of every 100 leads that come in, only about ${closedPct} turn into a signed job by the time they reach the end of your funnel.`;
  }

  // ---------- Diagnosis ----------
  function renderDiagnosis(diag) {
    const tag = el("diagnosis-tag");
    const text = el("diagnosis-text");
    tag.className = "diagnosis-tag";
    let html;

    if (diag.type === "quality") {
      tag.classList.add("tag-quality");
      tag.textContent = "Lead Quality Problem";
      html = `Based on the numbers you gave us, your business has a <strong>lead quality problem</strong>. You're getting enquiries — but only <strong>${diag.visitRatePct}%</strong> ever turn into a real conversation, and of those, only <strong>${diag.closeRatePct}%</strong> close. That pattern usually means most of what's reaching you are price shoppers — people who message "how much is a 5kVA inverter" and disappear the moment they hear a number. This is exactly the problem the 30-in-30 programme was built to solve: every buyer we send has already confirmed their budget bracket, timeline, and payment method before your phone ever rings.`;
    } else if (diag.type === "volume") {
      tag.classList.add("tag-volume");
      tag.textContent = "Lead Volume Problem";
      html = `Based on the numbers you gave us, your business has a <strong>lead volume problem</strong>, not a quality one. When leads do reach you, your funnel actually converts well — <strong>${diag.visitRatePct}%</strong> become real conversations and <strong>${diag.closeRatePct}%</strong> of those close. The issue is there simply aren't enough people reaching you in the first place — <strong>${diag.leads} leads a month</strong> is well below what a business with your close rate should be working with. This is exactly the problem the 30-in-30 programme was built to solve: a guaranteed 30 verified buyers in 30 days, so your pipeline stops depending on however many people happen to find you.`;
    } else if (diag.type === "mixed") {
      tag.classList.add("tag-mixed");
      tag.textContent = "Lead Quality & Volume Problem";
      html = `Based on the numbers you gave us, your business has <strong>both a volume problem and a quality problem</strong> — the harder combination. You're only getting <strong>${diag.leads} leads a month</strong>, and of those, only <strong>${diag.visitRatePct}%</strong> turn into a real conversation. That's a double leak: too few people reaching you, and most of the ones who do are price shoppers rather than real buyers. This is exactly the combination the 30-in-30 programme was built to solve — guaranteed volume, filtered before it ever reaches your WhatsApp.`;
    } else {
      tag.classList.add("tag-healthy");
      tag.textContent = "Funnel Running Well";
      html = `Based on the numbers you gave us, your funnel is actually in decent shape — <strong>${diag.visitRatePct}%</strong> of leads become real conversations and <strong>${diag.closeRatePct}%</strong> of those close. The leak we found below is smaller than what most installers are losing, but it's still real money, and it typically comes from the last few unqualified leads slipping through rather than a structural problem.`;
    }

    typeHTML(text, html);
  }

  // ---------- Benefits tied to diagnosis ----------
  function renderBenefits(diag) {
    const list = el("benefits-list");
    list.innerHTML = "";

    const qualityBenefits = [
      "Every buyer has already confirmed a ₦1.5M+ package bracket — no more \"how much\" DMs that go nowhere",
      "Every buyer has confirmed a real install timeline — no more \"just looking\" conversations",
      "Every buyer has stated how they intend to pay before you ever reply",
      "You only pay after a buyer lands in your WhatsApp — no risk on unqualified volume"
    ];
    const volumeBenefits = [
      "30 verified buyers guaranteed in 30 days — a predictable pipeline instead of feast-or-famine",
      "If we miss 30, we fund month two ourselves — the volume risk is ours, not yours",
      "One installer per city — the buyers we send aren't split with a competitor",
      "You set the pace by how fast you call, not by how many people happen to find you"
    ];

    let items;
    if (diag.type === "quality") items = qualityBenefits;
    else if (diag.type === "volume") items = volumeBenefits;
    else if (diag.type === "mixed") items = [qualityBenefits[0], volumeBenefits[0], qualityBenefits[2], volumeBenefits[1]];
    else items = [qualityBenefits[0], volumeBenefits[2]];

    items.forEach((text) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="check">✓</span><span>${text}</span>`;
      list.appendChild(li);
    });
  }

  // ---------- Comparison chart ----------
  function renderComparison(result, branch) {
    const fmt = Calculator.formatNaira;
    const loss = result.total;
    const cost = CONFIG.programMonthlyCost;
    const max = Math.max(loss, cost, 1);

    el("compare-loss-figure").textContent = fmt(loss) + "/mo";
    el("compare-cost-figure").textContent = fmt(cost);
    el("compare-program-name").textContent = CONFIG.programName + ", all-in";

    const lossBar = el("compare-bar-loss");
    const costBar = el("compare-bar-cost");
    requestAnimationFrame(() => {
      lossBar.style.width = Math.max((loss / max) * 100, 4) + "%";
      costBar.style.width = Math.max((cost / max) * 100, 4) + "%";
    });

    if (loss > cost) {
      const multiple = Math.round((loss / cost) * 10) / 10;
      el("compare-caption").textContent = `What you're losing every month is running about ${multiple}× what the programme costs, all in. Most of that loss repeats — next month, and the month after.`;
    } else {
      el("compare-caption").textContent = `Your current leak is smaller than the programme's all-in cost — worth fixing the funnel steps above first, or starting at a lower volume.`;
    }
  }

  // ---------- Verdict ----------
  function renderVerdict(result, branch) {
    const fmt = Calculator.formatNaira;
    const title = el("verdict-title");
    const body = el("verdict-body");
    const wastedVisits = Math.round(result.visits.wastedCount);
    const cityObj = CONFIG.cities.find((c) => c.id === answers.q1);
    const cityLabel = cityObj ? cityObj.label : "your area";

    const closingLine = `This is costing you <strong>${fmt(result.total)} every month</strong> right now — and as ad costs and competition for the same buyers both continue to rise, that number is more likely to grow than shrink. If fixing this is a priority for your business, exploring ${CONFIG.programName} is the right next step.`;

    let html;
    if (branch === "A") {
      title.textContent = `We'd recommend ${CONFIG.programName}`;
      html = `Your biggest leak is ${result.visits.monthlyCost >= result.opp.monthlyCost ? "wasted site visits" : "leads that never even reach a quote"} — and both come from the same root cause: leads reaching you before they've been filtered. The 30-in-30 programme replaces that with buyers who've already confirmed property ownership, a real timeline, a package bracket, and how they intend to pay. At your numbers, that's roughly <strong>${wastedVisits} visit${wastedVisits === 1 ? "" : "s"} a month</strong> that would go from a guess to a real conversation.<br><br>${closingLine}`;
    } else if (branch === "B") {
      title.textContent = `${cityLabel} is the right fit — the timing isn't, yet`;
      html = `Everything in this report points to the same fix — a qualified pipeline instead of a filtered-later one. ${cityLabel} is being served by another installer under an exclusive arrangement right now, so the honest recommendation is to get on the list and be first in line the moment that changes.<br><br>${closingLine}`;
    } else if (branch === "C") {
      title.textContent = `The fix is proven — it's just not in your city yet`;
      html = `The leak this report found is the exact problem the 30-in-30 programme was built to close, and it's already running in several Nigerian cities. We're not live in yours yet — leave your details and you'll be first to know when that changes.<br><br>${closingLine}`;
    } else {
      title.textContent = `Not the 30-in-30 programme — not yet`;
      html = `The leak is real, but at your current capacity, 30 verified buyers a month would likely outpace what your team can install. The honest recommendation is to close the gaps this report found first — starting with whichever bucket above is largest — before adding volume on top of it.<br><br>This is costing you <strong>${fmt(result.total)} every month</strong> — worth fixing regardless of programme timing. Once your capacity grows, ${CONFIG.programName} will be there.`;
    }

    typeHTML(body, html);
  }

  function renderBranchPanel(branch, result) {
    const panel = el("branch-panel");
    const cityObj = CONFIG.cities.find((c) => c.id === answers.q1);
    const cityLabel = cityObj ? cityObj.label : "your city";
    const wastedVisits = Math.round(result.visits.wastedCount);

    if (branch === "A") {
      panel.innerHTML = `
        <h3>What this could look like instead</h3>
        <p>Installers on the 30-in-30 programme pay ₦5,000 per verified buyer — someone who has already confirmed property ownership, a real timeline, a package bracket, and how they intend to pay, before you ever pick up the phone.
        ${wastedVisits > 0 ? `At your numbers, that's the difference between ${wastedVisits} wasted visit${wastedVisits === 1 ? "" : "s"} and ${wastedVisits} visit${wastedVisits === 1 ? "" : "s"} worth taking.` : ""}</p>
        <a class="branch-cta" href="${CONFIG.offerPageUrl}" target="_blank" rel="noopener">See how the 30-in-30 programme works →</a>
      `;
    } else if (branch === "B") {
      panel.innerHTML = `
        <h3>${cityLabel} is currently taken</h3>
        <p>We only work with one installer per city at a time, and ${cityLabel} is being served right now. Join the list and we'll reach out the moment it opens — or if a slot frees up sooner than expected.</p>
        <a class="branch-cta" href="https://wa.me/2348029234994?text=${encodeURIComponent("Hi, I'd like to join the waitlist for " + cityLabel + " — I just completed the Lead Leak Diagnostic.")}" target="_blank" rel="noopener">Join the ${cityLabel} waitlist →</a>
      `;
    } else if (branch === "C") {
      panel.innerHTML = `
        <h3>We're not live in your city yet</h3>
        <p>But this is exactly the kind of problem the system was built to fix. Leave your details and we'll reach out the moment we expand to you.</p>
        <a class="branch-cta" href="https://wa.me/2348029234994?text=${encodeURIComponent("Hi, I'd like to be notified when Tubalcain opens in my city — I just completed the Lead Leak Diagnostic.")}" target="_blank" rel="noopener">Notify me when it opens →</a>
      `;
    } else {
      panel.innerHTML = `
        <h3>Not quite a fit yet — and that's fine</h3>
        <p>At your current capacity, 30 verified buyers a month would likely be more than your team can take on right now. Here's where to start instead — practical tips for your size, no pitch attached.</p>
        <a class="branch-cta" href="https://wa.me/2348029234994?text=${encodeURIComponent("Hi, I just completed the Lead Leak Diagnostic — I'd like tips for a smaller operation.")}" target="_blank" rel="noopener">Talk to us on WhatsApp →</a>
      `;
    }
  }

  // ---------- Webhook submission ----------
  function submitToWebhook(answers, result, branch) {
    if (!CONFIG.webhookUrl) return; // not configured yet — safe no-op
    const payload = {
      tool: "lead-leak-diagnostic",
      submittedAt: new Date().toISOString(),
      city: answers.q1,
      monthlyLeads: answers.q2,
      dailyAdSpend: answers.q3,
      runsAds: !answers.q3_noAds,
      siteVisitsPerMonth: answers.q4,
      signedJobsPerMonth: answers.q5,
      avgJobValue: answers.q6,
      wastedVisitCostInput: answers.q7 || null,
      capacityBand: answers.q8,
      paymentOptions: answers.q9,
      name: answers.q10_name,
      businessName: answers.q10_business,
      whatsapp: answers.q10_whatsapp,
      branch: branch,
      result: {
        wastedVisitsCost: result.visits.monthlyCost,
        wastedAdSpendCost: result.ads.monthlyCost,
        opportunityCost: result.opp.monthlyCost,
        totalMonthly: result.total,
        totalAnnual: result.annual
      }
    };

    fetch(CONFIG.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {
      // Fail silently for the user — do not block their result on network issues.
      // Consider logging failed submissions locally if this matters for your ops.
    });
  }

  // ---------- Restart ----------
  function restart() {
    answers = {};
    initQ1(); initQ2(); initQ3(); initQ4(); initQ5();
    initQ6(); initQ7(); initQ8(); initQ9(); initQ10();
    goTo("intro");
  }

  // ---------- Init ----------
  function init() {
    el("year").textContent = new Date().getFullYear();
    el("startBtn").addEventListener("click", () => { goTo("q1"); });
    el("restartBtn").addEventListener("click", restart);

    applyFounderIdentity();
    initQ1(); initQ2(); initQ3(); initQ4(); initQ5();
    initQ6(); initQ7(); initQ8(); initQ9(); initQ10();

    goTo("intro");
  }

  // Wires CONFIG.founder into every photo/name placeholder on the page —
  // change the name or photo path in one place (config.js) and it updates
  // on the intro, calculating, and result screens together.
  function applyFounderIdentity() {
    const f = CONFIG.founder;
    document.querySelectorAll('img.consultant-photo').forEach((img) => {
      img.src = f.photo;
      img.alt = "Photo of " + f.fullName;
    });
    if (el("introName")) el("introName").textContent = `Hi, I'm ${f.name}.`;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
