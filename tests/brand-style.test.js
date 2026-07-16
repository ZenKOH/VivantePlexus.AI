const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const csstree = require("css-tree");

const root = path.join(__dirname, "..");
const baseCss = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const brandCss = fs.readFileSync(path.join(root, "overrides.css"), "utf8");
const polishCss = fs.readFileSync(path.join(root, "ui-polish.css"), "utf8");
const aiLabCss = fs.readFileSync(path.join(root, "plexus-ai-lab.css"), "utf8");
const rcmCss = fs.readFileSync(path.join(root, "rcm.css"), "utf8");

test("brand stylesheets are valid CSS", () => {
  assert.doesNotThrow(() => csstree.parse(baseCss));
  assert.doesNotThrow(() => csstree.parse(brandCss));
  assert.doesNotThrow(() => csstree.parse(polishCss));
  assert.doesNotThrow(() => csstree.parse(aiLabCss));
  assert.doesNotThrow(() => csstree.parse(rcmCss));
});

test("final cascade uses the Robotimize light and red brand palette", () => {
  const html = fs
    .readFileSync(path.join(root, "index.html"), "utf8")
    .replace(/<link rel="stylesheet"[^>]+>/g, "")
    .replace("</head>", `<style>${baseCss}\n${brandCss}\n${polishCss}\n${aiLabCss}\n${rcmCss}</style></head>`);
  const dom = new JSDOM(html, { pretendToBeVisual: true });
  const { document } = dom.window;
  const style = dom.window.getComputedStyle.bind(dom.window);

  assert.equal(style(document.documentElement).getPropertyValue("--accent").trim(), "#c21f47");
  assert.equal(style(document.documentElement).getPropertyValue("--panel").trim(), "#ffffff");
  assert.equal(style(document.documentElement).getPropertyValue("--text").trim(), "#403e3e");
  assert.equal(style(document.body).fontSize, "14px");
  assert.equal(style(document.querySelector(".tab-button")).minHeight, "44px");
  assert.equal(style(document.querySelector(".workspace-layer-nav button")).minHeight, "44px");
  const assurance = document.querySelector(".header-assurance");
  assert.equal(style(assurance).display, "flex");
  assert.equal(style(assurance).flexWrap, "wrap");
  assert.equal(style(assurance).textTransform, "none");
  assert.equal(style(assurance).textAlign, "");
  assert.match(brandCss, /\.panel,[\s\S]*background:\s*var\(--panel\)/);
  assert.match(brandCss, /\.tab-button\.active\s*{[\s\S]*?background:\s*var\(--accent\)/);
  assert.match(brandCss, /\.primary\s*{[\s\S]*?background:\s*var\(--accent\)/);
  assert.match(brandCss, /radial-gradient\(circle at 88% 4%, rgba\(194, 31, 71, \.09\)/);
  assert.match(polishCss, /\.app-header-inner\s*{[\s\S]*?width:\s*min\(var\(--ui-max\)/);
  assert.match(polishCss, /\.tab-nav-inner\s*{[\s\S]*?grid-template-columns:\s*repeat\(7/);
  assert.match(rcmCss, /\.rcm-layer-nav button\s*{[\s\S]*?min-height:/);
  assert.match(rcmCss, /\.rcm-stage\s*{[\s\S]*?height:\s*clamp/);
  assert.match(rcmCss, /@media \(max-width:\s*760px\)[\s\S]*?\.rcm-stage\s*{[\s\S]*?height:\s*auto/);
  assert.match(polishCss, /\.workspace-layer-nav button\s*{[\s\S]*?min-height:\s*44px/);
  assert.match(polishCss, /\.workspace-layer-nav\s*{[\s\S]*?grid-template-columns:\s*repeat\(8/);
  assert.match(aiLabCss, /\.ai-lab-mode-nav\s*{[\s\S]*?grid-template-columns:\s*repeat\(5/);
  assert.match(aiLabCss, /\.ai-lab-stage\s*{[\s\S]*?min-height:\s*420px/);
  assert.match(aiLabCss, /@media \(max-width:\s*520px\)/);
  assert.match(aiLabCss, /@media \(forced-colors:\s*active\)/);
  assert.match(polishCss, /\.header-assurance\s*{[\s\S]*?flex-wrap:\s*wrap/);
  assert.match(polishCss, /\.header-assurance li::before\s*{[\s\S]*?background:\s*var\(--accent\)/);
  assert.match(polishCss, /@media \(max-width:\s*760px\)[\s\S]*?\.workspace-stage,[\s\S]*?height:\s*auto/);
  assert.match(polishCss, /@media \(prefers-reduced-motion:\s*reduce\)/);
  dom.window.close();
});
