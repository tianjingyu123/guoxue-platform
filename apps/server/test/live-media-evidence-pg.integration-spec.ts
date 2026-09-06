import { randomUUID } from "node:crypto";
import { LiveMediaEvidenceRepository } from "../src/modules/live/live-media-evidence.repository";
import { CircleWorkflowLocalPg, capture } from "./fixtures/circle-workflow-local-pg";
import { LiveService } from "../src/modules/live/live.service";
import { LiveMediaCredentialRepository } from "../src/modules/live/live-media-credential.repository";

const suite = process.env.RUN_CIRCLE_WORKFLOW_LOCAL_PG === "YES" ? describe : describe.skip;
suite("隔离 PostgreSQL 媒体证据：并发/乱序/幂等/回滚", () => {
  const pg = new CircleWorkflowLocalPg(), repo = new LiveMediaEvidenceRepository();
  beforeAll(() => pg.start(), 120000);
  afterAll(() => pg.stop(), 65000);
  async function setup() {
    const id = randomUUID(), userId = randomUUID(), nowMs = Math.floor(Date.now() / 1000) * 1000;
    await pg.observer.user.create({ data: { id: userId, nickname: "LOCAL_MEDIA_ONLY" }, select: { id: true } });
    await pg.observer.liveRoom.create({ data: { id, userId, hostUserId: userId, title: "LOCAL_MEDIA_ONLY" }, select: { id: true } });
    const expected = { roomId: id, domain: "push.example.invalid", appName: "live", nowMs };
    const event = (type: 0 | 1, sequence = "session-a", seconds = 0) => ({ stream_id: `room_${id}`, app: expected.domain,
      appname: expected.appName, event_type: type, sequence, event_time: nowMs / 1000 + seconds });
    const record = (body: Record<string, unknown>, client = pg.a) => pg.transaction(client, tx => repo.recordCssInTransaction(tx, body, expected));
    const read = () => pg.transaction(pg.observer, tx => repo.readInTransaction(tx, id));
    return { id, userId, expected, event, record, read };
  }
  it("重复回调经过 jsonb 回读不增加版本，且不保存原始秘密字段", async () => {
    const f = await setup();
    await f.record({ ...f.event(1), sign: "SYNTHETIC_SECRET", stream_param: "SYNTHETIC_AUTH", user_ip: "SYNTHETIC_IP" });
    expect(await f.record(f.event(1), pg.b)).toMatchObject({ changed: false, revision: 1, status: "ONLINE" });
    const row = await f.read();
    expect(JSON.stringify(row)).not.toMatch(/SYNTHETIC_|stream_param|user_ip|session-a/);
    expect(row?.snapshot.evidence.sessions).toHaveLength(1);
  });
  it("并发签发保留最晚期限，旧刷新不缩短；范围漂移拒绝", async () => {
    const f = await setup(), credentials = new LiveMediaCredentialRepository();
    const scope = { provider: "CSS" as const, domain: f.expected.domain, appName: "live", streamName: `room_${f.id}` };
    const record = (seconds: number, client = pg.a) => pg.transaction(client, tx => credentials.recordInTransaction(tx, f.id, scope,
      new Date(f.expected.nowMs + seconds * 1000), f.expected.nowMs));
    await Promise.all([record(600, pg.a), record(1200, pg.b)]);
    const saved = await record(300);
    expect(saved.expiresAt).toEqual(new Date(f.expected.nowMs + 1200000));
    await expect(pg.transaction(pg.a, tx => credentials.recordInTransaction(tx, f.id, { ...scope, domain: "changed.example.invalid" },
      new Date(f.expected.nowMs + 1800000), f.expected.nowMs))).rejects.toThrow("LIVE_CREDENTIAL_SCOPE_CHANGED");
    const rows = await pg.transaction(pg.a, tx => credentials.readInTransaction(tx, f.id));
    expect(rows).toHaveLength(1); expect(rows[0].expiresAt).toEqual(saved.expiresAt);
  });
  it("签发事务失败回滚边界，CSS 与 TRTC 分别保留，结束后拒绝新签发", async () => {
    const f = await setup(), credentials = new LiveMediaCredentialRepository();
    const scope = { provider: "TRTC" as const, sdkAppId: 123, trtcRoomId: "synthetic_room" };
    const expiry = new Date(f.expected.nowMs + 600000);
    await expect(pg.transaction(pg.a, async tx => {
      await credentials.recordInTransaction(tx, f.id, scope, expiry, f.expected.nowMs); throw new Error("SYNTHETIC_FAILURE");
    })).rejects.toThrow("SYNTHETIC_FAILURE");
    expect(await pg.transaction(pg.a, tx => credentials.readInTransaction(tx, f.id))).toHaveLength(0);
    await pg.transaction(pg.a, tx => credentials.recordInTransaction(tx, f.id, scope, expiry, f.expected.nowMs));
    await pg.transaction(pg.a, tx => credentials.recordInTransaction(tx, f.id,
      { provider: "CSS", domain: f.expected.domain, appName: "live", streamName: `room_${f.id}` }, expiry, f.expected.nowMs));
    expect(await pg.transaction(pg.a, tx => credentials.readInTransaction(tx, f.id))).toHaveLength(2);
    await pg.observer.liveRoom.update({ where: { id: f.id }, data: { status: "ENDED" } });
    await expect(pg.transaction(pg.a, tx => credentials.recordInTransaction(tx, f.id, scope, expiry, f.expected.nowMs)))
      .rejects.toThrow("LIVE_CREDENTIAL_ROOM_CLOSED");
  });
  it("不同连接的双节点并发回调不丢更新", async () => {
    const f = await setup();
    const results = await Promise.all([f.record(f.event(1), pg.a), f.record(f.event(1, "session-b"), pg.b)]);
    expect(results.every(r => !r.ignored)).toBe(true);
    expect(await f.read()).toMatchObject({ revision: 2, snapshot: { evidence: { sessions: expect.any(Array) } } });
    expect((await f.read())?.snapshot.evidence.sessions).toHaveLength(2);
  });
  it("同事件并发只有一次写入", async () => {
    const f = await setup();
    const results = await Promise.all([f.record(f.event(1), pg.a), f.record(f.event(1), pg.b)]);
    expect(results.filter(r => !r.ignored && r.changed)).toHaveLength(1);
    expect((await f.read())?.revision).toBe(1);
  });
  it("迟到的旧连接断流不能覆盖新连接在线", async () => {
    const f = await setup(); await f.record(f.event(1)); await f.record(f.event(1, "session-b", 2));
    expect(await f.record(f.event(0, "session-a", 1))).toMatchObject({ status: "ONLINE", revision: 3 });
  });
  it("先断后推的乱序先 UNKNOWN，配对后仅 OFFLINE_OBSERVED", async () => {
    const f = await setup();
    expect(await f.record(f.event(0, "session-a", 1))).toMatchObject({ status: "UNKNOWN" });
    expect(await f.record(f.event(1))).toMatchObject({ status: "OFFLINE_OBSERVED" });
    // 证据归并不会将房间改成开播/结束，也不会制造额度结算。
    expect((await pg.observer.liveRoom.findUniqueOrThrow({ where: { id: f.id } })).status).toBe("WAITING");
    const [row] = await pg.observer.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM "CircleCapabilityQuota" WHERE "businessId"=${f.id}`;
    expect(row.n).toBe(0n);
  });
  it("所属域配置变更保留未知，不能把两套活动混为完整离线证据", async () => {
    const f = await setup(); await f.record(f.event(1));
    const expected = { ...f.expected, domain: "new.example.invalid" };
    expect(await pg.transaction(pg.a, tx => repo.recordCssInTransaction(tx, { ...f.event(0, "session-a", 1), app: expected.domain }, expected)))
      .toMatchObject({ status: "UNKNOWN" });
  });
  it("业务事务失败回滚媒体证据", async () => {
    const f = await setup();
    const result = await capture(pg.transaction(pg.a, async tx => {
      await repo.recordCssInTransaction(tx, f.event(1), f.expected); throw new Error("SYNTHETIC_BUSINESS_FAILURE");
    }));
    expect(result.ok).toBe(false); expect(await f.read()).toBeNull();
  });
  it("不完整或串流回调不写证据", async () => {
    const f = await setup();
    expect(await f.record({ ...f.event(1), stream_id: "room_other" })).toEqual({ ignored: true });
    expect(await f.record({ ...f.event(1), sequence: undefined })).toEqual({ ignored: true });
    expect(await f.read()).toBeNull();
  });
  it("损坏持久行停止处理，不覆盖为虚假正常值", async () => {
    const f = await setup(); await f.record(f.event(1));
    await pg.observer.$executeRaw`UPDATE "LiveMediaEvidence" SET "snapshot"='{}'::jsonb WHERE "roomId"=${f.id}`;
    await expect(f.record(f.event(0, "session-a", 1))).rejects.toThrow("LIVE_MEDIA_INVALID_STORED_ROW");
    const [row] = await pg.observer.$queryRaw<Array<{ revision: number }>>`SELECT revision FROM "LiveMediaEvidence" WHERE "roomId"=${f.id}`;
    expect(row.revision).toBe(1);
  });

  it("真实 LiveService 回调→主库→另一节点查询不受旧 Redis 状态影响", async () => {
    const f = await setup();
    const staleCache = { getJson: jest.fn().mockResolvedValue({ status: "offline", connectedAt: null }), setJson: jest.fn().mockResolvedValue(undefined) };
    const freshCache = { getJson: jest.fn().mockResolvedValue(null), setJson: jest.fn().mockResolvedValue(undefined) };
    const scope = { callbackScope: () => ({ domain: f.expected.domain, appName: f.expected.appName }) };
    const a = new LiveService(pg.a as never, staleCache as never, scope as never, {} as never, {} as never, {} as never, repo, new LiveMediaCredentialRepository(), {} as never);
    const b = new LiveService(pg.b as never, freshCache as never, scope as never, {} as never, {} as never, {} as never, new LiveMediaEvidenceRepository(), new LiveMediaCredentialRepository(), {} as never);
    await a.handleLiveEvent(`room_${f.id}`, 1, f.event(1));
    await b.handleLiveEvent(`room_${f.id}`, 1, f.event(1, "session-b", 2));
    await a.handleLiveEvent(`room_${f.id}`, 0, f.event(0, "session-a", 1));
    expect(await a.getStreamStatus(f.id, f.userId)).toMatchObject({ status: "online", connectedAt: new Date(f.expected.nowMs + 2000).toISOString() });
    expect(await b.getStreamStatus(f.id, f.userId)).toMatchObject({ status: "online" });
    await b.handleLiveEvent(`room_${f.id}`, 0, f.event(0, "session-b", 3));
    // 假 online 缓存不能覆盖所有已知连接已断开的持久事实。
    staleCache.getJson.mockResolvedValue({ status: "online", connectedAt: null });
    expect(await a.getStreamStatus(f.id, f.userId)).toMatchObject({ status: "offline", lastEventAt: new Date(f.expected.nowMs + 3000).toISOString() });
    expect(staleCache.setJson.mock.calls.every(([key]) => key === `live:css-metrics:${f.id}`)).toBe(true);
  });

  it("持久状态超过48小时、归属改变或缺证据均为未知", async () => {
    const f = await setup();
    const runtime = (changes = {}) => pg.transaction(pg.a, tx => repo.runtimeInTransaction(tx, f.id, { ...f.expected, ...changes }));
    expect(await runtime()).toMatchObject({ status: "unknown" });
    await f.record(f.event(1));
    expect(await runtime({ nowMs: f.expected.nowMs + 48 * 3600000 + 1 })).toMatchObject({ status: "unknown" });
    expect(await runtime({ domain: "another.example.invalid" })).toMatchObject({ status: "unknown" });
  });
});
