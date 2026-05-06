#!/usr/bin/env node
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

const VIEWPORTS = {
  mobile:  { width: 375,  height: 812 },
  tablet:  { width: 768,  height: 1024 },
  desktop: { width: 1440, height: 900 },
};

const { values } = parseArgs({
  options: {
    baseUrl: { type: 'string' },
    routes:  { type: 'string' },
    out:     { type: 'string' },
  },
});

if (!values.baseUrl || !values.routes || !values.out) {
  console.error('Usage: playwright-shoot.mjs --baseUrl <url> --routes <a,b,c> --out <dir>');
  process.exit(2);
}

await mkdir(values.out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const route of values.routes.split(',')) {
    const slug = route === '/' ? 'root' : route.replace(/^\//, '').replace(/\//g, '-');
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const ctx = await browser.newContext({ viewport: vp });
      const page = await ctx.newPage();
      await page.goto(values.baseUrl + route, { waitUntil: 'load', timeout: 15000 });
      await page.screenshot({ path: join(values.out, `${slug}-${vpName}.png`), fullPage: true });
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
