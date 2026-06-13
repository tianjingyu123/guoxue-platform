const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const out = execFileSync('npx', ['eslint', 'src', '--ext', '.ts', '--quiet', '-f', 'compact'], {
  encoding: 'utf8', maxBuffer: 50*1024*1024, cwd: __dirname
});

const lines = out.split('\n');
const wsFiles = new Set();

for (const line of lines) {
  if (line.includes('no-irregular-whitespace')) {
    const m = line.match(/^(.+?\.ts):(\d+):(\d+)/);
    if (m) wsFiles.add(m[1]);
  }
}

// Irregular whitespace chars to replace with regular space:
// U+00A0 (NBSP), U+2000-U+200A, U+2028, U+2029, U+202F, U+205F, U+3000, U+FEFF
const badWs = [
  ' ', ' ', ' ', ' ', ' ', ' ', ' ',
  ' ', ' ', ' ', ' ', ' ',
  ' ', ' ', ' ', ' ', '　', '﻿'
];

let count = 0;
for (const file of wsFiles) {
  const fullPath = path.resolve(__dirname, file);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;
  for (const ch of badWs) {
    if (content.includes(ch)) {
      content = content.replaceAll(ch, ' ');
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(fullPath, content);
    count++;
  }
}
console.log('Fixed', count, 'files with irregular whitespace');
