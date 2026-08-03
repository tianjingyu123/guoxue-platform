import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { after, before } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const scriptPath = path.join(repoRoot, "scripts", "release", "verify-business-journeys.mjs");
const releaseId = "business-test-001";
const testToken = "qa-token-must-never-appear-in-report";
let serverProcess;
let apiOrigin;

function runVerifier(specPath, reportPath, extraArgs = [], env = {}) {
  return spawnSync(
    process.execPath,
    [
      scriptPath,
      "--spec",
      specPath,
      "--report",
      reportPath,
      "--release-id",
      releaseId,
      ...extraArgs,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, ...env },
    },
  );
}

async function writeSpec(directory, name, journeys, extra = {}) {
  const specPath = path.join(directory, `${name}.json`);
  await writeFile(
    specPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        kind: "guoxue-business-journeys",
        apiOrigin,
        qaPrefix: "QA_BUSINESS_TEST",
        auth: { user: "QA_USER_TOKEN" },
        secrets: {},
        journeys,
        ...extra,
      },
      null,
      2,
    )}\n`,
  );
  return specPath;
}

before(async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "guoxue-business-server-"));
  const serverPath = path.join(tempDir, "server.mjs");
  await writeFile(
    serverPath,
    `import http from "node:http";
let cleaned = 0;
let created = 0;
const server = http.createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const pathname = new URL(request.url, "http://localhost").pathname;
  response.setHeader("Content-Type", "application/json");
  if (request.method === "GET" && pathname === "/api/v1/health") {
    const mismatched = String(request.headers["x-qa-run"] || "").startsWith("QA_RELEASE_MISMATCH:");
    response.end(JSON.stringify({ status: "ok", releaseId: mismatched ? "old-release-001" : "${releaseId}" }));
    return;
  }
  if (request.method === "GET" && pathname === "/api/v1/auth/me") {
    if (request.headers.authorization !== "Bearer ${testToken}") {
      response.statusCode = 401;
      response.end(JSON.stringify({ message: "token=${testToken}" }));
      return;
    }
    response.end(JSON.stringify({ data: { id: "qa-user" } }));
    return;
  }
  if (request.method === "GET" && pathname === "/api/v1/qa/stock") {
    response.end(JSON.stringify({ data: { stock: 7 } }));
    return;
  }
  if (request.method === "POST" && pathname === "/api/v1/qa/items") {
    created += 1;
    response.statusCode = 201;
    response.end(JSON.stringify({ data: { id: "item-1" } }));
    return;
  }
  if (request.method === "DELETE" && pathname === "/api/v1/qa/items/item-1") {
    cleaned += 1;
    response.statusCode = 204;
    response.end();
    return;
  }
  if (request.method === "GET" && pathname === "/api/v1/qa/fail") {
    response.statusCode = 500;
    response.end(JSON.stringify({ message: "forced failure" }));
    return;
  }
  if (request.method === "GET" && pathname === "/api/v1/test/state") {
    response.end(JSON.stringify({ cleaned, created }));
    return;
  }
  response.statusCode = 404;
  response.end(JSON.stringify({ message: "not found" }));
});
server.listen(0, "127.0.0.1", () => {
  process.stdout.write(String(server.address().port) + "\\n");
});
`,
  );

  serverProcess = spawn(process.execPath, [serverPath], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  const port = await new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error("测试服务器启动超时")), 5_000);
    serverProcess.stdout.on("data", (chunk) => {
      output += chunk.toString();
      const match = output.match(/^(\d+)\s/mu);
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
    serverProcess.once("error", reject);
    serverProcess.once("exit", (code) => reject(new Error(`测试服务器提前退出：${code}`)));
  });
  apiOrigin = `http://127.0.0.1:${port}`;
});

after(() => {
  serverProcess?.kill();
});

test("只读业务旅程通过并生成不含鉴权凭据的结构化证据", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "guoxue-business-read-"));
  const specPath = await writeSpec(tempDir, "read", [
    {
      id: "public-and-user",
      mode: "read",
      steps: [
        {
          id: "health",
          method: "GET",
          path: "/api/v1/health",
          expectJson: [
            { pointer: "/status", matches: "^o[k]$" },
            { pointer: "/releaseId", equals: "{{releaseId}}" },
          ],
          capture: { release: "/releaseId" },
        },
        {
          id: "stock-snapshot",
          method: "GET",
          path: "/api/v1/qa/stock",
          expectJson: [{ pointer: "/data/stock", exists: true }],
          capture: { stockBefore: "/data/stock" },
        },
        {
          id: "current-user",
          method: "GET",
          path: "/api/v1/auth/me",
          auth: "user",
          expectJson: [
            { pointer: "/data/id", exists: true },
            { pointer: "/data/id", matches: "^qa-" },
          ],
        },
        {
          id: "stock-unchanged",
          method: "GET",
          path: "/api/v1/qa/stock",
          expectJson: [{ pointer: "/data/stock", equals: "{{capture.stockBefore}}" }],
        },
      ],
    },
  ]);
  const reportPath = path.join(tempDir, "report.json");

  const result = runVerifier(specPath, reportPath, [], { QA_USER_TOKEN: testToken });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const reportText = await readFile(reportPath, "utf8");
  const report = JSON.parse(reportText);
  assert.equal(report.kind, "guoxue-business-journey-evidence");
  assert.equal(report.releaseId, releaseId);
  assert.equal(report.releaseBinding.status, "PASS");
  assert.equal(report.releaseBinding.observedReleaseId, releaseId);
  assert.equal(report.success, true);
  assert.equal(report.summary.passedJourneys, 1);
  assert.equal(report.summary.passedSteps, 4);
  assert.equal(reportText.includes(testToken), false);
  assert.equal(reportText.includes("Authorization"), false);
});

test("目标实例发布标识不一致时在任何业务写入前阻断", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "guoxue-business-release-mismatch-"));
  const specPath = await writeSpec(
    tempDir,
    "release-mismatch",
    [
      {
        id: "isolated-write",
        mode: "write",
        steps: [
          {
            id: "create-item",
            method: "POST",
            path: "/api/v1/qa/items",
            body: { name: "{{qaPrefix}}" },
            expectStatus: [201],
          },
        ],
        cleanup: [
          {
            id: "cleanup-item",
            method: "DELETE",
            path: "/api/v1/qa/items/item-1",
            expectStatus: [204],
          },
        ],
      },
    ],
    { qaPrefix: "QA_RELEASE_MISMATCH" },
  );
  const reportPath = path.join(tempDir, "report.json");
  const stateBefore = await fetch(`${apiOrigin}/api/v1/test/state`).then((response) =>
    response.json(),
  );

  const result = runVerifier(specPath, reportPath, [
    "--allow-write",
    "--confirm-write",
    `QA_WRITES:${releaseId}`,
  ]);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.success, false);
  assert.equal(report.releaseBinding.status, "FAIL");
  assert.equal(report.releaseBinding.observedReleaseId, "old-release-001");
  assert.equal(report.summary.journeys, 0);
  const stateAfter = await fetch(`${apiOrigin}/api/v1/test/state`).then((response) =>
    response.json(),
  );
  assert.equal(stateAfter.created, stateBefore.created);
});

test("可以只执行指定旅程而不要求其他旅程的鉴权环境变量", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "guoxue-business-select-"));
  const specPath = await writeSpec(tempDir, "selected", [
    {
      id: "public-readiness",
      mode: "read",
      steps: [{ id: "health", method: "GET", path: "/api/v1/health" }],
    },
    {
      id: "authenticated-user",
      mode: "read",
      steps: [
        {
          id: "current-user",
          method: "GET",
          path: "/api/v1/auth/me",
          auth: "user",
        },
      ],
    },
  ]);
  const reportPath = path.join(tempDir, "report.json");

  const result = runVerifier(specPath, reportPath, ["--journey", "public-readiness"]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.summary.journeys, 1);
  assert.equal(report.journeys[0].id, "public-readiness");
});

test("写旅程未提供双重确认时必须在发请求前阻断", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "guoxue-business-block-"));
  const specPath = await writeSpec(tempDir, "write-blocked", [
    {
      id: "isolated-write",
      mode: "write",
      steps: [
        {
          id: "create-item",
          method: "POST",
          path: "/api/v1/qa/items",
          body: { name: "{{qaPrefix}}" },
          expectStatus: [201],
        },
      ],
      cleanup: [
        {
          id: "cleanup-item",
          method: "DELETE",
          path: "/api/v1/qa/items/item-1",
          expectStatus: [204],
        },
      ],
    },
  ]);
  const reportPath = path.join(tempDir, "report.json");

  const result = runVerifier(specPath, reportPath);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /--allow-write/u);
});

test("写旅程中途失败仍会执行清理并记录失败证据", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "guoxue-business-cleanup-"));
  const specPath = await writeSpec(tempDir, "write-cleanup", [
    {
      id: "isolated-write",
      mode: "write",
      steps: [
        {
          id: "create-item",
          method: "POST",
          path: "/api/v1/qa/items",
          body: { name: "{{qaPrefix}}" },
          expectStatus: [201],
          capture: { itemId: "/data/id" },
        },
        {
          id: "forced-failure",
          method: "GET",
          path: "/api/v1/qa/fail",
          expectStatus: [200],
        },
      ],
      cleanup: [
        {
          id: "cleanup-item",
          method: "DELETE",
          path: "/api/v1/qa/items/{{capture.itemId}}",
          expectStatus: [204],
        },
      ],
    },
  ]);
  const reportPath = path.join(tempDir, "report.json");

  const result = runVerifier(specPath, reportPath, [
    "--allow-write",
    "--confirm-write",
    `QA_WRITES:${releaseId}`,
  ]);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.success, false);
  assert.equal(report.journeys[0].steps[0].status, "PASS");
  assert.equal(report.journeys[0].steps[1].status, "FAIL");
  assert.equal(report.journeys[0].cleanup[0].status, "PASS");
  const state = await fetch(`${apiOrigin}/api/v1/test/state`).then((response) => response.json());
  assert.equal(state.cleaned, 1);
});

test("短信、支付、退款、回调等外部副作用接口始终被硬阻断", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "guoxue-business-side-effect-"));
  const specPath = await writeSpec(tempDir, "forbidden", [
    {
      id: "forbidden-side-effect",
      mode: "write",
      steps: [
        {
          id: "send-sms",
          method: "POST",
          path: "/api/v1/auth/sms/send",
          body: { purpose: "qa" },
        },
      ],
      cleanup: [
        {
          id: "noop-cleanup",
          method: "DELETE",
          path: "/api/v1/qa/items/item-1",
          expectStatus: [204],
        },
      ],
    },
  ]);
  const reportPath = path.join(tempDir, "report.json");

  const result = runVerifier(specPath, reportPath, [
    "--allow-write",
    "--confirm-write",
    `QA_WRITES:${releaseId}`,
  ]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /外部副作用接口硬阻断/u);
});

test("手机号和密码等敏感业务字段只能从 QA 环境变量注入", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "guoxue-business-secret-"));
  const specPath = await writeSpec(tempDir, "literal-secret", [
    {
      id: "literal-secret",
      mode: "write",
      steps: [
        {
          id: "unsafe-login",
          method: "POST",
          path: "/api/v1/auth/login/phone",
          body: { phone: "13800000000", password: "plain-text" },
        },
      ],
      cleanup: [
        {
          id: "noop-cleanup",
          method: "DELETE",
          path: "/api/v1/qa/items/item-1",
          expectStatus: [204],
        },
      ],
    },
  ]);
  const reportPath = path.join(tempDir, "report.json");

  const result = runVerifier(specPath, reportPath, [
    "--allow-write",
    "--confirm-write",
    `QA_WRITES:${releaseId}`,
  ]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /必须通过 \{\{secret\.NAME\}\}/u);
});

test("仓库内写旅程示例只使用 QA 环境变量且每条写旅程都声明清理步骤", async () => {
  const examplePath = path.join(
    repoRoot,
    "config",
    "release",
    "business-journeys.write.example.json",
  );
  const exampleText = await readFile(examplePath, "utf8");
  const example = JSON.parse(exampleText);

  assert.equal(example.kind, "guoxue-business-journeys");
  assert.equal(example.schemaVersion, 1);
  assert.match(example.qaPrefix, /^QA_/u);
  assert.equal(example.journeys.length, 2);
  for (const envName of [...Object.values(example.auth), ...Object.values(example.secrets)]) {
    assert.match(envName, /^QA_[A-Z0-9_]+$/u);
  }
  for (const journey of example.journeys) {
    assert.equal(journey.mode, "write");
    assert.ok(journey.steps.length > 0);
    assert.ok(journey.cleanup.length > 0);
    assert.match(journey.cleanup[0].id, /^verify-cancelled-/u);
    assert.match(journey.cleanup.at(-1).id, /^cancel-/u);
    const firstWriteIndex = journey.steps.findIndex(
      (step) => !["GET", "HEAD"].includes(String(step.method || "GET").toUpperCase()),
    );
    assert.ok(firstWriteIndex > 0, `${journey.id} 必须先读取并核验 QA 资源`);
    const preflightSteps = journey.steps.slice(0, firstWriteIndex);
    assert.ok(preflightSteps.every((step) => step.method === "GET"));
    assert.ok(
      preflightSteps.some((step) =>
        (step.expectJson || []).some((assertion) => assertion.matches === "^QA_"),
      ),
      `${journey.id} 必须核验资源名称以 QA_ 开头`,
    );
  }
  assert.doesNotMatch(
    exampleText,
    /\/(?:pay(?:ment)?|refund|notify|callback|batch-ship|return-logistics)(?:\/|")/iu,
  );
});

test("仓库内公开旅程持续覆盖上线核心内容入口且保持零写入", async () => {
  const examplePath = path.join(
    repoRoot,
    "config",
    "release",
    "business-journeys.example.json",
  );
  const example = JSON.parse(await readFile(examplePath, "utf8"));
  const publicJourney = example.journeys.find((journey) => journey.id === "public-readiness");
  const requiredStepIds = new Set([
    "health",
    "home-aggregation",
    "anonymous-smart-feed",
    "classics-home",
    "agent-catalog",
    "video-feed",
    "live-rooms",
    "live-scheduled",
    "live-replays",
    "article-feed",
    "product-catalog",
  ]);

  assert.equal(publicJourney.mode, "read");
  assert.deepEqual(new Set(publicJourney.steps.map((step) => step.id)), requiredStepIds);
  assert.ok(publicJourney.steps.every((step) => step.method === "GET"));
  assert.ok(publicJourney.steps.every((step) => !step.auth));
});
