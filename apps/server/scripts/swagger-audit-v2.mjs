import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const BASE = 'C:/Users/Administrator/Desktop/guoxue-platform/apps/server/src/modules';

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

const allIssues = {};

for (const filePath of files) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = filePath.replace(BASE, 'src/modules').replace(/\\/g, '/');

  const fileIssues = [];

  // State machine: collect decorators until a method/class definition is found
  let classDecorators = [];     // decorators for the class
  let currentDecorators = [];   // decorators for the current method
  let inClass = false;
  let braceDepth = 0;           // track {} nesting for skipping method bodies
  let inMethodBody = false;
  let pendingHttpDecoratorIndex = -1;
  let methodCount = 0;

  // We'll use a line-by-line approach that properly groups decorators with methods
  // A decorator group starts at a @ line and ends at the method definition line
  // All @ lines between the previous method end and the current method def belong to the current method

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track class entry
    if (!inClass) {
      if (trimmed.startsWith('@')) {
        classDecorators.push(trimmed);
      } else if (/^export\s+class\s/.test(trimmed) || /^class\s/.test(trimmed)) {
        inClass = true;
        braceDepth = 0;
        continue;
      }
      continue; // skip until we enter the class
    }

    // We're inside the class
    // Track brace depth to skip method bodies
    if (inMethodBody) {
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;
      if (braceDepth <= 0) {
        inMethodBody = false;
        braceDepth = 0;
      }
      continue;
    }

    // If we encounter a '}' at depth 0, we might be at the end of the class
    if (trimmed === '}' && braceDepth === 0) {
      break; // end of class
    }

    // If we encounter a decorator line
    if (trimmed.startsWith('@')) {
      currentDecorators.push(trimmed);
      continue;
    }

    // If we encounter a method definition line (non-decorator, non-empty)
    if (trimmed && !trimmed.startsWith('@') && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
      // Check if this looks like a method definition: contains '(' and ')'
      // and isn't a class declaration or constructor call
      const isMethod = /^\s*(?:async\s+)?\w+\s*\(/.test(trimmed) ||
                       /^\s*constructor\s*\(/.test(trimmed);

      if (isMethod && currentDecorators.length > 0) {
        methodCount++;

        // Extract method name
        let methodName = '(anonymous)';
        const nameMatch = trimmed.match(/(?:async\s+)?(\w+)\s*\(/);
        if (nameMatch) methodName = nameMatch[1];

        // Check if this is a constructor - skip
        if (methodName === 'constructor') {
          if (trimmed.includes('{')) {
            inMethodBody = true;
            braceDepth = 1;
          }
          currentDecorators = [];
          continue;
        }

        // Find the HTTP method decorator among currentDecorators
        const httpMatch = currentDecorators.find(d => /^@(Get|Post|Put|Delete|Patch)\(/.test(d));
        const httpMethod = httpMatch ? httpMatch.match(/@(Get|Post|Put|Delete|Patch)\(/)[1] : null;

        if (!httpMethod) {
          // This method might not be a route handler (private method, etc.)
          // Skip it
          if (trimmed.includes('{')) {
            inMethodBody = true;
            braceDepth = 1;
          }
          currentDecorators = [];
          continue;
        }

        // Now check the three conditions

        // Condition 1: @UseGuards(JwtAuthGuard) without @ApiBearerAuth
        const hasJwtGuard = currentDecorators.some(d =>
          d.includes('@UseGuards(') && d.includes('JwtAuthGuard')
        );
        const hasMethodBearer = currentDecorators.some(d => d.startsWith('@ApiBearerAuth'));
        const classHasBearer = classDecorators.some(d => d.startsWith('@ApiBearerAuth'));

        if (hasJwtGuard && !classHasBearer && !hasMethodBearer) {
          fileIssues.push(`  - ${methodName} (@${httpMethod}): 使用了 @UseGuards(JwtAuthGuard) 但缺少 @ApiBearerAuth()`);
        }

        // Condition 2: @Query() parameter without @ApiQuery() decorator
        // Look at the method signature line and potentially next lines until '{'
        let methodSignatureLines = [trimmed];
        let j = i + 1;
        while (j < lines.length && !lines[j].trim().startsWith('{') && !lines[j].trim().startsWith('@')) {
          methodSignatureLines.push(lines[j].trim());
          j++;
        }
        const fullSignature = methodSignatureLines.join(' ');

        // Check if @Query is used in the signature
        const usesQuery = /@Query\s*\(/.test(fullSignature);

        if (usesQuery) {
          // Check if there's @ApiQuery in current decorators
          const hasApiQueryDecorator = currentDecorators.some(d => d.startsWith('@ApiQuery('));
          if (!hasApiQueryDecorator) {
            fileIssues.push(`  - ${methodName} (@${httpMethod}): 使用了 @Query() 参数但缺少 @ApiQuery()`);
          }
        }

        // Condition 3: Missing @ApiOperation
        const hasApiOperation = currentDecorators.some(d => d.startsWith('@ApiOperation('));
        if (!hasApiOperation) {
          fileIssues.push(`  - ${methodName} (@${httpMethod}): 缺少 @ApiOperation({ summary: "..." })`);
        }

        // Track method body
        if (trimmed.includes('{') || methodSignatureLines.some(l => l.includes('{'))) {
          inMethodBody = true;
          braceDepth = 1;
        }

        currentDecorators = [];
      } else if (/^\s*(private|public|protected)\s+\w+\s*\(/.test(trimmed) || /^\s*\}\s*$/.test(trimmed)) {
        // This line is not a method with decorators - might be a property or something else
        currentDecorators = [];
      } else {
        // Non-decorator, non-method line (property, empty, comment)
        // Reset decorator collection
        currentDecorators = [];
      }
    }
  }

  if (fileIssues.length > 0) {
    allIssues[relativePath] = fileIssues;
  }
}

// Output results organized by directory
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

// Group files by directory
const dirFiles = {};
for (const f of files) {
  const dir = f.split(/[/\\]/).slice(-2, -1)[0];
  if (!dirFiles[dir]) dirFiles[dir] = [];
  dirFiles[dir].push(f.replace(BASE, 'src/modules').replace(/\\/g, '/'));
}

let totalIssueCount = 0;
let problemFiles = 0;
let cleanFiles = 0;

for (const dir of orderedDirs) {
  const dfiles = dirFiles[dir] || [];
  if (dfiles.length === 0) {
    console.log(`src/modules/${dir}/ — 无控制器文件`);
    continue;
  }

  const dirHasIssues = dfiles.some(f => allIssues[f]);
  if (!dirHasIssues) {
    console.log(`src/modules/${dir}/ — 无问题`);
    cleanFiles += dfiles.length;
    continue;
  }

  console.log(`\n### src/modules/${dir}/`);
  for (const f of dfiles) {
    if (allIssues[f]) {
      console.log(`**${f}:**`);
      for (const issue of allIssues[f]) {
        console.log(issue);
        totalIssueCount++;
      }
      problemFiles++;
    }
  }
}

console.log('\n========================================');
console.log('审查总结');
console.log('========================================');
console.log(`发现问题文件数: ${problemFiles}`);
console.log(`完美文件数: ${cleanFiles}`);
console.log(`问题总数: ${totalIssueCount}`);
