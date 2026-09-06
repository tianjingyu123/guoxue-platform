import { Prisma, PrismaClient } from "@prisma/client";
import { createHmac, randomUUID } from "node:crypto";
import { ExecutionContext } from "@nestjs/common";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CircleCapabilityService } from "../src/modules/circle/circle-capability.service";
import { CircleCapabilityEligibilityService } from "../src/modules/circle/circle-capability-eligibility.service";
import { CircleCapabilityRepository } from "../src/modules/circle/circle-capability.repository";
import { CircleCapabilityQuotaRepository } from "../src/modules/circle/circle-capability-quota.repository";
import { CircleCapabilityQuotaService } from "../src/modules/circle/circle-capability-quota.service";
import { CIRCLE_CAPABILITIES, CIRCLE_CAPABILITY_CONFIG_KEY, CircleCapability } from "../src/modules/circle/circle-capability.policy";
import { PrismaService } from "../src/prisma/prisma.service";
import { CircleWorkflowLocalPg, localGate, capture } from "./fixtures/circle-workflow-local-pg";
import { quotaFixture } from "./fixtures/circle-capability-quota";
import { ConsultCallService } from "../src/modules/consult-call/consult-call.service";
import { CoinService } from "../src/modules/coin/coin.service";
import { RevenueService } from "../src/modules/revenue/revenue.service";
import { SettlementService } from "../src/modules/settlement/settlement.service";
import { buildTrtcConfig, consultTrtcUserId } from "../src/modules/consult-call/trtc-sig.util";
import { ConsultCallResourceService } from "../src/modules/consult-call/consult-call-resource.service";
import { ConsultTrtcStopDispatcher } from "../src/modules/consult-call/consult-trtc-stop.dispatcher";
import { ConsultTrtcStopClient } from "../src/modules/consult-call/consult-trtc-stop.client";
import { ConsultMediaEvidenceService } from "../src/modules/consult-call/consult-media-evidence.service";
import { ConsultMediaStatusService } from "../src/modules/consult-call/consult-media-status.service";
import { ConsultMediaCompletionService } from "../src/modules/consult-call/consult-media-completion.service";
import { ConsultBudgetWorker } from "../src/modules/consult-call/consult-budget.worker";
import { ConsultTrtcFinalProbeDispatcher } from "../src/modules/consult-call/consult-trtc-final-probe.dispatcher";
import { appendConsultMediaEvent, parseConsultMediaEvent } from "../src/modules/consult-call/consult-media-evidence.policy";
import { ConsultMediaEvidence } from "../src/modules/consult-call/consult-media-evidence.policy";
import { TrtcCallbackGuard } from "../src/common/trtc-callback.guard";
import { VideoService } from "../src/modules/video/video.service";
import { VideoPublicationTransactionService } from "../src/modules/video/video-publication-transaction.service";
import { AuditService } from "../src/modules/audit/audit.service";
import { LiveService } from "../src/modules/live/live.service";
import { LivePublicationService } from "../src/modules/live/live-publication.service";
import { LiveMediaCredentialRepository } from "../src/modules/live/live-media-credential.repository";
import { LiveMediaEvidenceRepository } from "../src/modules/live/live-media-evidence.repository";
import { LiveMediaStopRepository } from "../src/modules/live/live-media-stop.repository";
import { LiveMediaStopDispatcher, CssExactScopeAttestation } from "../src/modules/live/live-media-stop-dispatcher";
import { LiveCssStopClient } from "../src/modules/live/live-css-stop.client";
import { LiveMediaCompletionService } from "../src/modules/live/live-media-completion.service";
import { LiveMediaStopWorker } from "../src/modules/live/live-media-stop.worker";
import { LiveMediaClosureAdminService } from "../src/modules/live/live-media-closure-admin.service";
import { CircleConsultVisibilityService } from "../src/modules/circle/circle-consult-visibility.service";
import { CircleExpertService } from "../src/modules/circle/services/circle-expert.service";

// 只隔离 RTC 凭据生成；不会读取供应商密钥或发起真实通话，权限与通话状态 SQL 仍执行真实表。
jest.mock("../src/modules/consult-call/trtc-sig.util", () => ({ ...jest.requireActual("../src/modules/consult-call/trtc-sig.util"), buildTrtcConfig: jest.fn() }));

const localSuite = process.env.RUN_CIRCLE_WORKFLOW_LOCAL_PG === "YES" ? describe : describe.skip;
const human = (userId: string) => ({ userId, executor: "HUMAN" as const });

localSuite("独立完整基线 PostgreSQL：真实资格/申请/审批/启用/额度", () => {
  const pg = new CircleWorkflowLocalPg();
  const grants = new CircleCapabilityRepository(), ledger = new CircleCapabilityQuotaRepository();
  const service = (client: PrismaClient, repository = grants) => new CircleCapabilityService(client as PrismaService, repository, new CircleCapabilityEligibilityService(client as PrismaService));
  const quota = (client: PrismaClient) => new CircleCapabilityQuotaService(service(client), ledger);
  beforeAll(() => pg.start(), 120000);
  afterAll(() => pg.stop(), 65000);
  beforeEach(async () => {
    (buildTrtcConfig as jest.Mock).mockReset().mockImplementation((userId: string, roomId: string) => ({ configured: true,
      userSig: "SYNTHETIC_ONLY", privateMapKey: "SYNTHETIC_ROOM_ONLY", sdkAppId: 1, roomId, strRoomId: roomId,
      userId: consultTrtcUserId(userId, roomId), expiresAt: new Date(Date.now() + 600000).toISOString() }));
    await Promise.all(pg.clients().map(client => client.$executeRaw`SELECT set_config('TimeZone', 'America/Los_Angeles', false)`));
    const fixturePolicy = quotaFixture().authorization.policy;
    if (!fixturePolicy.ok) throw new Error("LOCAL_RULE_FIXTURE_INVALID");
    // 仅合成库的测试门槛，不是正式运营参数；事实来自真实表，不替换资格/主体服务。
    const rules = Object.fromEntries(CIRCLE_CAPABILITIES.map(cap => [cap, { ...fixturePolicy.rule, minOperatingDays: 7, minValidMembers: 2,
      minPublishedPosts: 2, minRecentPosts: 2 }]));
    await pg.observer.configSystem.upsert({ where: { configKey: CIRCLE_CAPABILITY_CONFIG_KEY },
      create: { configKey: CIRCLE_CAPABILITY_CONFIG_KEY, configValue: JSON.stringify({ version: 1, rules }), createdAt: new Date() },
      update: { configValue: JSON.stringify({ version: 1, rules }) }, select: { id: true } });
  });

  async function setup() {
    const ids = { owner: randomUUID(), reviewer: randomUUID(), guest: randomUUID(), consumer: randomUUID(), outsider: randomUUID(), circle: randomUUID() };
    for (const [role, id] of Object.entries(ids).filter(([role]) => role !== "circle")) {
      await pg.observer.user.create({ data: { id, nickname: `LOCAL_ONLY_${role}`, identityLevel: "L1", status: "ACTIVE", createdAt: new Date() }, select: { id: true } });
    }
    const adminRole = await pg.observer.userRole.create({ data: { userId: ids.reviewer, roleType: "OPERATION_ADMIN", bindId: null }, select: { id: true } });
    await pg.observer.circle.create({ data: { id: ids.circle, name: "LOCAL_ONLY_能力治理", intro: "隔离合成资料", tags: [], ownerId: ids.owner,
      status: "ACTIVE", createdAt: new Date(Date.now() - 30 * 86400000) }, select: { id: true } });
    const ownerMember = await pg.observer.circleMember.create({ data: { circleId: ids.circle, userId: ids.owner, role: "OWNER" }, select: { id: true } });
    const guestMember = await pg.observer.circleMember.create({ data: { circleId: ids.circle, userId: ids.guest, role: "GUEST" }, select: { id: true } });
    await pg.observer.circleMember.create({ data: { circleId: ids.circle, userId: ids.consumer, role: "MEMBER" }, select: { id: true } });
    for (let i = 0; i < 2; i++) await pg.observer.post.create({ data: { circleId: ids.circle, userId: ids.owner,
      content: "仅用于真实表资格计数", status: "PUBLISHED", auditStatus: "PENDING", createdAt: new Date() }, select: { id: true } });
    const binding = (cap: CircleCapability = "LIVE") => ({ ...quotaFixture(cap).binding, circleId: ids.circle,
      actorId: cap.includes("QUESTION") ? ids.consumer : ids.owner, subjectUserId: cap.includes("QUESTION") ? ids.guest : null,
      businessId: randomUUID(), requestKey: randomUUID() });
    const reserve = (cap: CircleCapability = "LIVE", client = pg.a) => {
      const value = binding(cap); return pg.transaction(client, tx => quota(client).reserveInTransaction(tx, value, human(value.actorId)));
    };
    const apply = (cap: CircleCapability = "LIVE", client = pg.a, subject?: string) => service(client).apply(ids.circle, human(ids.owner),
      { capability: cap, reason: "LOCAL_ONLY_申请", ...(subject ? { subjectUserId: subject } : {}) });
    const approve = (id: string, revision: number, client = pg.a) => service(client).review(id, human(ids.reviewer), { action: "APPROVE",
      expectedRevision: revision, reason: "LOCAL_ONLY_人工审核", expiresAt: new Date(Date.now() + 3600000).toISOString(), maxUnits: 10, maxConcurrent: 2 });
    const enable = (id: string, revision: number, userId: string = ids.owner) => service(pg.a).setEnabled(id, human(userId),
      { expectedRevision: revision, enabled: true, reason: "LOCAL_ONLY_本人启用" });
    const open = async (cap: CircleCapability = "LIVE", subject?: string) => {
      const pending = await apply(cap, pg.a, subject); const approved = await approve(pending.id, pending.revision);
      expect(approved.enabled).toBe(false); return enable(approved.id, approved.revision, subject ?? ids.owner);
    };
    const counts = async () => {
      const [row] = await pg.observer.$queryRaw<Array<{ grants: bigint; audits: bigint; quotas: bigint }>>`
        SELECT (SELECT count(*) FROM "CircleCapabilityGrant" WHERE "circleId"=${ids.circle}) AS grants,
        (SELECT count(*) FROM "CircleCapabilityAudit" a JOIN "CircleCapabilityGrant" g ON g.id=a."grantId" WHERE g."circleId"=${ids.circle}) AS audits,
        (SELECT count(*) FROM "CircleCapabilityQuota" WHERE "circleId"=${ids.circle}) AS quotas`;
      return { grants: Number(row.grants), audits: Number(row.audits), quotas: Number(row.quotas) };
    };
    return { ...ids, adminRole, ownerMember, guestMember, binding, reserve, apply, approve, enable, open, counts };
  }
  async function mutatePolicy(change: (value: { rules: Record<string, { enabled: boolean; revision: number }> }) => void) {
    const row = await pg.observer.configSystem.findUniqueOrThrow({ where: { configKey: CIRCLE_CAPABILITY_CONFIG_KEY } });
    const value = JSON.parse(row.configValue); change(value);
    await pg.observer.configSystem.update({ where: { id: row.id }, data: { configValue: JSON.stringify(value) }, select: { id: true } });
  }
  async function blockedChange(change: (tx: Prisma.TransactionClient) => Promise<unknown>, action: () => Promise<unknown>) {
    const ready = localGate(), release = localGate(); let initialFailure: unknown;
    const writer = capture(pg.transaction(pg.b, async tx => { try { await change(tx); ready.release(); await release.promise; }
      catch (error) { initialFailure = error; ready.release(); throw error; } }));
    await ready.promise; if (initialFailure) { await writer; throw initialFailure; }
    const pending = capture(action());
    try { await pg.waitForLocks(); } finally { release.release(); }
    const written = await writer; if (!written.ok) throw written.error;
    return pending;
  }
  async function competing(circleId: string, first: () => Promise<unknown>, second: () => Promise<unknown>, callId?: string) {
    const ready = localGate(), release = localGate();
    const holder = capture(pg.transaction(pg.observer, async tx => {
      if (callId) await tx.$queryRaw`SELECT id FROM "ConsultCall" WHERE id=${callId} FOR UPDATE`;
      else await ledger.lockScope(tx, circleId);
      ready.release(); await release.promise;
    }));
    // 独立第四连接读取实际等待，不用固定 sleep 推定两个请求已经排队。
    await Promise.race([ready.promise, holder.then(result => { if (!result.ok) throw result.error; })]);
    const one = capture(first()), two = capture(second());
    try { await pg.waitForLocks(2, !callId); } finally { release.release(); }
    const held = await holder; if (!held.ok) throw held.error;
    return Promise.all([one, two]);
  }

  it("实际双节点 worker 从 READY 派发、接断流、查询到额度收尾，不重复供应商写入", async () => {
    const old = process.env.LIVE_CSS_EXACT_SCOPE_ATTESTATION, s = await stopDispatchFixture();
    const credentials = new LiveMediaCredentialRepository(), media = new LiveMediaEvidenceRepository();
    process.env.LIVE_CSS_EXACT_SCOPE_ATTESTATION = JSON.stringify({ ...s.proof,
      verifiedAt: new Date(Date.now() - 1000).toISOString(), verifiedUntil: s.proof.verifiedUntil.toISOString() });
    s.forbidOnce.mockImplementation(async () => {
      const seconds = Math.floor(Date.now() / 1000);
      for (const [kind, occurred] of [[1, seconds - 5], [0, seconds]]) {
        await pg.transaction(pg.observer, tx => media.recordCssInTransaction(tx, { stream_id: `room_${s.room.id}`, app: s.proof.domain,
          appname: s.proof.appName, event_type: kind, sequence: "synthetic-worker-session", event_time: occurred },
        { roomId: s.room.id, domain: s.proof.domain, appName: s.proof.appName, nowMs: Date.now() }));
      }
      return { state: "ACKNOWLEDGED", requestId: "synthetic-worker-stop" };
    });
    try {
      const workers = [pg.a, pg.b].map(client => new LiveMediaStopWorker(client as PrismaService, s.stops, s.dispatcher(client),
        new LiveMediaCompletionService(client as PrismaService, ledger, quota(client), media, credentials, s.stops)));
      await Promise.all(workers.map(worker => worker.tick()));
      expect(workers.every(worker => worker.status().failed === 0)).toBe(true);
      expect(await ledger.byBusiness(pg.observer, "LIVE_SESSION", s.room.id)).toMatchObject({ state: "COMPLETED" });
      expect(s.forbidOnce).toHaveBeenCalledTimes(1);
      await Promise.all(workers.map(worker => worker.tick()));
      expect(s.forbidOnce).toHaveBeenCalledTimes(1);
    } finally {
      if (old === undefined) delete process.env.LIVE_CSS_EXACT_SCOPE_ATTESTATION; else process.env.LIVE_CSS_EXACT_SCOPE_ATTESTATION = old;
    }
  });
  it.each(CIRCLE_CAPABILITIES)("%s 完整真实表资格→待审→批准→本人启用→额度预留", async cap => {
    const h = await setup(); const progress = await service(pg.a).getEligibility(h.circle, human(h.owner), cap);
    expect(progress.eligibility.eligible).toBe(true);
    expect(progress.eligibility.progress.find(p => p.key === "validMembers")?.current).toBe(3);
    const pending = await h.apply(cap); expect(pending).toMatchObject({ state: "PENDING", enabled: false });
    await expect(h.reserve(cap)).rejects.toMatchObject({ status: 403 });
    const approved = await h.approve(pending.id, pending.revision);
    await expect(h.reserve(cap)).rejects.toMatchObject({ status: 403 });
    await h.enable(approved.id, approved.revision);
    if (cap.includes("QUESTION")) { await expect(h.reserve(cap)).rejects.toMatchObject({ status: 403 }); await h.open(cap, h.guest); }
    const reserved = await h.reserve(cap); expect(reserved.reservation.state).toBe("HELD");
    expect(await h.counts()).toEqual({ grants: cap.includes("QUESTION") ? 2 : 1, audits: cap.includes("QUESTION") ? 6 : 3, quotas: 1 });
  });

  function directDto(capability: CircleCapability, subjectUserId?: string) {
    return { capability, ...(subjectUserId ? { subjectUserId } : {}), reason: "LOCAL_ONLY_名师战略合作直授", expectedLatestRevision: 0,
      expiresAt: new Date(Date.now() + 3600000).toISOString(), maxUnits: 500, maxConcurrent: 20 };
  }
  function liveService(client: PrismaClient) {
    const audit = new AuditService(client as never, {} as never, {} as never, {} as never, {} as never);
    jest.spyOn(audit, "resolveContentVisibility").mockResolvedValue({ visibility: "CIRCLE_ONLY", auditStatus: "PENDING" } as never);
    const queue = jest.spyOn(audit, "queueContentModeration").mockImplementation(() => undefined);
    return { queue, lives: new LiveService(client as never, {} as never, {} as never, {} as never, audit,
      new LivePublicationService(service(client), ledger, quota(client)), {} as never, {} as never, {} as never) };
  }
  it("真实直播创建核对已启用资格，房间与审核记录一起提交，不提前占开播额度", async () => {
    const h = await setup(); await h.open("LIVE"); const v = liveService(pg.a);
    const room = await v.lives.createRoom(h.owner, { circleId: h.circle, title: "合成直播预告" });
    expect(room).toMatchObject({ status: "WAITING", hostUserId: h.owner });
    expect(await pg.observer.contentAuditRecord.count({ where: { contentId: room.id } })).toBe(1);
    expect((await h.counts()).quotas).toBe(0);
    expect(v.queue).toHaveBeenCalledTimes(1);
  });
  it("普通 MEMBER 的真实平台直授可创建直播，不要求圈级申请或原角色", async () => {
    const h = await setup(); await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { role: "MEMBER" } });
    await pg.observer.post.updateMany({ where: { circleId: h.circle }, data: { status: "HIDDEN" } });
    await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("LIVE", h.guest));
    const v = liveService(pg.a), room = await v.lives.createRoom(h.guest, { circleId: h.circle, title: "合成直授直播" });
    expect(room.hostUserId).toBe(h.guest);
  });
  it("真实直播资格撤销后不得创建，原观看入口未参与发布校验", async () => {
    const h = await setup(); const grant = await h.open("LIVE"), v = liveService(pg.a);
    await service(pg.a).review(grant.id, human(h.reviewer), { action: "REVOKE", expectedRevision: grant.revision, reason: "合成撤权" });
    await expect(v.lives.createRoom(h.owner, { circleId: h.circle, title: "撤权后直播" })).rejects.toMatchObject({ status: 403 });
    expect(await pg.observer.liveRoom.count({ where: { circleId: h.circle } })).toBe(0);
    expect(v.queue).not.toHaveBeenCalled();
  });
  it("真实直播审核写入失败回滚整个房间，不留下无审核的预告", async () => {
    const h = await setup(); await h.open("LIVE"); const v = liveService(pg.a);
    await pg.observer.$executeRawUnsafe(`ALTER TABLE "ContentAuditRecord" ADD CONSTRAINT "local_live_audit_failure" CHECK ("submitterId" <> '${h.owner}')`);
    try {
      await expect(v.lives.createRoom(h.owner, { circleId: h.circle, title: "合成审核失败" })).rejects.toThrow();
      expect(await pg.observer.liveRoom.count({ where: { circleId: h.circle } })).toBe(0);
      expect(v.queue).not.toHaveBeenCalled();
    } finally { await pg.observer.$executeRaw`ALTER TABLE "ContentAuditRecord" DROP CONSTRAINT "local_live_audit_failure"`; }
  });
  async function prepareLiveStart(h: Awaited<ReturnType<typeof setup>>, host = h.owner) {
    const room = await pg.observer.liveRoom.create({ data: { circleId: h.circle, userId: host, hostUserId: host, title: "本地开播事务" } });
    const input = { roomId: room.id, operatorId: host, isAdmin: false, executor: "HUMAN" as const, obsPreflight: false,
      pushUrl: "rtmp://example.invalid/synthetic", pullUrl: "https://example.invalid/synthetic", trtcRoomId: "synthetic_room" };
    const start = (client = pg.a) => pg.transaction(client, tx => new LivePublicationService(service(client), ledger, quota(client)).startInTransaction(tx, input));
    return { room, input, start };
  }
  function credentialService(client = pg.a) {
    const credentials = new LiveMediaCredentialRepository();
    const stream = { isReady: () => true,
      genPushUrl: (key: string) => `rtmp://push.example.invalid/live/${key}?txSecret=SYNTHETIC&txTime=${(Math.floor(Date.now() / 1000) + 3600).toString(16)}`,
      genPlayUrls: () => ({ flv: "https://example.invalid/live.flv" }) };
    const lives = new LiveService(client as never, { set: async () => {}, del: async () => {}, getJson: async () => null } as never, stream as never,
      { fire: async () => {} } as never, {} as never,
      new LivePublicationService(service(client), ledger, quota(client)), new LiveMediaEvidenceRepository(), credentials, new LiveMediaStopRepository(credentials));
    return { credentials, lives };
  }
  it("实际 LiveService 签发提交范围记录，重复领取复用额度且不能直接删除预告", async () => {
    const h = await setup(); await h.open("LIVE"); const s = await prepareLiveStart(h), v = credentialService();
    await v.lives.getStreamUrls(s.room.id, h.owner);
    await v.lives.getStreamUrls(s.room.id, h.owner);
    const rows = await pg.transaction(pg.observer, tx => v.credentials.readInTransaction(tx, s.room.id));
    expect(rows).toHaveLength(1); expect(rows[0].scope).toMatchObject({ provider: "CSS", streamName: `room_${s.room.id}` });
    expect(JSON.stringify(rows)).not.toContain("SYNTHETIC"); expect((await h.counts()).quotas).toBe(1);
    await expect(v.lives.deleteRoom(h.owner, s.room.id)).rejects.toThrow("保留记录");
  });
  it.each(["SIGN", "START"])("实际 %s 边界写入失败时凭据不返回、额度与房间一起回滚", async action => {
    const h = await setup(); await h.open("LIVE"); const s = await prepareLiveStart(h), v = credentialService();
    await pg.observer.$executeRawUnsafe(`ALTER TABLE "LiveMediaCredentialBoundary" ADD CONSTRAINT "local_credential_failure" CHECK ("roomId" <> '${s.room.id}')`);
    try {
      await expect(action === "SIGN" ? v.lives.getStreamUrls(s.room.id, h.owner) : v.lives.startLive(s.room.id, h.owner)).rejects.toThrow();
      expect((await h.counts()).quotas).toBe(0);
      expect(await pg.observer.liveRoom.findUnique({ where: { id: s.room.id } })).toMatchObject({ status: "WAITING", pushUrl: null });
      expect(await pg.transaction(pg.a, tx => v.credentials.readInTransaction(tx, s.room.id))).toHaveLength(0);
    } finally { await pg.observer.$executeRaw`ALTER TABLE "LiveMediaCredentialBoundary" DROP CONSTRAINT "local_credential_failure"`; }
  });
  it("实际 RTC 签发持久记录脱敏应用与房间，不保存票据", async () => {
    const h = await setup(); await h.open("LIVE"); const s = await prepareLiveStart(h); await s.start();
    const v = credentialService(), oldId = process.env.TRTC_SDK_APP_ID, oldKey = process.env.TRTC_SECRET_KEY;
    try {
      process.env.TRTC_SDK_APP_ID = "123456"; process.env.TRTC_SECRET_KEY = "LOCAL_SYNTHETIC_ONLY";
      const ticket = await v.lives.getRtcConfig(s.room.id, h.owner);
      const rows = await pg.transaction(pg.a, tx => v.credentials.readInTransaction(tx, s.room.id));
      expect(rows).toHaveLength(1); expect(rows[0].scope).toEqual({ provider: "TRTC", sdkAppId: 123456, trtcRoomId: ticket.strRoomId });
      expect(rows[0].expiresAt.toISOString()).toBe(ticket.expiresAt);
      expect(JSON.stringify(rows)).not.toMatch(/userSig|privateMapKey|LOCAL_SYNTHETIC/);
    } finally {
      if (oldId === undefined) delete process.env.TRTC_SDK_APP_ID; else process.env.TRTC_SDK_APP_ID = oldId;
      if (oldKey === undefined) delete process.env.TRTC_SECRET_KEY; else process.env.TRTC_SECRET_KEY = oldKey;
    }
  });
  it("实际结束与停流意图一起提交，重复结束不新增请求、不释放 ACTIVE", async () => {
    const h = await setup(); await h.open("LIVE"); const s = await prepareLiveStart(h), v = credentialService();
    await v.lives.getStreamUrls(s.room.id, h.owner); await v.lives.endRoom(s.room.id, h.owner);
    const stops = new LiveMediaStopRepository(v.credentials);
    const first = await pg.transaction(pg.a, tx => stops.readInTransaction(tx, s.room.id, "CSS"));
    expect(first).toMatchObject({ state: "READY", requestedBy: h.owner, credentialRevision: 1 });
    await v.lives.endRoom(s.room.id, h.owner);
    expect(await pg.transaction(pg.a, tx => stops.readInTransaction(tx, s.room.id, "CSS"))).toEqual(first);
    expect(await ledger.byBusiness(pg.observer, "LIVE_SESSION", s.room.id)).toMatchObject({ state: "ACTIVE" });
  });
  it("停流意图写入失败，结束状态回滚，不留下结束成功但无意图", async () => {
    const h = await setup(); await h.open("LIVE"); const s = await prepareLiveStart(h), v = credentialService();
    await v.lives.getStreamUrls(s.room.id, h.owner);
    await pg.observer.$executeRawUnsafe(`ALTER TABLE "LiveMediaStopIntent" ADD CONSTRAINT "local_stop_failure" CHECK ("roomId" <> '${s.room.id}')`);
    try {
      await expect(v.lives.endRoom(s.room.id, h.owner)).rejects.toThrow();
      expect(await pg.observer.liveRoom.findUnique({ where: { id: s.room.id } })).toMatchObject({ status: "WAITING", endTime: null });
    } finally { await pg.observer.$executeRaw`ALTER TABLE "LiveMediaStopIntent" DROP CONSTRAINT "local_stop_failure"`; }
  });
  it("双节点只能领取一次停流；租约超时保留 UNKNOWN，迟到回执只归原请求", async () => {
    const h = await setup(); await h.open("LIVE"); const s = await prepareLiveStart(h), v = credentialService();
    await v.lives.getStreamUrls(s.room.id, h.owner); await v.lives.endRoom(s.room.id, h.owner);
    const stops = new LiveMediaStopRepository(v.credentials), now = new Date();
    const claims = await Promise.all([pg.a, pg.b].map(client => pg.transaction(client, tx => stops.claimInTransaction(tx, s.room.id, "CSS", now))));
    expect(claims.filter(Boolean)).toHaveLength(1); const claim = claims.find(Boolean)!;
    const later = new Date(now.getTime() + 61000);
    expect(await pg.transaction(pg.a, tx => stops.expireLeaseInTransaction(tx, s.room.id, "CSS", later))).toMatchObject({ state: "UNKNOWN", operationId: claim.operationId });
    expect(await pg.transaction(pg.a, tx => stops.claimInTransaction(tx, s.room.id, "CSS", later))).toBeNull();
    await expect(pg.transaction(pg.a, tx => stops.recordResultInTransaction(tx, s.room.id, "CSS", randomUUID(),
      { state: "ACKNOWLEDGED", requestId: "synthetic-request" }, later))).rejects.toThrow("LIVE_STOP_RESULT_INVALID");
    const ack = await pg.transaction(pg.a, tx => stops.recordResultInTransaction(tx, s.room.id, "CSS", claim.operationId,
      { state: "ACKNOWLEDGED", requestId: "synthetic-request" }, later));
    expect(ack).toMatchObject({ state: "ACKNOWLEDGED" });
    expect(await pg.transaction(pg.a, tx => stops.recordResultInTransaction(tx, s.room.id, "CSS", claim.operationId,
      { state: "ACKNOWLEDGED", requestId: "synthetic-request" }, later))).toEqual(ack);
    expect(await ledger.byBusiness(pg.observer, "LIVE_SESSION", s.room.id)).toMatchObject({ state: "ACTIVE" });
  });
  async function stopDispatchFixture() {
    const h = await setup(); await h.open("LIVE"); const s = await prepareLiveStart(h), v = credentialService();
    await v.lives.getStreamUrls(s.room.id, h.owner); await v.lives.endRoom(s.room.id, h.owner);
    const stops = new LiveMediaStopRepository(v.credentials);
    const intent = (await pg.transaction(pg.a, tx => stops.readInTransaction(tx, s.room.id, "CSS")))!;
    if (intent.scope.provider !== "CSS") throw new Error("LOCAL_CSS_REQUIRED");
    const proof: CssExactScopeAttestation = { domain: intent.scope.domain, appName: intent.scope.appName,
      evidenceId: "local-synthetic-verification", verifiedUntil: new Date(Date.now() + 3600000) };
    const forbidOnce = jest.fn().mockResolvedValue({ state: "ACKNOWLEDGED", requestId: "synthetic-stop-request" });
    const queryState = jest.fn().mockResolvedValue({ state: "forbid", requestId: "synthetic-query-request" });
    const dispatcher = (client = pg.a) => new LiveMediaStopDispatcher(client as PrismaService, stops, v.credentials,
      { forbidOnce, queryState } as unknown as LiveCssStopClient);
    const read = () => pg.transaction(pg.observer, tx => stops.readInTransaction(tx, s.room.id, "CSS"));
    return { ...s, proof, forbidOnce, queryState, dispatcher, read, stops, reviewer: h.reviewer, owner: h.owner };
  }
  it("实际派发双节点竞争只调供应商一次，调用时 DISPATCHING 已提交且不持房间锁", async () => {
    const s = await stopDispatchFixture();
    s.forbidOnce.mockImplementation(async () => {
      expect(await s.read()).toMatchObject({ state: "DISPATCHING" });
      await pg.transaction(pg.probe, tx => tx.$executeRaw`SELECT id FROM "LiveRoom" WHERE id=${s.room.id} FOR UPDATE NOWAIT`);
      return { state: "ACKNOWLEDGED", requestId: "synthetic-stop-request" };
    });
    await Promise.all([pg.a, pg.b].map(client => s.dispatcher(client).dispatchCss(s.room.id, s.proof)));
    expect(s.forbidOnce).toHaveBeenCalledTimes(1);
    expect(s.forbidOnce).toHaveBeenCalledWith({ roomId: s.room.id, domain: s.proof.domain, appName: s.proof.appName,
      resumeAtMs: (await s.read())!.protectUntil.getTime(), exactScopeEnabled: true });
    expect(await s.read()).toMatchObject({ state: "ACKNOWLEDGED" });
    expect(await ledger.byBusiness(pg.observer, "LIVE_SESSION", s.room.id)).toMatchObject({ state: "ACTIVE" });
  });
  it("网络异常只持久 UNKNOWN 且重复运行不重发，不输出供应商错误", async () => {
    const s = await stopDispatchFixture(); s.forbidOnce.mockRejectedValue(new Error("SYNTHETIC_PRIVATE_PAYLOAD"));
    const first = await s.dispatcher().dispatchCss(s.room.id, s.proof);
    expect(first.state).toBe("UNKNOWN"); expect(JSON.stringify(first)).not.toContain("SYNTHETIC_PRIVATE");
    expect(await s.dispatcher().dispatchCss(s.room.id, s.proof)).toEqual(first);
    expect(s.forbidOnce).toHaveBeenCalledTimes(1);
  });
  it("无精确范围证明、域名错误、证明过期均不领取不发送", async () => {
    const s = await stopDispatchFixture();
    for (const proof of [null, { ...s.proof, domain: "other.invalid" }, { ...s.proof, verifiedUntil: new Date(0) }]) {
      expect(await s.dispatcher().dispatchCss(s.room.id, proof)).toEqual({ state: "BLOCKED", reason: "EXACT_SCOPE_NOT_VERIFIED" });
    }
    expect(await s.read()).toMatchObject({ state: "READY" }); expect(s.forbidOnce).not.toHaveBeenCalled();
  });
  it("领取前凭据版本漂移拒绝，不能对另一签发边界停流", async () => {
    const s = await stopDispatchFixture();
    await pg.observer.$executeRaw`UPDATE "LiveMediaCredentialBoundary" SET revision=revision+1 WHERE "roomId"=${s.room.id}`;
    expect(await s.dispatcher().dispatchCss(s.room.id, s.proof)).toEqual({ state: "BLOCKED", reason: "BOUNDARY_DRIFT" });
    expect(await s.read()).toMatchObject({ state: "READY" }); expect(s.forbidOnce).not.toHaveBeenCalled();
  });
  it("供应商已响应但结果写入失败保留 DISPATCHING，第二节点不再发送", async () => {
    const s = await stopDispatchFixture();
    await pg.observer.$executeRawUnsafe(`ALTER TABLE "LiveMediaStopIntent" ADD CONSTRAINT "local_stop_result_failure" CHECK ("roomId" <> '${s.room.id}' OR state <> 'ACKNOWLEDGED')`);
    try {
      await expect(s.dispatcher().dispatchCss(s.room.id, s.proof)).rejects.toThrow("LIVE_STOP_RESULT_PERSIST_FAILED");
      expect(await s.read()).toMatchObject({ state: "DISPATCHING" });
      expect((await s.dispatcher(pg.b).dispatchCss(s.room.id, s.proof)).state).toBe("DISPATCHING");
      expect(s.forbidOnce).toHaveBeenCalledTimes(1);
    } finally { await pg.observer.$executeRaw`ALTER TABLE "LiveMediaStopIntent" DROP CONSTRAINT "local_stop_result_failure"`; }
  });
  it("供应商状态查询记录精确范围与脱敏证明，但 forbid 不直接释放额度", async () => {
    const s = await stopDispatchFixture(); await s.dispatcher().dispatchCss(s.room.id, s.proof);
    expect(await s.dispatcher().verifyCss(s.room.id, s.proof)).toMatchObject({ state: "forbid", applied: true });
    const stored = await s.read();
    expect(stored?.verification).toMatchObject({ state: "forbid", requestId: "synthetic-query-request", scopeProofRef: s.proof.evidenceId });
    expect(s.queryState).toHaveBeenCalledTimes(1); expect(s.forbidOnce).toHaveBeenCalledTimes(1);
    expect(await ledger.byBusiness(pg.observer, "LIVE_SESSION", s.room.id)).toMatchObject({ state: "ACTIVE" });
  });
  it("只读查询失败覆盖旧 forbid 为 UNKNOWN，不能沿用陈旧禁推证据", async () => {
    const s = await stopDispatchFixture(); await s.dispatcher().dispatchCss(s.room.id, s.proof);
    await s.dispatcher().verifyCss(s.room.id, s.proof);
    s.queryState.mockRejectedValue(new Error("SYNTHETIC_PRIVATE_QUERY"));
    expect(await s.dispatcher().verifyCss(s.room.id, s.proof)).toMatchObject({ state: "UNKNOWN", applied: true });
    expect((await s.read())?.verification).toMatchObject({ state: "UNKNOWN", requestId: null });
    expect(JSON.stringify(await s.read())).not.toContain("SYNTHETIC_PRIVATE_QUERY");
  });
  it("两节点查询乱序返回只保留新查询，旧 inactive 不覆盖新 forbid", async () => {
    const s = await stopDispatchFixture(); await s.dispatcher().dispatchCss(s.room.id, s.proof);
    let started!: () => void, finish!: (value: unknown) => void;
    const entered = new Promise<void>(resolve => { started = resolve; });
    s.queryState.mockImplementationOnce(() => { started(); return new Promise(resolve => { finish = resolve; }); });
    const oldQuery = s.dispatcher(pg.a).verifyCss(s.room.id, s.proof);
    await entered;
    expect((await s.read())?.verification).toMatchObject({ state: "QUERYING", requestId: null });
    try {
      expect(await s.dispatcher(pg.b).verifyCss(s.room.id, s.proof)).toMatchObject({ state: "forbid", applied: true });
    } finally { finish({ state: "inactive", requestId: "synthetic-old-query" }); }
    expect(await oldQuery).toMatchObject({ state: "forbid", applied: false });
    expect((await s.read())?.verification?.requestId).toBe("synthetic-query-request");
  });
  it("未派发、错域、凭据变化都不查询供应商", async () => {
    const s = await stopDispatchFixture();
    expect(await s.dispatcher().verifyCss(s.room.id, s.proof)).toMatchObject({ state: "BLOCKED", reason: "STOP_NOT_DISPATCHED" });
    await s.dispatcher().dispatchCss(s.room.id, s.proof);
    expect(await s.dispatcher().verifyCss(s.room.id, { ...s.proof, domain: "wrong.invalid" })).toMatchObject({ state: "BLOCKED" });
    await pg.observer.$executeRaw`UPDATE "LiveMediaCredentialBoundary" SET revision=revision+1 WHERE "roomId"=${s.room.id}`;
    expect(await s.dispatcher().verifyCss(s.room.id, s.proof)).toMatchObject({ state: "BLOCKED", reason: "BOUNDARY_DRIFT" });
    expect(s.queryState).not.toHaveBeenCalled();
  });
  it("查询超过有效窗口或证明已过期，返回 forbid 也只能保存 UNKNOWN", async () => {
    const s = await stopDispatchFixture(); await s.dispatcher().dispatchCss(s.room.id, s.proof);
    const row = (await s.read())!, now = new Date();
    const query = await pg.transaction(pg.a, tx => s.stops.beginVerificationInTransaction(tx, s.room.id, row.operationId,
      { reference: s.proof.evidenceId, until: now.getTime() + 30000 }, now));
    expect(await pg.transaction(pg.b, tx => s.stops.finishVerificationInTransaction(tx, s.room.id, row.operationId,
      query.queryId, { state: "forbid", requestId: "synthetic-late-query" }, new Date(now.getTime() + 61000))))
      .toMatchObject({ applied: true, verification: { state: "UNKNOWN", requestId: null } });
  });
  async function completionFixture() {
    const s = await stopDispatchFixture(), media = new LiveMediaEvidenceRepository(), credentials = new LiveMediaCredentialRepository();
    const complete = (client = pg.a) => new LiveMediaCompletionService(client as PrismaService, ledger, quota(client), media, credentials, s.stops).completeCss(s.room.id);
    const event = (kind: 0 | 1, sequence: string, seconds: number) => pg.transaction(pg.a, tx => media.recordCssInTransaction(tx,
      { stream_id: `room_${s.room.id}`, app: s.proof.domain, appname: s.proof.appName, event_type: kind, sequence, event_time: seconds },
      { roomId: s.room.id, domain: s.proof.domain, appName: s.proof.appName, nowMs: Date.now() }));
    await s.dispatcher().dispatchCss(s.room.id, s.proof);
    const second = Math.floor(Date.now() / 1000);
    await event(1, "synthetic-completion-session", second - 5); await event(0, "synthetic-completion-session", second);
    await s.dispatcher().verifyCss(s.room.id, s.proof);
    return { ...s, complete, event, second };
  }
  it("结束、ACK、禁推查询、断流证据齐全才 COMPLETE；双节点仅一次且累计次数保留", async () => {
    const s = await completionFixture();
    const outcomes = await Promise.all([s.complete(pg.a), s.complete(pg.b)]);
    expect(outcomes).toContainEqual({ state: "COMPLETED", changed: true });
    expect(outcomes).toContainEqual({ state: "COMPLETED", changed: false });
    const current = (await ledger.byBusiness(pg.observer, "LIVE_SESSION", s.room.id))!;
    expect(current.state).toBe("COMPLETED");
    expect(await ledger.usage(pg.observer, [current.circleGrantId!], new Date())).toMatchObject([{ committed: 1, active: 0, held: 0 }]);
    const stop = (await s.read())!;
    expect(stop.completion).toMatchObject({ quotaId: current.id, quotaRevision: current.revision, verification: { state: "forbid" } });
    expect(await ledger.receipt(pg.observer, stop.operationId)).toMatchObject({ action: "COMPLETE", source: "BUSINESS_ADAPTER",
      evidenceRef: `live-stop:${stop.operationId}` });
  });
  it("断流证据缺失时不因 ACK 与 forbid 释放并发", async () => {
    const s = await completionFixture(); await pg.observer.$executeRaw`DELETE FROM "LiveMediaEvidence" WHERE "roomId"=${s.room.id}`;
    expect(await s.complete()).toEqual({ state: "PENDING", reason: "MEDIA_NOT_CLOSED" });
    expect(await ledger.byBusiness(pg.observer, "LIVE_SESSION", s.room.id)).toMatchObject({ state: "ACTIVE" });
  });
  it("任何仍打开的媒体连接优先于 forbid，不能收尾", async () => {
    const s = await completionFixture(); await s.event(1, "synthetic-open-session", s.second);
    expect(await s.complete()).toEqual({ state: "PENDING", reason: "MEDIA_NOT_CLOSED" });
  });
  it("最新查询 inactive 或失败都不能当禁止重连证明", async () => {
    const s = await completionFixture();
    for (const state of ["inactive", "UNKNOWN"]) {
      s.queryState.mockResolvedValue({ state, requestId: state === "UNKNOWN" ? undefined : "synthetic-inactive" });
      await s.dispatcher().verifyCss(s.room.id, s.proof);
      expect(await s.complete()).toEqual({ state: "PENDING", reason: "NO_FRESH_FORBID_EVIDENCE" });
    }
    expect(await ledger.byBusiness(pg.observer, "LIVE_SESSION", s.room.id)).toMatchObject({ state: "ACTIVE" });
  });
  it("同房间存在 TRTC 票据边界时不能仅依据 CSS 归还资源", async () => {
    const s = await completionFixture();
    const scope = { provider: "TRTC", sdkAppId: 123456, trtcRoomId: "synthetic_extra_rtc" };
    await pg.observer.$executeRaw`INSERT INTO "LiveMediaCredentialBoundary" ("roomId",provider,scope,"expiresAt",revision)
      VALUES (${s.room.id},'TRTC',${JSON.stringify(scope)}::jsonb,(CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + interval '1 hour',1)`;
    expect(await s.complete()).toEqual({ state: "PENDING", reason: "OTHER_PROVIDER_NOT_CLOSED" });
  });
  it("收尾证据落盘失败同时回滚 COMPLETE 与额度回执", async () => {
    const s = await completionFixture();
    await pg.observer.$executeRawUnsafe(`ALTER TABLE "LiveMediaStopIntent" ADD CONSTRAINT "local_completion_failure" CHECK ("roomId" <> '${s.room.id}' OR completion IS NULL)`);
    try {
      await expect(s.complete()).rejects.toThrow();
      expect(await ledger.byBusiness(pg.observer, "LIVE_SESSION", s.room.id)).toMatchObject({ state: "ACTIVE" });
      const stop = (await s.read())!;
      expect(stop.completion).toBeNull(); expect(await ledger.receipt(pg.observer, stop.operationId)).toBeNull();
    } finally { await pg.observer.$executeRaw`ALTER TABLE "LiveMediaStopIntent" DROP CONSTRAINT "local_completion_failure"`; }
  });
  it("发布者已停用或撤权仍可凭真实停流证据收尾，不重新签发", async () => {
    const s = await completionFixture();
    await pg.observer.user.update({ where: { id: s.room.hostUserId }, data: { status: "DISABLED" } });
    expect(await s.complete()).toEqual({ state: "COMPLETED", changed: true });
    expect(s.forbidOnce).toHaveBeenCalledTimes(1);
  });
  it("发布回放不阻塞原停流请求与额度收尾，缺结束时间的回放仍拒绝", async () => {
    const s = await completionFixture();
    await pg.observer.liveRoom.update({ where: { id: s.room.id }, data: { status: "REPLAY" } });
    expect((await s.dispatcher().dispatchCss(s.room.id, s.proof)).state).toBe("ACKNOWLEDGED");
    expect((await s.dispatcher().verifyCss(s.room.id, s.proof)).state).toBe("forbid");
    expect(await s.complete()).toEqual({ state: "COMPLETED", changed: true });
    const other = await stopDispatchFixture();
    await pg.observer.liveRoom.update({ where: { id: other.room.id }, data: { status: "REPLAY", endTime: null } });
    expect(await other.dispatcher().dispatchCss(other.room.id, other.proof)).toMatchObject({ state: "BLOCKED", reason: "ROOM_NOT_ENDED" });
    expect(other.forbidOnce).not.toHaveBeenCalled();
  });
  function closureAdmin() {
    const credentials = new LiveMediaCredentialRepository();
    return new LiveMediaClosureAdminService(pg.a as PrismaService, credentials, new LiveMediaStopRepository(credentials),
      new LiveMediaEvidenceRepository(), ledger, { status: () => ({ state: "WAITING_SCOPE_VERIFICATION" }) } as LiveMediaStopWorker);
  }
  it("后台资源核验只读且严格脱敏，已完成结论绑定额度回执", async () => {
    const s = await completionFixture(); await s.complete();
    const before = await s.read(), result = await closureAdmin().get(s.room.id, s.reviewer);
    expect(result.outcome.reason).toBe("COMPLETED"); expect(result.providers).toHaveLength(1);
    expect(result.quotaState).toBe("COMPLETED");
    expect(JSON.stringify(result)).not.toMatch(/txSecret|streamName|scopeProofRef|synthetic-query|synthetic-stop|secretKey|requestedBy/);
    expect(await s.read()).toEqual(before); expect(s.forbidOnce).toHaveBeenCalledTimes(1);
  });
  it("后台核验拒绝普通圈主、已撤销管理员和仅圈子绑定角色", async () => {
    const s = await completionFixture(), admin = closureAdmin();
    await expect(admin.get(s.room.id, s.owner)).rejects.toMatchObject({ status: 403 });
    await pg.observer.userRole.updateMany({ where: { userId: s.reviewer }, data: { bindId: s.room.circleId } });
    await expect(admin.get(s.room.id, s.reviewer)).rejects.toMatchObject({ status: 403 });
    await pg.observer.userRole.deleteMany({ where: { userId: s.reviewer } });
    await expect(admin.get(s.room.id, s.reviewer)).rejects.toMatchObject({ status: 403 });
  });
  it("后台读取不能把破损完成回执伪装为已收尾", async () => {
    const s = await completionFixture(); await s.complete(); const stopped = (await s.read())!;
    await pg.observer.$executeRaw`UPDATE "CircleCapabilityQuotaReceipt" SET "evidenceRef"='synthetic-wrong-proof' WHERE "operationKey"=${stopped.operationId}`;
    await expect(closureAdmin().get(s.room.id, s.reviewer)).rejects.toThrow("LIVE_COMPLETION_RECEIPT_INVALID");
  });
  it("领取凭据即占 ACTIVE，重复领取与正式开播复用同一资源", async () => {
    const h = await setup(); await h.open("LIVE"); const s = await prepareLiveStart(h);
    const sign = (client = pg.a) => pg.transaction(client, tx => new LivePublicationService(service(client), ledger, quota(client))
      .signInTransaction(tx, s.input, room => ({ roomId: room.id })));
    const results = await Promise.all([sign(pg.a), sign(pg.b)]);
    expect(results).toEqual([{ roomId: s.room.id }, { roomId: s.room.id }]);
    expect(await ledger.byBusiness(pg.observer, "LIVE_SESSION", s.room.id)).toMatchObject({ state: "ACTIVE" });
    expect(await pg.observer.liveRoom.findUnique({ where: { id: s.room.id } })).toMatchObject({ status: "WAITING" });
    await s.start();
    expect((await h.counts()).quotas).toBe(1);
  });
  for (const operation of ["sign", "start", "end"] as const) {
    it(`直播管理员事务复核 ${operation}：并发撤权后旧快照不能继续操作`, async () => {
      const h = await setup(), s = await prepareLiveStart(h);
      const pub = new LivePublicationService(service(pg.a), ledger, quota(pg.a));
      const input = { ...s.input, operatorId: h.reviewer, isAdmin: true };
      const sign = jest.fn(() => ({ synthetic: true }));
      const run = () => pg.transaction<unknown>(pg.a, tx => operation === "sign" ? pub.signInTransaction(tx, input, sign)
        : operation === "start" ? pub.startInTransaction(tx, input) : pub.endInTransaction(tx, input));
      const result = await blockedChange(tx => tx.userRole.delete({ where: { id: h.adminRole.id } }), run);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatchObject({ status: 403 });
      expect(sign).not.toHaveBeenCalled();
      expect(await pg.observer.liveRoom.findUnique({ where: { id: s.room.id } })).toMatchObject({ status: "WAITING" });
      expect((await h.counts()).quotas).toBe(0);
    });
  }
  it("直播管理员不得代停用主播签发或开播，但可完成下播清理", async () => {
    const h = await setup(), s = await prepareLiveStart(h);
    const pub = new LivePublicationService(service(pg.a), ledger, quota(pg.a));
    const input = { ...s.input, operatorId: h.reviewer, isAdmin: true }, sign = jest.fn(() => ({ synthetic: true }));
    await pg.observer.user.update({ where: { id: h.owner }, data: { status: "DISABLED" } });
    await expect(pg.transaction(pg.a, tx => pub.signInTransaction(tx, input, sign))).rejects.toMatchObject({ status: 403 });
    await expect(pg.transaction(pg.a, tx => pub.startInTransaction(tx, input))).rejects.toMatchObject({ status: 403 });
    expect(sign).not.toHaveBeenCalled();
    expect(await pg.observer.liveRoom.findUnique({ where: { id: s.room.id } })).toMatchObject({ status: "WAITING" });
    await expect(pg.transaction(pg.a, tx => pub.endInTransaction(tx, input))).resolves.toMatchObject({ changed: true });
    expect(await pg.observer.liveRoom.findUnique({ where: { id: s.room.id } })).toMatchObject({ status: "ENDED" });
    expect((await h.counts()).quotas).toBe(0);
  });
  it("签名失败回滚额度；结束已签发的预告后禁止再次签发", async () => {
    const h = await setup(); await h.open("LIVE"); const s = await prepareLiveStart(h);
    const publish = new LivePublicationService(service(pg.a), ledger, quota(pg.a));
    await expect(pg.transaction(pg.a, tx => publish.signInTransaction(tx, s.input, () => { throw new Error("SYNTHETIC_SIGN_FAILURE"); })))
      .rejects.toThrow("SYNTHETIC_SIGN_FAILURE");
    expect((await h.counts()).quotas).toBe(0);
    await pg.transaction(pg.a, tx => publish.signInTransaction(tx, s.input, room => room.id));
    await pg.transaction(pg.a, tx => publish.endInTransaction(tx, s.input));
    const sign = jest.fn();
    await expect(pg.transaction(pg.a, tx => publish.signInTransaction(tx, s.input, sign))).rejects.toMatchObject({ status: 403 });
    expect(sign).not.toHaveBeenCalled();
    expect(await ledger.byBusiness(pg.observer, "LIVE_SESSION", s.room.id)).toMatchObject({ state: "ACTIVE" });
  });
  it("RTC 获批嘉宾复用主播额度，移除麦位后不再签发", async () => {
    const h = await setup(); await h.open("LIVE"); const s = await prepareLiveStart(h); await s.start();
    const mic = await pg.observer.liveMic.create({ data: { liveRoomId: s.room.id, userId: h.guest, position: 1, status: "OCCUPIED", mediaMode: "VIDEO" } });
    const pub = new LivePublicationService(service(pg.a), ledger, quota(pg.a));
    const sign = jest.fn((room, seat) => ({ roomId: room.id, mediaMode: seat.mediaMode }));
    const read = () => pg.transaction(pg.a, tx => pub.rtcInTransaction(tx, { roomId: s.room.id, userId: h.guest, executor: "HUMAN" }, sign));
    expect(await read()).toEqual({ roomId: s.room.id, mediaMode: "VIDEO" });
    expect((await h.counts()).quotas).toBe(1);
    await pg.observer.liveMic.delete({ where: { id: mic.id } }); sign.mockClear();
    await expect(read()).rejects.toMatchObject({ status: 403 }); expect(sign).not.toHaveBeenCalled();
  });
  it("主播撤权后本人和已批准嘉宾均不得续领 RTC 发流票据", async () => {
    const h = await setup(); const grant = await h.open("LIVE"); const s = await prepareLiveStart(h); await s.start();
    await pg.observer.liveMic.create({ data: { liveRoomId: s.room.id, userId: h.guest, position: 1, status: "OCCUPIED" } });
    await service(pg.a).review(grant.id, human(h.reviewer), { action: "REVOKE", expectedRevision: grant.revision, reason: "合成 RTC 撤权" });
    const pub = new LivePublicationService(service(pg.a), ledger, quota(pg.a)), sign = jest.fn();
    for (const userId of [h.owner, h.guest]) {
      await expect(pg.transaction(pg.a, tx => pub.rtcInTransaction(tx, { roomId: s.room.id, userId, executor: "HUMAN" }, sign)))
        .rejects.toMatchObject({ status: 403 });
    }
    expect(sign).not.toHaveBeenCalled();
    expect(await ledger.byBusiness(pg.observer, "LIVE_SESSION", s.room.id)).toMatchObject({ state: "ACTIVE" });
  });
  it("RTC 禁止自动化签发且结束后的房间不能续领", async () => {
    const h = await setup(); await h.open("LIVE"); const s = await prepareLiveStart(h); await s.start();
    const pub = new LivePublicationService(service(pg.a), ledger, quota(pg.a)), sign = jest.fn();
    await expect(pg.transaction(pg.a, tx => pub.rtcInTransaction(tx, { roomId: s.room.id, userId: h.owner, executor: "AUTOMATION" }, sign)))
      .rejects.toMatchObject({ status: 403 });
    await pg.transaction(pg.a, tx => pub.endInTransaction(tx, s.input));
    await expect(pg.transaction(pg.a, tx => pub.rtcInTransaction(tx, { roomId: s.room.id, userId: h.owner, executor: "HUMAN" }, sign)))
      .rejects.toThrow("直播未开始或已结束");
    expect(sign).not.toHaveBeenCalled();
  });
  it.each(["DISABLED", "MIC_REMOVED"])("RTC 签发等待真实行锁后读取最新 %s，不采用查询前的旧资格", async change => {
    const h = await setup(); await h.open("LIVE"); const s = await prepareLiveStart(h); await s.start();
    const mic = await pg.observer.liveMic.create({ data: { liveRoomId: s.room.id, userId: h.guest, position: 1, status: "OCCUPIED" } });
    const pub = new LivePublicationService(service(pg.a), ledger, quota(pg.a)), sign = jest.fn();
    const result = await blockedChange(tx => change === "DISABLED"
      ? tx.user.update({ where: { id: h.guest }, data: { status: "DISABLED" } })
      : tx.liveMic.delete({ where: { id: mic.id } }), () => pg.transaction(pg.a, tx =>
        pub.rtcInTransaction(tx, { roomId: s.room.id, userId: h.guest, executor: "HUMAN" }, sign)));
    expect(result).toMatchObject({ ok: false, error: { status: 403 } });
    expect(sign).not.toHaveBeenCalled();
  });
  it("真实开播原子占用 ACTIVE 并切换 LIVING，重复请求不产生第二份额度", async () => {
    const h = await setup(); const grant = await h.open("LIVE"), s = await prepareLiveStart(h);
    expect(await s.start()).toMatchObject({ status: "LIVING" });
    const saved = await ledger.byBusiness(pg.observer, "LIVE_SESSION", s.room.id);
    expect(saved).toMatchObject({ state: "ACTIVE", circleGrantId: grant.id });
    await expect(s.start()).rejects.toMatchObject({ status: 409 });
    expect((await h.counts()).quotas).toBe(1);
  });
  it("两连接并发开播仅一次成功，不重复占用并发或改写开始时间", async () => {
    const h = await setup(); await h.open("LIVE"); const s = await prepareLiveStart(h);
    const results = await Promise.all([capture(s.start(pg.a)), capture(s.start(pg.b))]);
    expect(results.filter(result => result.ok)).toHaveLength(1);
    expect(results.filter(result => !result.ok)).toHaveLength(1);
    expect((await h.counts()).quotas).toBe(1);
  });
  it("创建后撤权，开播时必须重新拒绝且仍 WAITING、额度为零", async () => {
    const h = await setup(); const grant = await h.open("LIVE"), s = await prepareLiveStart(h);
    await service(pg.a).review(grant.id, human(h.reviewer), { action: "REVOKE", expectedRevision: grant.revision, reason: "合成开播前撤权" });
    await expect(s.start()).rejects.toMatchObject({ status: 403 });
    expect(await pg.observer.liveRoom.findUnique({ where: { id: s.room.id } })).toMatchObject({ status: "WAITING", startTime: null });
    expect((await h.counts()).quotas).toBe(0);
  });
  it("真实开播房间写入失败时 ACTIVE 额度与回执全部回滚", async () => {
    const h = await setup(); await h.open("LIVE"); const s = await prepareLiveStart(h);
    await pg.observer.$executeRawUnsafe(`ALTER TABLE "LiveRoom" ADD CONSTRAINT "local_live_start_failure" CHECK ("id" <> '${s.room.id}' OR "status" <> 'LIVING')`);
    try {
      await expect(s.start()).rejects.toThrow();
      expect((await h.counts()).quotas).toBe(0);
      expect(await pg.observer.liveRoom.findUnique({ where: { id: s.room.id } })).toMatchObject({ status: "WAITING" });
    } finally { await pg.observer.$executeRaw`ALTER TABLE "LiveRoom" DROP CONSTRAINT "local_live_start_failure"`; }
  });
  it("直授 MEMBER 实际开播只占个人授权，不要求圈级额度", async () => {
    const h = await setup(); await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { role: "MEMBER" } });
    await pg.observer.post.updateMany({ where: { circleId: h.circle }, data: { status: "HIDDEN" } });
    const grant = await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("LIVE", h.guest));
    const s = await prepareLiveStart(h, h.guest); await s.start();
    expect(await ledger.byBusiness(pg.observer, "LIVE_SESSION", s.room.id)).toMatchObject({ state: "ACTIVE", circleGrantId: null, providerGrantId: grant.id });
  });
  it("直播并发额度用完后第三场保持 WAITING，不超额占位", async () => {
    const h = await setup(); await h.open("LIVE");
    const first = await prepareLiveStart(h), second = await prepareLiveStart(h), third = await prepareLiveStart(h);
    await first.start(); await second.start();
    await expect(third.start()).rejects.toMatchObject({ status: 403 });
    expect((await h.counts()).quotas).toBe(2);
    expect(await pg.observer.liveRoom.findUnique({ where: { id: third.room.id } })).toMatchObject({ status: "WAITING", startTime: null });
  });
  it("已撤权主播仍能结束业务；未取得停流证据时保留 ACTIVE", async () => {
    const h = await setup(); const grant = await h.open("LIVE"), s = await prepareLiveStart(h); await s.start();
    await service(pg.a).review(grant.id, human(h.reviewer), { action: "REVOKE", expectedRevision: grant.revision, reason: "开播后撤权" });
    const end = () => pg.transaction(pg.a, tx => new LivePublicationService(service(pg.a), ledger, quota(pg.a)).endInTransaction(tx,
      { roomId: s.room.id, operatorId: h.owner, isAdmin: false, executor: "HUMAN" }));
    const first = await end(), second = await end();
    expect(first).toMatchObject({ changed: true, room: { status: "ENDED" } });
    expect(second).toMatchObject({ changed: false, room: { status: "ENDED", endTime: first.room.endTime } });
    expect(await ledger.byBusiness(pg.observer, "LIVE_SESSION", s.room.id)).toMatchObject({ state: "ACTIVE" });
  });
  it("其他用户不能结束别人的真实直播", async () => {
    const h = await setup(); await h.open("LIVE"); const s = await prepareLiveStart(h); await s.start();
    await expect(pg.transaction(pg.a, tx => new LivePublicationService(service(pg.a), ledger, quota(pg.a)).endInTransaction(tx,
      { roomId: s.room.id, operatorId: h.outsider, isAdmin: false, executor: "HUMAN" }))).rejects.toMatchObject({ status: 403 });
    expect(await pg.observer.liveRoom.findUnique({ where: { id: s.room.id } })).toMatchObject({ status: "LIVING", endTime: null });
  });
  function videoService(client: PrismaClient) {
    const audit = new AuditService(client as never, {} as never, {} as never, {} as never, {} as never);
    jest.spyOn(audit, "resolveContentVisibility").mockResolvedValue({ visibility: "CIRCLE_ONLY", auditStatus: "PENDING" } as never);
    const queue = jest.spyOn(audit, "queueContentModeration").mockImplementation(() => undefined);
    return { queue, videos: new VideoService(client as never, {} as never, audit,
      new VideoPublicationTransactionService(quota(client), ledger)) };
  }
  for (const kind of ["LIVE", "VIDEO"] as const) {
    it(`管理员创建 ${kind}：当前角色允许发布，并发撤权后禁止旧快照创建`, async () => {
      const h = await setup(), live = liveService(pg.a), video = videoService(pg.a);
      const create = () => kind === "LIVE"
        ? live.lives.createRoom(h.reviewer, { circleId: h.circle, title: "合成管理员预告" }, true)
        : video.videos.create(h.reviewer, { circleId: h.circle, videoUrl: "https://example.invalid/local.mp4" }, true);
      await create();
      const count = () => kind === "LIVE" ? pg.observer.liveRoom.count({ where: { circleId: h.circle } })
        : pg.observer.video.count({ where: { circleId: h.circle } });
      expect(await count()).toBe(1);
      live.queue.mockClear(); video.queue.mockClear();
      const result = await blockedChange(tx => tx.userRole.delete({ where: { id: h.adminRole.id } }), create);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatchObject({ status: 403 });
      expect(await count()).toBe(1);
      expect(live.queue).not.toHaveBeenCalled(); expect(video.queue).not.toHaveBeenCalled();
      expect((await h.counts()).quotas).toBe(0);
    });
  }
  it("真实短视频创建接入圈级授权：视频、台账、额度和三张回执一起提交", async () => {
    const h = await setup(); const grant = await h.open("SHORT_VIDEO"), v = videoService(pg.a);
    const created = await v.videos.create(h.owner, { circleId: h.circle, videoUrl: "https://example.invalid/local.mp4" });
    expect(await pg.observer.contentAuditRecord.count({ where: { contentId: created.id } })).toBe(1);
    const saved = await ledger.byBusiness(pg.observer, "SHORT_VIDEO_PUBLISH", created.id);
    expect(saved).toMatchObject({ state: "COMPLETED", circleGrantId: grant.id, providerGrantId: null,
      binding: { actorId: h.owner, circleId: h.circle, businessId: created.id } });
    const receipts = await pg.observer.$queryRaw<Array<{ action: string }>>`SELECT action FROM "CircleCapabilityQuotaReceipt" WHERE "reservationId"=${saved!.id}`;
    expect(receipts.map(r => r.action).sort()).toEqual(["ACTIVATE", "COMPLETE", "RESERVE"]);
    expect(v.queue).toHaveBeenCalledTimes(1);
  });
  it("撤权后真实短视频创建拒绝，视频和额度均零新增", async () => {
    const h = await setup(); const grant = await h.open("SHORT_VIDEO"), v = videoService(pg.a);
    await service(pg.a).review(grant.id, human(h.reviewer), { action: "REVOKE", expectedRevision: grant.revision, reason: "合成撤权" });
    expect(await service(pg.a).getPublishUseStatus(h.circle, human(h.owner), "SHORT_VIDEO")).toMatchObject({ canPublish: false });
    await expect(v.videos.create(h.owner, { circleId: h.circle, videoUrl: "https://example.invalid/local.mp4" })).rejects.toMatchObject({ status: 403 });
    expect(await pg.observer.video.count({ where: { circleId: h.circle } })).toBe(0);
    expect((await h.counts()).quotas).toBe(0); expect(v.queue).not.toHaveBeenCalled();
  });
  it("个人直授允许普通成员投稿并只消耗个人额度，不要求圈级申请通过", async () => {
    const h = await setup();
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { role: "MEMBER" } });
    await pg.observer.post.updateMany({ where: { circleId: h.circle }, data: { status: "HIDDEN" } });
    const grant = await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("SHORT_VIDEO", h.guest));
    const countsBefore = await h.counts();
    expect(await service(pg.a).getPublishUseStatus(h.circle, human(h.guest), "SHORT_VIDEO")).toEqual({ circleId: h.circle, capability: "SHORT_VIDEO", canPublish: true });
    expect(await h.counts()).toEqual(countsBefore);
    const v = videoService(pg.a), created = await v.videos.create(h.guest, { circleId: h.circle, videoUrl: "https://example.invalid/local.mp4" });
    expect(await ledger.byBusiness(pg.observer, "SHORT_VIDEO_PUBLISH", created.id)).toMatchObject({ state: "COMPLETED", circleGrantId: null, providerGrantId: grant.id });
  });
  it("真实审核记录写入失败时，视频、额度与回执全部回滚，不调度机审", async () => {
    const h = await setup(); await h.open("SHORT_VIDEO"); const v = videoService(pg.a);
    await pg.observer.$executeRawUnsafe(`ALTER TABLE "ContentAuditRecord" ADD CONSTRAINT "local_video_quota_audit_failure" CHECK ("submitterId" <> '${h.owner}')`);
    try {
      await expect(v.videos.create(h.owner, { circleId: h.circle, videoUrl: "https://example.invalid/local.mp4" })).rejects.toThrow();
      expect(await pg.observer.video.count({ where: { circleId: h.circle } })).toBe(0);
      expect((await h.counts()).quotas).toBe(0);
      expect(v.queue).not.toHaveBeenCalled();
    } finally { await pg.observer.$executeRaw`ALTER TABLE "ContentAuditRecord" DROP CONSTRAINT "local_video_quota_audit_failure"`; }
  });
  const directBinding = (h: Awaited<ReturnType<typeof setup>>, cap: CircleCapability) => ({ ...h.binding(cap),
    actorId: cap.includes("QUESTION") ? h.consumer : h.guest, subjectUserId: h.guest });
  it.each(CIRCLE_CAPABILITIES)("平台个人直授 %s 不依赖圈子门槛、圈级开通或成员头衔，单独记账", async cap => {
    const h = await setup();
    await pg.observer.post.updateMany({ where: { circleId: h.circle }, data: { status: "HIDDEN" } });
    await pg.observer.user.update({ where: { id: h.owner }, data: { identityLevel: "NONE" }, select: { id: true } });
    await pg.observer.circle.update({ where: { id: h.circle }, data: { createdAt: new Date() }, select: { id: true } });
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { role: "MEMBER" }, select: { id: true } });
    await expect(h.apply(cap)).rejects.toMatchObject({ status: 403 });
    await mutatePolicy(p => { for (const rule of Object.values(p.rules)) rule.enabled = false; });
    const grant = await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto(cap, h.guest));
    expect(grant).toMatchObject({ source: "PLATFORM_DIRECT", state: "APPROVED", enabled: true, maxUnits: 500, maxConcurrent: 20 });
    const binding = directBinding(h, cap);
    const held = await pg.transaction(pg.a, tx => quota(pg.a).reserveInTransaction(tx, binding, human(binding.actorId)));
    expect(held.reservation).toMatchObject({ circleGrantId: null, circleGrantRevision: null, providerGrantId: grant.id });
    expect(await ledger.usage(pg.observer, [grant.id], new Date())).toEqual([{ grantId: grant.id, committed: 0, held: 1, active: 0 }]);
    const active = await pg.transaction(pg.a, tx => quota(pg.a).activateInTransaction(tx, { reservationId: held.reservation.id, binding,
      expectedRevision: 1, operationKey: randomUUID() }, human(binding.actorId)));
    expect(active.reservation.state).toBe("ACTIVE");
    expect((await service(pg.a).listOwn(h.circle, human(h.guest), { page: 1, pageSize: 20 })).items[0].source).toBe("PLATFORM_DIRECT");
    // 不连带给其他成员开通，也不能借其身份发布。
    const other = { ...binding, actorId: h.consumer, subjectUserId: h.consumer, businessId: randomUUID(), requestKey: randomUUID() };
    await expect(pg.transaction(pg.a, tx => quota(pg.a).reserveInTransaction(tx, other, human(h.consumer)))).rejects.toMatchObject({ status: 403 });
  });
  it.each(["LIVE", "SHORT_VIDEO"] as const)("圈主平台直授 %s 也不读取圈子申请配置", async cap => {
    const h = await setup();
    await pg.observer.configSystem.update({ where: { configKey: CIRCLE_CAPABILITY_CONFIG_KEY }, data: { configValue: "invalid" }, select: { id: true } });
    const grant = await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto(cap));
    expect((await h.reserve(cap)).reservation.circleGrantId).toBe(grant.id);
  });
  it.each(["ordinary", "bound", "disabled", "automation"])("%s 不能借平台直授扩大权限", async mode => {
    const h = await setup(); let actor = human(mode === "ordinary" ? h.consumer : h.reviewer) as { userId: string; executor: "HUMAN" | "AUTOMATION" };
    if (mode === "bound") await pg.observer.userRole.update({ where: { id: h.adminRole.id }, data: { bindId: h.circle }, select: { id: true } });
    if (mode === "disabled") await pg.observer.user.update({ where: { id: h.reviewer }, data: { status: "DISABLED" }, select: { id: true } });
    if (mode === "automation") actor = { ...actor, executor: "AUTOMATION" };
    await expect(service(pg.a).directGrant(h.circle, actor, directDto("LIVE", h.guest))).rejects.toMatchObject({ status: 403 });
    expect(await h.counts()).toEqual({ grants: 0, audits: 0, quotas: 0 });
  });
  it("管理员不能给自己或自己的圈子自授，需另一平台管理员留痕", async () => {
    const h = await setup(); await pg.observer.userRole.create({ data: { userId: h.owner, roleType: "SUPER_ADMIN", bindId: null }, select: { id: true } });
    await expect(service(pg.a).directGrant(h.circle, human(h.owner), directDto("LIVE"))).rejects.toMatchObject({ status: 403 });
  });
  it("并发重复直授只有一次生效，同一范围不能隐式重置额度", async () => {
    const h = await setup(), dto = directDto("VIDEO_QUESTION", h.guest);
    const result = await competing(h.circle, () => service(pg.a).directGrant(h.circle, human(h.reviewer), dto), () => service(pg.b).directGrant(h.circle, human(h.reviewer), dto));
    expect(result.filter(r => r.ok)).toHaveLength(1); expect(result.find(r => !r.ok)).toMatchObject({ ok: false, error: { status: 409 } });
    expect(await h.counts()).toEqual({ grants: 1, audits: 1, quotas: 0 });
  });
  it("明确最新记录后可把普通待审转为独立直授，旧记录保留撤销审计", async () => {
    const h = await setup(), pending = await h.apply();
    await expect(service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("LIVE"))).rejects.toMatchObject({ status: 409 });
    const grant = await service(pg.a).directGrant(h.circle, human(h.reviewer), { ...directDto("LIVE"), expectedLatestId: pending.id, expectedLatestRevision: 1 });
    expect((await grants.byId(pg.observer, pending.id))?.state).toBe("REVOKED");
    expect(grant.sequence).toBe(2); expect(await h.counts()).toEqual({ grants: 2, audits: 3, quotas: 0 });
  });
  it("直授替代时审计失败，旧授权、新授权和审计全部回滚", async () => {
    const h = await setup(), pending = await h.apply(), failing = new CircleCapabilityRepository();
    failing.audit = async (...args) => { await grants.audit(...args); if (args[2] === "DIRECT_GRANT") await args[0].$executeRaw`SELECT 1/0`; };
    await expect(service(pg.a, failing).directGrant(h.circle, human(h.reviewer), { ...directDto("LIVE"), expectedLatestId: pending.id, expectedLatestRevision: 1 })).rejects.toThrow();
    expect((await grants.byId(pg.observer, pending.id))?.state).toBe("PENDING"); expect(await h.counts()).toEqual({ grants: 1, audits: 1, quotas: 0 });
  });
  it("直授角色撤销先提交，排队直授不能使用旧角色", async () => {
    const h = await setup(); const result = await blockedChange(tx => tx.userRole.delete({ where: { id: h.adminRole.id }, select: { id: true } }),
      () => service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("LIVE", h.guest)));
    expect(result).toMatchObject({ ok: false, error: { status: 403 } }); expect((await h.counts()).grants).toBe(0);
  });
  it("直授撤销后阻止预留激活，但不阻断未开始业务的额度释放", async () => {
    const h = await setup(), grant = await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("AUDIO_QUESTION", h.guest));
    const binding = directBinding(h, "AUDIO_QUESTION"), held = await pg.transaction(pg.a, tx => quota(pg.a).reserveInTransaction(tx, binding, human(h.consumer)));
    const revoked = await service(pg.a).review(grant.id, human(h.reviewer), { action: "REVOKE", expectedRevision: 1, reason: "战略授权结束" });
    expect(revoked.state).toBe("REVOKED");
    const input = { reservationId: held.reservation.id, binding, expectedRevision: 1, operationKey: randomUUID() };
    await expect(pg.transaction(pg.a, tx => quota(pg.a).activateInTransaction(tx, input, human(h.consumer)))).rejects.toMatchObject({ status: 403 });
    expect((await pg.transaction(pg.a, tx => quota(pg.a).settleInTransaction(tx, { ...input, action: "RELEASE", evidenceRef: "local:revoked-before-start" }))).reservation.state).toBe("RELEASED");
  });
  it("个人直授期限与独立额度仍受控，暂停恢复需本人开启", async () => {
    const h = await setup(), grant = await service(pg.a).directGrant(h.circle, human(h.reviewer), { ...directDto("LIVE", h.guest), maxUnits: 1, maxConcurrent: 1 });
    const binding = directBinding(h, "LIVE");
    await pg.transaction(pg.a, tx => quota(pg.a).reserveInTransaction(tx, binding, human(h.guest)));
    await expect(pg.transaction(pg.a, tx => quota(pg.a).reserveInTransaction(tx, { ...binding, businessId: randomUUID(), requestKey: randomUUID() }, human(h.guest)))).rejects.toMatchObject({ status: 403 });
    const suspended = await service(pg.a).review(grant.id, human(h.reviewer), { action: "SUSPEND", expectedRevision: 1, reason: "临时暂停" });
    const resumed = await service(pg.a).review(grant.id, human(h.reviewer), { action: "RESUME", expectedRevision: suspended.revision, reason: "恢复资格" });
    expect(resumed.enabled).toBe(false);
    const enabled = await h.enable(grant.id, resumed.revision, h.guest); expect(enabled.enabled).toBe(true);
    await pg.observer.$executeRaw`UPDATE "CircleCapabilityGrant" SET "expiresAt"='2020-01-01'::timestamp WHERE id=${grant.id}`;
    await expect(pg.transaction(pg.a, tx => quota(pg.a).reserveInTransaction(tx, { ...binding, businessId: randomUUID(), requestKey: randomUUID() }, human(h.guest)))).rejects.toMatchObject({ status: 403 });
  });
  it.each(["user", "circle", "membership"])("平台直授不绕过 %s 安全隔离", async mode => {
    const h = await setup(); await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("SHORT_VIDEO", h.guest));
    if (mode === "user") await pg.observer.user.update({ where: { id: h.guest }, data: { status: "DISABLED" }, select: { id: true } });
    if (mode === "circle") await pg.observer.circle.update({ where: { id: h.circle }, data: { status: "DISABLED" }, select: { id: true } });
    if (mode === "membership") await pg.observer.circleMember.delete({ where: { id: h.guestMember.id }, select: { id: true } });
    const binding = directBinding(h, "SHORT_VIDEO");
    await expect(pg.transaction(pg.a, tx => quota(pg.a).reserveInTransaction(tx, binding, human(h.guest)))).rejects.toMatchObject({ status: 403 });
  });
  it("角色和主体不能互相冒充：普通人不能申请、圈主不能代嘉宾启用", async () => {
    const h = await setup(); await h.open("AUDIO_QUESTION");
    await expect(service(pg.a).apply(h.circle, human(h.consumer), { capability: "AUDIO_QUESTION", reason: "越权" })).rejects.toMatchObject({ status: 403 });
    const pending = await h.apply("AUDIO_QUESTION", pg.a, h.guest), approved = await h.approve(pending.id, pending.revision);
    await expect(h.enable(approved.id, approved.revision)).rejects.toMatchObject({ status: 403 });
    expect((await h.enable(approved.id, approved.revision, h.guest)).enabled).toBe(true);
  });
  it("平台角色绑定业务范围不等于全平台审核权，拥有平台角色的圈主也不能自审批", async () => {
    const h = await setup(); const pending = await h.apply();
    await pg.observer.userRole.update({ where: { id: h.adminRole.id }, data: { bindId: h.circle }, select: { id: true } });
    await expect(h.approve(pending.id, 1)).rejects.toMatchObject({ status: 403 });
    await pg.observer.userRole.create({ data: { userId: h.owner, roleType: "SUPER_ADMIN", bindId: null }, select: { id: true } });
    await expect(service(pg.a).review(pending.id, human(h.owner), { action: "APPROVE", expectedRevision: 1, reason: "本人审批",
      expiresAt: new Date(Date.now() + 3600000).toISOString(), maxUnits: 1, maxConcurrent: 1 })).rejects.toMatchObject({ status: 403 });
    expect(await h.counts()).toEqual({ grants: 1, audits: 1, quotas: 0 });
  });
  it("真实帖子状态影响资格，隐藏内容不以冗余计数补足", async () => {
    const h = await setup(); await pg.observer.post.updateMany({ where: { circleId: h.circle }, data: { status: "HIDDEN" } });
    await pg.observer.circle.update({ where: { id: h.circle }, data: { postCount: 9999, memberCount: 9999 }, select: { id: true } });
    const result = await service(pg.a).getEligibility(h.circle, human(h.owner), "LIVE");
    expect(result.eligibility.eligible).toBe(false); expect(result.eligibility.progress.find(p => p.key === "publishedPosts")?.current).toBe(0);
    await expect(h.apply()).rejects.toMatchObject({ status: 403 }); expect(await h.counts()).toEqual({ grants: 0, audits: 0, quotas: 0 });
  });
  it("同圈两次申请仅一条成功，另一条冲突，不产生第二份待审或审计", async () => {
    const h = await setup(); const results = await competing(h.circle, () => h.apply("LIVE", pg.a), () => h.apply("LIVE", pg.b));
    expect(results.filter(r => r.ok)).toHaveLength(1); expect(results.find(r => !r.ok)).toMatchObject({ ok: false, error: { status: 409 } });
    expect(await h.counts()).toEqual({ grants: 1, audits: 1, quotas: 0 });
  });
  it("同一待审版本竞争审批，仅一个 CAS 与对应审计提交", async () => {
    const h = await setup(), pending = await h.apply();
    const results = await competing(h.circle, () => h.approve(pending.id, 1, pg.a), () => h.approve(pending.id, 1, pg.b));
    expect(results.filter(r => r.ok)).toHaveLength(1); expect(results.find(r => !r.ok)).toMatchObject({ ok: false, error: { status: 409 } });
    expect(await h.counts()).toEqual({ grants: 1, audits: 2, quotas: 0 });
  });
  it("审计写入后再发生真实 SQL 错误，申请与审计同时回滚", async () => {
    const h = await setup(); const failing = new CircleCapabilityRepository();
    failing.audit = async (...args) => { await grants.audit(...args); await args[0].$executeRaw`SELECT 1 / 0`; };
    await expect(service(pg.a, failing).apply(h.circle, human(h.owner), { capability: "LIVE", reason: "本地回滚演练" })).rejects.toThrow();
    expect(await h.counts()).toEqual({ grants: 0, audits: 0, quotas: 0 }); expect((await h.apply()).state).toBe("PENDING");
  });
  it.each(["disable", "revision"])("策略 %s 后旧授权不能创建新额度", async kind => {
    const h = await setup(); await h.open(); await mutatePolicy(p => { if (kind === "disable") p.rules.LIVE.enabled = false; else p.rules.LIVE.revision++; });
    await expect(h.reserve()).rejects.toMatchObject({ status: 403 }); expect((await h.counts()).quotas).toBe(0);
  });
  it("配置损坏时禁止新增，但保留本人停用和平台撤销", async () => {
    const h = await setup(), grant = await h.open();
    await pg.observer.configSystem.update({ where: { configKey: CIRCLE_CAPABILITY_CONFIG_KEY }, data: { configValue: "invalid" }, select: { id: true } });
    const disabled = await service(pg.a).setEnabled(grant.id, human(h.owner), { enabled: false, expectedRevision: grant.revision, reason: "安全关闭" });
    const revoked = await service(pg.a).review(grant.id, human(h.reviewer), { action: "REVOKE", expectedRevision: disabled.revision, reason: "安全撤销" });
    expect(revoked.state).toBe("REVOKED"); await expect(h.reserve()).rejects.toMatchObject({ status: 403 });
  });
  it("账号停用先持行锁，排队审批等待提交后读取停用状态并拒绝", async () => {
    const h = await setup(), pending = await h.apply();
    const result = await blockedChange(tx => tx.user.update({ where: { id: h.owner }, data: { status: "DISABLED" }, select: { id: true } }), () => h.approve(pending.id, 1));
    expect(result).toMatchObject({ ok: false, error: { status: 403 } }); expect((await h.counts()).audits).toBe(1);
  });
  it("审核角色撤销先提交，排队审批不能使用旧角色缓存", async () => {
    const h = await setup(), pending = await h.apply();
    const result = await blockedChange(tx => tx.userRole.delete({ where: { id: h.adminRole.id }, select: { id: true } }), () => h.approve(pending.id, 1));
    expect(result).toMatchObject({ ok: false, error: { status: 403 } }); expect((await h.counts()).audits).toBe(1);
  });
  it("成员移除先提交，已有预留不能开始；可信释放仍可收尾", async () => {
    const h = await setup(); await h.open("VIDEO_QUESTION"); await h.open("VIDEO_QUESTION", h.guest); const held = (await h.reserve("VIDEO_QUESTION")).reservation;
    const input = { reservationId: held.id, binding: held.binding, expectedRevision: held.revision, operationKey: randomUUID() };
    const result = await blockedChange(tx => tx.circleMember.delete({ where: { id: h.guestMember.id }, select: { id: true } }),
      () => pg.transaction(pg.a, tx => quota(pg.a).activateInTransaction(tx, input, human(h.consumer))));
    expect(result).toMatchObject({ ok: false, error: { status: 403 } });
    const end = await pg.transaction(pg.a, tx => quota(pg.a).settleInTransaction(tx, { ...input, operationKey: randomUUID(), action: "RELEASE", evidenceRef: "local:never-started" }));
    expect(end.reservation.state).toBe("RELEASED");
  });
  it("更换圈主使原授权失效，不能借旧 OWNER 成员记录继续新增", async () => {
    const h = await setup(); await h.open(); await pg.observer.circle.update({ where: { id: h.circle }, data: { ownerId: h.consumer }, select: { id: true } });
    await expect(h.reserve()).rejects.toMatchObject({ status: 403 });
  });
  it("缺失角色在取锁后新插入仍不能扩大本次审批权限", async () => {
    const h = await setup(), pending = await h.apply(); await pg.observer.userRole.delete({ where: { id: h.adminRole.id }, select: { id: true } });
    const paused = new CircleCapabilityRepository(), ready = localGate(), resume = localGate();
    paused.lockPeople = async (...args) => { const locked = await grants.lockPeople(...args); ready.release(); await resume.promise; return locked; };
    const action = capture(service(pg.a, paused).review(pending.id, human(h.reviewer), { action: "REJECT", expectedRevision: 1, reason: "缺行锁检验" }));
    await Promise.race([ready.promise, action.then(result => { if (!result.ok) throw result.error; })]);
    try { await pg.b.userRole.create({ data: { userId: h.reviewer, roleType: "OPERATION_ADMIN", bindId: null }, select: { id: true } }); }
    finally { resume.release(); }
    expect(await action).toMatchObject({ ok: false, error: { status: 403 } }); expect((await h.counts()).audits).toBe(1);
  });
  it("自动化不能通过直接调用内部申请、审批、启用绕过 HTTP 红线", async () => {
    const h = await setup(); const pending = await h.apply();
    await expect(service(pg.a).apply(h.circle, { userId: h.owner, executor: "AUTOMATION" }, { capability: "SHORT_VIDEO", reason: "自动申请" })).rejects.toMatchObject({ status: 403 });
    await expect(service(pg.a).review(pending.id, { userId: h.reviewer, executor: "AUTOMATION" }, { action: "REJECT", expectedRevision: 1, reason: "自动审批" })).rejects.toMatchObject({ status: 403 });
    await expect(service(pg.a).setEnabled(pending.id, { userId: h.owner, executor: "AUTOMATION" }, { enabled: true, expectedRevision: 1, reason: "自动启用" })).rejects.toMatchObject({ status: 403 });
    expect(await h.counts()).toEqual({ grants: 1, audits: 1, quotas: 0 });
  });

  const noMoney = () => ({ spend: jest.fn().mockRejectedValue(new Error("LOCAL_REAL_MONEY_FORBIDDEN")), refund: jest.fn().mockRejectedValue(new Error("LOCAL_REAL_MONEY_FORBIDDEN")) });
  const experts = (client = pg.a) => new CircleExpertService(client as PrismaService, { del: async () => 0 } as never, {} as never, new CircleConsultVisibilityService(client as PrismaService), grants, service(client));
  const configDto = (price = 8) => ({ questionPriceCoin: 0, peekPriceCoin: 0, questionTimeoutHours: 72, callPricePerMinuteCoin: price });
  it("存量溢出价格不生成公开入口，本人可修正且服务端拒绝再保存非法价格", async () => {
    const h = await setup();
    await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("AUDIO_QUESTION", h.guest));
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { callPricePerMinuteCoin: 214748365 }, select: { id: true } });
    expect(await experts().listCircleExperts(h.circle)).toEqual([]);
    expect(await experts().getOwnExpertConfig(h.circle, h.guest)).toMatchObject({ callPricePerMinuteCoin: 214748365, audioCallApproved: true });
    await expect(experts().setExpertConfig(h.circle, h.guest, configDto(214748365), human(h.guest))).rejects.toMatchObject({ status: 400 });
    await experts().setExpertConfig(h.circle, h.guest, configDto(214748364), human(h.guest));
    expect(await experts().getExpertConfig(h.circle, h.guest)).toMatchObject({ callPricePerMinuteCoin: 214748364, audioCallEnabled: true });
    await experts().setExpertConfig(h.circle, h.guest, configDto(0), human(h.guest));
    expect(await experts().listCircleExperts(h.circle)).toEqual([]);
  });
  const bookingBody = (circleId: string) => ({ circleId, slotDate: "2099-09-06", slotStart: "09:00", slotEnd: "10:00" });
  async function bookableFixture() {
    const h = await setup();
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { role: "MEMBER", callPricePerMinuteCoin: 8,
      callAvailableHours: [{ start: "09:00", end: "11:00", interval: 60 }] }, select: { id: true } });
    const grant = await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("VIDEO_QUESTION", h.guest));
    return { ...h, grant };
  }
  it("直授普通成员可查时段并预约，撤权后查询及新预约均拒绝但保留已有预约", async () => {
    const h = await bookableFixture();
    expect(await experts().getExpertSlots(h.guest, bookingBody(h.circle).slotDate, h.circle)).toMatchObject({ circleId: h.circle, slots: [{ start: "09:00", end: "10:00", available: true }, { start: "10:00", end: "11:00", available: true }] });
    await experts().createExpertBooking(h.guest, h.consumer, bookingBody(h.circle));
    await service(pg.a).review(h.grant.id, human(h.reviewer), { action: "REVOKE", expectedRevision: 1, reason: "本地预约撤权验证" });
    await expect(experts().getExpertSlots(h.guest, bookingBody(h.circle).slotDate, h.circle)).rejects.toMatchObject({ status: 404 });
    await expect(experts().createExpertBooking(h.guest, h.consumer, { ...bookingBody(h.circle), slotStart: "10:00", slotEnd: "11:00" })).rejects.toMatchObject({ status: 404 });
    expect(await pg.observer.circleExpertBooking.count({ where: { circleId: h.circle } })).toBe(1);
  });
  it("并发预约同一时段仅创建一条，另一条明确冲突", async () => {
    const h = await bookableFixture();
    const results = await Promise.all([capture(experts(pg.a).createExpertBooking(h.guest, h.consumer, bookingBody(h.circle))),
      capture(experts(pg.b).createExpertBooking(h.guest, h.owner, bookingBody(h.circle)))]);
    expect(results.filter(r => r.ok)).toHaveLength(1);
    expect(results.find(r => !r.ok)).toMatchObject({ ok: false, error: { status: 409 } });
    expect(await pg.observer.circleExpertBooking.count({ where: { circleId: h.circle } })).toBe(1);
  });
  it("同一达人多圈授权不替代用户所选圈子，撤权不自动改归属", async () => {
    const h = await bookableFixture(), other = await setup();
    await pg.observer.circleMember.create({ data: { circleId: other.circle, userId: h.guest, role: "MEMBER", callPricePerMinuteCoin: 8,
      callAvailableHours: [{ start: "09:00", end: "11:00", interval: 60 }] }, select: { id: true } });
    await expect(experts().getExpertSlots(h.guest, bookingBody(other.circle).slotDate, other.circle)).rejects.toMatchObject({ status: 404 });
    await expect(experts().createExpertBooking(h.guest, other.consumer, bookingBody(other.circle))).rejects.toMatchObject({ status: 404 });
    await service(pg.a).directGrant(other.circle, human(other.reviewer), directDto("AUDIO_QUESTION", h.guest));
    expect(await experts().getExpertSlots(h.guest, bookingBody(other.circle).slotDate, other.circle)).toMatchObject({ circleId: other.circle });
    await service(pg.a).review(h.grant.id, human(h.reviewer), { action: "REVOKE", expectedRevision: 1, reason: "指定圈子撤权不切其他圈" });
    await expect(experts().createExpertBooking(h.guest, h.consumer, bookingBody(h.circle))).rejects.toMatchObject({ status: 404 });
    const created = await experts().createExpertBooking(h.guest, other.consumer, bookingBody(other.circle));
    expect(created.circleId).toBe(other.circle);
    expect(await pg.observer.circleExpertBooking.count({ where: { circleId: h.circle } })).toBe(0);
  });
  it("预约者成员删除先提交，等待锁后拒绝且不创建预约", async () => {
    const h = await bookableFixture();
    const result = await blockedChange(tx => tx.circleMember.deleteMany({ where: { circleId: h.circle, userId: h.consumer } }),
      () => experts().createExpertBooking(h.guest, h.consumer, bookingBody(h.circle)));
    expect(result).toMatchObject({ ok: false, error: { status: 403 } });
    expect(await pg.observer.circleExpertBooking.count({ where: { circleId: h.circle } })).toBe(0);
  });
  it("外部用户和自动化不能占用预约时段", async () => {
    const h = await bookableFixture();
    await expect(experts().createExpertBooking(h.guest, h.outsider, bookingBody(h.circle))).rejects.toMatchObject({ status: 403 });
    await expect(experts().createExpertBooking(h.guest, h.consumer, bookingBody(h.circle), "AUTOMATION")).rejects.toMatchObject({ status: 403 });
    expect(await pg.observer.circleExpertBooking.count({ where: { circleId: h.circle } })).toBe(0);
  });
  it("零价格的直授普通成员可读本人设置并开价，公开价格只展示已获准类型", async () => {
    const h = await setup();
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { role: "MEMBER" }, select: { id: true } });
    await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("AUDIO_QUESTION", h.guest));
    expect(await experts().getOwnExpertConfig(h.circle, h.guest)).toMatchObject({ callPricePerMinuteCoin: 0, textConfigAllowed: false, audioCallApproved: true, videoCallApproved: false });
    await experts().setExpertConfig(h.circle, h.guest, configDto(), human(h.guest));
    expect(await experts().getExpertConfig(h.circle, h.guest)).toMatchObject({ callPricePerMinuteCoin: 8, audioCallEnabled: true, videoCallEnabled: false, questionPriceCoin: 0 });
    await expect(experts().setExpertConfig(h.circle, h.guest, { ...configDto(), questionPriceCoin: 30 }, human(h.guest))).rejects.toMatchObject({ status: 403 });
  });
  it("未授权或撤权后不可开启连麦，本人仍可读历史价并关闭", async () => {
    const h = await setup();
    await expect(experts().setExpertConfig(h.circle, h.guest, configDto(), human(h.guest))).rejects.toMatchObject({ status: 403 });
    const grant = await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("VIDEO_QUESTION", h.guest));
    await experts().setExpertConfig(h.circle, h.guest, configDto(), human(h.guest));
    await service(pg.a).review(grant.id, human(h.reviewer), { action: "REVOKE", expectedRevision: grant.revision, reason: "LOCAL_ONLY_撤权" });
    expect(await experts().getOwnExpertConfig(h.circle, h.guest)).toMatchObject({ callPricePerMinuteCoin: 8, audioCallApproved: false, videoCallApproved: false });
    expect(await experts().getExpertConfig(h.circle, h.guest)).toMatchObject({ callPricePerMinuteCoin: 0 });
    await expect(experts().setExpertConfig(h.circle, h.guest, configDto(9), human(h.guest))).rejects.toMatchObject({ status: 403 });
    await experts().setExpertConfig(h.circle, h.guest, configDto(0), human(h.guest));
    expect((await pg.observer.circleMember.findUniqueOrThrow({ where: { id: h.guestMember.id } })).callPricePerMinuteCoin).toBe(0);
  });
  it("代配置验证主库平台角色，撤角色后旧登录身份不能改价", async () => {
    const h = await setup();
    await experts().setExpertConfig(h.circle, h.guest, { ...configDto(0), questionPriceCoin: 20 }, human(h.reviewer));
    await pg.observer.userRole.delete({ where: { id: h.adminRole.id }, select: { id: true } });
    await expect(experts().setExpertConfig(h.circle, h.guest, { ...configDto(0), questionPriceCoin: 30 }, human(h.reviewer))).rejects.toMatchObject({ status: 403 });
    await expect(experts().setExpertConfig(h.circle, h.guest, configDto(0), human(h.consumer))).rejects.toMatchObject({ status: 403 });
    expect((await pg.observer.circleMember.findUniqueOrThrow({ where: { id: h.guestMember.id } })).questionPriceCoin).toBe(20);
  });
  it("自动化不能绕过控制器改咨询定价", async () => {
    const h = await setup();
    await expect(experts().setExpertConfig(h.circle, h.guest, configDto(0), { userId: h.reviewer, executor: "AUTOMATION" })).rejects.toMatchObject({ status: 403 });
  });
  it("公开达人列表不凭旧通话价格开放，文字提问保持原准入", async () => {
    const h = await setup();
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { callPricePerMinuteCoin: 8, questionPriceCoin: 20, peekPriceCoin: 2 }, select: { id: true } });
    const rows = await experts().listCircleExperts(h.circle);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: h.guest, questionPriceCoin: 20, peekPriceCoin: 2, callPricePerMinuteCoin: 0, audioCallEnabled: false, videoCallEnabled: false });
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { questionPriceCoin: 0 }, select: { id: true } });
    expect(await experts().listCircleExperts(h.circle)).toEqual([]);
  });
  it("平台直授普通成员显示精确音频服务，撤销立即从圈内和个人列表消失", async () => {
    const h = await setup();
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { role: "MEMBER", callPricePerMinuteCoin: 8, questionPriceCoin: 20 }, select: { id: true } });
    const grant = await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("AUDIO_QUESTION", h.guest));
    for (const rows of [await experts().listCircleExperts(h.circle), await experts().listUserConsultServices(h.guest)]) {
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ callPricePerMinuteCoin: 8, questionPriceCoin: 0, audioCallEnabled: true, videoCallEnabled: false });
      expect(JSON.stringify(rows)).not.toContain("eligibilitySnapshot");
    }
    await service(pg.a).review(grant.id, human(h.reviewer), { action: "REVOKE", expectedRevision: grant.revision, reason: "LOCAL_ONLY_撤销" });
    expect(await experts().listCircleExperts(h.circle)).toEqual([]);
    expect(await experts().listUserConsultServices(h.guest)).toEqual([]);
  });
  it("公开投影只显示获批的视频类型，停用账号后不再展示", async () => {
    const h = await setup();
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { callPricePerMinuteCoin: 8 }, select: { id: true } });
    await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("VIDEO_QUESTION", h.guest));
    expect((await experts().listCircleExperts(h.circle))[0]).toMatchObject({ audioCallEnabled: false, videoCallEnabled: true });
    await pg.observer.user.update({ where: { id: h.guest }, data: { status: "DISABLED" }, select: { id: true } });
    expect(await experts().listCircleExperts(h.circle)).toEqual([]);
  });
  const calls = (client: PrismaClient, coin = noMoney(), revenue: object = { assertConsultReadyInTransaction: jest.fn().mockResolvedValue(undefined) }, redis = {}) => new ConsultCallService(client as PrismaService, redis as never, coin as never, revenue as never, service(client),
    new ConsultCallResourceService(service(client), ledger, quota(client)));
  async function seedWaiting(h: Awaited<ReturnType<typeof setup>>) {
    await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("AUDIO_QUESTION", h.guest));
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { callPricePerMinuteCoin: 8 }, select: { id: true } });
    // 经过真实业务/授权/额度/边界事务；金币与供应商保持替身，不制造历史订单的虚假边界。
    const row = await calls(pg.a, { spend: jest.fn().mockResolvedValue(undefined), refund: jest.fn().mockResolvedValue(undefined) })
      .initiate(h.consumer, { circleId: h.circle, expertId: h.guest, type: "VOICE" });
    return row.id;
  }
  it("新增咨询边界增量迁移在隔离schema执行并完整事务回滚", async () => {
    const migration = readFileSync(path.resolve(__dirname, "../prisma/migrations/manual_add_consult_call_media_boundary/migration.sql"), "utf8");
    await expect(pg.transaction(pg.a, async tx => {
      await tx.$executeRawUnsafe('CREATE SCHEMA consult_boundary_migration_qa');
      await tx.$executeRawUnsafe('SET LOCAL search_path TO consult_boundary_migration_qa');
      await tx.$executeRawUnsafe('CREATE TABLE "ConsultCall" (id TEXT PRIMARY KEY)');
      for (const statement of migration.split(';').filter(part => part.trim())) await tx.$executeRawUnsafe(statement);
      const columns = await tx.$queryRaw<Array<{ column_name: string }>>`SELECT column_name FROM information_schema.columns
        WHERE table_schema='consult_boundary_migration_qa' AND table_name='ConsultCallMediaBoundary' ORDER BY ordinal_position`;
      expect(columns.map(row => row.column_name)).toEqual(["callId", "scope", "expiresAt", "revision"]);
      const stopMigration = readFileSync(path.resolve(__dirname, "../prisma/migrations/manual_add_consult_call_stop_intent/migration.sql"), "utf8");
      for (const statement of stopMigration.split(';').filter(part => part.trim())) await tx.$executeRawUnsafe(statement);
      const stopColumns = await tx.$queryRaw<Array<{ data_type: string; is_nullable: string }>>`SELECT data_type, is_nullable FROM information_schema.columns
        WHERE table_schema='consult_boundary_migration_qa' AND table_name='ConsultCallMediaBoundary' AND column_name='stopIntent'`;
      expect(stopColumns).toEqual([{ data_type: "jsonb", is_nullable: "YES" }]);
      await tx.$executeRawUnsafe('ALTER TABLE "ConsultCall" ADD COLUMN "rtcRoomId" TEXT');
      const evidenceMigration = readFileSync(path.resolve(__dirname, "../prisma/migrations/manual_add_consult_call_media_evidence/migration.sql"), "utf8");
      for (const statement of evidenceMigration.split(';').filter(part => part.trim())) await tx.$executeRawUnsafe(statement);
      const evidenceColumns = await tx.$queryRaw<Array<{ data_type: string }>>`SELECT data_type FROM information_schema.columns
        WHERE table_schema='consult_boundary_migration_qa' AND table_name='ConsultCallMediaBoundary' AND column_name='mediaEvidence'`;
      expect(evidenceColumns).toEqual([{ data_type: "jsonb" }]);
      const indexes = await tx.$queryRaw<Array<{ indexname: string }>>`SELECT indexname FROM pg_indexes
        WHERE schemaname='consult_boundary_migration_qa' AND indexname='ConsultCall_rtcRoomId_idx'`;
      expect(indexes).toHaveLength(1);
      const constraints = await tx.$queryRaw<Array<{ confdeltype: string }>>`SELECT confdeltype::text FROM pg_constraint
        WHERE conrelid='consult_boundary_migration_qa."ConsultCallMediaBoundary"'::regclass AND contype='f'`;
      expect(constraints).toEqual([{ confdeltype: "r" }]);
      throw new Error("LOCAL_MIGRATION_TEST_ROLLBACK");
    })).rejects.toThrow("LOCAL_MIGRATION_TEST_ROLLBACK");
    const rows = await pg.observer.$queryRaw<Array<{ schema: string | null }>>`SELECT to_regnamespace('consult_boundary_migration_qa')::text AS schema`;
    expect(rows).toEqual([{ schema: null }]);
  });
  async function consultResources(circleId: string) {
    const reservations = await pg.observer.$queryRaw<Array<{ state: string; businessId: string }>>`SELECT state, "businessId" FROM "CircleCapabilityQuota"
      WHERE "circleId"=${circleId} AND "businessType" IN ('AUDIO_QUESTION','VIDEO_QUESTION')`;
    const boundaries = await pg.observer.$queryRaw<Array<{ callId: string; scope: { sdkAppId: number; rtcRoomId: string }; expiresAt: Date; revision: number; stopIntent: Record<string, unknown> | null; mediaEvidence: ConsultMediaEvidence | null }>>`
      SELECT b.* FROM "ConsultCallMediaBoundary" b JOIN "ConsultCall" c ON c.id=b."callId" WHERE c."circleId"=${circleId}`;
    return { reservations, boundaries };
  }
  function signedConsultEvent(roomId: string, userId: string, type: number, eventAt: number, sdkAppId = 1, extra = {}) {
    const original = process.env, secret = "SYNTHETIC_LOCAL_CALLBACK_KEY";
    const body = { EventGroupId: type < 200 ? 1 : 2, EventType: type, CallbackTs: Date.now(), EventInfo: {
      RoomId: roomId, UserId: userId, EventMsTs: eventAt, ...extra } };
    const rawBody = Buffer.from(JSON.stringify(body));
    const req = { rawBody, body: {}, headers: { sdkappid: String(sdkAppId), sign: createHmac("sha256", secret).update(rawBody).digest("base64") } };
    try {
      process.env = { ...original, TRTC_CALLBACK_KEY: secret, TRTC_SDK_APP_ID: String(sdkAppId) };
      new TrtcCallbackGuard().canActivate({ switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext);
    } finally { process.env = original; }
    return req;
  }
  it("实际验签到数据库：无UniqueId的退房、乱序进房和重投均正确持久化，不释放额度", async () => {
    const h = await setup(), id = await seedWaiting(h), before = await consultResources(h.circle), room = before.boundaries[0].scope.rtcRoomId;
    const caller = consultTrtcUserId(h.consumer, room), expert = consultTrtcUserId(h.guest, room), now = Date.now();
    const receiver = (client: PrismaClient) => new ConsultMediaEvidenceService(client as PrismaService, ledger);
    const exit = signedConsultEvent(room, caller, 104, now);
    expect(await receiver(pg.a).handle(exit)).toMatchObject({ handled: true, recorded: true, observation: "UNKNOWN" });
    expect(await receiver(pg.b).handle(signedConsultEvent(room, expert, 104, now + 1))).toMatchObject({ observation: "OFFLINE_OBSERVED" });
    expect(await receiver(pg.a).handle(signedConsultEvent(room, caller, 103, now - 1))).toMatchObject({ observation: "OFFLINE_OBSERVED" });
    const after = await consultResources(h.circle);
    expect(await receiver(pg.b).handle(exit)).toMatchObject({ recorded: false, reason: "DUPLICATE" });
    expect(await consultResources(h.circle)).toEqual(after);
    expect(after.boundaries[0].mediaEvidence).toMatchObject({ version: 1, revision: 3, overflow: false });
    expect(after.reservations).toEqual(before.reservations); expect(after.boundaries[0].revision).toBe(before.boundaries[0].revision);
    expect(await receiver(pg.a).handle(signedConsultEvent(room, caller, 103, now + 2))).toMatchObject({ observation: "ACTIVITY_OBSERVED" });
    expect((await pg.observer.consultCall.findUnique({ where: { id } }))?.status).toBe("WAITING");
  });
  it("两连接重投同一事件仅落一次，回调原始私有字段不入库", async () => {
    const h = await setup(), id = await seedWaiting(h), before = await consultResources(h.circle), room = before.boundaries[0].scope.rtcRoomId;
    const req = signedConsultEvent(room, consultTrtcUserId(h.consumer, room), 104, Date.now(), 1, { ClientIpv4: "SYNTHETIC_PRIVATE", sign: "SYNTHETIC_PRIVATE" });
    const outcomes = await Promise.all([pg.a, pg.b].map(client => new ConsultMediaEvidenceService(client as PrismaService, ledger).handle(req)));
    expect(outcomes.filter(row => "recorded" in row && row.recorded)).toHaveLength(1);
    const after = await consultResources(h.circle);
    expect(after.boundaries[0].mediaEvidence?.events).toHaveLength(1); expect(JSON.stringify(after)).not.toContain("SYNTHETIC_PRIVATE");
  });
  it("未验签、错误应用或非参与者的回调都不能写咨询证据", async () => {
    const h = await setup(), id = await seedWaiting(h), before = await consultResources(h.circle), room = before.boundaries[0].scope.rtcRoomId;
    const receiver = new ConsultMediaEvidenceService(pg.a as PrismaService, ledger);
    await expect(receiver.handle({ body: { EventType: 104 } })).rejects.toThrow("尚未通过原文验证");
    expect(await receiver.handle(signedConsultEvent(room, consultTrtcUserId(h.consumer, room), 104, Date.now(), 2))).toMatchObject({ recorded: false, reason: "BOUNDARY_NOT_MATCHED" });
    expect(await receiver.handle(signedConsultEvent(room, `c_${"e".repeat(30)}`, 104, Date.now()))).toMatchObject({ recorded: false, reason: "PARTICIPANT_NOT_MATCHED" });
    expect(await consultResources(h.circle)).toEqual(before);
  });
  const consultDispatcher = (client: PrismaClient, removeOnce: jest.Mock) => new ConsultTrtcStopDispatcher(client as PrismaService,
    new ConsultCallResourceService(service(client), ledger, quota(client)), { removeOnce } as unknown as ConsultTrtcStopClient);
  async function seedStoppedConsult() {
    const h = await setup(), id = await seedWaiting(h);
    await calls(pg.a, { spend: jest.fn(), refund: jest.fn().mockResolvedValue(undefined) }).cancel(h.consumer, id);
    return { h, id };
  }
  it.each(['ABSENT', 'UNKNOWN'])("咨询保护期后最终核验双连接只发一次：%s", async resultState => {
    const oldProof = process.env.CONSULT_TRTC_CLOSURE_ATTESTATION, oldApp = process.env.CONSULT_TRTC_SDK_APP_ID,
      oldRegion = process.env.CONSULT_TRTC_STOP_REGION;
    const { h, id } = await seedStoppedConsult();
    expect(await consultDispatcher(pg.a, jest.fn().mockImplementation(async () => ({ state: "ACKNOWLEDGED", requestId: randomUUID(), receivedAt: new Date().toISOString() }))).dispatch(id, 'ap-beijing'))
      .toMatchObject({ state: 'ACKNOWLEDGED' });
    const boundary = (await consultResources(h.circle)).boundaries[0];
    const future = Date.parse(String(boundary.stopIntent!.protectUntil)) + 1000;
    jest.useFakeTimers({ now: future, doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'hrtime', 'queueMicrotask'] });
    try {
      process.env.CONSULT_TRTC_SDK_APP_ID = String(boundary.scope.sdkAppId); process.env.CONSULT_TRTC_STOP_REGION = 'ap-beijing';
      process.env.CONSULT_TRTC_CLOSURE_ATTESTATION = JSON.stringify({ sdkAppId: boundary.scope.sdkAppId, advancedPermission: true,
        exclusiveIssuer: true, evidenceId: 'a'.repeat(64), verifiedFrom: new Date(future - 86400000).toISOString(), verifiedUntil: new Date(future + 600000).toISOString() });
      const dismissOnce = jest.fn().mockImplementation(async () => resultState === 'ABSENT'
        ? { state: 'ABSENT', requestId: randomUUID(), receivedAt: new Date().toISOString() } : { state: 'UNKNOWN' });
      const dispatch = (client: PrismaClient) => new ConsultTrtcFinalProbeDispatcher(client as PrismaService,
        new ConsultCallResourceService(service(client), ledger, quota(client)), { dismissOnce } as any);
      await Promise.all([dispatch(pg.a).dispatch(id), dispatch(pg.b).dispatch(id)]);
      await dispatch(pg.b).dispatch(id);
      expect(dismissOnce).toHaveBeenCalledTimes(1);
      expect(dismissOnce).toHaveBeenCalledWith({ ...boundary.scope, region: 'ap-beijing' });
      const result = await new ConsultMediaCompletionService(pg.a as PrismaService, ledger, quota(pg.a)).complete(id);
      expect(result.state).toBe(resultState === 'ABSENT' ? 'COMPLETED' : 'PENDING');
      expect((await consultResources(h.circle)).reservations[0].state).toBe(resultState === 'ABSENT' ? 'COMPLETED' : 'ACTIVE');
    } finally {
      jest.useRealTimers();
      if (oldProof === undefined) delete process.env.CONSULT_TRTC_CLOSURE_ATTESTATION; else process.env.CONSULT_TRTC_CLOSURE_ATTESTATION = oldProof;
      if (oldApp === undefined) delete process.env.CONSULT_TRTC_SDK_APP_ID; else process.env.CONSULT_TRTC_SDK_APP_ID = oldApp;
      if (oldRegion === undefined) delete process.env.CONSULT_TRTC_STOP_REGION; else process.env.CONSULT_TRTC_STOP_REGION = oldRegion;
    }
  });
  it.each([false, true])("咨询最终收尾真实事务：并发幂等/写后失败回滚=%s", async failAfterLedger => {
    const oldProof = process.env.CONSULT_TRTC_CLOSURE_ATTESTATION, oldApp = process.env.CONSULT_TRTC_SDK_APP_ID;
    const { h, id } = await seedStoppedConsult();
    expect(await consultDispatcher(pg.a, jest.fn().mockImplementation(async () => ({ state: "ACKNOWLEDGED", requestId: randomUUID(), receivedAt: new Date().toISOString() }))).dispatch(id, "ap-beijing"))
      .toMatchObject({ state: "ACKNOWLEDGED" });
    const boundary = (await consultResources(h.circle)).boundaries[0];
    const future = Date.parse(String(boundary.stopIntent!.protectUntil)) + 1000;
    // 只推进本进程的合成时钟，不更改电脑/云端时间；网络和PG超时仍使用真实计时器。
    jest.useFakeTimers({ now: future, doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'hrtime', 'queueMicrotask'] });
    try {
      process.env.CONSULT_TRTC_SDK_APP_ID = String(boundary.scope.sdkAppId);
      process.env.CONSULT_TRTC_CLOSURE_ATTESTATION = JSON.stringify({ sdkAppId: boundary.scope.sdkAppId, advancedPermission: true,
        exclusiveIssuer: true, evidenceId: "a".repeat(64), verifiedFrom: new Date(future - 86400000).toISOString(), verifiedUntil: new Date(future + 600000).toISOString() });
      const evidence = appendConsultMediaEvent(null, parseConsultMediaEvent({ sdkAppId: boundary.scope.sdkAppId, receivedAt: future,
        bodyDigest: "b".repeat(64), body: { CallbackTs: future, EventGroupId: 1, EventType: 102,
          EventInfo: { RoomId: boundary.scope.rtcRoomId, EventMsTs: future } } })!);
      await pg.observer.$executeRaw`UPDATE "ConsultCallMediaBoundary" SET "mediaEvidence"=${JSON.stringify(evidence)}::jsonb WHERE "callId"=${id}`;
      const complete = (client: PrismaClient, fail: boolean) => {
        const q = quota(client);
        if (fail) {
          const settle = q.settleInTransaction.bind(q);
          q.settleInTransaction = async (...args) => { await settle(...args); throw new Error("LOCAL_COMPLETION_AFTER_LEDGER_FAILURE"); };
        }
        return new ConsultMediaCompletionService(client as PrismaService, ledger, q);
      };
      if (failAfterLedger) {
        await expect(complete(pg.a, true).complete(id)).rejects.toThrow("LOCAL_COMPLETION_AFTER_LEDGER_FAILURE");
        expect((await consultResources(h.circle)).reservations[0].state).toBe("ACTIVE");
        expect((await consultResources(h.circle)).boundaries[0].stopIntent).not.toHaveProperty("completion");
        expect(await ledger.receipt(pg.observer, String(boundary.stopIntent!.operationId))).toBeNull();
      } else {
        const results = await Promise.all([complete(pg.a, false).complete(id), complete(pg.b, false).complete(id)]);
        expect(results).toEqual(expect.arrayContaining([{ state: "COMPLETED", changed: true }, { state: "COMPLETED", changed: false }]));
        expect((await consultResources(h.circle)).reservations[0].state).toBe("COMPLETED");
        expect(await ledger.receipt(pg.observer, String(boundary.stopIntent!.operationId))).toMatchObject({ action: "COMPLETE", source: "BUSINESS_ADAPTER" });
      }
    } finally {
      jest.useRealTimers();
      if (oldProof === undefined) delete process.env.CONSULT_TRTC_CLOSURE_ATTESTATION; else process.env.CONSULT_TRTC_CLOSURE_ATTESTATION = oldProof;
      if (oldApp === undefined) delete process.env.CONSULT_TRTC_SDK_APP_ID; else process.env.CONSULT_TRTC_SDK_APP_ID = oldApp;
    }
  });
  it("咨询重复停流事务复用完整待办，残缺待办触发真实事务回滚", async () => {
    const { h, id } = await seedStoppedConsult();
    const before = await consultResources(h.circle);
    const resources = (client: PrismaClient) => new ConsultCallResourceService(service(client), ledger, quota(client));
    const results = await Promise.all([pg.a, pg.b].map(client => pg.transaction(client, async tx => {
      await resources(client).lockForStopInTransaction(tx, id);
      return resources(client).requestStopInTransaction(tx, id, "CANCEL", h.consumer);
    })));
    expect(results).toEqual([{ tracked: true }, { tracked: true }]);
    expect(await consultResources(h.circle)).toEqual(before);
    // 仅在本地合成库制造历史残缺记录，验证不能被覆盖或当作有效待办继续复用。
    await pg.observer.$executeRaw`UPDATE "ConsultCallMediaBoundary" SET "stopIntent"="stopIntent"-'operationId' WHERE "callId"=${id}`;
    const damaged = await consultResources(h.circle);
    const callBefore = await pg.observer.consultCall.findUnique({ where: { id } });
    await expect(pg.transaction(pg.a, async tx => {
      await resources(pg.a).lockForStopInTransaction(tx, id);
      await tx.consultCall.update({ where: { id }, data: { endAt: new Date(0) } });
      await resources(pg.a).requestStopInTransaction(tx, id, "CANCEL", h.consumer);
    })).rejects.toThrow("咨询资源或授权已变化");
    expect(await pg.observer.consultCall.findUnique({ where: { id } })).toEqual(callBefore);
    expect(await consultResources(h.circle)).toEqual(damaged);
  });
  it("两节点竞争咨询停流只派发一次，网络等待期间数据库可读，ACK不释放额度", async () => {
    const { h, id } = await seedStoppedConsult(), before = await consultResources(h.circle);
    let entered!: () => void, finish!: (value: object) => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const removeOnce = jest.fn(() => { entered(); return new Promise(resolve => { finish = resolve; }); });
    const first = consultDispatcher(pg.a, removeOnce).dispatch(id, "ap-beijing");
    await started;
    expect((await consultResources(h.circle)).boundaries[0].stopIntent).toMatchObject({ state: "DISPATCHING" });
    expect(await consultDispatcher(pg.b, removeOnce).dispatch(id, "ap-beijing")).toMatchObject({ state: "DISPATCHING" });
    finish({ state: "ACKNOWLEDGED", requestId: "a76ae9ed-1098-4410-8968-d9c803abf237", receivedAt: new Date().toISOString() });
    expect(await first).toEqual({ state: "ACKNOWLEDGED", applied: true }); expect(removeOnce).toHaveBeenCalledTimes(1);
    expect(removeOnce).toHaveBeenCalledWith({ ...before.boundaries[0].scope, region: "ap-beijing", userIds: [
      consultTrtcUserId(h.consumer, before.boundaries[0].scope.rtcRoomId), consultTrtcUserId(h.guest, before.boundaries[0].scope.rtcRoomId)] });
    expect(await consultDispatcher(pg.b, removeOnce).dispatch(id, "ap-beijing")).toMatchObject({ state: "ACKNOWLEDGED" });
    expect(removeOnce).toHaveBeenCalledTimes(1); expect((await consultResources(h.circle)).reservations).toEqual(before.reservations);
  });
  it("咨询供应商抛错持久化UNKNOWN且下一节点不重发、不释放", async () => {
    const { h, id } = await seedStoppedConsult(), before = await consultResources(h.circle);
    const removeOnce = jest.fn().mockRejectedValue(new Error("SYNTHETIC_PRIVATE_VENDOR_ERROR"));
    expect(await consultDispatcher(pg.a, removeOnce).dispatch(id, "ap-guangzhou")).toEqual({ state: "UNKNOWN", applied: true });
    expect(await consultDispatcher(pg.b, removeOnce).dispatch(id, "ap-guangzhou")).toMatchObject({ state: "UNKNOWN" });
    const after = await consultResources(h.circle);
    expect(removeOnce).toHaveBeenCalledTimes(1); expect(after.reservations).toEqual(before.reservations);
    expect(JSON.stringify(after)).not.toContain("SYNTHETIC_PRIVATE_VENDOR_ERROR");
  });
  it("咨询范围漂移阻止派发，不能用当前环境覆盖原SDK应用", async () => {
    const { id } = await seedStoppedConsult(), removeOnce = jest.fn();
    await pg.a.$executeRaw`UPDATE "ConsultCallMediaBoundary" SET scope=jsonb_set(scope,'{sdkAppId}','2'::jsonb) WHERE "callId"=${id}`;
    await expect(consultDispatcher(pg.a, removeOnce).dispatch(id, "ap-beijing")).rejects.toThrow("CONSULT_STOP_BOUNDARY_INVALID");
    expect(removeOnce).not.toHaveBeenCalled();
  });
  it("管理媒体核查真实JOIN读取待办和ACTIVE，不改变订单或资源", async () => {
    const { h, id } = await seedStoppedConsult();
    const before = await consultResources(h.circle);
    const view = await new ConsultMediaStatusService(pg.b as unknown as PrismaService).read(id);
    expect(view).toMatchObject({ callId: id, orderStatus: "REFUNDED", boundaryStatus: "TRACKED",
      stopState: "READY", mediaObservation: "UNKNOWN", quotaState: "ACTIVE", canRelease: false });
    expect(await consultResources(h.circle)).toEqual(before);
    expect(JSON.stringify(view)).not.toMatch(/sdkAppId|userSig|privateMapKey|rtcRoomId|callerId|expertId/);
  });
  it("咨询已认领但结果写库失败保留DISPATCHING，过期转UNKNOWN而不是重发", async () => {
    const { h, id } = await seedStoppedConsult();
    const removeOnce = jest.fn().mockImplementation(async () => ({ state: "ACKNOWLEDGED", requestId: "a76ae9ed-1098-4410-8968-d9c803abf237", receivedAt: new Date().toISOString() }));
    let transactions = 0;
    const proxy = new Proxy(pg.a, { get: (target, key) => key === "$transaction" ? (...args: unknown[]) => {
      if (++transactions === 2) return Promise.reject(new Error("SYNTHETIC_DB_FAILURE"));
      return (target.$transaction as Function).apply(target, args);
    } : Reflect.get(target, key) });
    await expect(consultDispatcher(proxy, removeOnce).dispatch(id, "ap-beijing")).rejects.toThrow("CONSULT_STOP_RESULT_PERSIST_FAILED");
    expect(await consultDispatcher(pg.b, removeOnce).dispatch(id, "ap-beijing")).toMatchObject({ state: "DISPATCHING" });
    const intent = (await consultResources(h.circle)).boundaries[0].stopIntent!;
    // 模拟进程中断后租约到期，不等待真实一分钟；保护边界仍来自原有效票据。
    const claimMs = Date.now() - 90000, claimedAt = new Date(claimMs).toISOString(), leaseUntil = new Date(claimMs + 60000).toISOString();
    Object.assign(intent, { requestedAt: claimedAt, dispatch: { region: "ap-beijing", claimedAt, leaseUntil } });
    await pg.a.$executeRaw`UPDATE "ConsultCallMediaBoundary" SET "stopIntent"=${JSON.stringify(intent)}::jsonb WHERE "callId"=${id}`;
    expect(await consultDispatcher(pg.b, removeOnce).dispatch(id, "ap-beijing")).toEqual({ state: "UNKNOWN" });
    expect(removeOnce).toHaveBeenCalledTimes(1);
    expect((await consultResources(h.circle)).reservations).toEqual([{ state: "ACTIVE", businessId: id }]);
  });
  it("不可信的未来ACK时间降为UNKNOWN，不保存供应商回执", async () => {
    const { h, id } = await seedStoppedConsult();
    const removeOnce = jest.fn().mockResolvedValue({ state: "ACKNOWLEDGED", requestId: "a76ae9ed-1098-4410-8968-d9c803abf237", receivedAt: new Date(Date.now() + 120000).toISOString() });
    expect(await consultDispatcher(pg.a, removeOnce).dispatch(id, "ap-beijing")).toEqual({ state: "UNKNOWN", applied: true });
    const intent = (await consultResources(h.circle)).boundaries[0].stopIntent!;
    expect(intent.dispatch).not.toHaveProperty("providerRequestId");
  });
  it("伪造格式的ACK编号降为UNKNOWN，进行中订单没有派发资格", async () => {
    const h = await setup(), id = await seedWaiting(h), removeOnce = jest.fn();
    expect(await consultDispatcher(pg.a, removeOnce).dispatch(id, "ap-beijing")).toEqual({ state: "BLOCKED" });
    expect(removeOnce).not.toHaveBeenCalled();
    await calls(pg.a, { spend: jest.fn(), refund: jest.fn().mockResolvedValue(undefined) }).cancel(h.consumer, id);
    removeOnce.mockImplementation(async () => ({ state: "ACKNOWLEDGED", requestId: "-".repeat(36), receivedAt: new Date().toISOString() }));
    expect(await consultDispatcher(pg.a, removeOnce).dispatch(id, "ap-beijing")).toEqual({ state: "UNKNOWN", applied: true });
    expect((await consultResources(h.circle)).reservations).toEqual([{ state: "ACTIVE", businessId: id }]);
  });
  it("实际咨询创建占用一次，接听复用原额度并扩展UTC票据最晚边界", async () => {
    const h = await setup(), id = await seedWaiting(h), before = await consultResources(h.circle);
    expect(before.reservations).toEqual([{ state: "ACTIVE", businessId: id }]);
    expect(before.boundaries).toHaveLength(1); expect(before.boundaries[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(Object.keys(before.boundaries[0].scope).sort()).toEqual(["rtcRoomId", "sdkAppId"]);
    const oldIssue = (buildTrtcConfig as jest.Mock).getMockImplementation()!;
    (buildTrtcConfig as jest.Mock).mockImplementation((...args) => ({ ...oldIssue(...args), expiresAt: new Date(Date.now() + 900000).toISOString() }));
    await calls(pg.a).accept(h.guest, id);
    const after = await consultResources(h.circle);
    expect(after.reservations).toEqual(before.reservations); expect(after.boundaries[0].revision).toBe(2);
    expect(after.boundaries[0].expiresAt.getTime()).toBeGreaterThan(before.boundaries[0].expiresAt.getTime());
    expect(after.boundaries[0].expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 900000);
  });
  it.each([-601000, 60000])("接听拒绝超时或未来创建时间 %s，事务回滚票据边界且保留取消退款", async offset => {
    const h = await setup(), id = await seedWaiting(h), before = await consultResources(h.circle);
    await pg.observer.consultCall.update({ where: { id }, data: { createdAt: new Date(Date.now() + offset) } });
    const coin = { spend: jest.fn(), refund: jest.fn().mockResolvedValue(undefined) };
    await expect(calls(pg.a, coin).accept(h.guest, id)).rejects.toMatchObject({ status: 409 });
    expect(await consultResources(h.circle)).toEqual(before);
    expect(await pg.observer.consultCall.findUnique({ where: { id } })).toMatchObject({ status: "WAITING", startAt: null });
    expect(coin.spend).not.toHaveBeenCalled(); expect(coin.refund).not.toHaveBeenCalled();
    await calls(pg.a, coin).cancel(h.consumer, id);
    expect(coin.refund).toHaveBeenCalledTimes(1);
    expect((await pg.observer.consultCall.findUnique({ where: { id } }))?.status).toBe("REFUNDED");
  });
  it("咨询并发名额仅1时两条真实连接只能建一单，失败方不调用扣币", async () => {
    const h = await setup(), coin = { spend: jest.fn().mockResolvedValue(undefined), refund: jest.fn().mockResolvedValue(undefined) };
    await service(pg.a).directGrant(h.circle, human(h.reviewer), { ...directDto("VIDEO_QUESTION", h.guest), maxConcurrent: 1 });
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { callPricePerMinuteCoin: 8 }, select: { id: true } });
    const dto = { circleId: h.circle, expertId: h.guest, type: "VIDEO" as const };
    const result = await competing(h.circle, () => calls(pg.a, coin).initiate(h.consumer, dto), () => calls(pg.b, coin).initiate(h.consumer, dto));
    expect(result.filter(row => row.ok)).toHaveLength(1); expect(result.find(row => !row.ok)).toMatchObject({ error: { status: 403 } });
    expect(coin.spend).toHaveBeenCalledTimes(1); expect(await pg.observer.consultCall.count({ where: { circleId: h.circle } })).toBe(1);
    const resources = await consultResources(h.circle); expect(resources.reservations).toHaveLength(1); expect(resources.boundaries).toHaveLength(1);
  });
  it("预扣失败回滚新建咨询、额度及非敏感边界", async () => {
    const h = await setup();
    await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("AUDIO_QUESTION", h.guest));
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { callPricePerMinuteCoin: 8 }, select: { id: true } });
    await expect(calls(pg.a).initiate(h.consumer, { circleId: h.circle, expertId: h.guest, type: "VOICE" })).rejects.toThrow("LOCAL_REAL_MONEY_FORBIDDEN");
    expect(await pg.observer.consultCall.count({ where: { circleId: h.circle } })).toBe(0);
    expect(await consultResources(h.circle)).toEqual({ reservations: [], boundaries: [] });
  });
  it("取消咨询只结束订单并退预扣，不伪造媒体停止或释放ACTIVE", async () => {
    const h = await setup(), id = await seedWaiting(h), before = await consultResources(h.circle);
    const coin = { spend: jest.fn(), refund: jest.fn().mockResolvedValue(undefined) };
    await calls(pg.a, coin).cancel(h.consumer, id);
    expect(coin.refund).toHaveBeenCalledTimes(1);
    const after = await consultResources(h.circle);
    expect(after.reservations).toEqual(before.reservations);
    expect({ ...after.boundaries[0], stopIntent: null }).toEqual(before.boundaries[0]);
    expect(after.boundaries[0].stopIntent).toMatchObject({ version: 1, state: "READY", reason: "CANCEL", requestedBy: h.consumer,
      credentialRevision: before.boundaries[0].revision, scope: before.boundaries[0].scope });
    expect(new Date(after.boundaries[0].stopIntent!.protectUntil as string).getTime()).toBe(before.boundaries[0].expiresAt.getTime() + 300000);
    await expect(calls(pg.a, coin).cancel(h.consumer, id)).rejects.toThrow();
    expect(await consultResources(h.circle)).toEqual(after); expect(coin.refund).toHaveBeenCalledTimes(1);
    await expect(calls(pg.a).accept(h.guest, id)).rejects.toThrow();
  });
  it("退款失败回滚终态与停流待办，保留原凭据和ACTIVE", async () => {
    const h = await setup(), id = await seedWaiting(h), before = await consultResources(h.circle);
    const coin = { spend: jest.fn(), refund: jest.fn().mockRejectedValue(new Error("LOCAL_REFUND_REJECTED")) };
    await expect(calls(pg.a, coin).cancel(h.consumer, id)).rejects.toThrow("LOCAL_REFUND_REJECTED");
    expect(await consultResources(h.circle)).toEqual(before);
    expect((await pg.observer.consultCall.findUnique({ where: { id } }))?.status).toBe("WAITING");
  });
  it("两连接同时结束只有一次结算和END待办，原ACTIVE仍保留", async () => {
    const h = await setup(), id = await seedWaiting(h);
    const coin = { spend: jest.fn(), refund: jest.fn().mockResolvedValue(undefined) };
    const revenue = { recordConsultInTransaction: jest.fn().mockResolvedValue(undefined) };
    await calls(pg.a).accept(h.guest, id);
    const before = await consultResources(h.circle);
    const results = await Promise.allSettled([calls(pg.a, coin, revenue).end(h.consumer, id), calls(pg.b, coin, revenue).end(h.guest, id)]);
    expect(results.filter(row => row.status === "fulfilled")).toHaveLength(1);
    expect(coin.refund).toHaveBeenCalledTimes(1); expect(revenue.recordConsultInTransaction).toHaveBeenCalledTimes(1);
    const after = await consultResources(h.circle);
    expect(after.reservations).toEqual(before.reservations);
    expect({ ...after.boundaries[0], stopIntent: null }).toEqual(before.boundaries[0]);
    expect(after.boundaries[0].stopIntent).toMatchObject({ reason: "END", state: "READY", credentialRevision: before.boundaries[0].revision });
  });
  it("咨询真实双账失败整体回滚，修正规则后双方挂断仅提交一次", async () => {
    const h = await setup(), id = await seedWaiting(h);
    await calls(pg.a).accept(h.guest, id);
    await pg.observer.virtualCoinAccount.create({ data: { userId: h.consumer, balance: 0 } });
    const rule = { enabled: true, bufferDays: 7, splits: [
      { role: "PROVIDER", rate: 0.6, basis: "GROSS", category: "SERVICE" },
      { role: "PLATFORM", rate: 0.4, basis: "GROSS", category: "PLATFORM" },
    ] };
    await pg.observer.settlementRule.upsert({ where: { scene: "CONSULT_CALL" }, create: { scene: "CONSULT_CALL", ...rule }, update: rule });
    const coin = new CoinService(pg.observer as PrismaService, {} as never);
    const revenue = new RevenueService(pg.observer as PrismaService, new SettlementService(pg.observer as PrismaService));
    const before = await consultResources(h.circle);
    await expect(calls(pg.a, coin as never, revenue).end(h.consumer, id)).rejects.toThrow("CONSULT_SETTLEMENT_LEDGER_MISMATCH");
    expect(await consultResources(h.circle)).toEqual(before);
    expect((await pg.observer.consultCall.findUnique({ where: { id } }))?.status).toBe("ONGOING");
    expect((await pg.observer.virtualCoinAccount.findUnique({ where: { userId: h.consumer } }))?.balance).toBe(0);
    expect(await pg.observer.virtualCoinTransaction.count({ where: { userId: h.consumer } })).toBe(0);
    expect(await pg.observer.userEarning.count({ where: { refId: id } })).toBe(0);
    expect(await pg.observer.ledgerEntry.count({ where: { refId: id } })).toBe(0);
    await pg.observer.settlementRule.update({ where: { scene: "CONSULT_CALL" }, data: { splits: rule.splits.map(row => ({ ...row, rate: 0.5 })) } });
    const result = await Promise.allSettled([calls(pg.a, coin as never, revenue).end(h.consumer, id), calls(pg.b, coin as never, revenue).end(h.guest, id)]);
    expect(result.filter(row => row.status === "fulfilled")).toHaveLength(1);
    expect((await pg.observer.consultCall.findUnique({ where: { id } }))?.status).toBe("ENDED");
    expect((await pg.observer.virtualCoinAccount.findUnique({ where: { userId: h.consumer } }))?.balance).toBe(72);
    expect(await pg.observer.virtualCoinTransaction.count({ where: { userId: h.consumer, type: "REFUND" } })).toBe(1);
    expect(await pg.observer.userEarning.count({ where: { refId: id } })).toBe(1);
    const entries = await pg.observer.ledgerEntry.findMany({ where: { refId: id } });
    expect(entries).toHaveLength(2); expect(entries.map(row => Number(row.amount))).toEqual([0.4, 0.4]);
    expect((await consultResources(h.circle)).boundaries[0].stopIntent).toMatchObject({ state: "READY", reason: "END" });
  });
  it("咨询预算到期真实双账回滚及与手动挂断竞争不重复结算", async () => {
    const h = await setup(), id = await seedWaiting(h);
    await calls(pg.a).accept(h.guest, id);
    await pg.observer.consultCall.update({ where: { id }, data: { startAt: new Date(Date.now() - 601000) } });
    const rule = { enabled: true, bufferDays: 7, splits: [
      { role: 'PROVIDER', rate: 0.6, basis: 'GROSS', category: 'SERVICE' },
      { role: 'PLATFORM', rate: 0.4, basis: 'GROSS', category: 'PLATFORM' }] };
    await pg.observer.settlementRule.upsert({ where: { scene: 'CONSULT_CALL' }, create: { scene: 'CONSULT_CALL', ...rule }, update: rule });
    const revenue = new RevenueService(pg.observer as PrismaService, new SettlementService(pg.observer as PrismaService));
    const worker = new ConsultBudgetWorker(pg.a as PrismaService, new ConsultCallResourceService(service(pg.a), ledger, quota(pg.a)), revenue, {} as never);
    await expect(worker.expire(id)).rejects.toThrow('CONSULT_SETTLEMENT_LEDGER_MISMATCH');
    expect((await pg.observer.consultCall.findUnique({ where: { id } }))?.status).toBe('ONGOING');
    expect((await consultResources(h.circle)).boundaries[0].stopIntent).toBeNull();
    expect(await pg.observer.userEarning.count({ where: { refId: id } })).toBe(0);
    expect(await pg.observer.ledgerEntry.count({ where: { refId: id } })).toBe(0);
    await pg.observer.settlementRule.update({ where: { scene: 'CONSULT_CALL' }, data: { splits: rule.splits.map(row => ({ ...row, rate: 0.5 })) } });
    await Promise.allSettled([worker.expire(id), calls(pg.b, noMoney(), revenue).end(h.consumer, id)]);
    const finished = await pg.observer.consultCall.findUnique({ where: { id } });
    expect(finished).toMatchObject({ status: 'ENDED', settledCoin: 80, refundedCoin: 0 });
    expect(await pg.observer.userEarning.count({ where: { refId: id } })).toBe(1);
    const entries = await pg.observer.ledgerEntry.findMany({ where: { refId: id } });
    expect(entries).toHaveLength(2); expect(entries.map(row => Number(row.amount))).toEqual([4, 4]);
    expect((await consultResources(h.circle)).boundaries[0].stopIntent?.reason).toMatch(/^(END|BUDGET_TIMEOUT)$/);
    expect(await worker.expire(id)).toBe(false);
  });
  it("咨询结算规则停用时真实事务不建单、不扣币、不占用资源", async () => {
    const h = await setup();
    await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("AUDIO_QUESTION", h.guest));
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { callPricePerMinuteCoin: 8 }, select: { id: true } });
    await pg.observer.settlementRule.upsert({ where: { scene: "CONSULT_CALL" }, create: { scene: "CONSULT_CALL", enabled: false, splits: [] }, update: { enabled: false } });
    const coin = noMoney(), revenue = new RevenueService(pg.observer as PrismaService, new SettlementService(pg.observer as PrismaService));
    await expect(calls(pg.a, coin, revenue).initiate(h.consumer, { circleId: h.circle, expertId: h.guest, type: "VOICE" })).rejects.toThrow("通话结算配置暂不可用");
    expect(coin.spend).not.toHaveBeenCalled();
    expect(await pg.observer.consultCall.count({ where: { circleId: h.circle } })).toBe(0);
    expect(await consultResources(h.circle)).toEqual({ reservations: [], boundaries: [] });
  });
  it("真实超时扫描持久化系统待办并仅退款一次，不提前释放资源", async () => {
    const h = await setup(), id = await seedWaiting(h), before = await consultResources(h.circle);
    await pg.observer.$executeRaw`UPDATE "ConsultCall" SET "createdAt"=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - interval '1 hour' WHERE id=${id}`;
    const coin = { spend: jest.fn(), refund: jest.fn().mockResolvedValue(undefined) };
    const redis = { runExclusive: jest.fn(async (_key: string, _ttl: number, run: () => Promise<void>) => run()) };
    await calls(pg.a, coin, {}, redis).refundStaleWaitingCallsCron();
    const after = await consultResources(h.circle);
    expect(coin.refund).toHaveBeenCalledTimes(1);
    expect(after.reservations).toEqual(before.reservations);
    expect({ ...after.boundaries[0], stopIntent: null }).toEqual(before.boundaries[0]);
    expect(after.boundaries[0].stopIntent).toMatchObject({ state: "READY", reason: "WAITING_TIMEOUT", requestedBy: null });
    await calls(pg.b, coin, {}, redis).refundStaleWaitingCallsCron();
    expect(coin.refund).toHaveBeenCalledTimes(1); expect(await consultResources(h.circle)).toEqual(after);
  });
  it("接听应用范围漂移不续发票据，不改原边界与WAITING", async () => {
    const h = await setup(), id = await seedWaiting(h), before = await consultResources(h.circle);
    const oldIssue = (buildTrtcConfig as jest.Mock).getMockImplementation()!;
    (buildTrtcConfig as jest.Mock).mockImplementation((...args) => ({ ...oldIssue(...args), sdkAppId: 2 }));
    await expect(calls(pg.a).accept(h.guest, id)).rejects.toMatchObject({ status: 409 });
    expect(await consultResources(h.circle)).toEqual(before);
    expect(await pg.observer.consultCall.findUnique({ where: { id }, select: { status: true } })).toEqual({ status: "WAITING" });
  });
  it("票据身份不匹配时回滚新单且不调用预扣", async () => {
    const h = await setup(), coin = noMoney();
    await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("AUDIO_QUESTION", h.guest));
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { callPricePerMinuteCoin: 8 }, select: { id: true } });
    const oldIssue = (buildTrtcConfig as jest.Mock).getMockImplementation()!;
    (buildTrtcConfig as jest.Mock).mockImplementation((...args) => ({ ...oldIssue(...args), userId: "OTHER_SYNTHETIC_USER" }));
    await expect(calls(pg.a, coin).initiate(h.consumer, { circleId: h.circle, expertId: h.guest, type: "VOICE" })).rejects.toMatchObject({ status: 400 });
    expect(coin.spend).not.toHaveBeenCalled(); expect(await pg.observer.consultCall.count({ where: { circleId: h.circle } })).toBe(0);
    expect(await consultResources(h.circle)).toEqual({ reservations: [], boundaries: [] });
  });
  it("历史等待单缺资源边界不伪造补发，仍保留原订单可取消", async () => {
    const h = await setup();
    await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("AUDIO_QUESTION", h.guest));
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { callPricePerMinuteCoin: 8 }, select: { id: true } });
    const row = await pg.observer.consultCall.create({ data: { circleId: h.circle, callerId: h.consumer, expertId: h.guest, type: "VOICE",
      pricePerMinute: 8, prepaidCoin: 80, rtcRoomId: "consult_0123456789abcdef" }, select: { id: true } });
    await expect(calls(pg.a).accept(h.guest, row.id)).rejects.toMatchObject({ status: 409 });
    expect(await consultResources(h.circle)).toEqual({ reservations: [], boundaries: [] });
    const coin = { spend: jest.fn(), refund: jest.fn().mockResolvedValue(undefined) };
    await calls(pg.a, coin).cancel(h.consumer, row.id); expect(coin.refund).toHaveBeenCalledTimes(1);
  });
  it.each(["MEMBER", "EXPIRED", "USER_DISABLED", "CIRCLE_DISABLED"])("通话真实表资格 %s 即使保留价格也不能预扣或建单", async state => {
    const h = await setup(), coin = noMoney();
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { callPricePerMinuteCoin: 8,
      ...(state === "MEMBER" ? { role: "MEMBER" } : {}), ...(state === "EXPIRED" ? { expireAt: new Date(Date.now() - 1000) } : {}) }, select: { id: true } });
    if (state === "USER_DISABLED") await pg.observer.user.update({ where: { id: h.guest }, data: { status: "DISABLED" }, select: { id: true } });
    if (state === "CIRCLE_DISABLED") await pg.observer.circle.update({ where: { id: h.circle }, data: { status: "DISABLED" }, select: { id: true } });
    await expect(calls(pg.a, coin).initiate(h.consumer, { circleId: h.circle, expertId: h.guest, type: "VOICE" })).rejects.toThrow();
    expect(coin.spend).not.toHaveBeenCalled(); expect(await pg.observer.consultCall.count({ where: { circleId: h.circle } })).toBe(0);
  });
  it("通话调价先提交，扣币前真实行锁等待并重新核价", async () => {
    const h = await setup(), coin = noMoney();
    await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("VIDEO_QUESTION", h.guest));
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { callPricePerMinuteCoin: 8 }, select: { id: true } });
    const result = await blockedChange(tx => tx.circleMember.update({ where: { id: h.guestMember.id }, data: { callPricePerMinuteCoin: 9 }, select: { id: true } }),
      () => calls(pg.a, coin).initiate(h.consumer, { circleId: h.circle, expertId: h.guest, type: "VIDEO" }));
    expect(result).toMatchObject({ ok: false, error: { status: 409 } }); expect(coin.spend).not.toHaveBeenCalled();
    expect(await pg.observer.consultCall.count({ where: { circleId: h.circle } })).toBe(0);
  });
  it("通话 RTC 配置不可用，实际资格通过后仍在扣币前拒绝", async () => {
    const h = await setup(), coin = noMoney();
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { callPricePerMinuteCoin: 8 }, select: { id: true } });
    (buildTrtcConfig as jest.Mock).mockReturnValue({ configured: false, userSig: null });
    await expect(calls(pg.a, coin).initiate(h.consumer, { circleId: h.circle, expertId: h.guest, type: "VOICE" })).rejects.toThrow("未扣除金币");
    expect(coin.spend).not.toHaveBeenCalled(); expect(await pg.observer.consultCall.count({ where: { circleId: h.circle } })).toBe(0);
  });
  it("有价格但未获音频授权的嘉宾不能发起通话，视频授权不能代替音频授权", async () => {
    const h = await setup(), coin = noMoney();
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { callPricePerMinuteCoin: 8 }, select: { id: true } });
    await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("VIDEO_QUESTION", h.guest));
    await expect(calls(pg.a, coin).initiate(h.consumer, { circleId: h.circle, expertId: h.guest, type: "VOICE" })).rejects.toMatchObject({ status: 403 });
    expect(coin.spend).not.toHaveBeenCalled();
    expect(await pg.observer.consultCall.count({ where: { circleId: h.circle } })).toBe(0);
  });
  it("平台音频直授普通成员可进入通话且不要求圈级开通，资金失败仍回滚", async () => {
    const h = await setup(), coin = noMoney();
    await pg.observer.circleMember.update({ where: { id: h.guestMember.id }, data: { role: "MEMBER", callPricePerMinuteCoin: 8 }, select: { id: true } });
    await service(pg.a).directGrant(h.circle, human(h.reviewer), directDto("AUDIO_QUESTION", h.guest));
    await expect(calls(pg.a, coin).initiate(h.consumer, { circleId: h.circle, expertId: h.guest, type: "VOICE" })).rejects.toThrow("LOCAL_REAL_MONEY_FORBIDDEN");
    expect(coin.spend).toHaveBeenCalledTimes(1);
    expect(await pg.observer.consultCall.count({ where: { circleId: h.circle } })).toBe(0);
  });
  it("已签发等待单在直授撤销后不再接通，仍可取消", async () => {
    const h = await setup(), id = await seedWaiting(h);
    const current = await pg.transaction(pg.observer, tx => grants.latest(tx, h.circle, "AUDIO_QUESTION", h.guest));
    await service(pg.a).review(current!.id, human(h.reviewer), { action: "REVOKE", expectedRevision: current!.revision, reason: "LOCAL_ONLY_撤销" });
    const coin = { spend: jest.fn(), refund: jest.fn().mockResolvedValue(undefined) };
    await expect(calls(pg.a, coin).accept(h.guest, id)).rejects.toMatchObject({ status: 403 });
    await calls(pg.a, coin).cancel(h.consumer, id);
    expect(coin.refund).toHaveBeenCalledTimes(1);
    expect(await pg.observer.consultCall.findUnique({ where: { id }, select: { status: true } })).toEqual({ status: "REFUNDED" });
  });
  it("取消状态先提交，已读取旧 WAITING 的接听不能覆盖 REFUNDED", async () => {
    const h = await setup(), id = await seedWaiting(h), coin = noMoney();
    // 仅用合成表记录代表取消已认领，不执行金币退款或调用供应商。
    const result = await blockedChange(tx => tx.consultCall.update({ where: { id }, data: { status: "REFUNDED", refundedCoin: 80, endAt: new Date() }, select: { id: true } }),
      () => calls(pg.a, coin).accept(h.guest, id));
    expect(result).toMatchObject({ ok: false, error: { status: 409 } });
    expect(await pg.observer.consultCall.findUnique({ where: { id }, select: { status: true, startAt: true } })).toEqual({ status: "REFUNDED", startAt: null });
    expect(coin.spend).not.toHaveBeenCalled(); expect(coin.refund).not.toHaveBeenCalled();
  });
  it("两个真实连接重复接听只有一次成功，开始时间不被第二次覆盖", async () => {
    const h = await setup(), id = await seedWaiting(h);
    const before = Date.now(); const result = await competing(h.circle, () => calls(pg.a).accept(h.guest, id), () => calls(pg.b).accept(h.guest, id), id);
    expect(result.filter(r => r.ok)).toHaveLength(1); expect(result.find(r => !r.ok)).toMatchObject({ ok: false, error: { status: 409 } });
    const call = await pg.observer.consultCall.findUniqueOrThrow({ where: { id }, select: { status: true, startAt: true } });
    expect(call.status).toBe("ONGOING"); expect(call.startAt!.getTime()).toBeGreaterThanOrEqual(before); expect(call.startAt!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it.each(["USER_DISABLED", "MEMBER_REMOVED", "EXPIRED", "CIRCLE_DISABLED"])("接听真实行锁等待资格变更 %s，拒绝接通但保留取消退款", async state => {
    const h = await setup(), id = await seedWaiting(h);
    const coin = { spend: jest.fn().mockRejectedValue(new Error("REAL_SPEND_FORBIDDEN")), refund: jest.fn().mockResolvedValue(undefined) };
    const result = await blockedChange(async tx => {
      if (state === "USER_DISABLED") await tx.user.update({ where: { id: h.guest }, data: { status: "DISABLED" }, select: { id: true } });
      else if (state === "CIRCLE_DISABLED") await tx.circle.update({ where: { id: h.circle }, data: { status: "DISABLED" }, select: { id: true } });
      else if (state === "MEMBER_REMOVED") await tx.circleMember.delete({ where: { id: h.guestMember.id }, select: { id: true } });
      else await tx.circleMember.update({ where: { id: h.guestMember.id }, data: { expireAt: new Date(Date.now() - 1000) }, select: { id: true } });
    }, () => calls(pg.a, coin).accept(h.guest, id));
    expect(result).toMatchObject({ ok: false, error: { status: 403 } });
    expect(await pg.observer.consultCall.findUnique({ where: { id }, select: { status: true, startAt: true, refundedCoin: true } }))
      .toEqual({ status: "WAITING", startAt: null, refundedCoin: 0 });
    expect(coin.refund).not.toHaveBeenCalled(); expect(coin.spend).not.toHaveBeenCalled();
    // 仅退款服务替身，确认受影响用户仍能走真实订单取消状态机，不发生任何真实资金动作。
    await calls(pg.a, coin).cancel(h.consumer, id);
    expect(coin.refund).toHaveBeenCalledTimes(1);
    expect(await pg.observer.consultCall.findUnique({ where: { id }, select: { status: true, refundedCoin: true } }))
      .toEqual({ status: "REFUNDED", refundedCoin: 80 });
  });
});
