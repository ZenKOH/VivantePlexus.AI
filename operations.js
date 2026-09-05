(function (root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.PlexusOperations = api;
  if (root.document) {
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", api.init, { once: true });
    } else {
      api.init();
    }
  }
})(globalThis, function (root) {
  "use strict";

  const APP_KEY = "vivantePlexus.v1";
  const OPS_KEY = "vivantePlexus.operations.v1";
  const VERSION = 1;
  const DAY = 86400000;
  const DOC_FIELDS = [
    "task",
    "minutes",
    "activeMinutes",
    "reps",
    "quality",
    "fatigue",
    "pain",
    "assistance",
    "specificity",
    "carryover",
  ];
  const TELEMETRY_FIELDS = [
    "deviceMode",
    "deviceAssistance",
    "activeContribution",
    "rangeOfMotion",
    "symmetry",
    "calibrationStatus",
  ];

  const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
  const round = (value) => Math.round(number(value));
  const percent = (value, total) => (total ? Math.round((number(value) / number(total)) * 100) : null);
  const sum = (items, getter) => items.reduce((total, item) => total + number(getter(item)), 0);
  const present = (value) => value !== undefined && value !== null && String(value).trim() !== "";
  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  function isoDate(value) {
    const date = value instanceof Date ? new Date(value) : new Date(`${String(value).slice(0, 10)}T12:00:00Z`);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  function startOfWeek(value = new Date()) {
    const date = isoDate(value);
    const day = date.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    date.setUTCDate(date.getUTCDate() + mondayOffset);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  function weekWindow(value = new Date()) {
    const start = startOfWeek(value);
    const end = new Date(start.getTime() + 7 * DAY);
    return {
      start,
      end,
      startIso: start.toISOString().slice(0, 10),
      endIso: new Date(end.getTime() - DAY).toISOString().slice(0, 10),
    };
  }

  function sessionInWindow(session, window) {
    if (!session?.date) return false;
    const date = isoDate(session.date);
    return date >= window.start && date < window.end;
  }

  function fieldCompleteness(records, fields) {
    if (!records.length || !fields.length) return null;
    let complete = 0;
    let total = 0;
    for (const record of records) {
      for (const field of fields) {
        total += 1;
        if (present(record?.[field])) complete += 1;
      }
    }
    return percent(complete, total);
  }

  function readClinicalState(storage = root.localStorage) {
    try {
      const parsed = JSON.parse(storage?.getItem?.(APP_KEY));
      return parsed && Array.isArray(parsed.cases) && Array.isArray(parsed.sessions)
        ? {
            cases: parsed.cases,
            sessions: parsed.sessions,
            equipment: Array.isArray(parsed.equipment) ? parsed.equipment : [],
            outcomes: Array.isArray(parsed.outcomes) ? parsed.outcomes : [],
          }
        : { cases: [], sessions: [], equipment: [], outcomes: [] };
    } catch {
      return { cases: [], sessions: [], equipment: [], outcomes: [] };
    }
  }

  function defaultConfig() {
    return {
      version: VERSION,
      capacities: {},
      reporting: { baselineMinutes: "", currentMinutes: "", reportsPerMonth: 4 },
    };
  }

  function readConfig(storage = root.localStorage) {
    try {
      const parsed = JSON.parse(storage?.getItem?.(OPS_KEY));
      if (!parsed || parsed.version !== VERSION) return defaultConfig();
      return {
        version: VERSION,
        capacities: parsed.capacities && typeof parsed.capacities === "object" ? parsed.capacities : {},
        reporting: { ...defaultConfig().reporting, ...(parsed.reporting || {}) },
      };
    } catch {
      return defaultConfig();
    }
  }

  function buildSnapshot(clinical, config = defaultConfig(), asOf = new Date()) {
    const safe = {
      cases: Array.isArray(clinical?.cases) ? clinical.cases : [],
      sessions: Array.isArray(clinical?.sessions) ? clinical.sessions : [],
      equipment: Array.isArray(clinical?.equipment) ? clinical.equipment : [],
      outcomes: Array.isArray(clinical?.outcomes) ? clinical.outcomes : [],
    };
    const window = weekWindow(asOf);
    const weekSessions = safe.sessions.filter((session) => sessionInWindow(session, window));
    const usedCaseIds = new Set(weekSessions.map((session) => session.caseId).filter(Boolean));
    const capacities = config?.capacities || {};

    const equipment = safe.equipment.map((item) => {
      const sessions = weekSessions.filter((session) =>
        Array.isArray(session.equipmentIds) && session.equipmentIds.includes(item.id),
      );
      const scheduledMinutes = sum(sessions, (session) => session.minutes);
      const activeMinutes = sum(sessions, (session) => session.activeMinutes);
      const configuredCapacity = Math.max(0, number(capacities[item.id]));
      const linkedCases = new Set(sessions.map((session) => session.caseId).filter(Boolean)).size;
      const utilisationPct = configuredCapacity ? percent(scheduledMinutes, configuredCapacity) : null;
      const conversionPct = scheduledMinutes ? percent(activeMinutes, scheduledMinutes) : null;
      let status = "Capacity not configured";
      if (utilisationPct !== null) {
        if (utilisationPct > 100) status = "Over configured capacity";
        else if (utilisationPct < 30) status = "Under-used";
        else if (utilisationPct < 60) status = "Capacity available";
        else status = "Well utilised";
      }
      return {
        id: item.id,
        name: item.name || "Unnamed equipment",
        category: item.category || "Equipment",
        sessionCount: sessions.length,
        linkedCases,
        scheduledMinutes,
        activeMinutes,
        configuredCapacity,
        idleMinutes: configuredCapacity ? Math.max(0, configuredCapacity - scheduledMinutes) : null,
        utilisationPct,
        conversionPct,
        status,
      };
    });

    const equipmentLinkedSessions = weekSessions.filter(
      (session) => Array.isArray(session.equipmentIds) && session.equipmentIds.length,
    );
    const casesWithOutcomes = new Set(safe.outcomes.map((outcome) => outcome.caseId).filter(Boolean));
    const configuredEquipment = equipment.filter((item) => item.configuredCapacity > 0);
    const totalConfiguredCapacity = sum(configuredEquipment, (item) => item.configuredCapacity);
    const totalScheduledOnConfigured = sum(configuredEquipment, (item) => item.scheduledMinutes);
    const totalScheduledMinutes = sum(weekSessions, (session) => session.minutes);
    const totalActiveMinutes = sum(weekSessions, (session) => session.activeMinutes);

    const baselineMinutes = Math.max(0, number(config?.reporting?.baselineMinutes));
    const currentMinutes = Math.max(0, number(config?.reporting?.currentMinutes));
    const reportsPerMonth = Math.max(0, number(config?.reporting?.reportsPerMonth));
    const reportingConfigured = baselineMinutes > 0 && reportsPerMonth > 0;
    const minutesSavedPerReport = reportingConfigured ? Math.max(0, baselineMinutes - currentMinutes) : null;
    const monthlyHoursSaved = reportingConfigured
      ? Math.round(((minutesSavedPerReport * reportsPerMonth) / 60) * 10) / 10
      : null;

    return {
      generatedAt: new Date().toISOString(),
      window: { start: window.startIso, end: window.endIso },
      portfolio: {
        sessions: weekSessions.length,
        activeCases: usedCaseIds.size,
        devicesUsed: equipment.filter((item) => item.sessionCount > 0).length,
        scheduledMinutes: totalScheduledMinutes,
        activeMinutes: totalActiveMinutes,
        activePracticeConversionPct: totalScheduledMinutes ? percent(totalActiveMinutes, totalScheduledMinutes) : null,
        configuredCapacityMinutes: totalConfiguredCapacity,
        utilisationPct: totalConfiguredCapacity ? percent(totalScheduledOnConfigured, totalConfiguredCapacity) : null,
      },
      dataQuality: {
        equipmentLinkagePct: weekSessions.length ? percent(equipmentLinkedSessions.length, weekSessions.length) : null,
        documentationCompletenessPct: fieldCompleteness(weekSessions, DOC_FIELDS),
        telemetryCompletenessPct: fieldCompleteness(equipmentLinkedSessions, TELEMETRY_FIELDS),
        outcomeCoveragePct: safe.cases.length ? percent(casesWithOutcomes.size, safe.cases.length) : null,
      },
      reportingScenario: {
        baselineMinutes: reportingConfigured ? baselineMinutes : null,
        currentMinutes: reportingConfigured ? currentMinutes : null,
        reportsPerMonth: reportingConfigured ? reportsPerMonth : null,
        minutesSavedPerReport,
        monthlyHoursSaved,
        isUserEnteredScenario: reportingConfigured,
      },
      equipment,
    };
  }

  function snapshotToCsv(snapshot) {
    const rows = [
      ["equipment", "category", "sessions", "cases", "scheduled_minutes", "active_minutes", "capacity_minutes", "utilisation_pct", "conversion_pct", "status"],
      ...snapshot.equipment.map((item) => [
        item.name,
        item.category,
        item.sessionCount,
        item.linkedCases,
        item.scheduledMinutes,
        item.activeMinutes,
        item.configuredCapacity || "",
        item.utilisationPct ?? "",
        item.conversionPct ?? "",
        item.status,
      ]),
    ];
    return rows
      .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
  }

  function metric(label, value, note) {
    return `<article class="operations-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`;
  }

  function pctLabel(value) {
    return value === null || value === undefined ? "—" : `${value}%`;
  }

  function render() {
    const mount = root.document?.getElementById("operationsApp");
    if (!mount) return;
    const clinical = readClinicalState();
    const config = readConfig();
    const snapshot = buildSnapshot(clinical, config);

    if (!clinical.cases.length && !clinical.sessions.length) {
      mount.innerHTML = `
        <section class="operations-empty">
          <p class="eyebrow">Plexus Operations</p>
          <h2>No rehabilitation dataset is loaded yet.</h2>
          <p>Open the main VivantePlexus application, choose <strong>Load sample</strong>, then return here. Both workspaces read the same browser-local dataset.</p>
          <a class="primary operations-link" href="index.html">Open VivantePlexus</a>
        </section>`;
      return;
    }

    const capacityRows = snapshot.equipment.length
      ? snapshot.equipment
          .map((item) => `
            <tr>
              <td><strong>${escapeHtml(item.name)}</strong><br><small>${escapeHtml(item.category)}</small></td>
              <td>${item.sessionCount}</td>
              <td>${item.scheduledMinutes}</td>
              <td>${item.activeMinutes}</td>
              <td><input class="operations-capacity-input" type="number" min="0" step="15" data-capacity-id="${escapeHtml(item.id)}" value="${escapeHtml(config.capacities[item.id] || "")}" aria-label="Weekly available capacity minutes for ${escapeHtml(item.name)}"></td>
              <td>${pctLabel(item.utilisationPct)}</td>
              <td>${pctLabel(item.conversionPct)}</td>
              <td><span class="operations-status">${escapeHtml(item.status)}</span></td>
            </tr>`)
          .join("")
      : `<tr><td colspan="8">No equipment is configured in the clinical workspace.</td></tr>`;

    mount.innerHTML = `
      <section class="operations-hero">
        <div>
          <p class="eyebrow">Plexus Operations · transparent operational intelligence</p>
          <h2>Utilisation, capacity and reporting readiness</h2>
          <p>Week of ${escapeHtml(snapshot.window.start)} to ${escapeHtml(snapshot.window.end)}. Utilisation uses your configured available minutes; no capacity denominator is invented.</p>
        </div>
        <div class="operations-actions">
          <button id="operationsExport" class="secondary" type="button">Export snapshot CSV</button>
          <a class="secondary operations-link" href="index.html#equipment">Manage equipment</a>
        </div>
      </section>

      <section class="operations-metrics" aria-label="Operational summary">
        ${metric("Sessions", snapshot.portfolio.sessions, "Recorded this week")}
        ${metric("Active cases", snapshot.portfolio.activeCases, "Cases with a session")}
        ${metric("Device utilisation", pctLabel(snapshot.portfolio.utilisationPct), snapshot.portfolio.configuredCapacityMinutes ? "Scheduled ÷ configured capacity" : "Configure capacity below")}
        ${metric("Practice conversion", pctLabel(snapshot.portfolio.activePracticeConversionPct), "Active ÷ scheduled minutes")}
      </section>

      <section class="operations-grid">
        <article class="operations-card operations-wide">
          <div class="operations-card-heading">
            <div><p class="eyebrow">Capacity model</p><h3>Equipment utilisation</h3></div>
            <button id="operationsSaveCapacity" class="primary" type="button">Save capacity</button>
          </div>
          <p class="operations-note">Enter the minutes each device is realistically available for patient-facing therapy in a normal week. The module compares recorded scheduled treatment time with that denominator.</p>
          <div class="table-wrap"><table class="operations-table"><thead><tr><th>Equipment</th><th>Sessions</th><th>Scheduled</th><th>Active</th><th>Weekly capacity</th><th>Utilisation</th><th>Conversion</th><th>Signal</th></tr></thead><tbody>${capacityRows}</tbody></table></div>
        </article>

        <article class="operations-card">
          <p class="eyebrow">Data readiness</p>
          <h3>Can this dataset support credible reporting?</h3>
          <dl class="operations-quality">
            <div><dt>Equipment linkage</dt><dd>${pctLabel(snapshot.dataQuality.equipmentLinkagePct)}</dd></div>
            <div><dt>Session documentation</dt><dd>${pctLabel(snapshot.dataQuality.documentationCompletenessPct)}</dd></div>
            <div><dt>Device telemetry</dt><dd>${pctLabel(snapshot.dataQuality.telemetryCompletenessPct)}</dd></div>
            <div><dt>Outcome coverage</dt><dd>${pctLabel(snapshot.dataQuality.outcomeCoveragePct)}</dd></div>
          </dl>
          <p class="operations-note">These are completeness measures, not quality scores or evidence that treatment was effective.</p>
        </article>

        <article class="operations-card">
          <p class="eyebrow">Reporting-burden scenario</p>
          <h3>Make the administrative hypothesis explicit</h3>
          <div class="operations-form-grid">
            <label>Baseline minutes/report<input id="opsBaselineMinutes" type="number" min="0" step="5" value="${escapeHtml(config.reporting.baselineMinutes)}"></label>
            <label>Current minutes/report<input id="opsCurrentMinutes" type="number" min="0" step="5" value="${escapeHtml(config.reporting.currentMinutes)}"></label>
            <label>Reports/month<input id="opsReportsPerMonth" type="number" min="0" step="1" value="${escapeHtml(config.reporting.reportsPerMonth)}"></label>
          </div>
          <button id="operationsSaveReporting" class="secondary" type="button">Save reporting scenario</button>
          <div class="operations-scenario">
            <strong>${snapshot.reportingScenario.monthlyHoursSaved === null ? "—" : `${snapshot.reportingScenario.monthlyHoursSaved} h/month`}</strong>
            <span>Potential administrative time difference from user-entered assumptions.</span>
          </div>
          <p class="operations-note">This is a scenario calculator, not a validated productivity claim. Production pilots should measure time directly.</p>
        </article>
      </section>`;
  }

  function saveConfig(next) {
    try {
      root.localStorage?.setItem?.(OPS_KEY, JSON.stringify(next));
    } catch {
      // Remain usable in read-only/private browser contexts.
    }
  }

  function downloadCsv(snapshot) {
    const csv = snapshotToCsv(snapshot);
    const blob = new root.Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = root.URL.createObjectURL(blob);
    const link = root.document.createElement("a");
    link.href = url;
    link.download = `vivanteplexus-operations-${snapshot.window.start}.csv`;
    link.click();
    root.URL.revokeObjectURL(url);
  }

  function bind() {
    const mount = root.document?.getElementById("operationsApp");
    if (!mount || mount.dataset.operationsBound) return;
    mount.dataset.operationsBound = "true";
    mount.addEventListener("click", (event) => {
      if (event.target.closest?.("#operationsSaveCapacity")) {
        const config = readConfig();
        root.document.querySelectorAll("[data-capacity-id]").forEach((input) => {
          const value = Math.max(0, number(input.value));
          if (value) config.capacities[input.dataset.capacityId] = value;
          else delete config.capacities[input.dataset.capacityId];
        });
        saveConfig(config);
        render();
      }
      if (event.target.closest?.("#operationsSaveReporting")) {
        const config = readConfig();
        config.reporting = {
          baselineMinutes: root.document.getElementById("opsBaselineMinutes")?.value || "",
          currentMinutes: root.document.getElementById("opsCurrentMinutes")?.value || "",
          reportsPerMonth: root.document.getElementById("opsReportsPerMonth")?.value || "",
        };
        saveConfig(config);
        render();
      }
      if (event.target.closest?.("#operationsExport")) {
        downloadCsv(buildSnapshot(readClinicalState(), readConfig()));
      }
    });
  }

  function init() {
    if (!root.document?.getElementById("operationsApp")) return;
    bind();
    render();
    root.addEventListener?.("storage", (event) => {
      if (event.key === APP_KEY || event.key === OPS_KEY) render();
    });
  }

  return {
    APP_KEY,
    OPS_KEY,
    weekWindow,
    fieldCompleteness,
    readClinicalState,
    defaultConfig,
    buildSnapshot,
    snapshotToCsv,
    init,
    render,
  };
});
