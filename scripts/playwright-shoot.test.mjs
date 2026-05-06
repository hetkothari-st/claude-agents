import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';

function startStaticServer() {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(`<!doctype html><html><body><h1>Path: ${req.url}</h1></body></html>`);
  });
  return new Promise(resolve => {
    server.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

test('shoots three viewports per route', async () => {
  const { server, port } = await startStaticServer();
  const out = mkdtempSync(join(tmpdir(), 'shoot-'));
  try {
    const baseUrl = `http://localhost:${port}`;
    const routes = ['/', '/about'];
    const child = spawn(process.execPath, [
      'scripts/playwright-shoot.mjs',
      '--baseUrl', baseUrl,
      '--routes', routes.join(','),
      '--out', out,
    ], { stdio: 'inherit' });
    const exitCode = await new Promise(r => child.on('exit', r));
    assert.equal(exitCode, 0);

    const files = readdirSync(out).sort();
    assert.deepEqual(files, [
      'about-desktop.png',
      'about-mobile.png',
      'about-tablet.png',
      'root-desktop.png',
      'root-mobile.png',
      'root-tablet.png',
    ]);
  } finally {
    server.close();
    rmSync(out, { recursive: true, force: true });
  }
});
