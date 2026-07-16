(function (root) {
  "use strict";

  const APP_KEY = "vivantePlexus.v1";
  const FEEDBACK_KEY = "vivantePlexus.aiLab.v1";
  const BUILD = "20260716-2";
  const MODES = [
    ["trajectory", "Trajectory"],
    ["cohort", "Cohort"],
    ["scenario", "Scenario"],
    ["value", "Value"],
    ["assurance", "Assurance"],
  ];
  const TRANSLATIONS = {
    "Explainable intelligence studio": ["可解释智能工作室", "Estudio de inteligencia explicable", "Studio d’intelligence explicable", "Studio für erklärbare Intelligenz", "Studio kecerdasan boleh dijelaskan"],
    "Trajectory": ["轨迹", "Trayectoria", "Trajectoire", "Verlauf", "Trajektori"],
    "Cohort": ["队列", "Cohorte", "Cohorte", "Kohorte", "Kohort"],
    "Scenario": ["情景", "Escenario", "Scénario", "Szenario", "Senario"],
    "Value": ["价值", "Valor", "Valeur", "Wert", "Nilai"],
    "Assurance": ["保障", "Garantía", "Assurance", "Absicherung", "Jaminan"],
    "Synthetic data only": ["仅合成数据", "Solo datos sintéticos", "Données synthétiques uniquement", "Nur synthetische Daten", "Data sintetik sahaja"],
    "Human review required": ["需要人工审核", "Revisión humana obligatoria", "Révision humaine requise", "Menschliche Prüfung erforderlich", "Semakan manusia diperlukan"],
    "Select case": ["选择案例", "Seleccionar caso", "Sélectionner le cas", "Fall auswählen", "Pilih kes"],
  };

  const ui = {
    mode: "trajectory",
    caseId: "",
    scenario: null,
  };

  const $ = (id) => root.document.getElementById(id);
  const e = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const n = (value) => Number(value) || 0;
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
  const sum = (items, read = (item) => item) => items.reduce((total, item, index) => total + n(read(item, index)), 0);
  const mean = (values) => {
    const clean = values.map(Number).filter(Number.isFinite);
    return clean.length ? clean.reduce((total, value) => total + value, 0) / clean.length : 0;
  };
  const median = (values) => {
    const clean = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    if (!clean.length) return 0;
    const middle = Math.floor(clean.length / 2);
    return clean.length % 2 ? clean[middle] : (clean[middle - 1] + clean[middle]) / 2;
  };
  const round = (value, digits = 0) => Number(n(value).toFixed(digits));
  const numeric = (value) => {
    const match = String(value ?? "").replaceAll(",", "").match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  };
  const locale = () => root.i18n?.locale?.() || "en-US";
  const t = (source) => {
    const language = root.i18n?.language || "en";
    if (language === "en" || !TRANSLATIONS[source]) return root.i18n?.translateText?.(source) || source;
    const index = { "zh-Hans": 0, es: 1, fr: 2, de: 3, ms: 4 }[language];
    return TRANSLATIONS[source][index] || source;
  };
  const formatNumber = (value, digits = 0) => new Intl.NumberFormat(locale(), {
    maximumFractionDigits: digits,
  }).format(n(value));
  const shortDate = (value) => {
    if (!value) return "Not recorded";
    return new Intl.DateTimeFormat(locale(), { month: "short", day: "numeric", year: "numeric" })
      .format(new Date(`${value}T12:00:00`));
  };

  function readData() {
    try {
      const parsed = JSON.parse(root.localStorage.getItem(APP_KEY));
      return parsed && Array.isArray(parsed.cases) && Array.isArray(parsed.sessions) && Array.isArray(parsed.outcomes)
        ? parsed
        : { cases: [], sessions: [], outcomes: [], equipment: [], aiActions: {} };
    } catch {
      return { cases: [], sessions: [], outcomes: [], equipment: [], aiActions: {} };
    }
  }

  function readFeedback() {
    try {
      const parsed = JSON.parse(root.localStorage.getItem(FEEDBACK_KEY));
      return parsed && parsed.version === 1 && parsed.items && typeof parsed.items === "object"
        ? parsed
        : { version: 1, items: {} };
    } catch {
      return { version: 1, items: {} };
    }
  }

  function saveFeedback(next) {
    try {
      root.localStorage.setItem(FEEDBACK_KEY, JSON.stringify(next));
    } catch {
      // The analytical preview remains readable when browser storage is unavailable.
    }
  }

  function sessionsFor(data, caseId, ascending = true) {
    return data.sessions
      .filter((session) => session.caseId === caseId)
      .sort((a, b) => ascending
        ? String(a.date).localeCompare(String(b.date))
        : String(b.date).localeCompare(String(a.date)));
  }

  function outcomesFor(data, caseId) {
    return data.outcomes
      .filter((outcome) => outcome.caseId === caseId)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  function progressFor(outcome) {
    const baseline = numeric(outcome.baseline);
    const current = numeric(outcome.current);
    const target = numeric(outcome.target);
    if (![baseline, current, target].every(Number.isFinite) || target === baseline || outcome.direction === "Goal-specific") return null;
    const direction = outcome.direction === "Lower is better" ? -1 : 1;
    return clamp(((current - baseline) * direction) / ((target - baseline) * direction) * 100, -100, 200);
  }

  function linearModel(values, bounds = [-Infinity, Infinity]) {
    const clean = values.map(Number).filter(Number.isFinite);
    if (clean.length < 3) return null;
    const xMean = (clean.length - 1) / 2;
    const yMean = mean(clean);
    let numerator = 0;
    let denominator = 0;
    clean.forEach((value, index) => {
      numerator += (index - xMean) * (value - yMean);
      denominator += (index - xMean) ** 2;
    });
    const slope = denominator ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;
    const fitted = clean.map((_, index) => intercept + slope * index);
    const residuals = clean.map((value, index) => Math.abs(value - fitted[index]));
    const ssResidual = sum(clean, (value, index) => (value - fitted[index]) ** 2);
    const ssTotal = sum(clean, (value) => (value - yMean) ** 2);
    const r2 = ssTotal ? clamp(1 - ssResidual / ssTotal, 0, 1) : 0;
    const rawPrediction = intercept + slope * clean.length;
    const spread = Math.max(mean(residuals) * 1.65, (Math.max(...clean) - Math.min(...clean)) * .12, Math.abs(yMean) * .05, .25);
    const prediction = clamp(rawPrediction, bounds[0], bounds[1]);
    return {
      count: clean.length,
      slope,
      prediction,
      low: clamp(rawPrediction - spread, bounds[0], bounds[1]),
      high: clamp(rawPrediction + spread, bounds[0], bounds[1]),
      r2,
      values: clean,
    };
  }

  function latestMetrics(data, caseId) {
    const recent = sessionsFor(data, caseId, false).slice(0, 3);
    const scheduled = sum(recent, (session) => session.minutes);
    return {
      active: mean(recent.map((session) => session.activeMinutes)),
      repetitions: mean(recent.map((session) => session.reps)),
      quality: mean(recent.map((session) => session.quality)),
      fatigue: mean(recent.map((session) => session.fatigue)),
      pain: mean(recent.map((session) => session.pain)),
      conversion: scheduled ? sum(recent, (session) => session.activeMinutes) / scheduled * 100 : 0,
      sessions: recent.length,
    };
  }

  function dataQuality(data, caseRecord) {
    const sessions = sessionsFor(data, caseRecord.id, false);
    const outcomes = outcomesFor(data, caseRecord.id);
    const caseFields = [caseRecord.diagnosis, caseRecord.phase, caseRecord.domain, caseRecord.primaryGoal, caseRecord.weeklyMinutes, caseRecord.weeklyReps, caseRecord.reviewDate, caseRecord.plannedDays];
    const sessionFields = sessions.flatMap((session) => [session.date, session.minutes, session.activeMinutes, session.reps, session.quality, session.fatigue, session.pain, session.carryover]);
    const outcomeFields = outcomes.flatMap((outcome) => [outcome.name, outcome.baseline, outcome.current, outcome.target, outcome.direction]);
    const all = [...caseFields, ...sessionFields, ...outcomeFields];
    const present = all.filter((value) => value !== "" && value != null).length;
    const completeness = all.length ? present / all.length * 100 : 0;
    const exceptions = sessions.filter((session) =>
      n(session.quality) < 1 || n(session.quality) > 5 ||
      n(session.fatigue) < 0 || n(session.fatigue) > 10 ||
      n(session.pain) < 0 || n(session.pain) > 10 ||
      n(session.activeMinutes) > n(session.minutes),
    ).length;
    const latest = sessions[0]?.date;
    const recencyDays = latest ? Math.max(0, Math.floor((Date.now() - new Date(`${latest}T12:00:00`).getTime()) / 86400000)) : 999;
    const strength = clamp(completeness * .55 + Math.min(sessions.length, 6) / 6 * 25 + Math.min(outcomes.length, 2) / 2 * 15 + (recencyDays <= 30 ? 5 : 0));
    return {
      completeness: round(completeness),
      exceptions,
      recencyDays,
      strength: round(strength),
      label: strength >= 78 ? "Stronger record" : strength >= 55 ? "Developing record" : "Limited record",
      sessions: sessions.length,
      outcomes: outcomes.length,
    };
  }

  function trajectoryFor(data, caseRecord) {
    const sessions = sessionsFor(data, caseRecord.id);
    const outcomes = outcomesFor(data, caseRecord.id);
    const forecasts = [
      ["Active practice", "min", linearModel(sessions.map((session) => session.activeMinutes), [0, 240]), 0],
      ["Valid repetitions", "reps", linearModel(sessions.map((session) => session.reps), [0, 5000]), 0],
      ["Movement quality", "/5", linearModel(sessions.map((session) => session.quality), [1, 5]), 1],
      ["Fatigue", "/10", linearModel(sessions.map((session) => session.fatigue), [0, 10]), 1],
    ].map(([label, unit, model, digits]) => ({ label, unit, model, digits }));
    const active = forecasts[0].model;
    const quality = forecasts[2].model;
    const fatigue = forecasts[3].model;
    const pain = linearModel(sessions.map((session) => session.pain), [0, 10]);
    const movements = [
      active && Math.abs(active.slope) >= .5 ? Math.sign(active.slope) : 0,
      quality && Math.abs(quality.slope) >= .08 ? Math.sign(quality.slope) : 0,
      fatigue && Math.abs(fatigue.slope) >= .12 ? -Math.sign(fatigue.slope) : 0,
      pain && Math.abs(pain.slope) >= .12 ? -Math.sign(pain.slope) : 0,
    ].filter((value) => value !== 0);
    const favourable = movements.filter((value) => value > 0).length;
    const caution = movements.filter((value) => value < 0).length;
    const pattern = movements.length < 2
      ? { label: "Insufficient trend evidence", tone: "limited", copy: "More repeated records are needed before interpreting indicator agreement." }
      : favourable >= 3 && caution <= 1
        ? { label: "Broadly favourable recorded pattern", tone: "supportive", copy: `${favourable} indicators move in a favourable direction within this short record.` }
        : caution >= 2
          ? { label: "Pattern warrants contextual review", tone: "review", copy: `${caution} indicators move in a direction that may merit source-record review.` }
          : { label: "Mixed recorded pattern", tone: "mixed", copy: "The short-window indicators do not move in one consistent direction." };
    return {
      sessions,
      outcomes: outcomes.map((outcome) => ({ ...outcome, progress: progressFor(outcome) })),
      forecasts,
      quality: dataQuality(data, caseRecord),
      pattern,
    };
  }

  function range(values) {
    const clean = values.map(Number).filter(Number.isFinite);
    return clean.length ? [Math.min(...clean), Math.max(...clean)] : [0, 1];
  }

  function numericSimilarity(value, other, limits) {
    const denominator = Math.max(1, limits[1] - limits[0]);
    return clamp(1 - Math.abs(n(value) - n(other)) / denominator, 0, 1);
  }

  function cohortMatches(data, selected) {
    const profiles = new Map(data.cases.map((caseRecord) => [caseRecord.id, latestMetrics(data, caseRecord.id)]));
    const minuteRange = range(data.cases.map((caseRecord) => caseRecord.weeklyMinutes));
    const repRange = range(data.cases.map((caseRecord) => caseRecord.weeklyReps));
    const selectedMetrics = profiles.get(selected.id);
    return data.cases
      .filter((candidate) => candidate.id !== selected.id)
      .map((candidate) => {
        const metrics = profiles.get(candidate.id);
        const components = [
          { label: "Pathway", similarity: candidate.diagnosis === selected.diagnosis ? 1 : 0, weight: .24 },
          { label: "Rehabilitation domain", similarity: candidate.domain === selected.domain ? 1 : 0, weight: .2 },
          { label: "Care phase", similarity: candidate.phase === selected.phase ? 1 : 0, weight: .1 },
          { label: "Weekly active-minute target", similarity: numericSimilarity(candidate.weeklyMinutes, selected.weeklyMinutes, minuteRange), weight: .1 },
          { label: "Weekly repetition target", similarity: numericSimilarity(candidate.weeklyReps, selected.weeklyReps, repRange), weight: .1 },
          { label: "Recent quality", similarity: numericSimilarity(metrics.quality, selectedMetrics.quality, [1, 5]), weight: .1 },
          { label: "Recent fatigue", similarity: numericSimilarity(metrics.fatigue, selectedMetrics.fatigue, [0, 10]), weight: .08 },
          { label: "Active-practice conversion", similarity: numericSimilarity(metrics.conversion, selectedMetrics.conversion, [0, 100]), weight: .08 },
        ];
        const score = sum(components, (component) => component.similarity * component.weight) * 100;
        const progresses = outcomesFor(data, candidate.id).map(progressFor).filter(Number.isFinite);
        return {
          case: candidate,
          score: round(score),
          metrics,
          outcomeProgress: progresses.length ? mean(progresses) : null,
          contributors: components
            .filter((component) => component.similarity >= .65)
            .sort((a, b) => b.weight * b.similarity - a.weight * a.similarity)
            .slice(0, 3),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  function initialScenario(data, caseRecord) {
    const sessions = sessionsFor(data, caseRecord.id, false).slice(0, 3);
    const averageScheduled = Math.max(15, round(mean(sessions.map((session) => session.minutes)) || 30));
    const conversion = sum(sessions, (session) => session.minutes)
      ? round(sum(sessions, (session) => session.activeMinutes) / sum(sessions, (session) => session.minutes) * 100)
      : 75;
    const planned = String(caseRecord.plannedDays || "").split(/[,;/|]+/).filter((value) => value.trim()).length;
    return {
      sessions: clamp(planned || 3, 1, 7),
      scheduled: clamp(averageScheduled, 15, 90),
      delivery: 80,
      conversion: clamp(conversion, 30, 100),
    };
  }

  function scenarioResult(data, caseRecord) {
    if (!ui.scenario) ui.scenario = initialScenario(data, caseRecord);
    const scenario = ui.scenario;
    const activeMinutes = scenario.sessions * scenario.scheduled * scenario.delivery / 100 * scenario.conversion / 100;
    const recent = latestMetrics(data, caseRecord.id);
    const repetitions = recent.active > 0 ? activeMinutes * recent.repetitions / recent.active : 0;
    const target = n(caseRecord.weeklyMinutes);
    return {
      ...scenario,
      activeMinutes,
      repetitions,
      targetCoverage: target ? activeMinutes / target * 100 : 0,
      targetGap: target - activeMinutes,
      baselineActive: recent.active * Math.max(1, scenario.sessions),
    };
  }

  function valueMetrics(data) {
    const casesReady = data.cases.filter((caseRecord) =>
      sessionsFor(data, caseRecord.id).length >= 3 && outcomesFor(data, caseRecord.id).length >= 1,
    ).length;
    const signals = root.PlexusAI?.activeSignals?.(Infinity) || [];
    const explainableSignals = signals.filter((signal) => signal.calculation && Array.isArray(signal.evidence) && signal.evidence.length).length;
    const queueSize = Math.min(5, signals.length);
    const feedback = Object.values(readFeedback().items);
    return {
      records: data.cases.length + data.sessions.length + data.outcomes.length,
      cases: data.cases.length,
      sessions: data.sessions.length,
      outcomes: data.outcomes.length,
      readiness: data.cases.length ? round(casesReady / data.cases.length * 100) : 0,
      queueSize,
      compression: data.cases.length ? round((1 - queueSize / data.cases.length) * 100) : 0,
      explainability: signals.length ? round(explainableSignals / signals.length * 100) : 0,
      feedback: feedback.length,
      useful: feedback.filter((item) => item.rating === "useful").length,
      review: feedback.filter((item) => item.rating === "review").length,
    };
  }

  function sparkline(values, label) {
    const clean = values.map(Number).filter(Number.isFinite);
    if (clean.length < 2) return `<div class="ai-lab-empty">Not enough repeated records</div>`;
    const width = 260;
    const height = 76;
    const min = Math.min(...clean);
    const max = Math.max(...clean);
    const spread = Math.max(1, max - min);
    const points = clean.map((value, index) => {
      const x = 10 + index / Math.max(1, clean.length - 1) * (width - 20);
      const y = height - 10 - (value - min) / spread * (height - 20);
      return `${round(x, 1)},${round(y, 1)}`;
    }).join(" ");
    return `<svg class="ai-lab-spark" viewBox="0 0 ${width} ${height}" role="img" aria-label="${e(label)}"><polyline points="${points}" fill="none" vector-effect="non-scaling-stroke"></polyline>${points.split(" ").map((point) => {
      const [cx, cy] = point.split(",");
      return `<circle cx="${cx}" cy="${cy}" r="3"></circle>`;
    }).join("")}</svg>`;
  }

  function feedbackCard(caseRecord, mode) {
    const key = `${caseRecord.id}:${mode}`;
    const existing = readFeedback().items[key];
    return `<article class="ai-lab-feedback"><div><span>Human feedback loop</span><strong>Was this output useful for review?</strong><p>Feedback is stored locally and should be evaluated against downstream workflow outcomes before deployment.</p></div><div class="ai-lab-feedback-actions"><button type="button" class="secondary ${existing?.rating === "useful" ? "selected" : ""}" data-ai-lab-feedback="useful">Useful</button><button type="button" class="secondary ${existing?.rating === "review" ? "selected" : ""}" data-ai-lab-feedback="review">Needs review</button></div></article>`;
  }

  function trajectoryLayer(data, caseRecord) {
    const trajectory = trajectoryFor(data, caseRecord);
    const latest = trajectory.sessions.at(-1);
    return `<section class="ai-lab-layer" aria-labelledby="aiLabTrajectoryTitle"><div class="ai-lab-layer-heading"><div><p class="ai-kicker">Within-case temporal intelligence</p><h3 id="aiLabTrajectoryTitle">Recorded trajectory and next-record estimates</h3><p>Transparent short-window regression highlights direction and variability. It does not predict recovery or prescribe care.</p></div><span class="ai-lab-pattern ${trajectory.pattern.tone}">${e(trajectory.pattern.label)}</span></div>
      <div class="ai-lab-metrics"><article><span>Evidence strength</span><strong>${trajectory.quality.strength}/100</strong><small>${e(trajectory.quality.label)} · not clinical validity</small></article><article><span>Repeated sessions</span><strong>${trajectory.sessions.length}</strong><small>Latest ${e(shortDate(latest?.date))}</small></article><article><span>Outcome records</span><strong>${trajectory.outcomes.length}</strong><small>${trajectory.outcomes.filter((item) => item.progress != null).length} numerically comparable</small></article><article><span>Data exceptions</span><strong>${trajectory.quality.exceptions}</strong><small>${trajectory.quality.completeness}% field completeness</small></article></div>
      <div class="ai-lab-trajectory-grid"><article class="ai-lab-card ai-lab-pattern-card"><span class="ai-lab-card-label">Pattern synthesis</span><h4>${e(trajectory.pattern.label)}</h4><p>${e(trajectory.pattern.copy)}</p><ul><li>Uses only repeated records for this case.</li><li>Shows uncertainty ranges and sample size.</li><li>Requires source-record and clinical-context review.</li></ul></article><article class="ai-lab-card ai-lab-trend-card"><div class="ai-lab-card-heading"><div><span class="ai-lab-card-label">Indicator traces</span><h4>Recent session pattern</h4></div><small>${trajectory.sessions.length} observations</small></div><div class="ai-lab-spark-grid"><div><span>Active minutes</span>${sparkline(trajectory.sessions.map((session) => session.activeMinutes), "Active-practice minutes over recorded sessions")}</div><div><span>Movement quality</span>${sparkline(trajectory.sessions.map((session) => session.quality), "Movement quality over recorded sessions")}</div><div><span>Fatigue</span>${sparkline(trajectory.sessions.map((session) => session.fatigue), "Fatigue over recorded sessions")}</div></div></article></div>
      <div class="ai-lab-forecast-grid">${trajectory.forecasts.map((forecast) => forecast.model ? `<article class="ai-lab-card ai-lab-forecast"><span class="ai-lab-card-label">Next-record estimate</span><h4>${e(forecast.label)}</h4><strong>${formatNumber(forecast.model.prediction, forecast.digits)}${e(forecast.unit)}</strong><div class="ai-lab-interval"><i style="left:${clamp((forecast.model.low / Math.max(forecast.model.high, 1)) * 70, 2, 70)}%;width:${clamp((forecast.model.high - forecast.model.low) / Math.max(forecast.model.high, 1) * 70, 8, 70)}%"></i></div><p>Illustrative range ${formatNumber(forecast.model.low, forecast.digits)}–${formatNumber(forecast.model.high, forecast.digits)}${e(forecast.unit)}</p><small>Linear fit · n=${forecast.model.count} · fit R² ${forecast.model.r2.toFixed(2)}</small></article>` : `<article class="ai-lab-card ai-lab-forecast limited"><span class="ai-lab-card-label">Next-record estimate</span><h4>${e(forecast.label)}</h4><strong>Unavailable</strong><p>At least three numeric observations are required.</p></article>`).join("")}</div>
      <article class="ai-lab-card"><div class="ai-lab-card-heading"><div><span class="ai-lab-card-label">Outcome context</span><h4>Recorded target trajectory</h4><p>Descriptive progress from baseline toward the entered target; scoring direction is preserved.</p></div></div><div class="ai-lab-outcomes">${trajectory.outcomes.length ? trajectory.outcomes.map((outcome) => `<div><div><strong>${e(outcome.name)}</strong><span>${e(outcome.baseline || "—")} → ${e(outcome.current || "—")} → ${e(outcome.target || "—")}</span></div>${outcome.progress == null ? `<em>Clinician interpretation</em>` : `<div class="ai-lab-progress"><i style="width:${clamp(outcome.progress)}%"></i><span>${round(outcome.progress)}%</span></div>`}</div>`).join("") : `<p class="ai-lab-empty">No linked outcome records.</p>`}</div></article>
      ${feedbackCard(caseRecord, "trajectory")}</section>`;
  }

  function cohortLayer(data, caseRecord) {
    const matches = cohortMatches(data, caseRecord);
    const qualityMedian = median(matches.map((match) => match.metrics.quality));
    const fatigueMedian = median(matches.map((match) => match.metrics.fatigue));
    const activeMedian = median(matches.map((match) => match.metrics.active));
    const outcomeMedian = median(matches.map((match) => match.outcomeProgress).filter(Number.isFinite));
    return `<section class="ai-lab-layer" aria-labelledby="aiLabCohortTitle"><div class="ai-lab-layer-heading"><div><p class="ai-kicker">Explainable similarity retrieval</p><h3 id="aiLabCohortTitle">Comparable-case context</h3><p>Gower-style mixed-data similarity finds structurally comparable synthetic cases. Similarity is descriptive and does not establish treatment effect or prognosis.</p></div><span class="ai-lab-pattern limited">Top ${matches.length} neighbours</span></div>
      <div class="ai-lab-metrics"><article><span>Median active practice</span><strong>${formatNumber(activeMedian)} min</strong><small>Recent-session average</small></article><article><span>Median quality</span><strong>${qualityMedian.toFixed(1)}/5</strong><small>Ordinal therapist rating</small></article><article><span>Median fatigue</span><strong>${fatigueMedian.toFixed(1)}/10</strong><small>Context, not a benchmark</small></article><article><span>Median target progress</span><strong>${outcomeMedian ? `${round(outcomeMedian)}%` : "—"}</strong><small>Comparable numeric outcomes only</small></article></div>
      <div class="ai-lab-match-list">${matches.map((match, index) => `<article class="ai-lab-card ai-lab-match"><div class="ai-lab-match-score"><span>${String(index + 1).padStart(2, "0")}</span><strong>${match.score}%</strong><small>similarity</small></div><div class="ai-lab-match-copy"><h4>${e(match.case.label)}</h4><p>${e(match.case.diagnosis)} · ${e(match.case.phase)} · ${e(match.case.domain)}</p><div>${match.contributors.map((component) => `<span>${e(component.label)} ${round(component.similarity * 100)}%</span>`).join("")}</div></div><dl><div><dt>Active</dt><dd>${round(match.metrics.active)} min</dd></div><div><dt>Quality</dt><dd>${match.metrics.quality.toFixed(1)}/5</dd></div><div><dt>Fatigue</dt><dd>${match.metrics.fatigue.toFixed(1)}/10</dd></div></dl></article>`).join("")}</div>
      <article class="ai-lab-boundary"><strong>Interpretation boundary</strong><p>Do not copy another case’s plan or infer that a recorded intervention caused its outcome. Use matches to locate records for multidisciplinary review, then examine differences the similarity function does not represent.</p></article>
      ${feedbackCard(caseRecord, "cohort")}</section>`;
  }

  function scenarioLayer(data, caseRecord) {
    const result = scenarioResult(data, caseRecord);
    const targetTone = result.targetCoverage >= 100 ? "supportive" : result.targetCoverage >= 75 ? "mixed" : "review";
    return `<section class="ai-lab-layer" aria-labelledby="aiLabScenarioTitle"><div class="ai-lab-layer-heading"><div><p class="ai-kicker">Bounded what-if analysis</p><h3 id="aiLabScenarioTitle">Therapy-exposure scenario</h3><p>Explore scheduling, delivery and active-practice assumptions. The model estimates exposure only—not recovery, treatment benefit or recommended dose.</p></div><span class="ai-lab-pattern ${targetTone}">${round(result.targetCoverage)}% entered target</span></div>
      <div class="ai-lab-scenario-grid"><article class="ai-lab-card ai-lab-controls"><span class="ai-lab-card-label">Adjust assumptions</span><h4>Weekly delivery model</h4>${[
        ["sessions", "Sessions per week", 1, 7, 1, result.sessions, ""],
        ["scheduled", "Scheduled minutes per session", 15, 90, 5, result.scheduled, " min"],
        ["delivery", "Session delivery / adherence", 30, 100, 5, result.delivery, "%"],
        ["conversion", "Active-practice conversion", 30, 100, 5, result.conversion, "%"],
      ].map(([id, label, min, max, step, value, unit]) => `<label><span>${e(label)}<strong data-ai-lab-scenario-value="${id}">${value}${e(unit)}</strong></span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-ai-lab-scenario="${id}" aria-label="${e(label)}" /></label>`).join("")}</article>
      <article class="ai-lab-card ai-lab-scenario-output"><span class="ai-lab-card-label">Calculated exposure</span><h4>Illustrative weekly result</h4><div class="ai-lab-scenario-primary"><strong>${round(result.activeMinutes)}</strong><span>projected active minutes</span></div><div class="ai-lab-target-meter"><i style="width:${clamp(result.targetCoverage)}%"></i></div><p>${result.targetGap > 0 ? `${round(result.targetGap)} minutes below` : `${round(Math.abs(result.targetGap))} minutes above`} the entered ${n(caseRecord.weeklyMinutes)}-minute programme target.</p><dl><div><dt>Estimated valid repetitions</dt><dd>${formatNumber(result.repetitions)}</dd></div><div><dt>Target coverage</dt><dd>${round(result.targetCoverage)}%</dd></div><div><dt>Recent-pattern comparison</dt><dd>${result.activeMinutes >= result.baselineActive ? "+" : ""}${round(result.activeMinutes - result.baselineActive)} min</dd></div></dl></article></div>
      <article class="ai-lab-card ai-lab-formula"><span class="ai-lab-card-label">Transparent formula</span><code>sessions × scheduled minutes × delivery % × active conversion % = projected active minutes</code><p>Repetition estimates preserve the selected case’s recent repetitions-per-active-minute ratio. No causal relationship with functional outcome is assumed.</p></article>
      <article class="ai-lab-boundary"><strong>Decision boundary</strong><p>This is not a dosing recommendation. Clinicians must consider goals, tolerance, precautions, preferences, staffing, device setup and applicable guidance before changing care.</p></article></section>`;
  }

  function valueLayer(data) {
    const value = valueMetrics(data);
    return `<section class="ai-lab-layer" aria-labelledby="aiLabValueTitle"><div class="ai-lab-layer-heading"><div><p class="ai-kicker">Measurable workflow value</p><h3 id="aiLabValueTitle">Value without inflated ROI claims</h3><p>These indicators show what the prototype can measure today and which benefits still require a prospective operational study.</p></div><span class="ai-lab-pattern supportive">Evidence before claims</span></div>
      <div class="ai-lab-metrics"><article><span>Linked source records</span><strong>${formatNumber(value.records)}</strong><small>${value.cases} cases · ${value.sessions} sessions · ${value.outcomes} outcomes</small></article><article><span>Review-set compression</span><strong>${value.compression}%</strong><small>${value.cases} cases to ${value.queueSize} prioritised items; not time saved</small></article><article><span>Longitudinal readiness</span><strong>${value.readiness}%</strong><small>Cases with ≥3 sessions and ≥1 outcome</small></article><article><span>Explainability coverage</span><strong>${value.explainability}%</strong><small>Active signals with calculation and source evidence</small></article></div>
      <article class="ai-lab-card"><div class="ai-lab-card-heading"><div><span class="ai-lab-card-label">Value register</span><h4>Benefit hypotheses and proof requirements</h4></div></div><div class="ai-lab-table-wrap"><table class="ai-lab-table"><thead><tr><th>Workflow</th><th>Value mechanism</th><th>Measure</th><th>Current evidence</th></tr></thead><tbody><tr><td>Clinical review</td><td>Prioritise source-linked exceptions</td><td>Queue size, overrides, time-to-review</td><td><span class="ai-lab-readiness ready">Queue measurable</span></td></tr><tr><td>Documentation</td><td>Expose missing or inconsistent fields</td><td>Exception resolution and rework</td><td><span class="ai-lab-readiness developing">Integration needed</span></td></tr><tr><td>Cohort learning</td><td>Retrieve comparable records with reasons</td><td>Search time, usefulness, false similarity</td><td><span class="ai-lab-readiness developing">User study needed</span></td></tr><tr><td>Trajectory review</td><td>Summarise repeated indicators and uncertainty</td><td>Detection, override and calibration</td><td><span class="ai-lab-readiness developing">Prospective study needed</span></td></tr><tr><td>Outcomes</td><td>Link dose, tolerance and function</td><td>Validated endpoint improvement</td><td><span class="ai-lab-readiness blocked">No effectiveness claim</span></td></tr></tbody></table></div></article>
      <div class="ai-lab-value-grid"><article class="ai-lab-card"><span class="ai-lab-card-label">Human feedback</span><h4>${value.feedback} locally evaluated outputs</h4><dl><div><dt>Marked useful</dt><dd>${value.useful}</dd></div><div><dt>Needs review</dt><dd>${value.review}</dd></div></dl><p>Feedback is a workflow-learning signal, not proof of clinical accuracy.</p></article><article class="ai-lab-card"><span class="ai-lab-card-label">Recommended pilot measures</span><h4>Evaluate the work, not the novelty</h4><ul><li>Review time and queue completion</li><li>Override rate and reasons</li><li>Missing-data resolution</li><li>Subgroup coverage and false reassurance</li><li>Clinician trust calibrated to accuracy</li></ul></article><article class="ai-lab-card"><span class="ai-lab-card-label">Stop criteria</span><h4>Pause before harm scales</h4><ul><li>Unexplained subgroup performance gaps</li><li>Automation bias or declining source review</li><li>Stale, incomplete or shifted input data</li><li>Outputs used outside intended scope</li></ul></article></div></section>`;
  }

  function assuranceLayer(data) {
    const qualities = data.cases.map((caseRecord) => dataQuality(data, caseRecord));
    const medianCompleteness = median(qualities.map((quality) => quality.completeness));
    const exceptions = sum(qualities, (quality) => quality.exceptions);
    const pathways = new Set(data.cases.map((caseRecord) => caseRecord.diagnosis)).size;
    const domains = new Set(data.cases.map((caseRecord) => caseRecord.domain)).size;
    return `<section class="ai-lab-layer" aria-labelledby="aiLabAssuranceTitle"><div class="ai-lab-layer-heading"><div><p class="ai-kicker">Model card and lifecycle gates</p><h3 id="aiLabAssuranceTitle">AI assurance</h3><p>Intended use, methods, limitations, data health and production gates remain visible beside the outputs.</p></div><span class="ai-lab-pattern review">Not clinically validated</span></div>
      <div class="ai-lab-assurance-grid"><article class="ai-lab-card"><span class="ai-lab-card-label">Intended use</span><h4>Licensed-team decision support</h4><ul><li>Prioritise records for review</li><li>Describe within-case change</li><li>Retrieve comparable synthetic records</li><li>Explore bounded exposure assumptions</li></ul></article><article class="ai-lab-card"><span class="ai-lab-card-label">Out of scope</span><h4>No autonomous clinical decision</h4><ul><li>No diagnosis or prognosis</li><li>No treatment or dose recommendation</li><li>No medical-necessity or coverage decision</li><li>No emergency monitoring</li></ul></article><article class="ai-lab-card"><span class="ai-lab-card-label">Methods</span><h4>Interpretable local analytics</h4><ul><li>Short-window linear regression</li><li>Mixed-data weighted similarity</li><li>Deterministic scenario arithmetic</li><li>Transparent rule-based prioritisation</li></ul></article><article class="ai-lab-card"><span class="ai-lab-card-label">Validation status</span><h4>Technical prototype only</h4><ul><li>Synthetic demonstration records</li><li>Functional regression tests</li><li>No external or prospective validation</li><li>No calibrated clinical endpoint</li></ul></article></div>
      <div class="ai-lab-metrics"><article><span>Median completeness</span><strong>${round(medianCompleteness)}%</strong><small>Current synthetic records</small></article><article><span>Range exceptions</span><strong>${exceptions}</strong><small>Session value checks</small></article><article><span>Pathway coverage</span><strong>${pathways}</strong><small>Synthetic diagnosis/pathway labels</small></article><article><span>Domain coverage</span><strong>${domains}</strong><small>Rehabilitation domains represented</small></article></div>
      <article class="ai-lab-card"><div class="ai-lab-card-heading"><div><span class="ai-lab-card-label">Production gates</span><h4>Required before real-world deployment</h4></div></div><ol class="ai-lab-gates"><li><strong>01 · Intended-use and regulatory assessment</strong><span>Define users, decisions, claims, jurisdiction and software classification.</span></li><li><strong>02 · Representative data and reference standard</strong><span>Document population, sites, missingness, labels and outcome timing.</span></li><li><strong>03 · External and subgroup validation</strong><span>Evaluate discrimination, calibration, utility and failure modes across settings.</span></li><li><strong>04 · Human-factors evaluation</strong><span>Test comprehension, automation bias, overrides and workflow consequences.</span></li><li><strong>05 · Prospective clinical evaluation</strong><span>Measure safety, effectiveness and operational value before scaling claims.</span></li><li><strong>06 · Lifecycle monitoring</strong><span>Track drift, performance, incidents, changes, rollback and decommissioning.</span></li></ol></article>
      <div class="ai-lab-source-grid"><a href="https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software" target="_blank" rel="noopener noreferrer"><strong>FDA CDS guidance</strong><span>Clinical decision-support scope</span></a><a href="https://www.who.int/publications/i/item/9789240029200" target="_blank" rel="noopener noreferrer"><strong>WHO AI for health</strong><span>Ethics and governance</span></a><a href="https://www.nist.gov/itl/ai-risk-management-framework" target="_blank" rel="noopener noreferrer"><strong>NIST AI RMF</strong><span>Govern, map, measure, manage</span></a><a href="https://www.bmj.com/content/385/bmj-2023-078378" target="_blank" rel="noopener noreferrer"><strong>TRIPOD+AI</strong><span>Prediction-model reporting</span></a><a href="https://www.bmj.com/content/388/bmj-2024-082505" target="_blank" rel="noopener noreferrer"><strong>PROBAST+AI</strong><span>Risk of bias and applicability</span></a><a href="https://www.nature.com/articles/s41591-022-01772-9" target="_blank" rel="noopener noreferrer"><strong>DECIDE-AI</strong><span>Early clinical evaluation</span></a></div></section>`;
  }

  function getSelected(data) {
    const preferred = ui.caseId || $("reviewCaseFilter")?.value;
    const caseRecord = data.cases.find((item) => item.id === preferred) || data.cases[0];
    if (caseRecord) ui.caseId = caseRecord.id;
    return caseRecord;
  }

  function layerContent(data, caseRecord) {
    if (ui.mode === "cohort") return cohortLayer(data, caseRecord);
    if (ui.mode === "scenario") return scenarioLayer(data, caseRecord);
    if (ui.mode === "value") return valueLayer(data);
    if (ui.mode === "assurance") return assuranceLayer(data);
    return trajectoryLayer(data, caseRecord);
  }

  function shell(data) {
    const mount = $("aiLabApp");
    if (!mount) return;
    const selected = getSelected(data);
    mount.innerHTML = `<section class="ai-lab-shell" aria-labelledby="aiLabTitle"><header class="ai-lab-topbar"><div><p class="ai-kicker">Plexus AI · interpretable intelligence</p><h2 id="aiLabTitle">${e(t("Explainable intelligence studio"))}</h2><p>Move from alerts to reviewable trajectory, similarity, scenario and value intelligence—with the assurance evidence beside it.</p><div class="ai-lab-chips"><span>${e(t("Synthetic data only"))}</span><span>Local computation</span><span>${e(t("Human review required"))}</span></div></div><div class="ai-lab-top-actions"><label>${e(t("Select case"))}<select id="aiLabCase">${data.cases.map((caseRecord) => `<option value="${e(caseRecord.id)}" ${caseRecord.id === selected?.id ? "selected" : ""}>${e(caseRecord.label)}</option>`).join("")}</select></label><button id="aiLabExport" type="button" class="secondary">Export evaluation packet</button></div></header><nav id="aiLabModeNav" class="ai-lab-mode-nav" aria-label="Plexus AI studio modes">${MODES.map(([id, label], index) => `<button type="button" data-ai-lab-mode="${id}" class="${id === ui.mode ? "active" : ""}" aria-pressed="${id === ui.mode}"><span>${String(index + 1).padStart(2, "0")}</span>${e(t(label))}</button>`).join("")}</nav><div id="aiLabStage" class="ai-lab-stage" tabindex="-1"></div><footer class="ai-lab-footer"><p><strong>Intended use:</strong> prioritisation, descriptive analytics and workflow evaluation · not diagnosis, prognosis or treatment selection</p><div id="aiLabLive" role="status" aria-live="polite"></div></footer></section>`;
    bindShell(mount);
  }

  function render(options = {}) {
    const mount = $("aiLabApp");
    if (!mount) return;
    const data = readData();
    if (!data.cases.length) {
      mount.innerHTML = `<div class="ai-lab-empty-state"><h3>Load synthetic sample data</h3><p>Plexus AI Studio needs case, session and outcome records before it can calculate local intelligence.</p></div>`;
      return;
    }
    if (!mount.querySelector(".ai-lab-shell") || options.rebuild) shell(data);
    const selected = getSelected(data);
    const select = $("aiLabCase");
    if (select && select.value !== selected.id) select.value = selected.id;
    const stage = $("aiLabStage");
    if (stage) stage.innerHTML = layerContent(data, selected);
    mount.querySelectorAll("[data-ai-lab-mode]").forEach((button) => {
      const active = button.dataset.aiLabMode === ui.mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    root.i18n?.translatePage?.(mount);
  }

  function showMode(mode, focus = true) {
    ui.mode = MODES.some(([id]) => id === mode) ? mode : "trajectory";
    render();
    if (focus) $("aiLabStage")?.focus?.({ preventScroll: true });
    return ui.mode;
  }

  function announce(message) {
    const live = $("aiLabLive");
    if (live) live.textContent = message;
  }

  function recordFeedback(rating) {
    const data = readData();
    const caseRecord = getSelected(data);
    if (!caseRecord || !["useful", "review"].includes(rating)) return;
    const saved = readFeedback();
    saved.items[`${caseRecord.id}:${ui.mode}`] = {
      caseId: caseRecord.id,
      mode: ui.mode,
      rating,
      methodBuild: BUILD,
      updatedAt: new Date().toISOString(),
    };
    saveFeedback(saved);
    render();
    announce(`${caseRecord.label} ${ui.mode} feedback saved locally.`);
  }

  function snapshot() {
    const data = readData();
    const caseRecord = getSelected(data);
    return {
      build: BUILD,
      generatedAt: new Date().toISOString(),
      scope: "Synthetic, local, human-reviewed intelligence demonstration",
      selectedCase: caseRecord ? { id: caseRecord.id, label: caseRecord.label } : null,
      trajectory: caseRecord ? trajectoryFor(data, caseRecord) : null,
      cohortMatches: caseRecord ? cohortMatches(data, caseRecord) : [],
      scenario: caseRecord ? scenarioResult(data, caseRecord) : null,
      value: valueMetrics(data),
      feedback: readFeedback(),
      methods: ["short-window linear regression", "weighted mixed-data similarity", "deterministic exposure scenario", "transparent prioritisation rules"],
      exclusions: ["diagnosis", "prognosis", "treatment recommendation", "medical necessity", "autonomous action"],
    };
  }

  function exportSnapshot() {
    const output = snapshot();
    if (!root.URL?.createObjectURL || !root.Blob) {
      announce("Evaluation packet prepared. Download is unavailable in this environment.");
      return output;
    }
    const link = root.document.createElement("a");
    const url = root.URL.createObjectURL(new root.Blob([JSON.stringify(output, null, 2)], { type: "application/json" }));
    link.href = url;
    link.download = `vivanteplexus-ai-evaluation-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    root.URL.revokeObjectURL(url);
    announce("Synthetic AI evaluation packet exported.");
    return output;
  }

  function bindShell(mount) {
    mount.addEventListener("click", (event) => {
      const mode = event.target.closest?.("[data-ai-lab-mode]");
      if (mode) {
        showMode(mode.dataset.aiLabMode);
        return;
      }
      const feedback = event.target.closest?.("[data-ai-lab-feedback]");
      if (feedback) {
        recordFeedback(feedback.dataset.aiLabFeedback);
        return;
      }
      if (event.target.closest?.("#aiLabExport")) exportSnapshot();
    });
    mount.addEventListener("change", (event) => {
      if (event.target.id === "aiLabCase") {
        ui.caseId = event.target.value;
        ui.scenario = null;
        if ($("reviewCaseFilter") && [...$("reviewCaseFilter").options].some((option) => option.value === ui.caseId)) {
          $("reviewCaseFilter").value = ui.caseId;
        }
        render();
      }
    });
    mount.addEventListener("change", (event) => {
      const key = event.target.dataset.aiLabScenario;
      if (!key) return;
      if (!ui.scenario) {
        const data = readData();
        const selected = getSelected(data);
        ui.scenario = initialScenario(data, selected);
      }
      ui.scenario[key] = n(event.target.value);
      render();
    });
  }

  function init() {
    const mount = $("aiLabApp");
    if (!mount || mount.dataset.aiLabReady) return;
    mount.dataset.aiLabReady = BUILD;
    shell(readData());
    render();
    root.document.querySelector('[data-workspace-layer-target="studio"]')?.addEventListener("click", render);
    $("reviewCaseFilter")?.addEventListener("change", () => {
      const value = $("reviewCaseFilter").value;
      if (value && value !== "all") {
        ui.caseId = value;
        ui.scenario = null;
        render();
      }
    });
    root.addEventListener?.("languagechange", () => render({ rebuild: true }));
    root.addEventListener?.("storage", (event) => {
      if (event.key === APP_KEY || event.key === FEEDBACK_KEY) render({ rebuild: event.key === APP_KEY });
    });
  }

  root.PlexusAILab = {
    BUILD,
    init,
    render,
    showMode,
    getSnapshot: snapshot,
    trajectoryFor,
    cohortMatches,
    exportSnapshot,
  };

  if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})(globalThis);
