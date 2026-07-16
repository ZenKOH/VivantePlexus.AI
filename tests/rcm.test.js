const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");

function launch() {
  const dom = new JSDOM(
    fs.readFileSync(path.join(root, "index.html"), "utf8"),
    {
      runScripts: "outside-only",
      url: "https://example.test/VivantePlexus.AI/",
    },
  );
  dom.window.scrollTo = () => {};
  dom.window.confirm = () => true;
  const scripts = [
    "i18n.js",
    "app-v4.js",
    "case-expansion.js",
    "diverse-cases.js",
    "plexus-ai.js",
    "plexus-ai-lab.js",
    "reports.js",
    "rcm.js",
  ];
  dom.window.eval(
    scripts.map((name) => fs.readFileSync(path.join(root, name), "utf8")).join("\n"),
  );
  dom.window.document.dispatchEvent(
    new dom.window.Event("DOMContentLoaded", { bubbles: true }),
  );
  return dom;
}

test("creates one separated synthetic RCM episode for every rehabilitation case", () => {
  const dom = launch();
  const { document, PlexusRCM, localStorage } = dom.window;
  const clinical = JSON.parse(localStorage.getItem("vivantePlexus.v1"));
  const snapshot = PlexusRCM.getSnapshot();

  assert.equal(clinical.cases.length, 72);
  assert.equal(snapshot.claims.length, 72);
  assert.equal(new Set(snapshot.claims.map((claim) => claim.id)).size, 72);
  assert.equal(new Set(snapshot.claims.map((claim) => claim.caseId)).size, 72);
  assert.deepEqual(
    new Set(snapshot.claims.map((claim) => claim.caseId)),
    new Set(clinical.cases.map((caseRecord) => caseRecord.id)),
  );
  assert.ok(snapshot.claims.every((claim) => claim.checks.length === 6));
  assert.ok(snapshot.claims.every((claim) => claim.sessionCount > 0));
  assert.equal(localStorage.getItem("vivantePlexus.rcm.v1"), null);

  document.querySelector('[data-tab="rcm"]').click();
  assert.equal(document.getElementById("rcm").hidden, false);
  assert.equal(document.querySelector(".tab-panel.active").id, "rcm");
  assert.equal(document.querySelectorAll("#rcmLayerNav [data-rcm-layer]").length, 8);
  assert.equal(document.querySelectorAll("#rcmLayerNav .active").length, 1);
  assert.equal(document.querySelectorAll("#rcmStage .rcm-metric").length, 6);
  assert.equal(document.querySelectorAll("#rcmStage .rcm-service-card").length, 6);
  assert.match(document.querySelector(".rcm-footer").textContent, /no payer connection/i);
  assert.match(document.querySelector(".rcm-footer").textContent, /no claim submission/i);
  dom.window.close();
});

test("calculates visible portfolio measures from the current synthetic records", () => {
  const dom = launch();
  const snapshot = dom.window.PlexusRCM.getSnapshot();
  const { claims, metrics } = snapshot;
  const submitted = claims.filter((claim) => ["submitted", "denied", "paid", "patient"].includes(claim.stage));
  const adjudicated = claims.filter((claim) => ["denied", "paid", "patient"].includes(claim.stage));
  const open = claims.filter((claim) => claim.outstanding > 0);
  const outstanding = open.reduce((total, claim) => total + claim.outstanding, 0);
  const firstPass = Math.round(
    submitted.filter((claim) => claim.firstPassAccepted).length / submitted.length * 100,
  );
  const denialRate = Math.round(
    adjudicated.filter((claim) => claim.stage === "denied").length / adjudicated.length * 100,
  );
  const weightedAge = Math.round(
    open.reduce((total, claim) => total + claim.ageDays * claim.outstanding, 0) / outstanding,
  );

  assert.equal(metrics.outstanding, outstanding);
  assert.equal(metrics.firstPass, firstPass);
  assert.equal(metrics.denialRate, denialRate);
  assert.equal(metrics.daysAr, weightedAge);
  assert.equal(metrics.openItems, claims.filter((claim) => claim.stage !== "paid").length);
  assert.ok(metrics.charges > metrics.collected);
  dom.window.close();
});

test("keeps each RCM task in a focused layer and opens editable local claim follow-up", () => {
  const dom = launch();
  const { document, PlexusRCM, localStorage } = dom.window;
  document.querySelector('[data-tab="rcm"]').click();

  document.querySelector('#rcmLayerNav [data-rcm-layer="coverage"]').click();
  assert.match(document.getElementById("rcmStage").textContent, /Coverage and authorisation/);
  assert.equal(document.querySelectorAll("#rcmStage .rcm-layer").length, 1);

  document.querySelector('#rcmLayerNav [data-rcm-layer="denials"]').click();
  assert.match(document.getElementById("rcmStage").textContent, /Denial intelligence/);
  assert.ok(document.querySelectorAll("#rcmStage [data-rcm-open]").length > 0);

  document.querySelector('#rcmLayerNav [data-rcm-layer="payments"]').click();
  assert.match(document.getElementById("rcmStage").textContent, /accounts receivable/i);
  assert.equal(document.querySelectorAll("#rcmStage .rcm-aging-grid article").length, 4);

  const claim = PlexusRCM.getSnapshot().claims.find((item) => item.stage === "denied");
  assert.equal(PlexusRCM.openClaim(claim.id), true);
  assert.match(document.getElementById("rcmDetailTitle").textContent, new RegExp(claim.id));
  assert.equal(document.querySelectorAll(".rcm-checklist li").length, 6);
  assert.match(document.querySelector(".rcm-caveat").textContent, /Synthetic amounts/);

  const form = document.getElementById("rcmFollowUpForm");
  form.elements.owner.value = "Denial team";
  form.elements.followUpDate.value = "2026-07-21";
  form.elements.note.value = "Synthetic root-cause review queued.";
  form.elements.reviewed.checked = true;
  form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));

  const saved = JSON.parse(localStorage.getItem("vivantePlexus.rcm.v1"));
  assert.equal(saved.version, 1);
  assert.equal(saved.actions[claim.id].owner, "Denial team");
  assert.equal(saved.actions[claim.id].followUpDate, "2026-07-21");
  assert.equal(saved.actions[claim.id].note, "Synthetic root-cause review queued.");
  assert.equal(saved.actions[claim.id].reviewed, true);
  assert.match(document.getElementById("rcmLive").textContent, /saved locally/i);
  dom.window.close();
});

test("documents transaction, FHIR and production boundaries in-product", () => {
  const dom = launch();
  const { document, PlexusRCM } = dom.window;
  document.querySelector('[data-tab="rcm"]').click();
  PlexusRCM.showLayer("safeguards", false);

  const text = document.getElementById("rcmStage").textContent;
  for (const standard of ["270/271", "278", "837P", "276/277", "835"]) {
    assert.match(text, new RegExp(standard.replace("/", "\\/")));
  }
  assert.match(text, /No CPT content or automated code selection/);
  assert.match(text, /No autonomous claim or appeal submission/);
  assert.match(text, /FHIR financial resources can support API and interoperability planning/);
  assert.match(text, /not presented here as a substitute/i);
  assert.equal(document.querySelectorAll(".rcm-source-grid a").length, 4);
  assert.ok(
    [...document.querySelectorAll(".rcm-source-grid a")].every(
      (link) => link.target === "_blank" && link.rel.includes("noopener"),
    ),
  );

  const exported = PlexusRCM.exportSnapshot();
  assert.equal(exported.scope, "Synthetic RCM workflow demonstration only");
  assert.deepEqual(
    Array.from(exported.transactionMap),
    ["X12 270/271", "X12 278", "X12 837P", "X12 276/277", "X12 835"],
  );
  assert.ok(exported.fhirPlanningResources.includes("CoverageEligibilityRequest"));
  dom.window.close();
});
