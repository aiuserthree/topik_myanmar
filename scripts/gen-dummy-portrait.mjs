#!/usr/bin/env node
/**
 * Generate scripts/assets/dummy-portrait.jpg and copy to FO asset dirs.
 * Run: node scripts/gen-dummy-portrait.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(__dirname, 'assets', 'dummy-portrait.jpg');
const PY = path.join(__dirname, 'gen-dummy-portrait.py');

const TARGETS = [
  path.join(ROOT, 'html', 'A안', 'assets', 'dummy-portrait.jpg'),
  path.join(ROOT, 'html', 'B안', 'assets', 'dummy-portrait.jpg'),
  path.join(ROOT, 'html', 'C안', 'FO', 'assets', 'dummy-portrait.jpg'),
  path.join(ROOT, 'public', 'assets', 'dummy-portrait.jpg'),
];

execSync(`python3 "${PY}" "${SRC}"`, { stdio: 'inherit' });

const stat = fs.statSync(SRC);
console.log(`Created ${SRC} (${stat.size} bytes)`);

for (const dest of TARGETS) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(SRC, dest);
  console.log(`Copied → ${dest}`);
}
