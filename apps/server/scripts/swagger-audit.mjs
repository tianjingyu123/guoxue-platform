import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const BASE = 'C:/Users/Administrator/Desktop/guoxue-platform/apps/server/src/modules';

// Get all controller files recursively
function getControllerFiles(dir) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getControllerFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.controller.ts')) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

const files = getControllerFiles(BASE);

// Track issues per file
const issues = {};

for (const filePath of files) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = relative(BASE.replace('/src/modules', '/src/modules'), filePath).replace(/\\/g, '/');

  let classHasApiBearerAuth = false;
  let classHasApiTags = false;

  // First pass: detect class-level decorators
  let inClassDecorators = false;
  let classDecoratorLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('@')) {
      if (!inClassDecorators) {
        inClassDecorators = true;
        classDecoratorLines = [];
      }
      classDecoratorLines.push(line.trim());
    } else if (inClassDecorators && line.includes('class ')) {
      // We've reached the class definition
      const hasBearer = classDecoratorLines.some(d => d.startsWith('@ApiBearerAuth'));
      const hasTags = classDecoratorLines.some(d => d.startsWith('@ApiTags'));
      if (hasBearer) classHasApiBearerAuth = true;
      if (hasTags) classHasApiTags = true;
      inClassDecorators = false;
    } else if (inClassDecorators && line.trim() !== '') {
      inClassDecorators = false;
    }
  }

  // Second pass: parse each method
  // Strategy: find decorator blocks followed by method definitions
  const methodPattern = /^\s+@(Get|Post|Put|Delete|Patch)\(/;
  const useGuardsPattern = /^\s+@UseGuards\(/;
  const apiBearerAuthPattern = /^\s*@ApiBearerAuth\(/;
  const apiOperationPattern = /^\s*@ApiOperation\(/;
  const apiQueryPattern = /^\s*@ApiQuery\(/;
  const queryParamPattern = /@Query\(/;
  const useGuardsJwtPattern = /@UseGuards\(\s*JwtAuthGuard\s*\)/;

  // Parse methods line by line
  let i = 0;
  const fileIssues = [];

  while (i < lines.length) {
    const line = lines[i];

    if (methodPattern.test(line)) {
      // Found an HTTP method decorator
      const httpMethod = line.match(/@(Get|Post|Put|Delete|Patch)\(/)[1];

      // Collect all decorators above this line
      let decoratorLines = [];
      let j = i - 1;
      while (j >= 0 && lines[j].trim().startsWith('@')) {
        decoratorLines.unshift(lines[j].trim());
        j--;
      }

      // Check for @UseGuards that includes JwtAuthGuard
      const hasJwtGuard = decoratorLines.some(d => useGuardsJwtPattern.test(d) ||
        (d.includes('@UseGuards(') && d.includes('JwtAuthGuard')));

      // Check for method-level @ApiBearerAuth (class level already checked separately)
      const hasMethodApiBearerAuth = decoratorLines.some(d => apiBearerAuthPattern.test(d));
      const hasApiOperation = decoratorLines.some(d => apiOperationPattern.test(d));
      const hasApiQuery = decoratorLines.some(d => apiQueryPattern.test(d));

      // Find method signature
      let methodLine = '';
      let k = i + 1;
      while (k < lines.length) {
        const trimmed = lines[k].trim();
        if (trimmed.startsWith('async ') || trimmed.startsWith('(') || trimmed.startsWith('}')) {
          methodLine = lines[k];
          // Skip if it's a closing brace
          if (trimmed.startsWith('}')) break;
          // Find the actual method signature
          while (k < lines.length) {
            const t = lines[k].trim();
            if (t.includes('(') && t.includes(')')) {
              methodLine = lines[k];
              break;
            }
            if (t.startsWith('{') || t.startsWith('}')) break;
            k++;
          }
          break;
        }
        k++;
      }

      // Get full method text (next few lines) to check for @Query params
      let methodText = '';
      let scanIdx = i;
      let braceCount = 0;
      let foundMethod = false;
      while (scanIdx < lines.length) {
        const l = lines[scanIdx];
        methodText += l + '\n';
        if (l.includes('{')) {
          if (!foundMethod) {
            foundMethod = true;
            braceCount += (l.match(/\{/g) || []).length;
            if (l.includes('}')) braceCount -= (l.match(/\}/g) || []).length;
          } else {
            braceCount += (l.match(/\{/g) || []).length;
            if (l.includes('}')) braceCount -= (l.match(/\}/g) || []).length;
          }
        } else if (foundMethod && l.includes('}')) {
          braceCount -= (l.match(/\}/g) || []).length;
        }
        if (foundMethod && braceCount <= 0) break;
        scanIdx++;
      }

      // Check if method uses @Query()
      const usesQuery = queryParamPattern.test(methodText);

      // Extract method name for reporting
      let methodName = httpMethod.toLowerCase();
      // Try to extract from async methodName(
      const defMatch = methodText.match(/(?:async\s+)?(\w+)\s*\(/);
      if (defMatch && !['if', 'for', 'while', 'switch', 'catch', 'then'].includes(defMatch[1])) {
        methodName = defMatch[1];
      }

      // Check conditions
      // Condition 1: @UseGuards(JwtAuthGuard) without @ApiBearerAuth
      if (hasJwtGuard && !classHasApiBearerAuth && !hasMethodApiBearerAuth) {
        fileIssues.push(`  - ${methodName} (@${httpMethod}): 使用了 @UseGuards(JwtAuthGuard) 但缺少 @ApiBearerAuth()`);
      }

      // Condition 2: @Query() without @ApiQuery()
      if (usesQuery && !hasApiQuery) {
        // Check for any @ApiQuery in the method
        const anyApiQueryInMethod = decoratorLines.some(d => d.startsWith('@ApiQuery('));
        const linesAfterMethodDecorator = [];
        let ll = i + 1;
        while (ll < lines.length && !lines[ll].trim().startsWith('@')) {
          ll++;
        }
        // Also check decorators between @Get and method
        let m = i + 1;
        const extraDecorators = [];
        while (m < lines.length && lines[m].trim().startsWith('@')) {
          extraDecorators.push(lines[m].trim());
          m++;
        }
        const totalApiQuery = decoratorLines.concat(extraDecorators).some(d => d.startsWith('@ApiQuery('));
        if (!totalApiQuery) {
          fileIssues.push(`  - ${methodName} (@${httpMethod}): 使用了 @Query() 参数但缺少 @ApiQuery()`);
        }
      }

      // Condition 3: No @ApiOperation
      if (!hasApiOperation) {
        fileIssues.push(`  - ${methodName} (@${httpMethod}): 缺少 @ApiOperation({ summary: "..." })`);
      }

      i = scanIdx; // Skip to end of method
    }
    i++;
  }

  if (fileIssues.length > 0) {
    issues[relativePath] = fileIssues;
  }
}

// Output results
const orderedDirs = [
  'auth', 'user', 'circle', 'shop', 'course', 'article', 'classic', 'ebook',
  'merchant', 'station', 'content', 'system', 'finance', 'recommend', 'im',
  'live', 'notification', 'upload', 'comment', 'interaction', 'commission',
  'marketing', 'operation-engine', 'operation-robot', 'content-generation',
  'discover', 'search', 'bot', 'ai', 'ai-gateway', 'member', 'coin',
  'dashboard', 'fortune', 'paipan', 'offline', 'institute', 'identity',
  'video', 'tenant', 'pricing', 'risk-control', 'task', 'churn', 'bounty',
  'question', 'call', 'webhook', 'map', 'menu', 'metrics', 'mini', 'sms',
  'email', 'tts', 'audit', 'huifu', 'share', 'feature-flag', 'revenue',
  'station-pick', 'category', 'health'
];

// Map files to their directories
const dirFiles = {};
for (const filePath of files) {
  const dir = filePath.split(/[/\\]/).slice(-2, -1)[0]; // parent dir name
  if (!dirFiles[dir]) dirFiles[dir] = [];
  const relativePath = relative(BASE.replace('/src/modules', '/src/modules'), filePath).replace(/\\/g, '/');
  dirFiles[dir].push(relativePath);
}

for (const dir of orderedDirs) {
  const dFiles = dirFiles[dir] || [];
  if (dFiles.length === 0) {
    console.log(`src/modules/${dir}/ — 无控制器文件`);
    continue;
  }

  const dirIssues = [];
  for (const file of dFiles) {
    if (issues[file]) {
      dirIssues.push(...issues[file]);
    }
  }

  if (dirIssues.length === 0) {
    console.log(`src/modules/${dir}/ — 无问题`);
  } else {
    console.log(`\n### src/modules/${dir}/`);
    for (const file of dFiles) {
      if (issues[file]) {
        console.log(`**${file}:**`);
        for (const issue of issues[file]) {
          console.log(issue);
        }
      }
    }
  }
}

// Summary
console.log('\n========================================');
console.log('审查总结');
console.log('========================================');
let totalIssues = 0;
let problemFiles = 0;
for (const [file, fileIssues] of Object.entries(issues)) {
  totalIssues += fileIssues.length;
  problemFiles++;
}
console.log(`发现问题文件数: ${problemFiles}`);
console.log(`问题总数: ${totalIssues}`);
console.log(`完美文件数: ${files.length - problemFiles}`);
