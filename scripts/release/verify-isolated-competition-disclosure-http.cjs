// 封闭镜像临时库中核验真实公开入口；不创建线上赛事或发送通知。
const { createRequire } = require("node:module");
const req = createRequire("/app/apps/server/package.json");
const { PrismaClient } = req("@prisma/client");
const assert = require("node:assert/strict");
const p = new PrismaClient();
const rows = [];
const marker = "ISOLATED-DISCLOSURE-ANSWER";
async function read(name, id, expected) {
  const response = await fetch("http://127.0.0.1:3000/api/v1/competitions/" + id + "/questions/disclosure", { signal: AbortSignal.timeout(10000) });
  const body = await response.json();
  assert.equal(response.status, expected, name);
  if (expected !== 200) assert(!JSON.stringify(body).includes(marker), "拒绝响应不能泄露答案");
  rows.push({ name, expected, status: response.status, passed: true });
  return body.data || body;
}
(async () => {
  try {
    for (const status of ["DRAFT", "PUBLISHED", "IN_PROGRESS", "FINISHED", "CANCELLED"]) {
      const id = "linux-disclosure-" + status;
      await p.competition.create({ data: { id, title: "隔离合成赛事", type: "CLASSIC_RECITE", status } });
      await p.competitionQuestion.create({ data: { competitionId: id, type: "SINGLE_CHOICE", stem: "合成题干", options: [{ key: "A", text: "合成选项" }], answer: { correctKey: marker }, analysis: "合成解析", source: "合成出处", isPublished: true } });
      const result = await read(status, id, status === "FINISHED" ? 200 : ["PUBLISHED", "IN_PROGRESS"].includes(status) ? 400 : 404);
      if (status === "FINISHED") {
        assert.equal(result.competitionId, id);
        assert.equal(result.total, 1);
        assert.equal(result.questions[0].answer.correctKey, marker);
        assert.equal(result.questions[0].analysis, "合成解析");
        assert.equal(result.questions[0].source, "合成出处");
      }
    }
    await p.competition.create({ data: { id: "linux-disclosure-empty", title: "隔离空公示", type: "CLASSIC_RECITE", status: "FINISHED" } });
    const empty = await read("finished-empty", "linux-disclosure-empty", 200);
    assert.equal(empty.total, 0); assert.deepEqual(empty.questions, []);
    await p.competition.create({ data: { id: "comp-demo-linux-disclosure", title: "隔离演示边界", type: "CLASSIC_RECITE", status: "FINISHED" } });
    await read("demo-finished-not-public", "comp-demo-linux-disclosure", 404);
    await read("missing-competition", "linux-disclosure-missing", 404);
    console.log("NODE_TEST_RESULT:" + JSON.stringify({ passed: true, scope: "full-app-real-public-http-postgres-synthetic-only", cases: rows, noRealMoney: true, noExternalDelivery: true }));
  } finally { await p.$disconnect(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
