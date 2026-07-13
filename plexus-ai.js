(function () {
  "use strict";

  const METHOD_VERSION = "Plexus Signals ruleset 1.0 · 13 July 2026";
  const DAY_INDEX = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7 };
  const severityRank = { risk: 3, warning: 2, info: 1, good: 0 };

  const mean = (values) => {
    const clean = values.map(Number).filter(Number.isFinite);
    return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0;
  };
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
  const round = (value, digits = 0) => Number(value).toFixed(digits);
  const isoDate = (date) => date.toISOString().slice(0, 10);
  const parseDate = (value) => new Date(`${value}T12:00:00`);
  const latestFirst = (a, b) => String(b.date).localeCompare(String(a.date));
  const actionKey = (signal) => `${signal.caseId}:${signal.id}`;

  function plannedDays(c) {
    const raw = Array.isArray(c.plannedDays)
      ? c.plannedDays
      : String(c.plannedDays || "Mon, Wed, Fri").split(/[,;/|]+/);
    const days = raw
      .map((value) => DAY_INDEX[String(value).trim().slice(0, 3).toLowerCase()])
      .filter((value) => Number.isInteger(value));
    return [...new Set(days)].sort((a, b) => a - b);
  }

  function weekProgressFor(c, reference = new Date()) {
    const days = plannedDays(c);
    if (!days.length) return 0;
    const todayIndex = reference.getDay() || 7;
    const elapsed = days.filter((day) => day <= todayIndex).length;
    return elapsed / days.length;
  }

  function weekProgress() {
    const cases = typeof scope === "function" ? scope() : state.cases;
    if (!cases.length) return 0;
    return mean(cases.map((c) => weekProgressFor(c)));
  }

  function dataCompleteness(c, sessions, outcomes) {
    const programmeFields = [
      c.diagnosis,
      c.phase,
      c.domain,
      c.primaryGoal,
      c.weeklyMinutes,
      c.weeklyReps,
      c.reviewDate,
      c.plannedDays,
    ];
    const latest = sessions.slice().sort(latestFirst).slice(0, 3);
    const requiredSessionFields = latest.flatMap((s) => [
      s.date,
      s.activeMinutes,
      s.reps,
      s.quality,
      s.fatigue,
      s.pain,
      s.carryover,
      s.specificity,
    ]);
    const total = programmeFields.length + Math.max(8, requiredSessionFields.length) + 2;
    const present = programmeFields.filter((value) => value !== "" && value != null).length +
      requiredSessionFields.filter((value) => value !== "" && value != null).length +
      (outcomes.length ? 2 : 0);
    return clamp(Math.round((present / total) * 100));
  }

  function equipmentNamesFor(sessions) {
    const ids = [...new Set(sessions.flatMap((s) => s.equipmentIds || []))];
    return ids.map((id) => getEquipment(id)?.name).filter(Boolean);
  }

  function buildSignal(c, base, context) {
    const severity = base.severity || "warning";
    return {
      caseId: c.id,
      case: c,
      severity,
      score: base.score + (base.persistence > 1 ? Math.min(8, base.persistence * 2) : 0),
      type: base.type || "Rule",
      category: base.category,
      id: base.id,
      title: base.title,
      summary: base.summary,
      why: base.why,
      review: base.review,
      evidence: base.evidence || [],
      calculation: base.calculation,
      persistence: base.persistence || 1,
      completeness: context.completeness,
      equipment: context.equipment,
      lastSession: context.lastSession,
      timeWindow: base.timeWindow || "Current programme week",
    };
  }

  function caseSignals(c) {
    const sessions = sessionsFor(c.id).slice().sort(latestFirst);
    const weekly = sessions.filter((s) => inWeek(s.date));
    const outcomes = outcomesFor(c.id).slice().sort(latestFirst);
    const pace = weekProgressFor(c);
    const active = weekly.reduce((sum, s) => sum + n(s.activeMinutes), 0);
    const reps = weekly.reduce((sum, s) => sum + n(s.reps), 0);
    const expectedMinutes = Math.round(n(c.weeklyMinutes) * pace);
    const expectedReps = Math.round(n(c.weeklyReps) * pace);
    const minutePace = expectedMinutes ? active / expectedMinutes : null;
    const repPace = expectedReps ? reps / expectedReps : null;
    const equipment = equipmentNamesFor(sessions.slice(0, 6));
    const completeness = dataCompleteness(c, sessions, outcomes);
    const context = { completeness, equipment, lastSession: sessions[0] || null };
    const signals = [];

    const highPain = weekly.filter((s) => n(s.pain) >= 7);
    if (highPain.length) {
      signals.push(buildSignal(c, {
        id: "pain-tolerance",
        category: "Tolerance",
        type: "Rule",
        severity: highPain.length >= 2 ? "risk" : "warning",
        score: 94,
        persistence: highPain.length,
        title: "Pain tolerance threshold crossed",
        summary: `${highPain.length} current-week session${highPain.length === 1 ? "" : "s"} recorded pain at or above 7/10.`,
        why: "This pattern may warrant a clinician check of tolerance, context and data validity.",
        review: "Review the source session, precautions and clinical context before deciding whether the signal is meaningful.",
        evidence: highPain.slice(0, 3).map((s) => `${fmt(s.date)} · pain ${s.pain}/10 · ${s.task}`),
        calculation: `Count(pain ≥ 7/10) = ${highPain.length}. Escalation appears only when the threshold persists across at least two sessions.`,
      }, context));
    }

    const tolerance = weekly.filter((s) => n(s.fatigue) >= 8 && n(s.quality) <= 2);
    if (tolerance.length) {
      signals.push(buildSignal(c, {
        id: "fatigue-quality",
        category: "Tolerance",
        type: "Rule",
        severity: tolerance.length >= 2 ? "risk" : "warning",
        score: 89,
        persistence: tolerance.length,
        title: "Fatigue and movement quality coupled",
        summary: `${tolerance.length} current-week session${tolerance.length === 1 ? "" : "s"} combined fatigue ≥8/10 with quality ≤2/5.`,
        why: "The coupled values could reflect tolerance, task grading, device setup or incomplete context.",
        review: "Inspect the source records and decide whether the pattern requires follow-up.",
        evidence: tolerance.slice(0, 3).map((s) => `${fmt(s.date)} · fatigue ${s.fatigue}/10 · quality ${s.quality}/5`),
        calculation: `Count(fatigue ≥ 8 AND quality ≤ 2) = ${tolerance.length}.`,
      }, context));
    }

    if (sessions.length >= 4) {
      const recent = sessions.slice(0, 2);
      const previous = sessions.slice(2, 4);
      const qualityChange = mean(recent.map((s) => s.quality)) - mean(previous.map((s) => s.quality));
      const fatigueChange = mean(recent.map((s) => s.fatigue)) - mean(previous.map((s) => s.fatigue));
      if (qualityChange <= -0.5 && fatigueChange >= 1) {
        signals.push(buildSignal(c, {
          id: "tolerance-trend",
          category: "Trajectory",
          type: "Trend",
          severity: "warning",
          score: 82,
          persistence: 2,
          title: "Recent tolerance trend changed",
          summary: `Mean quality changed ${round(qualityChange, 1)} points while fatigue changed +${round(fatigueChange, 1)} across the two most recent sessions.`,
          why: "A within-case change can be more informative than a cross-case average, but two sessions remain a limited window.",
          review: "Compare the four source sessions and confirm whether task, assistance or setting changed.",
          evidence: [
            `Recent: quality ${round(mean(recent.map((s) => s.quality)), 1)}/5 · fatigue ${round(mean(recent.map((s) => s.fatigue)), 1)}/10`,
            `Previous: quality ${round(mean(previous.map((s) => s.quality)), 1)}/5 · fatigue ${round(mean(previous.map((s) => s.fatigue)), 1)}/10`,
          ],
          calculation: "Difference of the two-session recent mean and the preceding two-session mean; threshold = quality ≤ −0.5 and fatigue ≥ +1.0.",
          timeWindow: `${fmt(previous.at(-1).date)} to ${fmt(recent[0].date)}`,
        }, context));
      }
    }

    if (pace > 0 && ((minutePace != null && minutePace < 0.75) || (repPace != null && repPace < 0.75))) {
      const worst = Math.min(minutePace ?? 1, repPace ?? 1);
      signals.push(buildSignal(c, {
        id: "dose-pace",
        category: "Dose pace",
        type: "Rule",
        severity: worst < 0.4 && pace >= 0.5 ? "risk" : "warning",
        score: 68 + Math.round((1 - worst) * 12),
        persistence: weekly.length ? 1 : 2,
        title: "Dose is behind expected pace",
        summary: `${active} active minutes and ${reps} repetitions against ${expectedMinutes} minutes and ${expectedReps} repetitions expected by now.`,
        why: "The comparison uses elapsed planned treatment days, so early-week records are not judged against the full weekly target.",
        review: "Check recording completeness and the planned schedule before interpreting the pace variance.",
        evidence: [
          `${Math.round((minutePace || 0) * 100)}% of expected active minutes`,
          `${Math.round((repPace || 0) * 100)}% of expected repetitions`,
          `Planned days: ${plannedDays(c).map((day) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]).join(", ")}`,
        ],
        calculation: `Expected to date = weekly target × elapsed planned days / total planned days. Pace threshold = actual < 75% of expected.`,
      }, context));
    }

    const carryAssessed = weekly.filter((s) => s.carryover && s.carryover !== "Not assessed");
    const carryPositive = carryAssessed.filter((s) => s.carryover === "Yes, in daily activity" || s.carryover === "Partial");
    if (carryAssessed.length >= 2 && carryPositive.length === 0) {
      signals.push(buildSignal(c, {
        id: "carryover",
        category: "Carryover",
        type: "Rule",
        severity: "warning",
        score: 64,
        persistence: carryAssessed.length,
        title: "Functional carryover not observed",
        summary: `${carryAssessed.length} assessed sessions recorded no full or partial carryover.`,
        why: "The signal separates therapy exposure from transfer into daily activity.",
        review: "Confirm how carryover was assessed and whether the home or community context is represented.",
        evidence: carryAssessed.slice(0, 3).map((s) => `${fmt(s.date)} · ${s.carryover} · ${s.task}`),
        calculation: "At least two assessed current-week sessions AND zero marked Yes or Partial.",
      }, context));
    }

    const due = daysUntil(c.reviewDate);
    if (due != null && due <= 0) {
      signals.push(buildSignal(c, {
        id: "review-due",
        category: "Trajectory",
        type: "Rule",
        severity: due <= -14 ? "warning" : "info",
        score: 49 + Math.min(12, Math.abs(due)),
        persistence: Math.max(1, Math.ceil(Math.abs(due) / 7)),
        title: "Programme review is due",
        summary: `The review date was ${fmt(c.reviewDate)}${due < 0 ? ` (${Math.abs(due)} days ago)` : ""}.`,
        why: "A due review can affect whether goals, dose targets and outcome measures still match the programme.",
        review: "Confirm the review status and update the programme record if appropriate.",
        evidence: [`Review date: ${fmt(c.reviewDate)}`, `${outcomes.length} linked outcome record${outcomes.length === 1 ? "" : "s"}`],
        calculation: "Calendar date comparison only; it does not infer clinical deterioration.",
      }, context));
    }

    if (sessions.length < 2 || outcomes.length === 0 || completeness < 65) {
      signals.push(buildSignal(c, {
        id: "data-readiness",
        category: "Data quality",
        type: "Rule",
        severity: "info",
        score: 28,
        persistence: 1,
        title: "Not enough complete data",
        summary: `Data completeness is ${completeness}% with ${sessions.length} session and ${outcomes.length} outcome record${outcomes.length === 1 ? "" : "s"}.`,
        why: "Missing context limits interpretation and should not be presented as a normal or on-track result.",
        review: "Add or verify missing structured records before relying on longitudinal signals.",
        evidence: [`Sessions: ${sessions.length}`, `Outcomes: ${outcomes.length}`, `Completeness: ${completeness}%`],
        calculation: "Completeness checks programme context, recent dose/tolerance fields and at least one linked outcome.",
      }, context));
    }

    if (!signals.length) {
      signals.push(buildSignal(c, {
        id: "no-active-signal",
        category: "Data quality",
        type: "Rule",
        severity: "good",
        score: 0,
        title: "No active review signal",
        summary: "Current records do not cross this prototype's configured review thresholds.",
        why: "This means no configured rule fired; it is not a clinical clearance.",
        review: "Continue clinician-led review and data collection.",
        evidence: [`Data completeness: ${completeness}%`],
        calculation: "No configured rule or trend threshold crossed.",
      }, context));
    }

    return signals.sort((a, b) => b.score - a.score || severityRank[b.severity] - severityRank[a.severity]);
  }

  function actionFor(signal) {
    return state.aiActions?.[actionKey(signal)] || null;
  }

  function isActive(signal) {
    const action = actionFor(signal);
    if (!action) return signal.severity !== "good";
    if (action.status === "deferred" && action.deferUntil && action.deferUntil <= today()) return true;
    return false;
  }

  function activeSignals(limit = 5) {
    const cases = typeof scope === "function" ? scope() : state.cases;
    const primary = cases
      .map((c) => caseSignals(c).find(isActive))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || severityRank[b.severity] - severityRank[a.severity] || a.case.label.localeCompare(b.case.label));
    return Number.isFinite(limit) ? primary.slice(0, limit) : primary;
  }

  function recordAction(signal, action, reason = "") {
    state.aiActions ||= {};
    const record = {
      signalId: signal.id,
      caseId: signal.caseId,
      caseLabel: signal.case.label,
      signalTitle: signal.title,
      status: action,
      reason,
      at: new Date().toISOString(),
    };
    if (action === "deferred") {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      record.deferUntil = isoDate(date);
    }
    state.aiActions[actionKey(signal)] = record;
    save();
    render();
    status(action === "accepted" ? "Signal accepted and recorded." : action === "dismissed" ? "Signal dismissed and recorded." : "Signal deferred for 7 days.");
  }

  function queueCard(signal, index) {
    const secondary = caseSignals(signal.case).filter((item) => item.id !== signal.id && item.severity !== "good");
    const equipment = signal.equipment.length ? signal.equipment.join(", ") : "No linked equipment in recent records";
    return `<article class="ai-signal-card ${signal.severity}" data-signal-key="${e(actionKey(signal))}">
      <div class="signal-rank">${index + 1}</div>
      <div class="signal-body">
        <div class="signal-header"><div><div class="signal-labels"><span class="signal-type">${e(signal.type)}</span><span class="badge ${e(signal.severity)}">${e(signal.severity)}</span>${signal.persistence > 1 ? `<span class="persistence-chip">Persistent ×${signal.persistence}</span>` : ""}</div><h3>${e(signal.title)}</h3><p class="case-context"><strong>${e(signal.case.label)}</strong> · ${e(signal.case.diagnosis)} · ${e(signal.case.phase)}</p></div><span class="signal-score" title="Transparent prioritisation score">${signal.score}</span></div>
        <p>${e(signal.summary)}</p>
        <dl class="signal-meta"><div><dt>Goal</dt><dd>${e(signal.case.primaryGoal)}</dd></div><div><dt>Equipment</dt><dd>${e(equipment)}</dd></div><div><dt>Window</dt><dd>${e(signal.timeWindow)}</dd></div><div><dt>Data completeness</dt><dd>${signal.completeness}%</dd></div></dl>
        <details class="calculation"><summary>View evidence &amp; calculation</summary><p><strong>Why it may matter:</strong> ${e(signal.why)}</p><ul>${signal.evidence.map((item) => `<li>${e(item)}</li>`).join("")}</ul><p><strong>Calculation:</strong> ${e(signal.calculation)}</p><p><strong>Clinician review:</strong> ${e(signal.review)}</p>${secondary.length ? `<p><strong>${secondary.length} grouped secondary signal${secondary.length === 1 ? "" : "s"}:</strong> ${secondary.map((item) => e(item.title)).join(" · ")}</p>` : ""}</details>
        <div class="signal-actions"><button type="button" class="primary small" data-ai-action="review" data-case-id="${e(signal.caseId)}">Review case</button><button type="button" class="secondary small" data-ai-action="accepted">Accept</button><button type="button" class="secondary small" data-ai-action="deferred">Defer 7 days</button><label class="dismiss-control"><span class="sr-only">Dismissal reason</span><select data-dismiss-reason><option>Not clinically relevant</option><option>Known and already managed</option><option>Data entry issue</option><option>Duplicate signal</option></select><button type="button" class="secondary small" data-ai-action="dismissed">Dismiss</button></label></div>
      </div>
    </article>`;
  }

  function renderQueue() {
    const target = $("insights");
    if (!target) return;
    const signals = activeSignals(5);
    target.innerHTML = signals.length
      ? signals.map(queueCard).join("")
      : `<div class="empty-state"><strong>No active signals in this view</strong><p>All configured signals have been actioned, deferred, or no threshold is currently crossed. This is not a clinical clearance.</p></div>`;
  }

  function renderBrief() {
    const target = $("aiClinicalBrief");
    if (!target) return;
    const signal = activeSignals(1)[0];
    if (!signal) {
      target.innerHTML = `<div class="empty-state"><strong>No active brief</strong><p>Select another case or review the clinician audit history.</p></div>`;
      return;
    }
    target.innerHTML = `<div class="brief-priority"><span class="badge ${e(signal.severity)}">${e(signal.severity)} priority</span><span>${e(signal.type)} · updated ${fmt(today())}</span></div>
      <h3>${e(signal.case.label)}</h3><p class="brief-context">${e(signal.case.diagnosis)} · ${e(signal.case.phase)} · ${e(signal.case.domain)}</p>
      <div class="brief-block"><span>What changed</span><p>${e(signal.summary)}</p></div>
      <div class="brief-block"><span>Why it may matter</span><p>${e(signal.why)}</p></div>
      <div class="brief-block"><span>Evidence</span><ul>${signal.evidence.map((item) => `<li>${e(item)}</li>`).join("")}</ul></div>
      <div class="brief-uncertainty"><strong>Uncertainty</strong><span>Data completeness ${signal.completeness}%</span><span>${signal.type === "Trend" ? "Short within-case trend window" : "Configured deterministic rule"}</span></div>
      <p class="brief-boundary">Clinician interpretation required. This structured summary does not diagnose, predict recovery or recommend treatment.</p>`;
  }

  function deviceMetrics() {
    return state.equipment.map((item) => {
      const sessions = state.sessions.filter((s) => (s.equipmentIds || []).includes(item.id));
      const scheduled = sessions.reduce((sum, s) => sum + n(s.minutes), 0);
      const active = sessions.reduce((sum, s) => sum + n(s.activeMinutes), 0);
      const valid = sessions.reduce((sum, s) => sum + n(s.reps), 0);
      const attempted = sessions.reduce(
        (sum, s) => sum + (s.attemptedReps == null ? n(s.reps) : n(s.attemptedReps)),
        0,
      );
      const contributions = sessions
        .map((s) =>
          s.activeContribution == null ? NaN : Number(s.activeContribution),
        )
        .filter(Number.isFinite);
      const calibrationIssues = sessions.filter((s) => s.calibrationStatus && s.calibrationStatus !== "Valid" && s.calibrationStatus !== "Not recorded").length;
      return {
        item,
        sessions,
        scheduled,
        active,
        conversion: scheduled ? Math.round((active / scheduled) * 100) : 0,
        valid,
        attempted,
        validRate: attempted ? Math.round((valid / attempted) * 100) : 0,
        contribution: contributions.length ? Math.round(mean(contributions)) : null,
        fatigue: sessions.length ? mean(sessions.map((s) => s.fatigue)) : 0,
        calibrationIssues,
      };
    }).sort((a, b) => b.sessions.length - a.sessions.length || b.conversion - a.conversion);
  }

  function renderDeviceIQ() {
    const target = $("deviceIntelligence");
    if (!target) return;
    const metrics = deviceMetrics();
    target.innerHTML = metrics.length
      ? metrics.map((metric) => `<article class="device-iq-card"><div class="device-iq-head"><div><span class="device-category">${e(metric.item.category)}</span><h3>${e(metric.item.name)}</h3></div><span class="badge ${metric.calibrationIssues ? "warning" : "good"}">${metric.calibrationIssues ? `${metric.calibrationIssues} data check${metric.calibrationIssues === 1 ? "" : "s"}` : "No recorded data flags"}</span></div><div class="device-metrics"><div><strong>${metric.sessions.length}</strong><span>linked sessions</span></div><div><strong>${metric.conversion}%</strong><span>active conversion</span></div><div><strong>${metric.validRate}%</strong><span>valid / attempted reps</span></div><div><strong>${metric.contribution == null ? "—" : `${metric.contribution}%`}</strong><span>active contribution</span></div></div><p>${metric.valid.toLocaleString()} valid repetitions · mean fatigue ${round(metric.fatigue, 1)}/10</p></article>`).join("")
      : `<p class="empty">No equipment records available.</p>`;
  }

  function renderSignalSummary() {
    const target = $("aiSignalSummary");
    if (!target) return;
    const primary = (typeof scope === "function" ? scope() : state.cases).map((c) => caseSignals(c)[0]).filter(Boolean);
    const definitions = [
      ["Dose pace", "Dose pace", "Expected dose based on elapsed planned treatment days"],
      ["Tolerance", "Tolerance", "Pain and fatigue–quality coupling from session records"],
      ["Trajectory", "Trajectory", "Within-case change and overdue programme reviews"],
      ["Data quality", "Data quality", "Missing context and data-readiness checks"],
    ];
    target.innerHTML = definitions.map(([category, title, description]) => {
      const count = primary.filter((signal) => signal.category === category).length;
      return `<article class="ai-family-card"><div><span>${e(category === "Trajectory" ? "Trend + Rule" : "Rule")}</span><strong>${count}</strong></div><h3>${e(title)}</h3><p>${e(description)}</p></article>`;
    }).join("");
  }

  function renderAudit() {
    const target = $("aiAuditLog");
    if (!target) return;
    const records = Object.values(state.aiActions || {}).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 5);
    target.innerHTML = records.length
      ? `<ul class="audit-list">${records.map((record) => `<li><strong>${e(record.caseLabel)}</strong><span>${e(record.status)} · ${fmt(String(record.at).slice(0, 10))}</span><small>${e(record.signalTitle)}${record.reason ? ` · ${e(record.reason)}` : ""}</small></li>`).join("")}</ul>`
      : `<p class="empty">No signal decisions recorded.</p>`;
  }

  function ensureProgrammePaceField() {
    if ($("plannedDays")) return;
    const reviewDate = $("reviewDate");
    const row = reviewDate?.closest(".grid-2, .grid-3");
    if (!row) return;
    row.classList.remove("grid-2");
    row.classList.add("grid-3");
    const label = document.createElement("label");
    label.innerHTML = `Planned treatment days <input id="plannedDays" type="text" value="Mon, Wed, Fri" placeholder="e.g. Mon, Wed, Fri" maxlength="48" />`;
    row.insertBefore(label, row.children[1] || null);
  }

  function queryResults(query) {
    const value = String(query || "").trim();
    const lower = value.toLowerCase();
    const allSignals = activeSignals(Infinity);
    const domain = lower.includes("gait") ? "Gait" : lower.includes("upper limb") || lower.includes("hand") ? "Upper limb" : null;
    const filtered = domain ? allSignals.filter((signal) => signal.case.domain === domain) : allSignals;

    if (/device|equipment|conversion|robot/.test(lower)) {
      const rows = deviceMetrics().filter((metric) => metric.sessions.length).sort((a, b) => b.conversion - a.conversion).slice(0, 5);
      return {
        intent: "Rank device-linked sessions by active-practice conversion",
        method: "For each equipment item: Σ active minutes ÷ Σ scheduled minutes. Session-derived; no model inference.",
        items: rows.map((metric) => `<strong>${e(metric.item.name)}</strong> — ${metric.conversion}% conversion across ${metric.sessions.length} linked sessions; ${metric.validRate}% valid/attempted repetitions.`),
      };
    }

    let matches = filtered;
    let intent = domain ? `Find ${domain.toLowerCase()} cases with active signals` : "Rank active case signals";
    let method = "One highest-scoring active signal per case; deterministic priority score shown on each queue card.";
    if (/fatigue|quality|tolerance|pain/.test(lower)) {
      matches = filtered.filter((signal) => signal.category === "Tolerance" || signal.id === "tolerance-trend");
      intent = "Find coupled tolerance thresholds or recent fatigue/quality change";
      method = "Configured thresholds plus the difference between the latest two-session mean and the preceding two-session mean.";
    } else if (/dose|pace|minute|repetition|rep/.test(lower)) {
      matches = filtered.filter((signal) => signal.id === "dose-pace");
      intent = `${domain ? `${domain} · ` : ""}find cases below expected dose pace`;
      method = "Expected to date = weekly target × elapsed planned treatment days ÷ total planned treatment days; flag below 75%.";
    } else if (/overdue|review|outcome/.test(lower)) {
      matches = filtered.filter((signal) => signal.id === "review-due" || signal.category === "Trajectory");
      intent = "Find due reviews and trajectory signals";
      method = "Calendar comparison for programme review dates plus transparent within-case trend rules.";
    } else if (/carry|transfer|daily/.test(lower)) {
      matches = filtered.filter((signal) => signal.id === "carryover");
      intent = "Find cases without observed functional carryover";
      method = "At least two assessed current-week sessions and none marked full or partial carryover.";
    }
    return {
      intent,
      method,
      items: matches.slice(0, 5).map((signal) => `<strong>${e(signal.case.label)}</strong> — ${e(signal.title)}. ${e(signal.summary)}`),
    };
  }

  function runQuery(query) {
    const target = $("aiQueryResult");
    if (!target) return;
    const result = queryResults(query);
    target.innerHTML = `<div class="query-interpretation"><span>Interpreted as</span><strong>${e(result.intent)}</strong></div>${result.items.length ? `<ol>${result.items.map((item) => `<li>${item}</li>`).join("")}</ol>` : `<p>No matching active signals were found in the selected scope.</p>`}<p class="query-method"><strong>Method shown:</strong> ${e(result.method)} <span>No external request was made.</span></p>`;
  }

  function bindEvents() {
    $("aiQueryForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      runQuery($("aiQueryInput").value);
    });
    document.querySelectorAll("[data-ai-query]").forEach((button) => button.addEventListener("click", () => {
      $("aiQueryInput").value = button.dataset.aiQuery;
      runQuery(button.dataset.aiQuery);
    }));
    document.querySelectorAll("[data-open-tab]").forEach((link) => link.addEventListener("click", (event) => {
      event.preventDefault();
      tab(link.dataset.openTab, "push");
    }));
    $("insights")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-ai-action]");
      if (!button) return;
      const card = button.closest("[data-signal-key]");
      const signal = activeSignals(Infinity).find((item) => actionKey(item) === card?.dataset.signalKey);
      if (!signal) return;
      if (button.dataset.aiAction === "review") {
        $("reviewCaseFilter").value = signal.caseId;
        render();
        $("aiClinicalBrief")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
        status(`Reviewing ${signal.case.label}.`);
        return;
      }
      const reason = button.dataset.aiAction === "dismissed"
        ? card.querySelector("[data-dismiss-reason]")?.value || "Not clinically relevant"
        : button.dataset.aiAction === "accepted"
          ? "Reviewed by clinician"
          : "Deferred by clinician";
      recordAction(signal, button.dataset.aiAction, reason);
    });
  }

  function legacyReviewFor(c) {
    const signals = caseSignals(c);
    return signals.map((signal) => ({
      severity: signal.severity,
      title: signal.title,
      trigger: signal.summary,
      review: signal.review,
    }));
  }

  function renderAll() {
    renderQueue();
    renderBrief();
    renderSignalSummary();
    renderDeviceIQ();
    renderAudit();
    if ($("aiMethodVersion")) $("aiMethodVersion").textContent = `${METHOD_VERSION} · Local browser execution · No external model endpoint`;
  }

  state.aiActions ||= {};
  globalThis.PlexusAI = {
    METHOD_VERSION,
    activeSignals,
    caseSignals,
    deviceMetrics,
    legacyReviewFor,
    queryResults,
    render: renderAll,
    renderQueue,
    runQuery,
    weekProgress,
    weekProgressFor,
  };

  document.addEventListener("DOMContentLoaded", () => {
    ensureProgrammePaceField();
    bindEvents();
    renderAll();
    runQuery("Which cases need review first?");
    globalThis.i18n?.translatePage();
  });
})();
