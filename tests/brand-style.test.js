const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const csstree = require("css-tree");

const root = path.join(__dirname, "..");
const baseCss = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const brandCss = fs.readFileSync(path.join(root, "overrides.css"), "utf8");

test("brand stylesheets are valid CSS", () => {
  assert.doesNotThrow(() => csstree.parse(baseCss));
  assert.doesNotThrow(() => csstree.parse(brandCss));
});

test("final cascade uses the Robotimize light and red brand palette", () => {
  const html = fs
    .readFileSync(path.join(root, "index.html"), "utf8")
    .replace(/<link rel="stylesheet"[^>]+>/g, "")
    .replace("</head>", `<style>${baseCss}\n${brandCss}</style></head>`);
  const dom = new JSDOM(html, { pretendToBeVisual: true });
  const { document } = dom.window;
  const style = dom.window.getComputedStyle.bind(dom.window);

  assert.equal(style(document.documentElement).getPropertyValue("--accent").trim(), "#c21f47");
  assert.equal(style(document.documentElement).getPropertyValue("--panel").trim(), "#ffffff");
  assert.equal(style(document.documentElement).getPropertyValue("--text").trim(), "#403e3e");
  assert.match(brandCss, /\.panel,[\s\S]*background:\s*var\(--panel\)/);
  assert.match(brandCss, /\.tab-button\.active\s*{[\s\S]*?background:\s*var\(--accent\)/);
  assert.match(brandCss, /\.primary\s*{[\s\S]*?background:\s*var\(--accent\)/);
  assert.match(brandCss, /radial-gradient\(circle at 88% 4%, rgba\(194, 31, 71, \.09\)/);
  dom.window.close();
});
