const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const landing = fs.readFileSync(path.join(root, 'welcome-landing.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'welcome-landing.css'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'equipment-upgrade.js'), 'utf8');

test('welcome layer exposes the required safe entry controls', () => {
  for (const id of [
    'plexusWelcomeMain',
    'plexusWelcomeConsent',
    'plexusWelcomeEnter',
    'plexusWelcomeReload',
    'plexusWelcomeMethod'
  ]) assert.match(landing, new RegExp(id));
  assert.match(landing, /synthetic data/i);
  assert.match(landing, /directly identifiable patient information/i);
});

test('welcome layer supports all interface languages', () => {
  for (const language of ['en', 'zh-Hans', 'es', 'fr', 'de', 'ms']) {
    assert.match(landing, new RegExp(`(?:^|\\n)\\s*(?:"${language}"|${language}):\\[`));
  }
});

test('loader references the current versioned welcome assets and has a visibility failsafe', () => {
  assert.match(loader, /const version = "20260714-3"/);
  assert.match(loader, /welcome-landing\.css\?v=\$\{version\}/);
  assert.match(loader, /welcome-landing\.js\?v=\$\{version\}/);
  assert.match(loader, /setTimeout\(\(\) => document\.documentElement\.classList\.remove\("plexus-welcome-pending"\), 5000\)/);
});

test('welcome styling uses a restrained desktop rail and compact access panel', () => {
  assert.match(styles, /width:\s*min\(1280px, 100%\)/);
  assert.match(styles, /grid-template-columns:\s*minmax\(0, 1fr\) minmax\(330px, 390px\)/);
  assert.match(styles, /\.plexus-access-card\s*{[\s\S]*?border-radius:\s*18px/);
  assert.match(styles, /\.plexus-access-actions \.primary,[\s\S]*?border-radius:\s*10px/);
});

test('mobile presentation removes decorative density and preserves touch targets', () => {
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*?\.plexus-map-wrap\s*{\s*display:\s*none/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*?\.plexus-mechanism-strip span\s*{\s*display:\s*none/);
  assert.match(styles, /min-height:\s*48px/);
  assert.match(styles, /min-height:\s*100svh/);
});

test('welcome styling keeps reduced-motion, high-contrast and keyboard focus support', () => {
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /@media \(forced-colors: active\)/);
  assert.match(styles, /:focus-visible/);
});
