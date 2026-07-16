const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");

function launch(hash = "") {
  const dom = new JSDOM(fs.readFileSync(path.join(root, "index.html"), "utf8"), {
    runScripts: "outside-only",
    url: `https://example.test/VivantePlexus.AI/${hash}`,
  });
  dom.window.scrollTo = () => {};
  dom.window.eval([
    "i18n.js",
    "app-v4.js",
    "case-expansion.js",
    "diverse-cases.js",
    "plexus-ai.js",
    "plexus-ai-lab.js",
    "reports.js",
    "rcm.js",
  ].map((name) => fs.readFileSync(path.join(root, name), "utf8")).join("\n"));
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded", { bubbles: true }));
  return dom;
}

test("opens a focused five-mode AI Studio with reviewable local trajectory estimates", () => {
  const dom = launch("#ai-studio");
  const { document, PlexusAILab } = dom.window;
  const snapshot = PlexusAILab.getSnapshot();

  assert.equal(document.getElementById("overview").hidden, false);
  assert.equal(document.getElementById("ai-studio").hidden, false);
  assert.equal(document.querySelector('[data-workspace-layer].active').dataset.workspaceLayer, "studio");
  assert.equal(document.querySelectorAll("[data-ai-lab-mode]").length, 5);
  assert.equal(document.querySelectorAll("[data-ai-lab-mode].active").length, 1);
  assert.equal(snapshot.build, "20260716-2");
  assert.equal(snapshot.selectedCase.id, "case-01");
  assert.equal(snapshot.trajectory.forecasts.length, 4);
  assert.ok(snapshot.trajectory.forecasts.every((forecast) => forecast.model?.count >= 3));
  assert.ok(snapshot.trajectory.forecasts.every((forecast) => forecast.model.r2 >= 0 && forecast.model.r2 <= 1));
  assert.match(document.getElementById("aiLabStage").textContent, /does not predict recovery/i);
  assert.deepEqual(
    new Set(snapshot.exclusions),
    new Set(["diagnosis", "prognosis", "treatment recommendation", "medical necessity", "autonomous action"]),
  );
  dom.window.close();
});

test("retrieves explainable synthetic neighbours and recalculates bounded exposure scenarios", () => {
  const dom = launch();
  const { document, PlexusAILab, Event } = dom.window;
  const selected = PlexusAILab.getSnapshot().selectedCase.id;

  PlexusAILab.showMode("cohort", false);
  const matches = PlexusAILab.getSnapshot().cohortMatches;
  assert.equal(matches.length, 5);
  assert.ok(matches.every((match) => match.case.id !== selected));
  assert.equal(new Set(matches.map((match) => match.case.id)).size, 5);
  assert.ok(matches.every((match) => match.score >= 0 && match.score <= 100));
  assert.ok(matches.every((match) => match.contributors.length > 0));
  const scores = Array.from(matches, (match) => match.score);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
  assert.match(document.getElementById("aiLabStage").textContent, /does not establish treatment effect or prognosis/i);

  PlexusAILab.showMode("scenario", false);
  const before = PlexusAILab.getSnapshot().scenario;
  const slider = document.querySelector('[data-ai-lab-scenario="sessions"]');
  slider.value = String(before.sessions === 7 ? 6 : before.sessions + 1);
  slider.dispatchEvent(new Event("change", { bubbles: true }));
  const after = PlexusAILab.getSnapshot().scenario;
  assert.notEqual(after.sessions, before.sessions);
  assert.equal(
    after.activeMinutes,
    after.sessions * after.scheduled * after.delivery / 100 * after.conversion / 100,
  );
  assert.match(document.getElementById("aiLabStage").textContent, /not a dosing recommendation/i);
  dom.window.close();
});

test("keeps workflow value, assurance and feedback measurable without inventing clinical claims", () => {
  const dom = launch();
  const { document, PlexusAILab } = dom.window;

  let snapshot = PlexusAILab.getSnapshot();
  assert.equal(snapshot.value.records, 432);
  assert.equal(snapshot.value.cases, 72);
  assert.equal(snapshot.value.sessions, 216);
  assert.equal(snapshot.value.outcomes, 144);
  assert.ok(snapshot.value.compression > 90);

  document.querySelector('[data-ai-lab-feedback="useful"]').click();
  const feedback = JSON.parse(dom.window.localStorage.getItem("vivantePlexus.aiLab.v1"));
  assert.equal(feedback.items["case-01:trajectory"].rating, "useful");
  assert.ok(dom.window.localStorage.getItem("vivantePlexus.v1"), "clinical source data remains in its own namespace");

  PlexusAILab.showMode("assurance", false);
  const text = document.getElementById("aiLabStage").textContent;
  assert.match(text, /Not clinically validated/i);
  assert.match(text, /No diagnosis or prognosis/i);
  assert.equal(document.querySelectorAll(".ai-lab-gates li").length, 6);
  assert.equal(document.querySelectorAll(".ai-lab-source-grid a").length, 6);
  assert.ok([...document.querySelectorAll(".ai-lab-source-grid a")].every((link) => link.protocol === "https:"));
  snapshot = PlexusAILab.getSnapshot();
  assert.equal(snapshot.feedback.items["case-01:trajectory"].rating, "useful");
  assert.ok(snapshot.methods.includes("weighted mixed-data similarity"));
  dom.window.close();
});
