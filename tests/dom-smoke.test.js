const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");

function launch(existingState) {
  const dom = new JSDOM(
    fs.readFileSync(path.join(root, "index.html"), "utf8"),
    {
      runScripts: "outside-only",
      url: "https://example.test/VivantePlexus.AI/",
    },
  );
  dom.window.scrollTo = () => {};
  if (existingState) {
    dom.window.localStorage.setItem(
      "vivantePlexus.v1",
      JSON.stringify(existingState),
    );
  }
  dom.window.eval(fs.readFileSync(path.join(root, "i18n.js"), "utf8"));
  dom.window.eval(
    [
      fs.readFileSync(path.join(root, "app-v4.js"), "utf8"),
      fs.readFileSync(path.join(root, "case-expansion.js"), "utf8"),
      fs.readFileSync(path.join(root, "diverse-cases.js"), "utf8"),
      fs.readFileSync(path.join(root, "plexus-ai.js"), "utf8"),
      fs.readFileSync(path.join(root, "reports.js"), "utf8"),
    ].join("\n"),
  );
  dom.window.document.dispatchEvent(
    new dom.window.Event("DOMContentLoaded", { bubbles: true }),
  );
  return dom;
}

test("renders the VivantePlexus and Robotimize brand identity", () => {
  const dom = launch();
  const { document } = dom.window;

  assert.equal(document.title, "VivantePlexus™");
  assert.equal(document.querySelector("h1").textContent.trim(), "VivantePlexus™");
  assert.equal(document.querySelectorAll('img[src="assets/robotimize-logo.png"]').length, 2);
  assert.equal(document.querySelector(".company-brand").href, "https://www.robotimize.tech/");
  assert.equal(document.querySelector(".skip-link").getAttribute("href"), "#mainContent");
  assert.equal(document.querySelector("main").id, "mainContent");
  assert.ok(document.querySelector(".app-header > .app-header-inner"));
  assert.equal(document.querySelectorAll(".tab-nav > .tab-nav-inner > .tab-button").length, 6);
  assert.match(document.querySelector('link[href*="ui-polish.css"]').href, /ui-polish\.css\?v=20260713-8$/);
  assert.ok(dom.window.localStorage.getItem("vivantePlexus.v1"));
  assert.equal(dom.window.localStorage.getItem("neurorehabDoseTracker.v5"), null);
  dom.window.close();
});

test("migrates existing version 5 browser data without discarding records", () => {
  const dom = launch({
    schemaVersion: 5,
    cases: [],
    sessions: [],
    outcomes: [],
    exports: [],
  });
  const saved = JSON.parse(
    dom.window.localStorage.getItem("vivantePlexus.v1"),
  );
  assert.equal(saved.schemaVersion, 9);
  assert.equal(saved.equipment.length, 4);
  assert.deepEqual(saved.sessions, []);
  assert.deepEqual(saved.aiActions, {});
  assert.deepEqual(saved.reportDrafts, {});
  dom.window.close();
});

test("language menu switches the rendered dashboard without changing clinical option values", () => {
  const dom = launch();
  const { document } = dom.window;

  document.getElementById("languageButton").click();
  assert.equal(document.getElementById("languageMenu").hidden, false);
  document.querySelector('[data-language="es"]').click();

  assert.equal(document.documentElement.lang, "es");
  assert.equal(
    document.getElementById("languageButtonLabel").textContent,
    "Español",
  );
  assert.equal(
    document.querySelector(".tab-button").textContent.trim(),
    "Plexus AI",
  );

  const stroke = [...document.querySelectorAll("#diagnosis option")].find(
    (option) => option.value === "Stroke",
  );
  assert.ok(stroke, "stable English clinical value remains available");
  assert.equal(stroke.textContent, "Ictus");
  dom.window.close();
});

test("dynamic clinical content and the page title localise in Chinese", () => {
  const dom = launch();
  const { document } = dom.window;
  document.getElementById("languageButton").click();
  document.querySelector('[data-language="zh-Hans"]').click();

  assert.equal(document.title, "VivantePlexus™");
  assert.equal(
    document.querySelector("#overview h2").textContent.trim(),
    "临床指挥中心",
  );
  assert.match(
    document.getElementById("minutesTargetLabel").textContent,
    /^截至目前预期:/,
  );
  assert.match(document.getElementById("aiClinicalBrief").textContent, /Case/);
  dom.window.close();
});

test("every workflow destination is a real link and opens the matching section", () => {
  const dom = launch();
  const { document } = dom.window;
  const links = [...document.querySelectorAll(".tab-nav [data-tab]")];

  assert.deepEqual(
    links.map((link) => link.getAttribute("href")),
    [
      "#overview",
      "#programmes",
      "#sessions",
      "#equipment",
      "#outcomes",
      "#reports",
    ],
  );

  for (const link of links) {
    link.click();
    const destination = link.dataset.tab;
    assert.equal(
      document.getElementById(destination).hidden,
      false,
      `${destination} is visible`,
    );
    assert.equal(document.querySelector(".tab-panel.active").id, destination);
    assert.equal(
      document.querySelector('.tab-nav [aria-current="page"]').dataset.tab,
      destination,
    );
  }
  dom.window.close();
});

test("keeps the compact data menu out of the way after navigation or Escape", () => {
  const dom = launch();
  const { document } = dom.window;
  const menu = document.querySelector(".data-menu");
  const summary = menu.querySelector("summary");

  menu.open = true;
  document.querySelector('[data-tab="sessions"]').click();
  assert.equal(menu.open, false);

  menu.open = true;
  document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(menu.open, false);
  assert.equal(document.activeElement, summary);
  dom.window.close();
});

test("AI deep links retain the overview instead of hiding the application", () => {
  const dom = launch();
  const { document } = dom.window;
  dom.window.history.pushState(null, "", "#ai-review");
  dom.window.dispatchEvent(new dom.window.PopStateEvent("popstate"));

  assert.equal(document.getElementById("overview").hidden, false);
  assert.equal(document.querySelector(".tab-panel.active").id, "overview");
  assert.equal(dom.window.location.hash, "#ai-review");
  assert.equal(document.getElementById("ai-review").hidden, false);
  assert.equal(document.querySelector('[data-workspace-layer].active').dataset.workspaceLayer, "signals");
  dom.window.close();
});

test("progressively discloses one professional intelligence layer at a time", () => {
  const dom = launch();
  const { document } = dom.window;
  const tabs = [...document.querySelectorAll('.workspace-layer-nav [role="tab"]')];
  const layers = [...document.querySelectorAll("[data-workspace-layer]")];

  assert.equal(tabs.length, 7);
  assert.equal(layers.length, 7);
  assert.equal(layers.filter((layer) => !layer.hidden).length, 1);
  assert.equal(layers.find((layer) => !layer.hidden).dataset.workspaceLayer, "command");
  assert.equal(document.querySelectorAll("#doseChart .chart-row").length, 8);
  assert.ok(document.querySelectorAll("#outcomeIntelligence .outcome-intelligence-card").length > 0);
  assert.ok(document.querySelectorAll("#outcomeIntelligence .outcome-intelligence-card").length <= 6);
  assert.equal(document.querySelector("#aiQueryResult .query-interpretation"), null);

  for (const tabButton of tabs) {
    tabButton.click();
    assert.equal(layers.filter((layer) => !layer.hidden).length, 1);
    assert.equal(
      layers.find((layer) => !layer.hidden).dataset.workspaceLayer,
      tabButton.dataset.workspaceLayerTarget,
    );
    assert.equal(document.querySelectorAll('.workspace-layer-nav [aria-selected="true"]').length, 1);
  }

  document.getElementById("layerTabCommand").click();
  const priority = document.querySelector("#priorityPreview [data-priority-case]");
  assert.ok(priority);
  priority.click();
  assert.notEqual(document.getElementById("reviewCaseFilter").value, "all");
  assert.equal(document.querySelector('[data-workspace-layer].active').dataset.workspaceLayer, "signals");
  assert.ok(document.querySelectorAll("#insights .ai-signal-card").length <= 1);

  const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
  assert.equal(new Set(ids).size, ids.length, "the document contains no duplicate IDs");
  dom.window.close();
});

test("renders a grounded top-five Plexus AI queue with case context and calculations", () => {
  const dom = launch();
  const { document } = dom.window;
  const cards = [...document.querySelectorAll("#insights .ai-signal-card")];

  assert.ok(cards.length > 0);
  assert.ok(cards.length <= 5, "the primary queue never exceeds five cases");
  assert.equal(
    new Set(cards.map((card) => card.querySelector(".case-context strong").textContent)).size,
    cards.length,
    "each queued case appears only once",
  );
  assert.ok(cards.every((card) => card.querySelector(".signal-type")));
  assert.ok(cards.every((card) => card.querySelector(".calculation")));
  assert.match(document.getElementById("aiClinicalBrief").textContent, /Data completeness/);
  assert.match(document.getElementById("aiMethodVersion").textContent, /ruleset 1\.0/);
  assert.equal(document.getElementById("casesNeedingReview").textContent, String(cards.length));
  dom.window.close();
});

test("opens a comprehensive evidence-linked report for every one of the 72 cases", () => {
  const dom = launch();
  const { document } = dom.window;
  document.querySelector('[data-tab="reports"]').click();

  const cards = [...document.querySelectorAll("#reportCaseIndex [data-open-case-report]")];
  assert.equal(cards.length, 72);
  assert.equal(document.getElementById("report-index-layer").hidden, false);
  assert.equal(document.getElementById("report-detail-layer").hidden, true);

  for (const card of cards) {
    const label = card.querySelector(".report-card-copy strong").textContent;
    card.click();
    const report = document.querySelector("[data-case-report]");
    assert.ok(report, `${label} has a dedicated report document`);
    assert.match(report.querySelector(".case-report-title h2").textContent, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.ok(report.querySelectorAll(".report-section").length >= 12);
    assert.match(report.textContent, /Executive clinical summary/);
    assert.match(report.textContent, /Function, goals & participation/);
    assert.match(report.textContent, /Dose, delivery & task exposure/);
    assert.match(report.textContent, /Equipment & device response/);
    assert.match(report.textContent, /Outcome trajectory/);
    assert.match(report.textContent, /Review signals & calculations/);
    assert.match(report.textContent, /Data provenance & limitations/);
    assert.match(report.textContent, /Clinical interpretation & sign-off/);
    assert.equal(document.getElementById("report-index-layer").hidden, true);
    assert.equal(document.getElementById("report-detail-layer").hidden, false);
  }

  document.querySelector('[data-report-action="back"]').click();
  assert.equal(document.getElementById("report-index-layer").hidden, false);
  assert.equal(document.getElementById("report-detail-layer").hidden, true);
  dom.window.close();
});

test("links every recent session to its owning comprehensive case report", () => {
  const dom = launch();
  const { document } = dom.window;
  const saved = JSON.parse(
    dom.window.localStorage.getItem("vivantePlexus.v1"),
  );
  document.querySelector('[data-tab="sessions"]').click();

  const links = [
    ...document.querySelectorAll(
      "#sessionsList [data-open-session-report]",
    ),
  ];
  const linksByCase = new Map();

  assert.equal(links.length, saved.sessions.length);
  assert.equal(new Set(links.map((link) => link.dataset.sessionId)).size, 216);
  for (const link of links) {
    assert.equal(link.getAttribute("href"), "#reports");
    assert.match(link.textContent, /Open case report/);
    assert.ok(
      saved.sessions.some(
        (session) =>
          session.id === link.dataset.sessionId &&
          session.caseId === link.dataset.openSessionReport,
      ),
    );
    assert.equal(
      link.closest(".session-item").querySelector(".delete-session").closest(
        "[data-open-session-report]",
      ),
      null,
    );
    if (!linksByCase.has(link.dataset.openSessionReport))
      linksByCase.set(link.dataset.openSessionReport, link);
  }

  assert.equal(linksByCase.size, 72);
  assert.match(
    linksByCase.get("case-01").textContent,
    /Reach-grasp-release practice · Case 01 · Stroke UL/,
  );

  for (const [caseId, link] of linksByCase) {
    link.click();
    assert.equal(dom.window.location.hash, "#reports");
    assert.equal(document.querySelector(".tab-panel.active").id, "reports");
    assert.equal(document.getElementById("report-detail-layer").hidden, false);
    assert.equal(
      document.querySelector(".case-report-document").dataset.caseReport,
      caseId,
    );
    assert.equal(document.activeElement.id, "reportDetailTab");
  }
  dom.window.close();
});

test("links every heatmap case to its report, case record and filtered sessions", () => {
  const dom = launch();
  const { document } = dom.window;
  const saved = JSON.parse(
    dom.window.localStorage.getItem("vivantePlexus.v1"),
  );
  document.getElementById("layerTabCases").click();

  const workflowLinks = [
    ...document.querySelectorAll("#caseTable [data-case-workflow]"),
  ];
  const expectedHref = {
    report: "#reports",
    programme: "#programmes",
    sessions: "#sessions",
  };

  assert.equal(document.querySelectorAll("#caseTable [data-case-row]").length, 72);
  assert.equal(workflowLinks.length, 216);
  for (const clinicalCase of saved.cases) {
    const caseLinks = workflowLinks.filter(
      (link) => link.dataset.caseId === clinicalCase.id,
    );
    assert.equal(caseLinks.length, 3);
    assert.deepEqual(
      new Set(caseLinks.map((link) => link.dataset.caseWorkflow)),
      new Set(["report", "programme", "sessions"]),
    );
    for (const link of caseLinks)
      assert.equal(
        link.getAttribute("href"),
        expectedHref[link.dataset.caseWorkflow],
      );
  }

  const reportLinks = workflowLinks.filter(
    (link) => link.dataset.caseWorkflow === "report",
  );
  for (const link of reportLinks) {
    link.click();
    assert.equal(document.querySelector(".tab-panel.active").id, "reports");
    assert.equal(
      document.querySelector(".case-report-document").dataset.caseReport,
      link.dataset.caseId,
    );
  }

  const case05Report = reportLinks.find(
    (link) => link.dataset.caseId === "case-05",
  );
  assert.match(case05Report.textContent, /Case 05 · SCI Hand/);

  document.querySelector('[data-tab="overview"]').click();
  document.getElementById("layerTabCases").click();
  document
    .querySelector(
      '#caseTable [data-case-id="case-05"][data-case-workflow="sessions"]',
    )
    .click();
  const case05Sessions = saved.sessions.filter(
    (session) => session.caseId === "case-05",
  );
  const visibleSessionLinks = [
    ...document.querySelectorAll("#sessionsList [data-open-session-report]"),
  ];
  assert.equal(dom.window.location.hash, "#sessions");
  assert.equal(document.querySelector(".tab-panel.active").id, "sessions");
  assert.equal(document.getElementById("reviewCaseFilter").value, "case-05");
  assert.equal(document.getElementById("sessionCaseId").value, "case-05");
  assert.equal(visibleSessionLinks.length, case05Sessions.length);
  assert.ok(
    visibleSessionLinks.every(
      (link) => link.dataset.openSessionReport === "case-05",
    ),
  );
  assert.equal(document.activeElement.dataset.openSessionReport, "case-05");

  document.querySelector('[data-tab="overview"]').click();
  document.getElementById("layerTabCases").click();
  document
    .querySelector(
      '#caseTable [data-case-id="case-05"][data-case-workflow="programme"]',
    )
    .click();
  assert.equal(dom.window.location.hash, "#programmes");
  assert.equal(document.querySelector(".tab-panel.active").id, "programmes");
  assert.equal(document.getElementById("caseId").value, "case-05");
  assert.equal(document.getElementById("caseLabel").value, "Case 05 · SCI Hand");
  assert.equal(document.activeElement.id, "caseLabel");
  dom.window.close();
});

test("adds 36 diverse scenarios with structured clinical context and pathway evidence", () => {
  const dom = launch();
  const { document } = dom.window;
  const saved = JSON.parse(
    dom.window.localStorage.getItem("vivantePlexus.v1"),
  );
  const alternatives = saved.cases.slice(36);

  assert.equal(alternatives.length, 36);
  assert.equal(new Set(alternatives.map((entry) => entry.label)).size, 36);
  assert.ok(new Set(alternatives.map((entry) => entry.diagnosis)).size >= 20);
  assert.ok(
    alternatives.every(
      (entry) =>
        entry.clinicalScenario?.profile &&
        entry.clinicalScenario?.presentation &&
        entry.clinicalScenario?.participation &&
        entry.clinicalScenario?.environment &&
        entry.clinicalScenario?.complexity &&
        entry.clinicalScenario?.reviewFocus &&
        entry.evidenceKey &&
        entry.protocol &&
        entry.icfFrame &&
        entry.precautions,
    ),
  );

  document.querySelector('[data-tab="reports"]').click();
  const cards = [
    ...document.querySelectorAll("#reportCaseIndex [data-open-case-report]"),
  ].slice(36);
  assert.equal(cards.length, 36);

  for (const card of cards) {
    card.click();
    const scenario = document.querySelector(".report-scenario");
    assert.ok(scenario, `${card.dataset.openCaseReport} has a scenario section`);
    assert.match(scenario.textContent, /Clinical scenario & referral context/);
    assert.match(scenario.textContent, /Synthetic scenario/);
    assert.equal(scenario.querySelectorAll("dl > div").length, 6);
    assert.ok(document.querySelectorAll(".report-source-list a").length >= 3);
  }

  const quickDash = saved.outcomes.find(
    (entry) => entry.caseId === "case-69" && /QuickDASH/.test(entry.name),
  );
  assert.equal(quickDash.direction, "Lower is better");
  dom.window.close();
});

test("upgrades the prior 36-case sample additively without losing edits or addenda", () => {
  const current = launch();
  const previous = JSON.parse(
    current.window.localStorage.getItem("vivantePlexus.v1"),
  );
  current.window.close();

  previous.schemaVersion = 8;
  previous.cases = previous.cases.slice(0, 36);
  previous.cases[0].primaryGoal = "Preserved clinician-edited goal.";
  previous.sessions = previous.sessions.filter((entry) =>
    previous.cases.some((clinicalCase) => clinicalCase.id === entry.caseId),
  );
  previous.outcomes = previous.outcomes.filter((entry) =>
    previous.cases.some((clinicalCase) => clinicalCase.id === entry.caseId),
  );
  previous.reportDrafts = {
    "case-01": {
      status: "Reviewed",
      overview: "Preserved clinician addendum.",
    },
  };

  const upgraded = launch(previous);
  const saved = JSON.parse(
    upgraded.window.localStorage.getItem("vivantePlexus.v1"),
  );
  assert.equal(saved.schemaVersion, 9);
  assert.equal(saved.cases.length, 72);
  assert.equal(saved.sessions.length, 216);
  assert.equal(saved.outcomes.length, 144);
  assert.equal(saved.cases[0].primaryGoal, "Preserved clinician-edited goal.");
  assert.equal(saved.reportDrafts["case-01"].status, "Reviewed");
  assert.equal(
    saved.reportDrafts["case-01"].overview,
    "Preserved clinician addendum.",
  );
  assert.equal(new Set(saved.cases.map((entry) => entry.id)).size, 72);
  upgraded.window.close();
});

test("filters the report index and persists an editable clinician addendum separately", () => {
  const dom = launch();
  const { document, Event } = dom.window;
  document.querySelector('[data-tab="reports"]').click();

  const search = document.getElementById("reportSearch");
  search.value = "Stroke UL";
  search.dispatchEvent(new Event("input", { bubbles: true }));
  assert.equal(document.querySelectorAll("#reportCaseIndex [data-open-case-report]").length, 1);

  document.querySelector("#reportCaseIndex [data-open-case-report]").click();
  document.querySelector('[data-report-action="edit-addendum"]').click();
  assert.equal(document.getElementById("reportAddendumForm").hidden, false);
  document.getElementById("reportAddendumStatus").value = "Reviewed";
  document.getElementById("reportAddendumAuthor").value = "A. Clinician";
  document.getElementById("reportAddendumRole").value = "Rehabilitation therapist";
  document.getElementById("reportAddendumOverview").value = "Clinician-authored overview after source-record review.";
  document.getElementById("reportAddendumInterpretation").value = "The recorded dose and outcome context were reviewed together.";
  document.getElementById("reportAddendumPriorities").value = "Confirm carryover context at the next review.";
  document.getElementById("reportAddendumPlan").value = "Continue clinician-led review under the recorded programme.";
  document.getElementById("reportAddendumCommunication").value = "Share the reviewed summary with the rehabilitation team.";
  document.getElementById("reportAddendumForm").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true }),
  );

  const saved = JSON.parse(dom.window.localStorage.getItem("vivantePlexus.v1"));
  assert.equal(saved.reportDrafts["case-01"].status, "Reviewed");
  assert.equal(saved.reportDrafts["case-01"].author, "A. Clinician");
  assert.match(document.getElementById("caseReportDetail").textContent, /Clinician-authored overview after source-record review/);
  assert.match(document.getElementById("caseReportDetail").textContent, /Read-only calculations/);
  assert.equal(saved.cases[0].primaryGoal, "Improve reach, grasp and release for meal preparation.");
  assert.equal(saved.sessions.length, 216);

  document.querySelector('[data-report-action="back"]').click();
  document.getElementById("reportSearch").value = "";
  document.getElementById("reportSearch").dispatchEvent(new Event("input", { bubbles: true }));
  document.getElementById("reportStatusFilter").value = "Reviewed";
  document.getElementById("reportStatusFilter").dispatchEvent(new Event("change", { bubbles: true }));
  assert.equal(document.querySelectorAll("#reportCaseIndex [data-open-case-report]").length, 1);
  assert.match(document.getElementById("reportCaseIndex").textContent, /Case 01/);
  dom.window.close();
});

test("Plexus Query calculates structured answers locally", () => {
  const dom = launch();
  const { document, Event } = dom.window;
  document.getElementById("aiQueryInput").value =
    "Which devices have the highest active-practice conversion?";
  document
    .getElementById("aiQueryForm")
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  const output = document.getElementById("aiQueryResult").textContent;
  assert.match(output, /active-practice conversion/i);
  assert.match(output, /No external request was made/);
  assert.match(output, /Vivante/);
  dom.window.close();
});

test("clinician signal decisions persist with an audit record", () => {
  const dom = launch();
  const { document } = dom.window;
  const firstCard = document.querySelector("#insights .ai-signal-card");
  const caseLabel = firstCard.querySelector(".case-context strong").textContent;
  firstCard.querySelector('[data-ai-action="accepted"]').click();

  const saved = JSON.parse(dom.window.localStorage.getItem("vivantePlexus.v1"));
  const actions = Object.values(saved.aiActions);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].status, "accepted");
  assert.equal(actions[0].caseLabel, caseLabel);
  assert.match(document.getElementById("aiAuditLog").textContent, new RegExp(caseLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  dom.window.close();
});

test("adds custom equipment and links it to a newly recorded therapy session", () => {
  const dom = launch();
  const { document, Event } = dom.window;

  document.querySelector('[data-tab="equipment"]').click();
  document.getElementById("equipmentName").value = "Research Exoskeleton A";
  document.getElementById("equipmentCategory").value = "Upper-limb robotics";
  document.getElementById("equipmentIdentifier").value = "DEMO-001";
  document
    .getElementById("equipmentForm")
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  let saved = JSON.parse(
    dom.window.localStorage.getItem("vivantePlexus.v1"),
  );
  const equipment = saved.equipment.find(
    (item) => item.name === "Research Exoskeleton A",
  );
  assert.ok(equipment);
  assert.match(
    document.getElementById("equipmentList").textContent,
    /Research Exoskeleton A/,
  );

  document.querySelector('[data-tab="sessions"]').click();
  document.getElementById("task").value = "Functional reach practice";
  document.getElementById("deviceMode").value = "Assist-as-needed level 2";
  document.getElementById("attemptedReps").value = "120";
  document.getElementById("activeContribution").value = "68";
  document.getElementById("calibrationStatus").value = "Valid";
  const checkbox = document.querySelector(
    `#sessionEquipmentPicker input[value="${equipment.id}"]`,
  );
  assert.ok(checkbox);
  checkbox.checked = true;
  document
    .getElementById("sessionForm")
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  saved = JSON.parse(
    dom.window.localStorage.getItem("vivantePlexus.v1"),
  );
  const session = saved.sessions.at(-1);
  assert.ok(session.equipmentIds.includes(equipment.id));
  assert.equal(session.deviceMode, "Assist-as-needed level 2");
  assert.equal(session.attemptedReps, 120);
  assert.equal(session.activeContribution, 68);
  assert.equal(session.calibrationStatus, "Valid");
  assert.match(
    document.getElementById("sessionsList").textContent,
    /Research Exoskeleton A/,
  );
  dom.window.close();
});

test("FHIR-shaped export contains Device and Procedure references for equipment", () => {
  const dom = launch();
  dom.window.eval("dl = (...args) => { globalThis.__download = args; }");
  dom.window.eval("fhir()");
  const bundle = JSON.parse(dom.window.__download[1]);

  const devices = bundle.entry.filter(
    (entry) => entry.resource.resourceType === "Device",
  );
  const procedures = bundle.entry.filter(
    (entry) => entry.resource.resourceType === "Procedure",
  );
  assert.equal(devices.length, 4);
  assert.equal(procedures.length, 216);
  assert.ok(
    procedures.some((entry) => entry.resource.usedReference.length > 0),
  );
  assert.ok(
    bundle.entry
      .filter(
        (entry) =>
          entry.resource.resourceType === "Observation" &&
          !entry.resource.id.startsWith("outcome-"),
      )
      .every((entry) => Array.isArray(entry.resource.partOf)),
  );
  assert.ok(
    bundle.entry
      .filter((entry) => entry.resource.resourceType === "Patient")
      .every((entry) =>
        entry.resource.identifier[0].system.includes("/VivantePlexus.AI/"),
      ),
  );
  dom.window.close();
});

test("header command buttons execute their documented actions", () => {
  const dom = launch();
  const { document } = dom.window;
  dom.window.__downloads = [];
  dom.window.eval("dl = (...args) => { globalThis.__downloads.push(args); }");

  document.getElementById("exportCsvBtn").click();
  document.getElementById("exportNoteBtn").click();
  document.getElementById("exportFhirBtn").click();
  document.getElementById("backupBtn").click();
  assert.equal(dom.window.__downloads.length, 4);
  assert.ok(
    dom.window.__downloads.every(([filename]) =>
      filename.startsWith("vivanteplexus-"),
    ),
  );
  const csv = dom.window.__downloads.find(([filename]) =>
    filename.endsWith(".csv"),
  );
  assert.match(csv[1], /equipmentNames,equipmentIds/);

  document.getElementById("loadSampleBtn").click();
  assert.match(document.getElementById("appStatus").textContent, /Loaded 72/);

  let restoreClicks = 0;
  document.getElementById("restoreInput").click = () => restoreClicks++;
  document
    .getElementById("restoreLabel")
    .dispatchEvent(
      new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
  assert.equal(restoreClicks, 1);

  dom.window.confirm = () => false;
  document.getElementById("clearBtn").click();
  const saved = JSON.parse(
    dom.window.localStorage.getItem("vivantePlexus.v1"),
  );
  assert.equal(saved.cases.length, 72);
  dom.window.close();
});
