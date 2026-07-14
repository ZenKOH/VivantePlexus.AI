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

test('loader references versioned welcome assets and has a visibility failsafe', () => {
  assert.match(loader, /welcome-landing\.css\?v=\$\{version\}/);
  assert.match(loader, /welcome-landing\.js\?v=\$\{version\}/);
  assert.match(loader, /setTimeout\(\(\) => document\.documentElement\.classList\.remove\("plexus-welcome-pending"\), 5000\)/);
});

test('welcome styling contains responsive and reduced-motion handling', () => {
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.match(styles, /min-height: 100svh/);
});
