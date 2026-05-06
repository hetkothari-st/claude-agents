#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REQUIRED_SECTIONS = [
  '## Reference apps',
  '## Palette',
  '## Typography',
  '## Layout archetype',
  '## Key UX patterns',
  '## Anti-patterns',
];

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const root = process.cwd();
const domainsRoot = join(root, 'knowledge/domains');

let errors = 0;
let warnings = 0;
const log  = (msg) => console.log(msg);
const err  = (msg) => { console.error(`ERROR: ${msg}`); errors++; };
const warn = (msg) => { console.log(`warn: ${msg}`); warnings++; };

let domains;
try {
  domains = readdirSync(domainsRoot).filter(d =>
    statSync(join(domainsRoot, d)).isDirectory()
  );
} catch {
  err(`No knowledge/domains directory at ${domainsRoot}`);
  process.exit(1);
}

for (const slug of domains) {
  const dir = join(domainsRoot, slug);
  const readmePath = join(dir, 'README.md');
  const tokensPath = join(dir, 'tokens.json');
  const refsDir    = join(dir, 'refs');

  // README
  let readme = '';
  try { readme = readFileSync(readmePath, 'utf8'); }
  catch { err(`${slug}: missing README.md`); continue; }
  for (const sec of REQUIRED_SECTIONS) {
    if (!readme.includes(sec)) err(`${slug}: README.md missing section "${sec}"`);
  }

  // tokens.json
  let tokens;
  try { tokens = JSON.parse(readFileSync(tokensPath, 'utf8')); }
  catch (e) { err(`${slug}: tokens.json invalid JSON (${e.message})`); continue; }
  if (!tokens.colors || typeof tokens.colors !== 'object') {
    err(`${slug}: tokens.json missing "colors" object`);
  } else {
    walkColors(slug, tokens.colors);
  }

  // refs
  let refs = [];
  try { refs = readdirSync(refsDir); }
  catch { err(`${slug}: missing refs/ directory`); continue; }
  const pngs = refs.filter(f => f.toLowerCase().endsWith('.png'));
  if (pngs.length === 0) {
    warn(`${slug}: refs/ has no PNG screenshots yet (capture pending)`);
  } else {
    for (const f of pngs) {
      const s = statSync(join(refsDir, f));
      if (s.size === 0) err(`${slug}: refs/${f} is zero bytes`);
      if (s.size > 800 * 1024) warn(`${slug}: refs/${f} > 800 KB (${(s.size/1024).toFixed(0)} KB)`);
    }
  }
}

function walkColors(slug, obj, path = '') {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      if (!HEX_RE.test(v)) err(`${slug}: tokens.colors${path}.${k} not a valid hex: ${v}`);
    } else if (v && typeof v === 'object') {
      walkColors(slug, v, `${path}.${k}`);
    }
  }
}

log(`\nDomains scanned: ${domains.length}. errors=${errors} warnings=${warnings}`);
process.exit(errors > 0 ? 1 : 0);
