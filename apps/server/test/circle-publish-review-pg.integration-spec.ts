import { randomUUID } from "node:crypto";
import { CirclePublishGrantService } from "../src/modules/circle/circle-publish-grant.service";
import { CircleWorkflowLocalPg, capture, localGate } from "./fixtures/circle-workflow-local-pg";

const localSuite = process.env.RUN_CIRCLE_WORKFLOW_LOCAL_PG === "YES" ? describe : describe.skip;
localSuite("发布审批真实数据库并发保护", () => {
  const pg = new CircleWorkflowLocalPg();
  beforeAll(() => pg.start(), 120000);
  afterAll(() => pg.stop(), 65000);

  async function fixture() {
    const owner = await pg.observer.user.create({ data: { id: randomUUID(), nickname: "LOCAL_ONLY_PUBLISH_OWNER" } });
    const reviewer = await pg.observer.user.create({ data: { id: randomUUID(), nickname: "LOCAL_ONLY_REVIEWER" } });
    const circle = await pg.observer.circle.create({ data: { ownerId: owner.id, name: "合成测试圈", intro: "仅隔离测试", tags: [] } });
    const grant = await pg.observer.circlePublishGrant.create({ data: { circleId: circle.id, applicantId: owner.id,
      scopes: ["SHORT_VIDEO"], eligibilitySnapshot: { synthetic: true } } });
    return { owner, reviewer, grant };
  }

  it.each(["approve", "reject"] as const)("%s 先提交后，等待中的相反裁决不能覆盖", async firstAction => {
    const h = await fixture();
    const entered = localGate(), release = localGate();
    const first = capture(pg.transaction(pg.a, async tx => {
      try {
        const result = await new CirclePublishGrantService(tx as never)[firstAction](h.grant.id, h.owner.id, { reason: "先完成的合成决定" });
        entered.release(); await release.promise; return result;
      } catch (error) { entered.release(); throw error; }
    }));
    await entered.promise;
    const secondAction = firstAction === "approve" ? "reject" : "approve";
    const second = capture(new CirclePublishGrantService(pg.b as never)[secondAction](h.grant.id, h.reviewer.id, { reason: "过期页面的合成决定" }));
    // 第一笔尚未提交，第二连接读到 PENDING，但实际 UPDATE 必须等待并重新检查条件。
    try { await pg.waitForLocks(); } finally { release.release(); }
    expect((await first).ok).toBe(true);
    const loser = await second;
    expect(loser.ok).toBe(false);
    if (!loser.ok) expect(loser.error.message).toContain("该授权申请已变化");
    expect(await pg.observer.circlePublishGrant.findUnique({ where: { id: h.grant.id } })).toMatchObject({
      status: firstAction === "approve" ? "APPROVED" : "REJECTED", reviewerId: h.owner.id, rejectReason: "先完成的合成决定",
    });
  });

  it("事务撤销时不留下批准结果，后续管理员仍可处理待审申请", async () => {
    const h = await fixture();
    await expect(pg.transaction(pg.a, async tx => {
      await new CirclePublishGrantService(tx as never).approve(h.grant.id, h.owner.id, {});
      await tx.$executeRaw`SELECT 1 / 0`;
    })).rejects.toThrow();
    expect(await pg.observer.circlePublishGrant.findUnique({ where: { id: h.grant.id } })).toMatchObject({ status: "PENDING", reviewerId: null });
    await new CirclePublishGrantService(pg.b as never).reject(h.grant.id, h.reviewer.id, { reason: "回滚后重新处理" });
    expect(await pg.observer.circlePublishGrant.findUnique({ where: { id: h.grant.id } })).toMatchObject({ status: "REJECTED", reviewerId: h.reviewer.id });
  });
});
