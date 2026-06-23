// Batch fix: replace useMock() pattern with try/catch fallback
// Pattern: if (useMock()) return mockData
//          return apiGet(...)
// Fix:     try { return await apiGet(...) } catch { return mockData }
const fs = require('fs');
const path = require('path');
const glob = require('child_process');

const libDir = path.resolve(__dirname, '../src/lib');
const files = fs.readdirSync(libDir).filter(f => f.endsWith('.ts'));

let totalFixed = 0;
let totalFiles = 0;

for (const file of files) {
  const filePath = path.join(libDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Check if file uses useMock()
  if (!content.includes('useMock()')) continue;
  totalFiles++;

  // Pattern 1: "if (useMock()) return mockVar" followed by "return apiGet(...)" on next line
  // Replace with: "try { const res = await apiGet(...); return res; } catch { return mockVar }"
  // Note: we need to keep the mock variable accessible

  // Simpler approach: replace "if (useMock()) return X" with comment,
  // and wrap the apiGet call in try/catch returning X

  // Pattern: if (useMock()) return something;
  //          return apiGet(path);
  // Replace with: try { return await apiGet(path); } catch { return something; }

  const pattern = /if\s*\(\s*useMock\s*\(\s*\)\s*\)\s*return\s+([^;]+);\s*\n(\s*)return\s+(await\s+)?(apiGet|apiPost)\s*(<[^>]+>)?\s*\(([^)]*)\)/g;

  if (pattern.test(content)) {
    // Reset lastIndex
    pattern.lastIndex = 0;
    content = content.replace(pattern, (match, mockReturn, indent, awaitKw, method, typeParam, args) => {
      const aw = awaitKw || 'await ';
      const tp = typeParam || '';
      return `try { return ${aw}${method}${tp}(${args}); } catch { return ${mockReturn}; }`;
    });
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    totalFixed++;
    console.log('FIXED:', file);
  }
}

console.log(`Fixed ${totalFixed}/${totalFiles} files`);
