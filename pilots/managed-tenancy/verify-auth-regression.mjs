import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { assertFresh } from '../../scripts/ops/prisma-candidate/client.mjs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const server = resolve(repo, 'apps/server');
const require = createRequire(resolve(server, 'package.json'));
assertFresh();
const runtime = resolve(repo, 'pilots/managed-tenancy/.runtime');
mkdirSync(runtime, { recursive: true });
const config = {
  rootDir: server, testEnvironment: 'node', testMatch: ['**/auth.service.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: resolve(server, 'tsconfig.jest.json'), diagnostics: false }] },
  setupFiles: [resolve(server, 'test/jest-setup.ts')],
  moduleNameMapper: {
    '^@prisma/client$': resolve(server, '.prisma-candidate/client/index.js'),
    '^bcryptjs$': require.resolve('bcryptjs'),
    '^@guoxue/shared$': resolve(repo, 'packages/shared/src/index.ts'),
  }, reporters: ['default'],
};
const cfg = resolve(runtime, 'auth-jest.config.json');
// 每次使用独立结果文件，失败时不能读取上次成功的结果。
const resultPath = resolve(runtime, `auth-jest-results-${Date.now()}.json`);
writeFileSync(cfg, JSON.stringify(config));
const run = spawnSync(process.execPath, [require.resolve('jest/bin/jest'), '--config', cfg, '--runInBand', '--json', '--outputFile', resultPath, '--silent'], { cwd: server, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
writeFileSync(resolve(runtime, 'auth-jest.log'), (run.stdout || '') + (run.stderr || ''));
if (run.error || run.status !== 0) {
  console.error('认证回归未通过，诊断保留在本任务忽略目录 auth-jest.log');
  process.exit(1);
}
const result = JSON.parse(readFileSync(resultPath, 'utf8'));
const files = ['apps/server/src/modules/auth/auth.service.ts', 'apps/server/src/modules/auth/auth.service.spec.ts', 'apps/server/prisma/schema.prisma'];
const sources = Object.fromEntries(files.map(path => [path, createHash('sha256').update(readFileSync(resolve(repo, path))).digest('hex')]));
const report = { head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), sources, node: process.version, passed: result.numPassedTests, failed: result.numFailedTests, success: result.success, production: false, limits: ['现有认证服务的47项单元测试；候选服务端另行完整类型检查', 'Redis为原测试适配器；真实Redis ACL、队列和生产认证仍需验收'] };
const output = resolve(process.argv[2] || resolve(runtime, 'auth-regression.json'));
mkdirSync(resolve(output, '..'), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, failed: report.failed, report: output }));
if (!report.success) process.exitCode = 1;
