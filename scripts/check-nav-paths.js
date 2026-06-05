const fs = require('fs');
const path = require('path');

const srcDir = 'C:/Users/Administrator/Desktop/guoxue-platform/apps/mobile/src';
const validPaths = JSON.parse(fs.readFileSync(path.join(srcDir, '../.tmp-valid-paths.json'), 'utf8'));
const validSet = new Set(validPaths);

function findVueFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules') files.push(...findVueFiles(full));
    else if (e.name.endsWith('.vue')) files.push(full);
  }
  return files;
}

const vueFiles = findVueFiles(path.join(srcDir, 'pages'));
const urlRegex = /url\s*:\s*['`]([^'`]+)['`]/g;
const broken = [];

for (const file of vueFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = urlRegex.exec(content)) !== null) {
    let url = m[1];
    if (!url.startsWith('/pages/') && !url.startsWith('pages/')) continue;
    const cleanUrl = url.replace(/^\//, '').split('?')[0].split('#')[0];
    if (!validSet.has(cleanUrl)) {
      const lines = content.substring(0, m.index).split('\n');
      const relPath = path.relative(srcDir, file).replace(/\\/g, '/');
      broken.push({ file: relPath, line: lines.length, url: m[1], target: cleanUrl });
    }
  }
}

if (broken.length) {
  console.log('Broken paths: ' + broken.length);
  for (const b of broken) {
    console.log('  ' + b.file + ':' + b.line + ' → ' + b.url + ' (target: ' + b.target + ')');
  }
} else {
  console.log('All navigation paths valid!');
}
