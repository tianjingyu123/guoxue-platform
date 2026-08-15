import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const auditScript = resolve("scripts/migration/audit-domain.mjs");

async function withWorkspace(files, callback) {
  const workspace = await mkdtemp(join(tmpdir(), "domain-policy-"));
  try {
    for (const [relative, content] of Object.entries(files)) {
      const destination = join(workspace, relative);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, content, "utf8");
    }
    await callback(workspace);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

function runAudit(workspace) {
  return spawnSync(process.execPath, [auditScript], {
    cwd: workspace,
    encoding: "utf8",
  });
}

test("正式域名仅出现在批准的客户端基线文件时通过", async () => {
  await withWorkspace(
    {
      "apps/mobile/.env.production": "VITE_API_URL=https://api.rebugx.cn\n",
      "apps/mobile/src/manifest.json": JSON.stringify({
        app: { domains: ["applinks:api.rebugx.cn"] },
      }),
    },
    async (workspace) => {
      const result = runAudit(workspace);
      assert.equal(result.status, 0, result.stderr || result.stdout);
    },
  );
});

test("正式域名硬编码到未批准的运行时代码时仍阻断", async () => {
  await withWorkspace(
    {
      "apps/mobile/src/lib/runtime.ts":
        'export const unexpected = "https://api.rebugx.cn/api/v1";\n',
    },
    async (workspace) => {
      const result = runAudit(workspace);
      assert.equal(result.status, 1);
      assert.match(result.stdout, /runtime\.ts:1/);
    },
  );
});

test("远程配置先识别预发布再识别正式域名时通过", async () => {
  await withWorkspace(
    {
      "apps/mobile/src/lib/remote-config.ts": [
        "const apiUrl = 'https://pre-api.rebugx.cn'",
        "if (apiUrl.includes('pre-api.rebugx.cn')) return 'staging'",
        "if (apiUrl.includes('api.rebugx.cn')) return 'production'",
      ].join("\n"),
    },
    async (workspace) => {
      const result = runAudit(workspace);
      assert.equal(result.status, 0, result.stderr || result.stdout);
    },
  );
});

test("远程配置先识别正式域名会阻断预发布误判", async () => {
  await withWorkspace(
    {
      "apps/mobile/src/lib/remote-config.ts": [
        "const apiUrl = 'https://pre-api.rebugx.cn'",
        "if (apiUrl.includes('api.rebugx.cn')) return 'production'",
        "if (apiUrl.includes('pre-api.rebugx.cn')) return 'staging'",
      ].join("\n"),
    },
    async (workspace) => {
      const result = runAudit(workspace);
      assert.equal(result.status, 1);
      assert.match(result.stdout, /正式环境判断必须位于预发布环境判断之后/);
    },
  );
});
