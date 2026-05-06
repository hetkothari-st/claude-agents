import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function makeFakeDomain(root, slug, { readme, tokens, addPng = false } = {}) {
  const dir = join(root, 'knowledge/domains', slug);
  mkdirSync(join(dir, 'refs'), { recursive: true });
  if (readme !== null) writeFileSync(join(dir, 'README.md'), readme);
  if (tokens !== null) writeFileSync(join(dir, 'tokens.json'), tokens);
  writeFileSync(join(dir, 'refs/.gitkeep'), '');
  if (addPng) writeFileSync(join(dir, 'refs/sample.png'), 'fake-png-content');
}

const VALID_README = [
  '# X', '',
  '## Reference apps', 'table',
  '## Palette', 'p',
  '## Typography', 't',
  '## Layout archetype', 'l',
  '## Key UX patterns', 'k',
  '## Anti-patterns', 'a',
].join('\n');

const VALID_TOKENS = JSON.stringify({
  colors: { primary: '#000000' },
  fontFamily: { sans: ['Inter'] },
  fontSize: {},
  borderRadius: {}
});

function runLint(cwd) {
  return spawnSync(process.execPath, ['tests/lint-knowledge.mjs'], {
    cwd, encoding: 'utf8',
  });
}

test('passes on a valid domain with refs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-'));
  try {
    makeFakeDomain(dir, 'good', { readme: VALID_README, tokens: VALID_TOKENS, addPng: true });
    // copy the lint script into a sibling tests/ in tempdir
    mkdirSync(join(dir, 'tests'), { recursive: true });
    writeFileSync(join(dir, 'tests/lint-knowledge.mjs'), readScript());
    const r = runLint(dir);
    assert.equal(r.status, 0, r.stderr || r.stdout);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('fails when README missing a required section', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-'));
  try {
    const broken = VALID_README.replace('## Anti-patterns', '## Other');
    makeFakeDomain(dir, 'bad-readme', { readme: broken, tokens: VALID_TOKENS, addPng: true });
    mkdirSync(join(dir, 'tests'), { recursive: true });
    writeFileSync(join(dir, 'tests/lint-knowledge.mjs'), readScript());
    const r = runLint(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /Anti-patterns/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('fails when tokens.json invalid JSON', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-'));
  try {
    makeFakeDomain(dir, 'bad-tokens', { readme: VALID_README, tokens: '{ not json', addPng: true });
    mkdirSync(join(dir, 'tests'), { recursive: true });
    writeFileSync(join(dir, 'tests/lint-knowledge.mjs'), readScript());
    const r = runLint(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /tokens\.json/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('warns but exits 0 when refs dir has no PNGs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-'));
  try {
    makeFakeDomain(dir, 'no-refs', { readme: VALID_README, tokens: VALID_TOKENS, addPng: false });
    mkdirSync(join(dir, 'tests'), { recursive: true });
    writeFileSync(join(dir, 'tests/lint-knowledge.mjs'), readScript());
    const r = runLint(dir);
    assert.equal(r.status, 0);
    assert.match(r.stderr + r.stdout, /warn.*no PNG/i);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
function readScript() {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(resolve(here, 'lint-knowledge.mjs'), 'utf8');
}
