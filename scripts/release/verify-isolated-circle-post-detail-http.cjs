// 仅由封闭容器验收调用：真实JWT、HTTP和临时库，不连接生产或真实通知渠道。
const { createRequire } = require("node:module");
const req = createRequire("/app/apps/server/package.json");
const { PrismaClient } = req("@prisma/client");
const jwt = req("jsonwebtoken");
const assert = require("node:assert/strict");
const { publicQuarantinedIds } = require("/app/apps/server/dist/common/public-content-quarantine");
const p = new PrismaClient();
const circle = "linux-detail-circle";
const author = "linux-detail-author";
const member = "linux-detail-member";
const manager = "linux-detail-manager";
const partner = "linux-detail-partner";
const rows = [];
const content = "ISOLATED-PRIVATE-POST-CONTENT";
const attachment = { name: "合成附件", url: "https://attachment.invalid/private", size: 1 };
const token = (user, claims = {}) => jwt.sign({ sub: user, sessionIssuedAt: Date.now(), ...claims }, process.env.JWT_SECRET, { expiresIn: "5m" });
const route = (id, contextual = false) => contextual ? `/api/v1/circles/${circle}/posts/${id}` : `/api/v1/circles/posts/${id}`;
async function send(name, user, path, expected, bearer) {
  const response = await fetch("http://127.0.0.1:3000" + path, {
    headers: user || bearer ? { Authorization: "Bearer " + (bearer || token(user)) } : {},
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();
  rows.push({ name, status: response.status, expected, passed: response.status === expected });
  assert.equal(response.status, expected, name);
  if (expected === 200 && path.includes("/posts/")) {
    assert.equal((result.data || result).content, content);
    assert.deepEqual((result.data || result).attachments, [attachment]);
  } else if (expected !== 200) {
    const text = JSON.stringify(result);
    assert(!text.includes(content), "拒绝响应不能包含正文");
    assert(!text.includes(attachment.url), "拒绝响应不能包含附件");
  }
  return result.data || result;
}
(async () => {
  try {
    for (const id of [author, member, manager, partner]) await p.user.create({ data: { id, nickname: "合成详情验收用户" } });
    await p.circle.create({ data: { id: circle, ownerId: author, name: "隔离详情验收", intro: "不对外开放", tags: [] } });
    for (const [userId, role] of [[author, "OWNER"], [member, "MEMBER"], [manager, "ADMIN"], [partner, "PARTNER"]]) {
      await p.circleMember.create({ data: { circleId: circle, userId, role } });
    }
    for (const status of ["PUBLISHED", "DRAFT", "AUDITING", "HIDDEN"]) {
      const id = "linux-detail-" + status;
      await p.post.create({ data: { id, circleId: circle, userId: author, status, content, attachments: [attachment] } });
      for (const contextual of [false, true]) {
        const prefix = status + (contextual ? "-circle-route" : "-direct-route");
        for (const [label, user, privileged] of [["anonymous", null, false], ["ordinary-member", member, false], ["outsider", "linux-user-a", false], ["finance", "linux-finance", false], ["author-owner", author, true], ["circle-admin", manager, true], ["partner", partner, true], ["super-admin", "linux-super", true], ["operations", "linux-ops", true]]) {
          await send(prefix + "-" + label, user, route(id, contextual), status === "PUBLISHED" || privileged ? 200 : 404);
        }
      }
    }
    await send("invalid-token-remains-anonymous", null, route("linux-detail-DRAFT"), 404, "not-a-valid-jwt");
    // 由普通用户签名请求带伪造角色，真实JWT策略仍必须从库读取权限。
    await send("jwt-role-claim-does-not-create-admin", member, route("linux-detail-HIDDEN"), 404, token(member, { roles: ["SUPER_ADMIN"] }));
    for (const user of [null, member, author, "linux-super"]) {
      await send("wrong-circle-context-" + (user || "anonymous"), user, route("linux-detail-PUBLISHED", true).replace(circle, "linux-detail-other-circle"), 404);
    }
    // 使用发布代码中的精确隔离ID，但仅在本次临时空库中建立合成记录。
    const quarantinedId = publicQuarantinedIds("post")[0];
    assert(quarantinedId, "正式隔离清单应存在");
    await p.post.create({ data: { id: quarantinedId, circleId: circle, userId: author, status: "PUBLISHED", content, attachments: [attachment] } });
    for (const contextual of [false, true]) {
      await send("quarantine-anonymous-" + contextual, null, route(quarantinedId, contextual), 404);
      await send("quarantine-member-" + contextual, member, route(quarantinedId, contextual), 404);
      await send("quarantine-author-preview-" + contextual, author, route(quarantinedId, contextual), 200);
    }
    // 通知归属与目标内容是两次独立校验：通知接收者不能借通知读隐藏正文。
    const notification = await p.notification.create({ data: { userId: member, type: "SYSTEM", title: "合成圈帖通知", content: "仅验证目标校验", targetType: "POST", targetId: "linux-detail-PUBLISHED", circleId: circle } });
    const detail = await send("notification-receiver-can-read-own-notification", member, "/api/v1/notifications/" + notification.id, 200);
    assert.equal(detail.targetId, "linux-detail-PUBLISHED");
    await p.post.update({ where: { id: detail.targetId }, data: { status: "HIDDEN" } });
    await send("notification-target-rechecks-hidden-status", member, route(detail.targetId, true), 404);
    await send("notification-target-author-preview", author, route(detail.targetId, true), 200);
    await send("notification-target-anonymous-denied", null, route(detail.targetId), 404);
    await send("notification-other-user-denied", author, "/api/v1/notifications/" + notification.id, 404);
    console.log("NODE_TEST_RESULT:" + JSON.stringify({ passed: true, scope: "full-app-real-http-jwt-postgres-synthetic-only", cases: rows, notificationTargetPermissionRechecked: true, noExternalDelivery: true, noRealMoney: true }));
  } finally { await p.$disconnect(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
