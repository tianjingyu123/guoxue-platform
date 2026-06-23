// Comprehensive Vue template audit for V0 team
const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(p));
    else if (e.name.endsWith('.vue')) files.push(p);
  }
  return files;
}

const results = [];
const allFiles = walk('src');
let total = 0;

for (const f of allFiles) {
  total++;
  const content = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  const tStart = content.indexOf('<template>');
  const tEnd = content.lastIndexOf('</template>');
  if (tStart < 0 || tEnd < 0) continue;

  const tpl = content.slice(tStart + 10, tEnd);

  // Count view tags
  const opens = (tpl.match(/<view[\s>]/g) || []).length;
  const closes = (tpl.match(/<\/view>/g) || []).length;
  const diff = opens - closes;

  // Check nesting order
  const stack = [];
  let nestingIssue = false;
  const tagRegex = /<(\/?)(view|text|scroll-view|image|block|swiper|swiper-item)[\s>]/g;
  let m;
  while ((m = tagRegex.exec(tpl)) !== null) {
    if (m[1] === '/') {
      if (stack.length && stack[stack.length-1].tag === m[2]) {
        stack.pop();
      } else if (stack.length) {
        nestingIssue = true;
        const found = stack.map(s => s.tag).lastIndexOf(m[2]);
        if (found >= 0) stack.splice(found);
        else stack.pop();
      }
    } else {
      stack.push({ tag: m[2] });
    }
  }

  if (diff !== 0 || nestingIssue || stack.length > 0) {
    const cleanPath = f.replace(/\\/g, '/');
    results.push({
      file: cleanPath,
      opens,
      closes,
      diff,
      unclosedTags: stack.map(s => s.tag).join(','),
      nestingIssue
    });
  }
}

// Sort by severity
results.sort((a, b) => {
  const sev = r => Math.abs(r.diff) + (r.nestingIssue ? 10 : 0) + (r.unclosedTags ? 5 : 0);
  return sev(b) - sev(a);
});

// Output
const lines = [];
lines.push('Vue Template Error Audit Report');
lines.push('===============================');
lines.push('Total Vue files: ' + total);
lines.push('Files with issues: ' + results.length);
lines.push('Total files checked: ' + total);
lines.push('');
lines.push('Severity: diff=view tag count mismatch, nest=nesting order wrong, unclosed=tags left open');
lines.push('');
lines.push('--- ISSUE LIST ---');
lines.push('');

results.forEach((r, i) => {
  const issues = [];
  if (r.diff !== 0) {
    issues.push('view tag count: ' + r.opens + ' opens vs ' + r.closes + ' closes (diff=' + (r.diff > 0 ? '+' : '') + r.diff + ')');
  }
  if (r.nestingIssue) issues.push('NESTING ORDER WRONG');
  if (r.unclosedTags) issues.push('unclosed tags: ' + r.unclosedTags);

  lines.push((i + 1) + '. ' + r.file);
  lines.push('   ISSUE: ' + issues.join(' | '));
});

// Group by directory
lines.push('');
lines.push('--- BY DIRECTORY ---');
lines.push('');
const byDir = {};
results.forEach(r => {
  const parts = r.file.split('/');
  const dir = parts.length > 2 ? parts.slice(0, 3).join('/') : parts.slice(0, 2).join('/');
  if (!byDir[dir]) byDir[dir] = [];
  byDir[dir].push(r.file);
});

Object.keys(byDir).sort().forEach(dir => {
  lines.push(dir + ': ' + byDir[dir].length + ' files');
});

const output = lines.join('\n');

// Write to file
const outPath = 'C:/Users/Administrator/Desktop/vue-template-errors.txt';
fs.writeFileSync(outPath, output, 'utf8');

console.log(output.slice(0, 2000));
console.log('...');
console.log('Full report saved to: Desktop/vue-template-errors.txt');
console.log('Total lines: ' + lines.length);
