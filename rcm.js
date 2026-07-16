(function (root) {
  "use strict";

  const APP_KEY = "vivantePlexus.v1";
  const RCM_KEY = "vivantePlexus.rcm.v1";
  const BUILD = "20260716-1";
  const DAY = 86400000;
  const PAYERS = [
    "NorthStar Health Plan",
    "Harbour Mutual",
    "CivicCare Network",
    "Summit Employer Health",
    "Community Rehabilitation Fund",
  ];
  const SITES = ["Central Rehab Centre", "North Clinic", "Community Hub", "Tele-rehabilitation Service"];
  const STAGE_PATTERN = [
    "paid", "submitted", "ready", "denied", "authorisation", "patient",
    "paid", "documentation", "submitted", "paid", "denied", "eligibility",
  ];
  const STAGES = {
    eligibility: { label: "Eligibility review", tone: "review" },
    authorisation: { label: "Authorisation hold", tone: "risk" },
    documentation: { label: "Documentation hold", tone: "review" },
    ready: { label: "Ready for review", tone: "ready" },
    submitted: { label: "Submitted", tone: "progress" },
    denied: { label: "Denied", tone: "risk" },
    paid: { label: "Paid", tone: "paid" },
    patient: { label: "Patient balance", tone: "progress" },
  };
  const DENIAL_REASONS = [
    "Authorisation mismatch",
    "Eligibility or coverage",
    "Documentation requested",
    "Coding or claim edit",
    "Coordination of benefits",
    "Timely-filing review",
  ];
  const LAYERS = [
    ["command", "Command"],
    ["coverage", "Coverage"],
    ["claims", "Claims"],
    ["denials", "Denials"],
    ["payments", "Payments & A/R"],
    ["performance", "Performance"],
    ["safeguards", "Safeguards"],
    ["detail", "Claim detail"],
  ];

  const TRANSLATIONS = {
    "Revenue cycle command centre": ["收入周期指挥中心", "Centro de control del ciclo de ingresos", "Centre de pilotage du cycle de revenus", "Kommandozentrale für den Erlöszyklus", "Pusat arahan kitaran hasil"],
    "Technology-enabled revenue cycle services for rehabilitation organisations.": ["面向康复机构的技术赋能收入周期服务。", "Servicios tecnológicos del ciclo de ingresos para organizaciones de rehabilitación.", "Services technologiques de cycle de revenus pour les organisations de réadaptation.", "Technologiegestützte Erlöszyklus-Dienste für Rehabilitationseinrichtungen.", "Perkhidmatan kitaran hasil berasaskan teknologi untuk organisasi rehabilitasi."],
    "Command": ["指挥台", "Mando", "Commande", "Kommando", "Arahan"],
    "Coverage": ["保障与授权", "Cobertura", "Couverture", "Deckung", "Perlindungan"],
    "Claims": ["理赔", "Reclamaciones", "Demandes", "Abrechnungen", "Tuntutan"],
    "Denials": ["拒付", "Denegaciones", "Refus", "Ablehnungen", "Penolakan"],
    "Payments & A/R": ["付款与应收账款", "Pagos y cuentas por cobrar", "Paiements et créances", "Zahlungen und Forderungen", "Bayaran & akaun belum terima"],
    "Performance": ["绩效", "Rendimiento", "Performance", "Leistung", "Prestasi"],
    "Safeguards": ["保障措施", "Salvaguardas", "Garde-fous", "Schutzmaßnahmen", "Perlindungan"],
    "Claim detail": ["理赔详情", "Detalle de reclamación", "Détail de la demande", "Abrechnungsdetails", "Butiran tuntutan"],
    "Synthetic financial data": ["合成财务数据", "Datos financieros sintéticos", "Données financières synthétiques", "Synthetische Finanzdaten", "Data kewangan sintetik"],
    "Local workflow preview": ["本地工作流程预览", "Vista previa local", "Aperçu local du flux", "Lokale Workflow-Vorschau", "Pratonton aliran kerja setempat"],
    "Priority work queue": ["优先工作队列", "Cola prioritaria", "File de travail prioritaire", "Priorisierte Arbeitsliste", "Baris gilir keutamaan"],
    "Service suite": ["服务套件", "Suite de servicios", "Suite de services", "Servicepaket", "Suite perkhidmatan"],
    "Gross charges": ["总收费", "Cargos brutos", "Facturation brute", "Bruttobeträge", "Caj kasar"],
    "Collected": ["已收款", "Cobrado", "Encaissé", "Eingezogen", "Dikutip"],
    "Outstanding A/R": ["未结应收账款", "Cuentas por cobrar", "Créances en cours", "Offene Forderungen", "Belum terima tertunggak"],
    "First-pass acceptance": ["首次通过率", "Aceptación al primer envío", "Acceptation au premier passage", "Erstannahmequote", "Penerimaan kali pertama"],
    "Denial rate": ["拒付率", "Tasa de denegación", "Taux de refus", "Ablehnungsquote", "Kadar penolakan"],
    "Weighted A/R age": ["加权应收账款账龄", "Antigüedad ponderada", "Âge pondéré des créances", "Gewichtetes Forderungsalter", "Usia berwajaran"],
  };

  const state = {
    layer: "command",
    selectedId: "",
    query: "",
    stage: "all",
    payer: "all",
  };

  const $ = (id) => root.document.getElementById(id);
  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  const number = (value) => Number(value) || 0;
  const round = (value) => Math.round(number(value));
  const percent = (value, total) => (total ? Math.round((value / total) * 100) : 0);
  const sum = (items, key) => items.reduce((total, item) => total + number(typeof key === "function" ? key(item) : item[key]), 0);
  const currentLanguage = () => root.i18n?.language || "en";
  const translate = (source) => {
    const language = currentLanguage();
    if (language === "en" || !TRANSLATIONS[source]) return root.i18n?.translateText?.(source) || source;
    const index = { "zh-Hans": 0, es: 1, fr: 2, de: 3, ms: 4 }[language];
    return TRANSLATIONS[source][index] || source;
  };
  const currency = (value) =>
    new Intl.NumberFormat(root.i18n?.locale?.() || "en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(number(value));
  const shortDate = (value) =>
    new Intl.DateTimeFormat(root.i18n?.locale?.() || "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  const isoDaysAgo = (days) => new Date(Date.now() - days * DAY).toISOString().slice(0, 10);

  function readClinicalState() {
    try {
      const parsed = JSON.parse(root.localStorage.getItem(APP_KEY));
      return parsed && Array.isArray(parsed.cases) && Array.isArray(parsed.sessions)
        ? parsed
        : { cases: [], sessions: [], outcomes: [] };
    } catch {
      return { cases: [], sessions: [], outcomes: [] };
    }
  }

  function readRcmState() {
    try {
      const parsed = JSON.parse(root.localStorage.getItem(RCM_KEY));
      return parsed && parsed.version === 1 && parsed.actions && typeof parsed.actions === "object"
        ? parsed
        : { version: 1, actions: {} };
    } catch {
      return { version: 1, actions: {} };
    }
  }

  function saveRcmState(next) {
    try {
      root.localStorage.setItem(RCM_KEY, JSON.stringify(next));
    } catch {
      // The read-only demonstration remains usable if browser storage is unavailable.
    }
  }

  function disciplineFor(caseRecord) {
    const domain = String(caseRecord.domain || "").toLowerCase();
    if (/speech|swallow|cognition/.test(domain)) return "SLP";
    if (/upper limb|adl|functional/.test(domain)) return "OT";
    return "PT";
  }

  function buildClaims() {
    const clinical = readClinicalState();
    const actions = readRcmState().actions;
    const sessionsByCase = new Map();
    for (const session of clinical.sessions) {
      if (!sessionsByCase.has(session.caseId)) sessionsByCase.set(session.caseId, []);
      sessionsByCase.get(session.caseId).push(session);
    }

    return clinical.cases.map((caseRecord, index) => {
      const sessions = sessionsByCase.get(caseRecord.id) || [];
      const stage = STAGE_PATTERN[index % STAGE_PATTERN.length];
      const ageDays = 4 + ((index * 7) % 112);
      const charge = round(420 + sessions.length * 118 + (index % 7) * 67);
      const allowed = round(charge * (0.64 + (index % 5) * 0.035));
      const patientResponsibility = round(allowed * (0.08 + (index % 4) * 0.025));
      let payerPaid = 0;
      let patientPaid = 0;
      if (stage === "paid") {
        payerPaid = allowed - patientResponsibility;
        patientPaid = patientResponsibility;
      } else if (stage === "patient") {
        payerPaid = allowed - patientResponsibility;
        patientPaid = round(patientResponsibility * 0.35);
      }
      const outstanding = Math.max(0, allowed - payerPaid - patientPaid);
      const authorisationTotal = 8 + (index % 5) * 4;
      const authorisationUsed = Math.min(authorisationTotal, sessions.length + (index % 8));
      const authorisationRemaining = authorisationTotal - authorisationUsed;
      const checks = [
        { id: "eligibility", label: "Eligibility and benefits verified", ok: stage !== "eligibility" && index % 10 !== 0 },
        { id: "authorisation", label: "Authorisation on file and within limits", ok: stage !== "authorisation" && authorisationRemaining > 0 },
        { id: "plan", label: "Plan of care present for billing review", ok: Boolean(caseRecord.primaryGoal) && index % 13 !== 0 },
        { id: "note", label: "Service documentation complete", ok: sessions.length > 0 && stage !== "documentation" && index % 11 !== 0 },
        { id: "coding", label: "Coding and claim edits reviewed", ok: index % 8 !== 0 },
        { id: "attachment", label: "Requested supporting information assembled", ok: index % 6 !== 0 },
      ];
      const missing = checks.filter((check) => !check.ok);
      const denialReason = stage === "denied" ? DENIAL_REASONS[index % DENIAL_REASONS.length] : "";
      const nearFilingLimit = outstanding > 0 && ageDays >= 85;
      const priority = round(
        outstanding / 35 + ageDays * 1.3 + (stage === "denied" ? 90 : 0) +
        (stage === "authorisation" ? 70 : 0) + missing.length * 18 + (nearFilingLimit ? 75 : 0) -
        (actions[`RCM-${String(index + 1).padStart(4, "0")}`]?.reviewed ? 35 : 0),
      );
      const firstPassAccepted = ["paid", "patient", "submitted"].includes(stage) && index % 9 !== 0;
      return {
        id: `RCM-${String(index + 1).padStart(4, "0")}`,
        caseId: caseRecord.id,
        caseLabel: caseRecord.label || `Case ${String(index + 1).padStart(2, "0")}`,
        pathway: caseRecord.diagnosis || "Rehabilitation",
        phase: caseRecord.phase || "Outpatient",
        discipline: disciplineFor(caseRecord),
        payer: PAYERS[index % PAYERS.length],
        site: SITES[index % SITES.length],
        stage,
        ageDays,
        serviceDate: isoDaysAgo(ageDays + 5),
        submittedDate: ["submitted", "denied", "paid", "patient"].includes(stage) ? isoDaysAgo(ageDays) : "",
        charge,
        allowed,
        contractualAdjustment: Math.max(0, charge - allowed),
        payerPaid,
        patientResponsibility,
        patientPaid,
        outstanding,
        sessionCount: sessions.length,
        authorisationTotal,
        authorisationUsed,
        authorisationRemaining,
        checks,
        missing,
        denialReason,
        nearFilingLimit,
        priority,
        firstPassAccepted,
        action: actions[`RCM-${String(index + 1).padStart(4, "0")}`] || {},
      };
    });
  }

  function metricsFor(claims) {
    const submitted = claims.filter((claim) => ["submitted", "denied", "paid", "patient"].includes(claim.stage));
    const adjudicated = claims.filter((claim) => ["denied", "paid", "patient"].includes(claim.stage));
    const outstandingClaims = claims.filter((claim) => claim.outstanding > 0);
    const outstandingTotal = sum(outstandingClaims, "outstanding");
    return {
      charges: sum(claims, "charge"),
      collected: sum(claims, (claim) => claim.payerPaid + claim.patientPaid),
      outstanding: outstandingTotal,
      firstPass: percent(submitted.filter((claim) => claim.firstPassAccepted).length, submitted.length),
      denialRate: percent(adjudicated.filter((claim) => claim.stage === "denied").length, adjudicated.length),
      daysAr: outstandingTotal
        ? round(sum(outstandingClaims, (claim) => claim.ageDays * claim.outstanding) / outstandingTotal)
        : 0,
      openItems: claims.filter((claim) => claim.stage !== "paid").length,
      authorisationRisk: claims.filter((claim) => claim.stage === "authorisation" || claim.authorisationRemaining <= 1).length,
      denials: claims.filter((claim) => claim.stage === "denied").length,
    };
  }

  function snapshot() {
    const claims = buildClaims();
    return { build: BUILD, generatedAt: new Date().toISOString(), claims, metrics: metricsFor(claims) };
  }

  function badge(claim) {
    const stage = STAGES[claim.stage] || STAGES.ready;
    return `<span class="rcm-badge ${stage.tone}">${escapeHtml(stage.label)}</span>`;
  }

  function metric(label, value, note) {
    return `<article class="rcm-metric"><span>${escapeHtml(translate(label))}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`;
  }

  function claimButton(claim) {
    return `<button type="button" class="rcm-claim-link" data-rcm-open="${escapeHtml(claim.id)}"><strong>${escapeHtml(claim.id)}</strong><span>${escapeHtml(claim.caseLabel)}</span></button>`;
  }

  function tableRows(claims) {
    if (!claims.length) return `<tr><td colspan="7" class="rcm-empty">No items match the current filters.</td></tr>`;
    return claims.map((claim) => `<tr>
      <td>${claimButton(claim)}</td>
      <td>${escapeHtml(claim.payer)}<small>${escapeHtml(claim.site)}</small></td>
      <td>${badge(claim)}</td>
      <td class="rcm-number">${currency(claim.outstanding)}</td>
      <td class="rcm-number">${claim.ageDays} days</td>
      <td><span class="rcm-readiness ${claim.missing.length ? "review" : "ready"}">${claim.missing.length ? `${claim.missing.length} review` : "Ready"}</span></td>
      <td><button type="button" class="rcm-row-action" data-rcm-open="${escapeHtml(claim.id)}">Review <span aria-hidden="true">→</span></button></td>
    </tr>`).join("");
  }

  function queueTable(claims, caption = "Revenue-cycle work queue") {
    return `<div class="rcm-table-wrap"><table class="rcm-table"><caption class="sr-only">${escapeHtml(caption)}</caption><thead><tr>
      <th>Claim / case</th><th>Payer / site</th><th>Status</th><th>Outstanding</th><th>Age</th><th>Readiness</th><th>Action</th>
    </tr></thead><tbody>${tableRows(claims)}</tbody></table></div>`;
  }

  function serviceCard(layer, numberLabel, title, copy, meta) {
    return `<button type="button" class="rcm-service-card" data-rcm-layer="${escapeHtml(layer)}"><span>${escapeHtml(numberLabel)}</span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(copy)}</p><small>${escapeHtml(meta)}</small></div><i aria-hidden="true">→</i></button>`;
  }

  function commandLayer(claims, metrics) {
    const queue = claims.filter((claim) => claim.stage !== "paid").sort((a, b) => b.priority - a.priority).slice(0, 7);
    const aging = agingBuckets(claims);
    return `<section class="rcm-layer" aria-labelledby="rcmCommandTitle">
      <div class="rcm-layer-heading"><div><p class="rcm-kicker">Plexus RCM intelligence</p><h3 id="rcmCommandTitle">Financial performance at a glance</h3><p>One prioritised operating view across access, claims, denials, payments and follow-up.</p></div><button type="button" class="secondary rcm-compact" data-rcm-layer="claims">Open full queue</button></div>
      <div class="rcm-metric-grid">
        ${metric("Gross charges", currency(metrics.charges), `${claims.length} synthetic claim episodes`)}
        ${metric("Collected", currency(metrics.collected), "Payer and patient payments posted")}
        ${metric("Outstanding A/R", currency(metrics.outstanding), `${metrics.openItems} open work items`)}
        ${metric("First-pass acceptance", `${metrics.firstPass}%`, "Accepted without a recorded denial")}
        ${metric("Denial rate", `${metrics.denialRate}%`, `${metrics.denials} adjudicated denials`)}
        ${metric("Weighted A/R age", `${metrics.daysAr} days`, "Weighted by outstanding balance")}
      </div>
      <div class="rcm-command-grid">
        <article class="rcm-card rcm-queue-card"><div class="rcm-card-heading"><div><span>Action first</span><h4>${escapeHtml(translate("Priority work queue"))}</h4><p>Explainable priority combines balance, age, workflow holds and review status.</p></div><strong>${queue.length}</strong></div>${queueTable(queue, "Priority revenue-cycle work queue")}</article>
        <article class="rcm-card rcm-suite-card"><div class="rcm-card-heading"><div><span>End-to-end operations</span><h4>${escapeHtml(translate("Service suite"))}</h4><p>Six connected provider-service capabilities for rehabilitation organisations.</p></div></div><div class="rcm-service-grid">
          ${serviceCard("coverage", "01", "Access & authorisation", "Eligibility, benefit and visit-limit visibility before billing.", `${metrics.authorisationRisk} items to review`)}
          ${serviceCard("claims", "02", "Claim readiness", "Documentation, edit and supporting-information work queues.", `${claims.filter((c) => c.missing.length).length} readiness exceptions`)}
          ${serviceCard("claims", "03", "Claims & status", "Submission readiness and lifecycle visibility without hidden automation.", `${claims.filter((c) => c.stage === "submitted").length} submitted`)}
          ${serviceCard("denials", "04", "Denial recovery", "Root-cause grouping, prioritisation and local follow-up records.", `${metrics.denials} denials`)}
          ${serviceCard("payments", "05", "Payments & A/R", "Remittance, balance and ageing visibility across payers and sites.", currency(metrics.outstanding))}
          ${serviceCard("performance", "06", "Performance intelligence", "Payer, site and discipline views with transparent formulas.", `${aging[2].count + aging[3].count} items over 60 days`)}
        </div></article>
      </div>
    </section>`;
  }

  function coverageLayer(claims) {
    const risk = claims
      .filter((claim) => claim.stage === "eligibility" || claim.stage === "authorisation" || claim.authorisationRemaining <= 1)
      .sort((a, b) => b.priority - a.priority);
    const verified = claims.filter((claim) => claim.checks[0].ok && claim.checks[1].ok).length;
    return `<section class="rcm-layer" aria-labelledby="rcmCoverageTitle"><div class="rcm-layer-heading"><div><p class="rcm-kicker">Front-end revenue integrity</p><h3 id="rcmCoverageTitle">Coverage and authorisation</h3><p>Surface benefit, authorisation and visit-limit exceptions before they become downstream claim rework.</p></div><button type="button" class="secondary rcm-compact" data-rcm-layer="command">Back to command</button></div>
      <div class="rcm-summary-strip">${metric("Verified", String(verified), "Eligibility and authorisation checks complete")}${metric("At risk", String(risk.length), "Coverage or authorisation review")}${metric("Visits remaining", String(sum(claims, "authorisationRemaining")), "Across synthetic authorisations")}</div>
      <article class="rcm-card"><div class="rcm-card-heading"><div><span>Pre-service and concurrent review</span><h4>Authorisation watchlist</h4><p>Visit utilisation is contextual information only; payer policy and clinical necessity still require human review.</p></div></div>${queueTable(risk, "Coverage and authorisation work queue")}</article></section>`;
  }

  function claimsLayer(claims) {
    const stages = Object.entries(STAGES).map(([value, stage]) => `<option value="${value}" ${state.stage === value ? "selected" : ""}>${escapeHtml(stage.label)}</option>`).join("");
    const payers = [...new Set(claims.map((claim) => claim.payer))].map((payer) => `<option value="${escapeHtml(payer)}" ${state.payer === payer ? "selected" : ""}>${escapeHtml(payer)}</option>`).join("");
    const query = state.query.trim().toLowerCase();
    const filtered = claims.filter((claim) =>
      (state.stage === "all" || claim.stage === state.stage) &&
      (state.payer === "all" || claim.payer === state.payer) &&
      (!query || [claim.id, claim.caseLabel, claim.payer, claim.site, claim.pathway].some((value) => String(value).toLowerCase().includes(query))),
    ).sort((a, b) => b.priority - a.priority);
    return `<section class="rcm-layer" aria-labelledby="rcmClaimsTitle"><div class="rcm-layer-heading"><div><p class="rcm-kicker">Mid-cycle and claim operations</p><h3 id="rcmClaimsTitle">Claims work queue</h3><p>Filter every synthetic claim episode, inspect readiness evidence and record local follow-up.</p></div><button type="button" class="secondary rcm-compact" data-rcm-layer="command">Back to command</button></div>
      <form id="rcmFilters" class="rcm-filters"><label>Find claim<input id="rcmSearch" type="search" value="${escapeHtml(state.query)}" placeholder="Claim, case, payer or site" /></label><label>Workflow stage<select id="rcmStageFilter"><option value="all">All stages</option>${stages}</select></label><label>Payer<select id="rcmPayerFilter"><option value="all">All payers</option>${payers}</select></label><button type="submit" class="primary">Apply filters</button><button id="rcmClearFilters" type="button" class="secondary">Clear</button></form>
      <div class="rcm-results-note"><strong>${filtered.length}</strong><span>of ${claims.length} claim episodes</span></div>
      <article class="rcm-card rcm-full-table">${queueTable(filtered, "Filtered claims work queue")}</article></section>`;
  }

  function denialsLayer(claims) {
    const denied = claims.filter((claim) => claim.stage === "denied").sort((a, b) => b.outstanding - a.outstanding);
    const groups = DENIAL_REASONS.map((reason) => ({ reason, claims: denied.filter((claim) => claim.denialReason === reason) })).filter((group) => group.claims.length);
    const max = Math.max(1, ...groups.map((group) => group.claims.length));
    return `<section class="rcm-layer" aria-labelledby="rcmDenialsTitle"><div class="rcm-layer-heading"><div><p class="rcm-kicker">Prevention and recovery</p><h3 id="rcmDenialsTitle">Denial intelligence</h3><p>Group root causes, prioritise recoverable balances and retain a human decision before any follow-up.</p></div><button type="button" class="secondary rcm-compact" data-rcm-layer="command">Back to command</button></div>
      <div class="rcm-denial-grid"><article class="rcm-card"><div class="rcm-card-heading"><div><span>Root-cause view</span><h4>Denial mix</h4><p>Counts are calculated from the synthetic work queue.</p></div><strong>${denied.length}</strong></div><div class="rcm-bars">${groups.map((group) => `<div class="rcm-bar-row"><span>${escapeHtml(group.reason)}</span><div><i style="width:${Math.max(12, percent(group.claims.length, max))}%"></i></div><strong>${group.claims.length}</strong></div>`).join("")}</div></article>
      <article class="rcm-card"><div class="rcm-card-heading"><div><span>Recoverable exposure</span><h4>Denial balances</h4><p>No automated appeal or payer communication occurs.</p></div><strong>${currency(sum(denied, "outstanding"))}</strong></div><ul class="rcm-signal-list"><li><strong>${denied.filter((c) => c.nearFilingLimit).length}</strong><span>items at elevated filing-age risk</span></li><li><strong>${denied.filter((c) => c.missing.length).length}</strong><span>items with readiness exceptions</span></li><li><strong>${denied.filter((c) => c.action.reviewed).length}</strong><span>items locally marked reviewed</span></li></ul></article></div>
      <article class="rcm-card rcm-full-table"><div class="rcm-card-heading"><div><span>Human review required</span><h4>Denial recovery queue</h4></div></div>${queueTable(denied, "Denial recovery work queue")}</article></section>`;
  }

  function agingBuckets(claims) {
    const definitions = [[0, 30, "0–30"], [31, 60, "31–60"], [61, 90, "61–90"], [91, Infinity, "91+"]];
    return definitions.map(([min, max, label]) => {
      const items = claims.filter((claim) => claim.outstanding > 0 && claim.ageDays >= min && claim.ageDays <= max);
      return { label, count: items.length, amount: sum(items, "outstanding") };
    });
  }

  function groupPerformance(claims, field) {
    return [...new Set(claims.map((claim) => claim[field]))].map((name) => {
      const items = claims.filter((claim) => claim[field] === name);
      const adjudicated = items.filter((claim) => ["denied", "paid", "patient"].includes(claim.stage));
      return {
        name,
        count: items.length,
        charges: sum(items, "charge"),
        collected: sum(items, (claim) => claim.payerPaid + claim.patientPaid),
        outstanding: sum(items, "outstanding"),
        denialRate: percent(adjudicated.filter((claim) => claim.stage === "denied").length, adjudicated.length),
        firstPass: percent(items.filter((claim) => claim.firstPassAccepted).length, items.filter((claim) => ["submitted", "denied", "paid", "patient"].includes(claim.stage)).length),
      };
    });
  }

  function paymentsLayer(claims) {
    const aging = agingBuckets(claims);
    const payerRows = groupPerformance(claims, "payer").sort((a, b) => b.outstanding - a.outstanding);
    const maximum = Math.max(1, ...aging.map((bucket) => bucket.amount));
    return `<section class="rcm-layer" aria-labelledby="rcmPaymentsTitle"><div class="rcm-layer-heading"><div><p class="rcm-kicker">Cash and balance visibility</p><h3 id="rcmPaymentsTitle">Payments and accounts receivable</h3><p>Review posted synthetic payments, open balances and ageing without treating charges as expected reimbursement.</p></div><button type="button" class="secondary rcm-compact" data-rcm-layer="command">Back to command</button></div>
      <div class="rcm-aging-grid">${aging.map((bucket) => `<article><span>${escapeHtml(bucket.label)} days</span><strong>${currency(bucket.amount)}</strong><small>${bucket.count} open items</small><div><i style="width:${percent(bucket.amount, maximum)}%"></i></div></article>`).join("")}</div>
      <article class="rcm-card"><div class="rcm-card-heading"><div><span>Portfolio view</span><h4>Payer performance</h4><p>Comparisons are descriptive, not contractual reimbursement benchmarks.</p></div></div><div class="rcm-table-wrap"><table class="rcm-table"><thead><tr><th>Payer</th><th>Claims</th><th>Charges</th><th>Collected</th><th>Outstanding</th><th>First pass</th><th>Denial rate</th></tr></thead><tbody>${payerRows.map((row) => `<tr><td><strong>${escapeHtml(row.name)}</strong></td><td>${row.count}</td><td>${currency(row.charges)}</td><td>${currency(row.collected)}</td><td>${currency(row.outstanding)}</td><td>${row.firstPass}%</td><td>${row.denialRate}%</td></tr>`).join("")}</tbody></table></div></article></section>`;
  }

  function performanceLayer(claims) {
    const sites = groupPerformance(claims, "site");
    const disciplines = groupPerformance(claims, "discipline");
    return `<section class="rcm-layer" aria-labelledby="rcmPerformanceTitle"><div class="rcm-layer-heading"><div><p class="rcm-kicker">Organisation-level visibility</p><h3 id="rcmPerformanceTitle">Financial performance intelligence</h3><p>Compare sites and disciplines using the same transparent definitions and synthetic source records.</p></div><button type="button" class="secondary rcm-compact" data-rcm-layer="command">Back to command</button></div>
      <div class="rcm-performance-grid"><article class="rcm-card"><div class="rcm-card-heading"><div><span>Operating level</span><h4>Performance by site</h4></div></div><div class="rcm-performance-list">${sites.map((row) => `<article><div><strong>${escapeHtml(row.name)}</strong><span>${row.count} claim episodes</span></div><dl><div><dt>Collected</dt><dd>${currency(row.collected)}</dd></div><div><dt>Outstanding</dt><dd>${currency(row.outstanding)}</dd></div><div><dt>Denials</dt><dd>${row.denialRate}%</dd></div></dl></article>`).join("")}</div></article>
      <article class="rcm-card"><div class="rcm-card-heading"><div><span>Service line</span><h4>Performance by discipline</h4></div></div><div class="rcm-performance-list">${disciplines.map((row) => `<article><div><strong>${escapeHtml(row.name)}</strong><span>${row.count} claim episodes</span></div><dl><div><dt>First pass</dt><dd>${row.firstPass}%</dd></div><div><dt>Collected</dt><dd>${currency(row.collected)}</dd></div><div><dt>Outstanding</dt><dd>${currency(row.outstanding)}</dd></div></dl></article>`).join("")}</div></article></div>
      <article class="rcm-card rcm-method-card"><div class="rcm-card-heading"><div><span>Explainable analytics</span><h4>Metric definitions</h4></div></div><div class="rcm-definition-grid"><div><strong>First-pass acceptance</strong><p>Submitted claim episodes without a recorded denial divided by submitted episodes.</p></div><div><strong>Denial rate</strong><p>Denied episodes divided by adjudicated episodes in the current synthetic view.</p></div><div><strong>Weighted A/R age</strong><p>Age multiplied by outstanding balance, divided by total outstanding balance.</p></div><div><strong>Priority score</strong><p>Balance, age, workflow holds, missing readiness evidence and filing-age risk; reduced after local review.</p></div></div></article></section>`;
  }

  function safeguardsLayer() {
    return `<section class="rcm-layer" aria-labelledby="rcmSafeguardsTitle"><div class="rcm-layer-heading"><div><p class="rcm-kicker">Standards, governance and scope</p><h3 id="rcmSafeguardsTitle">RCM method and safeguards</h3><p>This layer separates a useful operating prototype from a production billing or clearinghouse system.</p></div><button type="button" class="secondary rcm-compact" data-rcm-layer="command">Back to command</button></div>
      <div class="rcm-safeguard-grid">
        <article class="rcm-card"><span class="rcm-card-number">01</span><h4>Provider service model</h4><p>Access and authorisation; documentation readiness; claim operations; denial recovery; payment posting and A/R; patient estimates; performance reporting.</p><ul><li>Role-based work queues</li><li>Human approval at every financial decision</li><li>Site, payer and discipline visibility</li></ul></article>
        <article class="rcm-card"><span class="rcm-card-number">02</span><h4>US transaction map</h4><p>The demonstration maps eligibility, authorisation, claim, status and remittance workflows to the adopted administrative transaction families.</p><dl class="rcm-standard-map"><div><dt>270/271</dt><dd>Eligibility and benefits</dd></div><div><dt>278</dt><dd>Prior authorisation</dd></div><div><dt>837P</dt><dd>Professional claim</dd></div><div><dt>276/277</dt><dd>Claim status</dd></div><div><dt>835</dt><dd>Remittance advice</dd></div></dl></article>
        <article class="rcm-card"><span class="rcm-card-number">03</span><h4>Rehabilitation evidence controls</h4><p>Readiness prompts cover plan-of-care context, service documentation, authorisation limits, supporting information and claim edits. They do not determine medical necessity or coding.</p><ul><li>No CPT content or automated code selection</li><li>No autonomous claim or appeal submission</li><li>Local payer policy and licensed billing review required</li></ul></article>
        <article class="rcm-card"><span class="rcm-card-number">04</span><h4>FHIR planning boundary</h4><p>FHIR financial resources can support API and interoperability planning. They are not presented here as a substitute for mandated transactions, payer companion guides or testing.</p><ul><li>Claim and ClaimResponse</li><li>CoverageEligibilityRequest and Response</li><li>ExplanationOfBenefit and Task</li></ul></article>
      </div>
      <article class="rcm-card rcm-boundary-card"><div><strong>Operational boundary</strong><p>No live patient data, payer connection, eligibility response, claim submission, remittance posting, patient statement or collection activity occurs in this static prototype.</p></div><span>Configure jurisdiction, contracts, privacy, security, coding, accounting and audit controls before production use.</span></article>
      <div class="rcm-source-grid"><a href="https://www.cms.gov/priorities/key-initiatives/burden-reduction/administrative-simplification/hipaa/adopted-standards-operating-rules" target="_blank" rel="noopener noreferrer"><strong>CMS adopted standards</strong><span>Electronic administrative transactions</span></a><a href="https://www.cms.gov/files/document/mln905365-complying-outpatient-rehabilitation-therapy-documentation-requirements.pdf" target="_blank" rel="noopener noreferrer"><strong>CMS rehabilitation documentation</strong><span>Outpatient therapy claim support</span></a><a href="https://www.cms.gov/newsroom/fact-sheets/cms-interoperability-prior-authorization-final-rule-cms-0057-f" target="_blank" rel="noopener noreferrer"><strong>CMS prior authorisation</strong><span>API and process requirements</span></a><a href="https://hl7.org/fhir/R4/financial-module.html" target="_blank" rel="noopener noreferrer"><strong>HL7 FHIR financial module</strong><span>Interoperability planning resources</span></a></div>
    </section>`;
  }

  function detailLayer(claims) {
    const claim = claims.find((item) => item.id === state.selectedId);
    if (!claim) return `<section class="rcm-layer"><div class="rcm-empty-state"><h3>Select a claim</h3><p>Open an item from a work queue to review its synthetic financial and readiness evidence.</p><button type="button" class="primary" data-rcm-layer="claims">Open claims queue</button></div></section>`;
    const action = claim.action || {};
    const stage = STAGES[claim.stage] || STAGES.ready;
    const timeline = [
      [claim.serviceDate, "Service record created", `${claim.sessionCount} linked synthetic rehabilitation sessions`],
      [claim.submittedDate || isoDaysAgo(Math.max(1, claim.ageDays - 2)), claim.submittedDate ? "Claim submitted" : "Claim preparation", claim.submittedDate ? "Synthetic submission recorded" : "Awaiting readiness review"],
      [isoDaysAgo(Math.max(0, claim.ageDays - 7)), stage.label, claim.denialReason || "Current workflow state"],
    ];
    return `<section class="rcm-layer" aria-labelledby="rcmDetailTitle"><div class="rcm-detail-heading"><button type="button" class="rcm-back" data-rcm-layer="claims"><span aria-hidden="true">←</span> Back to claims</button><div><p class="rcm-kicker">Synthetic claim file</p><h3 id="rcmDetailTitle">${escapeHtml(claim.id)} · ${escapeHtml(claim.caseLabel)}</h3><p>${escapeHtml(claim.pathway)} · ${escapeHtml(claim.discipline)} · ${escapeHtml(claim.site)}</p></div>${badge(claim)}</div>
      <div class="rcm-detail-grid"><article class="rcm-card rcm-detail-primary"><div class="rcm-card-heading"><div><span>Financial summary</span><h4>Claim economics</h4></div><strong>${currency(claim.outstanding)}</strong></div><dl class="rcm-financial-grid"><div><dt>Gross charge</dt><dd>${currency(claim.charge)}</dd></div><div><dt>Allowed amount</dt><dd>${currency(claim.allowed)}</dd></div><div><dt>Contractual adjustment</dt><dd>${currency(claim.contractualAdjustment)}</dd></div><div><dt>Payer paid</dt><dd>${currency(claim.payerPaid)}</dd></div><div><dt>Patient responsibility</dt><dd>${currency(claim.patientResponsibility)}</dd></div><div><dt>Outstanding</dt><dd>${currency(claim.outstanding)}</dd></div></dl><p class="rcm-caveat">Synthetic amounts demonstrate workflow calculations only and are not fee schedules, estimates of entitlement or accounting records.</p></article>
      <article class="rcm-card"><div class="rcm-card-heading"><div><span>Explainable readiness</span><h4>Evidence checklist</h4></div><strong>${claim.checks.length - claim.missing.length}/${claim.checks.length}</strong></div><ul class="rcm-checklist">${claim.checks.map((check) => `<li class="${check.ok ? "ready" : "review"}"><span aria-hidden="true">${check.ok ? "✓" : "!"}</span><div><strong>${escapeHtml(check.label)}</strong><small>${check.ok ? "Recorded in the synthetic source" : "Human review required"}</small></div></li>`).join("")}</ul></article>
      <article class="rcm-card"><div class="rcm-card-heading"><div><span>Coverage context</span><h4>Authorisation utilisation</h4></div><strong>${claim.authorisationRemaining}</strong></div><div class="rcm-auth-meter"><div><i style="width:${percent(claim.authorisationUsed, claim.authorisationTotal)}%"></i></div><p><strong>${claim.authorisationUsed}</strong> used · <strong>${claim.authorisationRemaining}</strong> remaining · ${claim.authorisationTotal} authorised</p></div><dl class="rcm-compact-list"><div><dt>Payer</dt><dd>${escapeHtml(claim.payer)}</dd></div><div><dt>Service date</dt><dd>${shortDate(claim.serviceDate)}</dd></div><div><dt>A/R age</dt><dd>${claim.ageDays} days</dd></div><div><dt>Priority score</dt><dd>${claim.priority}</dd></div></dl></article>
      <article class="rcm-card"><div class="rcm-card-heading"><div><span>Traceability</span><h4>Workflow timeline</h4></div></div><ol class="rcm-timeline">${timeline.map(([date, title, note]) => `<li><time datetime="${escapeHtml(date)}">${shortDate(date)}</time><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(note)}</span></div></li>`).join("")}</ol></article>
      <article class="rcm-card rcm-follow-up-card"><div class="rcm-card-heading"><div><span>Local action record</span><h4>Assign and follow up</h4><p>No message is sent to a payer, patient or external service.</p></div></div><form id="rcmFollowUpForm"><input type="hidden" name="claimId" value="${escapeHtml(claim.id)}" /><div class="rcm-form-grid"><label>Team owner<select name="owner"><option value="">Unassigned</option>${["Access team", "Billing team", "Denial team", "Patient accounts", "Clinical documentation review"].map((owner) => `<option ${action.owner === owner ? "selected" : ""}>${owner}</option>`).join("")}</select></label><label>Follow-up date<input name="followUpDate" type="date" value="${escapeHtml(action.followUpDate || "")}" /></label></div><label>Internal note<textarea name="note" rows="3" maxlength="500" placeholder="Use synthetic, non-identifying workflow notes only.">${escapeHtml(action.note || "")}</textarea></label><label class="rcm-review-check"><input name="reviewed" type="checkbox" ${action.reviewed ? "checked" : ""} /><span>Mark this demonstration item reviewed</span></label><button type="submit" class="primary">Save local follow-up</button></form></article></div>
    </section>`;
  }

  function layerContent(claims, metrics) {
    if (state.layer === "coverage") return coverageLayer(claims);
    if (state.layer === "claims") return claimsLayer(claims);
    if (state.layer === "denials") return denialsLayer(claims);
    if (state.layer === "payments") return paymentsLayer(claims);
    if (state.layer === "performance") return performanceLayer(claims);
    if (state.layer === "safeguards") return safeguardsLayer();
    if (state.layer === "detail") return detailLayer(claims);
    return commandLayer(claims, metrics);
  }

  function shell() {
    const mount = $("rcmApp");
    if (!mount) return;
    mount.innerHTML = `<section class="rcm-shell" aria-labelledby="rcmTitle"><header class="rcm-topbar"><div class="rcm-title-block"><p class="rcm-kicker">Plexus RCM by Robotimize · provider-service prototype</p><h2 id="rcmTitle">${escapeHtml(translate("Revenue cycle command centre"))}</h2><p>${escapeHtml(translate("Technology-enabled revenue cycle services for rehabilitation organisations."))}</p><div class="rcm-context-chips"><span>US outpatient rehabilitation demo</span><span>${escapeHtml(translate("Synthetic financial data"))}</span><span>${escapeHtml(translate("Local workflow preview"))}</span></div></div><div class="rcm-top-actions"><button id="rcmExport" type="button" class="secondary">Export RCM snapshot</button><button id="rcmReset" type="button" class="secondary">Reset RCM actions</button></div></header><nav id="rcmLayerNav" class="rcm-layer-nav" aria-label="Revenue cycle layers">${LAYERS.map(([id, label], index) => `<button type="button" data-rcm-layer="${id}" class="${id === state.layer ? "active" : ""}" aria-pressed="${id === state.layer}" ${id === "detail" && !state.selectedId ? "disabled" : ""}><span>${String(index + 1).padStart(2, "0")}</span>${escapeHtml(translate(label))}</button>`).join("")}</nav><div id="rcmStage" class="rcm-stage" tabindex="-1"></div><footer class="rcm-footer"><p><strong>Prototype boundary:</strong> synthetic records · no payer connection · no claim submission · no patient collection activity</p><div id="rcmLive" role="status" aria-live="polite"></div></footer></section>`;
    bindShell(mount);
  }

  function render(options = {}) {
    const mount = $("rcmApp");
    if (!mount) return;
    if (!mount.querySelector(".rcm-shell") || options.rebuild) shell();
    const data = snapshot();
    const stage = $("rcmStage");
    if (stage) stage.innerHTML = layerContent(data.claims, data.metrics);
    mount.querySelectorAll("[data-rcm-layer]").forEach((button) => {
      const active = button.dataset.rcmLayer === state.layer;
      button.classList.toggle("active", active);
      if (button.closest("#rcmLayerNav")) button.setAttribute("aria-pressed", String(active));
    });
    const detailButton = mount.querySelector('#rcmLayerNav [data-rcm-layer="detail"]');
    if (detailButton) detailButton.disabled = !state.selectedId;
    root.i18n?.translatePage?.(mount);
  }

  function showLayer(layer, focus = true) {
    if (!LAYERS.some(([id]) => id === layer)) layer = "command";
    if (layer === "detail" && !state.selectedId) layer = "claims";
    state.layer = layer;
    render();
    if (focus) $("rcmStage")?.focus?.({ preventScroll: true });
  }

  function openClaim(id) {
    if (!buildClaims().some((claim) => claim.id === id)) return false;
    state.selectedId = id;
    showLayer("detail");
    return true;
  }

  function announce(message) {
    const live = $("rcmLive");
    if (live) live.textContent = message;
  }

  function exportSnapshot() {
    const data = snapshot();
    const output = {
      ...data,
      scope: "Synthetic RCM workflow demonstration only",
      jurisdictionProfile: "US outpatient rehabilitation demonstration",
      transactionMap: ["X12 270/271", "X12 278", "X12 837P", "X12 276/277", "X12 835"],
      fhirPlanningResources: ["CoverageEligibilityRequest", "Claim", "ClaimResponse", "ExplanationOfBenefit", "Task"],
    };
    if (!root.URL?.createObjectURL || !root.Blob) {
      announce("RCM snapshot prepared. Download is unavailable in this environment.");
      return output;
    }
    const link = root.document.createElement("a");
    const url = root.URL.createObjectURL(new root.Blob([JSON.stringify(output, null, 2)], { type: "application/json" }));
    link.href = url;
    link.download = `vivanteplexus-rcm-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    root.URL.revokeObjectURL(url);
    announce("Synthetic RCM snapshot exported.");
    return output;
  }

  function bindShell(mount) {
    mount.addEventListener("click", (event) => {
      const layerButton = event.target.closest?.("[data-rcm-layer]");
      if (layerButton && !layerButton.disabled) {
        showLayer(layerButton.dataset.rcmLayer);
        return;
      }
      const claimButtonElement = event.target.closest?.("[data-rcm-open]");
      if (claimButtonElement) {
        openClaim(claimButtonElement.dataset.rcmOpen);
        return;
      }
      if (event.target.closest?.("#rcmExport")) exportSnapshot();
      if (event.target.closest?.("#rcmClearFilters")) {
        state.query = "";
        state.stage = "all";
        state.payer = "all";
        render();
      }
      if (event.target.closest?.("#rcmReset")) {
        const approved = typeof root.confirm === "function" ? root.confirm("Reset all locally saved RCM follow-up actions?") : true;
        if (approved) {
          saveRcmState({ version: 1, actions: {} });
          render();
          announce("Local RCM actions reset.");
        }
      }
    });
    mount.addEventListener("submit", (event) => {
      if (event.target.id === "rcmFilters") {
        event.preventDefault();
        state.query = $("rcmSearch")?.value || "";
        state.stage = $("rcmStageFilter")?.value || "all";
        state.payer = $("rcmPayerFilter")?.value || "all";
        render();
        return;
      }
      if (event.target.id === "rcmFollowUpForm") {
        event.preventDefault();
        const form = event.target;
        const data = new root.FormData(form);
        const claimId = String(data.get("claimId") || "");
        const saved = readRcmState();
        saved.actions[claimId] = {
          owner: String(data.get("owner") || ""),
          followUpDate: String(data.get("followUpDate") || ""),
          note: String(data.get("note") || "").slice(0, 500),
          reviewed: data.get("reviewed") === "on",
          updatedAt: new Date().toISOString(),
        };
        saveRcmState(saved);
        render();
        announce(`${claimId} follow-up saved locally.`);
      }
    });
  }

  function init() {
    const mount = $("rcmApp");
    if (!mount || mount.dataset.rcmReady) return;
    mount.dataset.rcmReady = BUILD;
    shell();
    render();
    root.document.querySelector('[data-tab="rcm"]')?.addEventListener("click", render);
    root.addEventListener?.("languagechange", () => render({ rebuild: true }));
    root.addEventListener?.("storage", (event) => {
      if (event.key === APP_KEY || event.key === RCM_KEY) render();
    });
  }

  root.PlexusRCM = { init, render, showLayer, openClaim, getSnapshot: snapshot, exportSnapshot };
  if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})(globalThis);
