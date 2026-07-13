const test = require("node:test");
const assert = require("node:assert/strict");

const stored = new Map();
global.localStorage = {
  getItem: (key) => stored.get(key) || null,
  setItem: (key, value) => stored.set(key, value),
};

require("../i18n.js");

test("exposes all six supported languages", () => {
  assert.deepEqual(Object.keys(global.i18n.languages), [
    "en",
    "zh-Hans",
    "es",
    "fr",
    "de",
    "ms",
  ]);
});

test("translates representative clinical interface content", () => {
  const expected = {
    "zh-Hans": "VivantePlexus™",
    es: "VivantePlexus™",
    fr: "VivantePlexus™",
    de: "VivantePlexus™",
    ms: "VivantePlexus™",
  };
  for (const [language, title] of Object.entries(expected)) {
    global.i18n.setLanguage(language);
    assert.equal(global.i18n.translateText("VivantePlexus™"), title);
  }
});

test("localises dynamic dose and clinical-review messages", () => {
  global.i18n.setLanguage("es");
  assert.equal(
    global.i18n.translateText("Target: 180 min · 75%"),
    "Objetivo: 180 min · 75%",
  );
  assert.match(
    global.i18n.translateText("45 active minutes against a 180 minute target."),
    /45 minutos activos/,
  );

  global.i18n.setLanguage("zh-Hans");
  assert.equal(
    global.i18n.translateText("3 session(s) show pain >=7/10."),
    "3 次治疗显示疼痛 ≥7/10。",
  );

  global.i18n.setLanguage("ms");
  assert.equal(
    global.i18n.translateText("Programme saved."),
    "Program disimpan.",
  );
});

test("localises the equipment workflow in every added language", () => {
  const expected = {
    "zh-Hans": "设备库",
    es: "Biblioteca de equipamiento",
    fr: "Bibliothèque d’équipement",
    de: "Ausrüstungsbibliothek",
    ms: "Pustaka peralatan",
  };
  for (const [language, label] of Object.entries(expected)) {
    global.i18n.setLanguage(language);
    assert.equal(global.i18n.translateText("Equipment library"), label);
    assert.notEqual(
      global.i18n.translateText("Save equipment"),
      "Save equipment",
    );
  }
});

test("localises the case and session navigation in every added language", () => {
  const expected = {
    "zh-Hans": ["打开病例报告", "病例记录", "报告"],
    es: ["Abrir informe del caso", "Registro del caso", "Informe"],
    fr: ["Ouvrir le rapport du cas", "Dossier du cas", "Rapport"],
    de: ["Fallbericht öffnen", "Fallakte", "Bericht"],
    ms: ["Buka laporan kes", "Rekod kes", "Laporan"],
  };
  const guidance =
    "Select a session title to open its comprehensive case report. Sample data includes 216 synthetic therapy sessions across 72 cases.";
  for (const [language, labels] of Object.entries(expected)) {
    global.i18n.setLanguage(language);
    assert.equal(global.i18n.translateText("Open case report"), labels[0]);
    assert.equal(global.i18n.translateText("Case record"), labels[1]);
    assert.equal(global.i18n.translateText("Report"), labels[2]);
    assert.notEqual(global.i18n.translateText("Sessions"), "Sessions");
    assert.notEqual(global.i18n.translateText(guidance), guidance);
  }
});

test("persists the selected language and exposes the matching locale", () => {
  global.i18n.setLanguage("de");
  assert.equal(stored.get("vivantePlexus.language"), "de");
  assert.equal(global.i18n.locale(), "de-DE");
});

test("falls back safely for unsupported languages and user text", () => {
  assert.equal(global.i18n.setLanguage("xx"), "en");
  assert.equal(
    global.i18n.translateText("Patient-authored goal text"),
    "Patient-authored goal text",
  );
});
