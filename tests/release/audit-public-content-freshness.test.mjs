import assert from "node:assert/strict";
import test from "node:test";

import { auditFeedItems } from "../../scripts/release/audit-public-content-freshness.mjs";

const now = new Date("2026-08-03T12:00:00.000Z");

test("正常直播、未来预约和有首图文章通过审计", () => {
  const result = auditFeedItems(
    [
      {
        id: "live-1",
        type: "live",
        title: "正在直播",
        payload: { status: "live", scheduledTime: "2026-08-03T11:00:00.000Z" },
      },
      {
        id: "live-2",
        type: "live",
        title: "稍后开播",
        payload: { status: "upcoming", scheduledTime: "2026-08-03T13:00:00.000Z" },
      },
      { id: "article-1", type: "article", title: "文章", cover: "https://cdn/a.webp" },
    ],
    { now },
  );

  assert.equal(result.blockers, 0);
  assert.equal(result.totalItems, 3);
});

test("已过开播时间的预约直播被阻断", () => {
  const result = auditFeedItems(
    [
      {
        id: "live-expired",
        type: "live",
        title: "过期预约",
        payload: { status: "upcoming", scheduledTime: "2026-08-03T10:00:00.000Z" },
      },
    ],
    { now },
  );

  assert.equal(result.blockers, 1);
  assert.equal(result.findings[0].code, "UPCOMING_LIVE_EXPIRED");
});

test("持续时间异常的直播被阻断", () => {
  const result = auditFeedItems(
    [
      {
        id: "live-stale",
        type: "live",
        title: "忘记结束的直播",
        payload: { status: "live", scheduledTime: "2026-08-01T10:00:00.000Z" },
      },
    ],
    { now, maxLiveAgeHours: 24 },
  );

  assert.equal(result.blockers, 1);
  assert.equal(result.findings[0].code, "LIVE_STATUS_STALE");
});

test("直播时间无效和文章无首图均被阻断", () => {
  const result = auditFeedItems(
    [
      { id: "live-invalid", type: "live", title: "无时间", payload: { status: "live" } },
      { id: "article-no-cover", type: "article", title: "无首图文章", cover: "" },
    ],
    { now },
  );

  assert.equal(result.blockers, 2);
  assert.deepEqual(result.findings.map((finding) => finding.code).sort(), [
    "ARTICLE_COVER_MISSING",
    "LIVE_TIME_INVALID",
  ]);
});
