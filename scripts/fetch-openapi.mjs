#!/usr/bin/env node
/**
 * Refreshes the three `backend-*-openapi.json` specs Orval reads by copying the sibling API repos'
 * build output (`openapi/<Api>.json`, emitted by `dotnet build` via
 * `Microsoft.Extensions.ApiDescription.Server`) — no database or running server needed.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const SPECS = [
  { api: 'LupiraLocationApi', out: 'backend-location-openapi.json' },
  { api: 'LupiraHealthApi', out: 'backend-health-openapi.json' },
  { api: 'LupiraAssistantApi', out: 'backend-assistant-openapi.json' },
];

let failed = false;

for (const { api, out } of SPECS) {
  const src = path.resolve(repoRoot, '..', api, 'openapi', `${api}.json`);
  const dest = path.join(repoRoot, out);
  try {
    const json = JSON.parse(await fs.readFile(src, 'utf-8'));
    await fs.writeFile(dest, JSON.stringify(json, null, 2) + '\n');
    console.log(`Copied ${src} → ${out} (${(JSON.stringify(json).length / 1024).toFixed(1)} KB)`);
  } catch (e) {
    failed = true;
    console.error(`No spec at ${src} — run \`dotnet build\` in ../${api} to emit it.`);
    console.error(`(${e instanceof Error ? e.message : String(e)})`);
  }
}

if (failed) process.exit(1);
