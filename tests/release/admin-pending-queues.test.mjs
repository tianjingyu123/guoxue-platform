import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  readPendingTotal,
  summarizePendingQueues,
} from "../../apps/admin/src/utils/pending-queues.ts";

test("无待办默认收起，展开仍保留全部入口", () => {
  const queues = [{ title: "内容", link: "/contents", count: 0 }];
  assert.deepEqual(summarizePendingQueues(queues, false).visibleItems, []);
  assert.deepEqual(summarizePendingQueues(queues, true).visibleItems, queues);
});

test("优先展示真实待办，不修改原始队列顺序", () => {
  const queues = [0, 3, 7].map((count, index) => ({
    title: String(index),
    link: String(index),
    count,
  }));
  const summary = summarizePendingQueues(queues, false);
  assert.equal(summary.total, 10);
  assert.equal(summary.activeCount, 2);
  assert.equal(summary.idleCount, 1);
  assert.deepEqual(
    summary.visibleItems.map((item) => item.count),
    [7, 3],
  );
  assert.deepEqual(
    queues.map((item) => item.count),
    [0, 3, 7],
  );
});

test("异常计数不能伪装成零待办", () => {
  for (const data of [
    null,
    {},
    { total: -1 },
    { total: 1.5 },
    { total: "0" },
    { total: Infinity },
  ]) {
    assert.equal(readPendingTotal(data), null);
  }
  assert.equal(readPendingTotal({ total: 0 }), 0);
  assert.equal(readPendingTotal({ data: { total: 12 } }), 12);
  assert.equal(readPendingTotal({ items: [1, 2] }), 2);
  assert.equal(readPendingTotal([]), 0);
});
test("Element 统计栅格不叠加横向 gap，避免四列意外换行", () => {
  const css = readFileSync(new URL("../../apps/admin/src/styles/global.css", import.meta.url), "utf8");
  assert.match(css, /\.el-row\.stats-row\s*\{\s*column-gap:\s*0;/);
});
