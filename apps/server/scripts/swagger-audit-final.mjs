import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const BASE = 'C:/Users/Administrator/Desktop/guoxue-platform/apps/server/src/modules';

function getControllerFiles(dir) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...getControllerFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.controller.ts')) results.push(fullPath);
  }
  return results.sort();
}

const files = getControllerFiles(BASE);

// Track findings
const authBearerIssues = [];     // @UseGuards(JwtAuthGuard) without @ApiBearerAuth
const apiQueryIssues = [];       // @Query() without @ApiQuery(), split by DTO coverage
const apiQueryDtoNoProp = [];    // DTO-based @Query where DTO lacks @ApiProperty
const apiQueryDtoWithProp = [];  // DTO-based @Query where DTO has @ApiProperty (plugin-covered)
const apiQueryIndividual = [];   // Individual @Query("name") params

for (const filePath of files) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = filePath.replace(BASE, 'src/modules').replace(/\\/g, '/');

  // Find the full import line for DTO references
  const importLines = content.match(/import\s+\{[\s\S]*?\}\s+from\s+["']\.\/[^"']+["']/g) || [];

  // Find all DTO files in the same dir
  const dir = filePath.substring(0, filePath.lastIndexOf('/')).replace(/\\/g, '/');
  const dtoFiles = readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith('.dto.ts'))
    .map(e => join(dir, e.name));

  // Read DTO content for @ApiProperty checks
  const dtoContents = {};
  for (const dtoFile of dtoFiles) {
    const dtoContent = readFileSync(dtoFile, 'utf-8');
    const dtoName = dtoFile.split(/[/\\]/).pop();
    dtoContents[dtoName] = dtoContent;
  }
  // Also check for imported DTOs from other dirs
  const allDtoContents = {};
  for (const [name, c] of Object.entries(dtoContents)) allDtoContents[name] = c;

  // Check if a DTO class has @ApiProperty
  function dtoHasApiProperty(dtoContent, className) {
    // Find the class definition and check next ~30 lines for @ApiProperty
    const classMatch = dtoContent.match(new RegExp(`export\\s+class\\s+${className}\\s*\\{`));
    if (!classMatch) return null; // DTO not found
    const startIdx = classMatch.index;
    const nextClassMatch = dtoContent.slice(startIdx + 100).match(/\nexport\s+class\s+/);
    const endIdx = nextClassMatch ? startIdx + 100 + nextClassMatch.index : dtoContent.length;
    const classBody = dtoContent.slice(startIdx, endIdx);
    if (classBody.includes('extends')) {
      // Check parent class
      const extMatch = classBody.match(/extends\s+(\w+)/);
      if (extMatch) {
        const parentName = extMatch[1];
        // Search all DTO content for parent class
        const parentClassMatch = dtoContent.match(new RegExp(`export\\s+class\\s+${parentName}\\s*\\{`));
        if (parentClassMatch) {
          return dtoHasApiProperty(dtoContent, parentName);
        }
        // Parent might be in another DTO file
        for (const [, dc] of Object.entries(dtoContents)) {
          const pcMatch = dc.match(new RegExp(`export\\s+class\\s+${parentName}\\s*\\{`));
          if (pcMatch) {
            const pStart = pcMatch.index;
            const pNextClass = dc.slice(pStart + 100).match(/\nexport\s+class\s+/);
            const pEnd = pNextClass ? pStart + 100 + pNextClass.index : dc.length;
            const pBody = dc.slice(pStart, pEnd);
            return pBody.includes('@ApiProperty');
          }
        }
      }
    }
    return classBody.includes('@ApiProperty');
  }

  // Parse methods
  let classDecorators = [];
  let currentDecorators = [];
  let inClass = false;
  let inMethodBody = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!inClass) {
      if (trimmed.startsWith('@')) classDecorators.push(trimmed);
      else if (/^export\s+class\s/.test(trimmed) || /^class\s/.test(trimmed)) inClass = true;
      continue;
    }

    if (inMethodBody) {
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;
      if (braceDepth <= 0) { inMethodBody = false; braceDepth = 0; }
      continue;
    }

    if (trimmed === '}' && braceDepth === 0) break;

    if (trimmed.startsWith('@')) { currentDecorators.push(trimmed); continue; }

    if (trimmed && !trimmed.startsWith('@') && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
      const isMethod = /^\s*(?:async\s+)?\w+\s*\(/.test(trimmed) || /^\s*constructor\s*\(/.test(trimmed);
      if (isMethod && currentDecorators.length > 0) {
        let methodName = '(anonymous)';
        const nameMatch = trimmed.match(/(?:async\s+)?(\w+)\s*\(/);
        if (nameMatch) methodName = nameMatch[1];
        if (methodName === 'constructor') {
          if (trimmed.includes('{')) { inMethodBody = true; braceDepth = 1; }
          currentDecorators = []; continue;
        }

        const httpMatch = currentDecorators.find(d => /^@(Get|Post|Put|Delete|Patch)\(/.test(d));
        const httpMethod = httpMatch ? httpMatch.match(/@(Get|Post|Put|Delete|Patch)\(/)[1] : null;
        if (!httpMethod) {
          if (trimmed.includes('{')) { inMethodBody = true; braceDepth = 1; }
          currentDecorators = []; continue;
        }

        // Condition 1: @UseGuards(JwtAuthGuard) without @ApiBearerAuth
        const hasJwtGuard = currentDecorators.some(d => d.includes('@UseGuards(') && d.includes('JwtAuthGuard'));
        const hasMethodBearer = currentDecorators.some(d => d.startsWith('@ApiBearerAuth'));
        const classHasBearer = classDecorators.some(d => d.startsWith('@ApiBearerAuth'));
        if (hasJwtGuard && !classHasBearer && !hasMethodBearer) {
          authBearerIssues.push(`${relativePath} - ${methodName} (@${httpMethod})`);
        }

        // Condition 2: @Query() param without @ApiQuery()
        const hasApiQueryDecorator = currentDecorators.some(d => d.startsWith('@ApiQuery('));
        if (!hasApiQueryDecorator) {
          // Find full method signature to check @Query usage
          let methodSig = trimmed;
          let j = i + 1;
          while (j < lines.length && !lines[j].trim().startsWith('{') && !lines[j].trim().startsWith('@') && !lines[j].trim().startsWith(')')) {
            methodSig += ' ' + lines[j].trim();
            j++;
          }
          // Also include closing paren if multi-line
          if (!methodSig.includes(')') && j < lines.length && lines[j].trim() === ')') methodSig += ')';

          const usesQuery = /@Query\s*\(/.test(methodSig);
          if (usesQuery) {
            // Check if it's a DTO-based @Query() or individual @Query("name")
            const isDtoBased = /@Query\s*\(\s*\)\s+\w+\s*:\s*\w+/.test(methodSig);
            if (isDtoBased) {
              // Extract DTO class name
              const dtoNameMatch = methodSig.match(/@Query\s*\(\s*\)\s+\w+\s*:\s*(\w+)/);
              if (dtoNameMatch) {
                const dtoClassName = dtoNameMatch[1];
                // Check if this DTO has @ApiProperty in any DTO file
                let hasProp = false;
                for (const [, dc] of Object.entries(dtoContents)) {
                  const r = dtoHasApiProperty(dc, dtoClassName);
                  if (r === true) { hasProp = true; break; }
                  else if (r === null) continue;
                }
                if (hasProp) {
                  apiQueryDtoWithProp.push(`${relativePath} - ${methodName} (@${httpMethod}): uses ${dtoClassName} (has @ApiProperty, plugin covers)`);
                } else {
                  apiQueryDtoNoProp.push(`${relativePath} - ${methodName} (@${httpMethod}): uses ${dtoClassName} (NO @ApiProperty - REAL ISSUE!)`);
                }
              } else {
                apiQueryIndividual.push(`${relativePath} - ${methodName} (@${httpMethod}): uses @Query() DTO`);
              }
            } else {
              apiQueryIndividual.push(`${relativePath} - ${methodName} (@${httpMethod}): uses @Query("name") params`);
            }
          }
        }

        if (trimmed.includes('{') || methodSig.includes('{')) { inMethodBody = true; braceDepth = 1; }
        currentDecorators = [];
      } else {
        currentDecorators = [];
      }
    }
  }
}

console.log('========================================');
console.log('Swagger 装饰器完整性审查报告');
console.log('========================================');
console.log('');
console.log('说明：项目配置了 @nestjs/swagger 插件 (classValidatorShim + introspectComments)，');
console.log('会自动从 @ApiProperty/@ApiPropertyOptional 生成 @ApiQuery，从 JSDoc 生成 @ApiOperation。');
console.log('以下按严重程度分类。');
console.log('');

// Category A: Missing @ApiBearerAuth
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('【严重】缺少 @ApiBearerAuth——Swagger UI 无法发送 Token');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
if (authBearerIssues.length === 0) {
  console.log('  无问题');
} else {
  for (const issue of authBearerIssues) console.log(`  ${issue}`);
}
console.log('');

// Category B: @Query DTO without @ApiProperty
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('【严重】@Query() 使用 DTO 但 DTO 缺少 @ApiProperty——Swagger 文档缺少查询参数');
console.log('（插件无法自动生成，必须添加 @ApiProperty 或显式 @ApiQuery）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
if (apiQueryDtoNoProp.length === 0) {
  console.log('  无问题');
} else {
  for (const issue of apiQueryDtoNoProp) console.log(`  ${issue}`);
}
console.log('');

// Category C: Individual @Query("name") without @ApiQuery
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('【一般】@Query("name") 单个参数无 @ApiQuery——插件应能自动检测生成');
console.log('（插件 introspectComments: true，可以识别方法签名中的 @Query）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
if (apiQueryIndividual.length === 0) {
  console.log('  无问题');
} else {
  for (const issue of apiQueryIndividual) console.log(`  ${issue}`);
}
console.log('');

// Category D: DTO-based @Query with @ApiProperty (info only)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('【参考】@Query() 使用了有 @ApiProperty 的 DTO——插件自动生成 @ApiQuery');
console.log('（无需处理，装饰器完整）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
if (apiQueryDtoWithProp.length === 0) {
  console.log('  无问题');
} else {
  for (const issue of apiQueryDtoWithProp) console.log(`  ${issue}`);
}
console.log('');

console.log('========================================');
console.log(`审查统计`);
console.log(`  缺少 @ApiBearerAuth: ${authBearerIssues.length}`);
console.log(`  @Query DTO 缺 @ApiProperty: ${apiQueryDtoNoProp.length}`);
console.log(`  @Query 单个参数无 @ApiQuery: ${apiQueryIndividual.length}`);
console.log(`  DTO 已有 @ApiProperty(参考): ${apiQueryDtoWithProp.length}`);
console.log('========================================');
