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
      fs.readFileSync(path.join(root, "plexus-ai.js"), "utf8"),
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
  assert.equal(saved.schemaVersion, 7);
  assert.equal(saved.equipment.length, 4);
  assert.deepEqual(saved.sessions, []);
  assert.deepEqual(saved.aiActions, {});
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
    "询问康复数据集",
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

test("AI deep links retain the overview instead of hiding the application", () => {
  const dom = launch();
  const { document } = dom.window;
  dom.window.history.pushState(null, "", "#ai-review");
  dom.window.dispatchEvent(new dom.window.PopStateEvent("popstate"));

  assert.equal(document.getElementById("overview").hidden, false);
  assert.equal(document.querySelector(".tab-panel.active").id, "overview");
  assert.equal(dom.window.location.hash, "#ai-review");
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
  assert.equal(procedures.length, 108);
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
  assert.match(document.getElementById("appStatus").textContent, /Loaded 36/);

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
  assert.equal(saved.cases.length, 36);
  dom.window.close();
});
