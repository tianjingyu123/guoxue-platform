import { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import path from "node:path";
import { CircleCapabilityQuotaRepository } from "../src/modules/circle/circle-capability-quota.repository";
import { CircleCapabilityDispatchRepository } from "../src/modules/circle/circle-capability-dispatch.repository";
import { CircleCapabilityDispatchService } from "../src/modules/circle/circle-capability-dispatch.service";
import { CircleCapabilityQuotaService } from "../src/modules/circle/circle-capability-quota.service";
import { CircleCapabilityService } from "../src/modules/circle/circle-capability.service";
import { CircleCapabilityRepository } from "../src/modules/circle/circle-capability.repository";
import { CircleCapability } from "../src/modules/circle/circle-capability.policy";
import { QuotaBinding, QuotaReservation } from "../src/modules/circle/circle-capability-quota.policy";
import { quotaFixture } from "./fixtures/circle-capability-quota";

// 只接受显式本地测试开关；不读取任何远端 DATABASE_URL、不复用已存在的数据目录或服务。
const localSuite = process.env.RUN_CIRCLE_QUOTA_LOCAL_PG === "YES" ? describe : describe.skip;
const binaries = "C:/Program Files/PostgreSQL/16/bin";
const artifactRoot = "D:/gx-deploy-91/artifacts/local-qa";
const serverRoot = path.resolve(__dirname, "..");
const repo = new CircleCapabilityQuotaRepository();
const dispatches = new CircleCapabilityDispatchRepository();
const grants = new CircleCapabilityRepository();
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const gate = () => { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; };

localSuite("独立本机 PostgreSQL 16：额度 SQL/原子回滚/双连接竞争", () => {
  let qaRoot: string, dataRoot: string, port: number;
  let observer: PrismaClient, a: PrismaClient, b: PrismaClient;
  let started = false;
  const run = (exe: string, args: string[], input?: string) => {
    // pg_ctl 的后代服务器可能继承管道句柄；控制命令不建输出管道，日志由 -l 单独保存。
    const control = exe === "pg_ctl.exe";
    const result = spawnSync(path.join(binaries, exe), args, { input, encoding: "utf8", windowsHide: true,
      ...(control ? { stdio: "ignore" as const } : {}), timeout: control ? 15000 : 60000, maxBuffer: 2 * 1024 * 1024 });
    if (result.error || result.status !== 0) throw new Error(`LOCAL_PG_${exe}_FAILED: ${result.error?.message || result.stderr || result.stdout}`);
    return result.stdout ?? "";
  };
  const transaction = <T>(client: PrismaClient, callback: (tx: Prisma.TransactionClient) => Promise<T>) => client.$transaction(callback, { maxWait: 5000, timeout: 15000 });
  const totals = async (circleId: string) => {
    const rows = await observer.$queryRaw<Array<{ reservations: bigint; receipts: bigint }>>`
      SELECT (SELECT count(*) FROM "CircleCapabilityQuota" WHERE "circleId" = ${circleId}) AS reservations,
        (SELECT count(*) FROM "CircleCapabilityQuotaReceipt" r JOIN "CircleCapabilityQuota" q ON q.id = r."reservationId" WHERE q."circleId" = ${circleId}) AS receipts`;
    return { reservations: Number(rows[0].reservations), receipts: Number(rows[0].receipts) };
  };
  beforeAll(async () => {
    expect(run("postgres.exe", ["--version"])).toContain("16.13");
    mkdirSync(artifactRoot, { recursive: true }); qaRoot = mkdtempSync(path.join(artifactRoot, "circle-capability-pg-"));
    dataRoot = path.join(qaRoot, "data");
    port = await new Promise<number>((resolve, reject) => { const socket = createServer(); socket.once("error", reject);
      socket.listen(0, "127.0.0.1", () => { const address = socket.address(); const allocated = typeof address === "object" && address ? address.port : 0;
        socket.close(error => error ? reject(error) : resolve(allocated)); }); });
    if (port < 1024) throw new Error("LOCAL_PG_PORT_INVALID");
    run("initdb.exe", ["-D", dataRoot, "-U", "quota_qa", "-A", "trust", "--encoding=UTF8", "--locale=C", "--no-instructions"]);
    try {
      run("pg_ctl.exe", ["-D", dataRoot, "-l", path.join(qaRoot, "postgres.log"), "-o", `-h 127.0.0.1 -p ${port} -c max_connections=12 -c shared_buffers=32MB`, "-w", "start"]);
      started = true;
    } catch (error) {
      // 启动回执不确定时仅查询本次新目录，供 afterAll 安全停止，不重复启动。
      started = spawnSync(path.join(binaries, "pg_ctl.exe"), ["-D", dataRoot, "status"], { windowsHide: true, timeout: 10000 }).status === 0;
      throw error;
    }
    const psql = ["-h", "127.0.0.1", "-p", String(port), "-U", "quota_qa", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-X"];
    run("psql.exe", psql, 'CREATE DATABASE circle_quota_qa;');
    const migrations = ["manual_add_circle_capability_01_workflow", "manual_add_circle_capability_02_quota_ledger", "manual_add_circle_platform_direct_grant", "manual_add_circle_capability_03_dispatch"].sort().map(name =>
      readFileSync(path.join(serverRoot, "prisma/migrations", name, "migration.sql"), "utf8"));
    run("psql.exe", [...psql.slice(0, 6), "-d", "circle_quota_qa", "-v", "ON_ERROR_STOP=1", "-X"],
      'CREATE TABLE "Circle" ("id" TEXT PRIMARY KEY);\n' + migrations.join("\n"));
    // 数据库地址完全由本次进程创建的 loopback 端口构成，不可用环境变量覆盖到云端。
    const url = `postgresql://quota_qa@127.0.0.1:${port}/circle_quota_qa?connection_limit=1&connect_timeout=5`;
    observer = new PrismaClient({ datasources: { db: { url } } }); a = new PrismaClient({ datasources: { db: { url } } }); b = new PrismaClient({ datasources: { db: { url } } });
    await Promise.all([observer.$connect(), a.$connect(), b.$connect()]);
    const db = await observer.$queryRaw<Array<{ db: string; version: string; addr: string; port: number }>>`SELECT current_database() AS db, version(), inet_server_addr()::text AS addr, inet_server_port() AS port`;
    expect(db[0]).toMatchObject({ db: "circle_quota_qa", addr: "127.0.0.1/32", port }); expect(db[0].version).toContain("16.13");
    console.info(`LOCAL_PG_READY version=16.13 data=${dataRoot} port=${port} syntheticOnly=true`);
  }, 120000);
  afterAll(async () => {
    await Promise.all([observer, a, b].filter(Boolean).map(client => client.$disconnect()));
    if (started) {
      const resolved = path.resolve(dataRoot);
      if (!resolved.startsWith(path.resolve(artifactRoot) + path.sep) || !path.basename(path.dirname(resolved)).startsWith("circle-capability-pg-")) throw new Error("LOCAL_PG_STOP_SCOPE_INVALID");
      run("pg_ctl.exe", ["-D", resolved, "-m", "fast", "-w", "stop"]); started = false;
      console.info("LOCAL_PG_STOPPED syntheticDataRetained=true");
    }
  }, 65000);
  beforeEach(async () => {
    // 非 UTC 是必测前提，不能靠把测试库改成 UTC 来掩盖原始 Date 参数的转换缺陷。
    await Promise.all([observer, a, b].map(client => client.$executeRaw`SELECT set_config('TimeZone', 'America/Los_Angeles', false)`));
  });

  async function setup(capability: CircleCapability = "LIVE", limits = { maxUnits: 10, maxConcurrent: 2 }) {
    const fixture = quotaFixture(capability); const circleId = randomUUID(), ownerId = randomUUID(), providerId = randomUUID();
    const isQuestion = capability.includes("QUESTION");
    fixture.binding = { ...fixture.binding, circleId, actorId: isQuestion ? randomUUID() : ownerId, subjectUserId: isQuestion ? providerId : null,
      businessId: randomUUID(), requestKey: randomUUID() };
    fixture.authorization.context = { ...fixture.authorization.context, circleId, ownerId,
      provider: { userId: providerId, active: true, membershipValid: true, role: "GUEST" } };
    await observer.$executeRaw`INSERT INTO "Circle" (id) VALUES (${circleId})`;
    async function seed(subject: string | null) {
      const grantId = randomUUID(); const time = new Date(); const expires = new Date(time.getTime() + 3600000);
      await transaction(observer, async tx => {
        await repo.lockScope(tx, circleId);
        const pending = await grants.create(tx, { ...fixture.authorization.circleGrant!, id: grantId, circleId, ownerId, applicantId: ownerId,
          subjectUserId: subject, revision: 1, state: "PENDING", enabled: false, expiresAt: null, maxUnits: null, maxConcurrent: null }, 1, {}, time);
        expect(pending.createdAt.getTime()).toBe(time.getTime()); expect(pending.updatedAt.getTime()).toBe(time.getTime());
        const approved = (await grants.compareAndSet(tx, pending, { ...pending, revision: 2, state: "APPROVED", expiresAt: expires, ...limits }, time))!;
        const enabled = (await grants.compareAndSet(tx, approved, { ...approved, revision: 3, enabled: true }, time))!;
        expect(enabled.expiresAt!.getTime()).toBe(expires.getTime()); expect(enabled.updatedAt.getTime()).toBe(time.getTime());
        await grants.audit(tx, ownerId, "LOCAL_QA_SEED", "隔离合成数据，不代表真实人工审批", null, enabled, time);
        const audit = await tx.$queryRaw<Array<{ createdAt: Date }>>`SELECT "createdAt" FROM "CircleCapabilityAudit" WHERE "grantId"=${grantId}`;
        expect(audit[0].createdAt.getTime()).toBe(time.getTime());
      });
      return grantId;
    }
    const circleGrantId = await seed(null); if (isQuestion) await seed(providerId);
    // 账号/成员上下文仅为合成夹具；授权记录、锁、额度、回执和事务是真 PostgreSQL。
    const capabilities = { assertAuthorizationInTransaction: async (tx: Prisma.TransactionClient, circle: string, cap: CircleCapability, actor: { userId: string; executor: "HUMAN" }, subject: string | null) => {
      await repo.lockScope(tx, circle);
      const circleGrant = await grants.latest(tx, circle, cap, null); const providerGrant = subject ? await grants.latest(tx, circle, cap, subject) : null;
      if (!circleGrant) throw new Error("LOCAL_PG_FIXTURE_GRANT_MISSING");
      expect({ dateInstance: circleGrant.expiresAt instanceof Date, finite: Number.isFinite(circleGrant.expiresAt?.getTime()),
        future: Number(circleGrant.expiresAt) > Date.now() }).toEqual({ dateInstance: true, finite: true, future: true });
      return { circleGrant, providerGrant, checkedAt: new Date(), authorization: { policy: fixture.authorization.policy,
        context: { ...fixture.authorization.context, ...(subject ? { provider: { ...fixture.authorization.context.provider!, userId: subject } } : {}) },
        circleGrant, providerGrant, actor: { ...actor, active: true } } };
    } };
    const makeService = (repository = repo) => new CircleCapabilityQuotaService(capabilities as unknown as CircleCapabilityService, repository);
    const service = makeService(), actor = { userId: fixture.binding.actorId, executor: "HUMAN" as const };
    const reserve = (client: PrismaClient, binding = fixture.binding) => transaction(client, tx => service.reserveInTransaction(tx, binding, actor));
    const startInput = (r: QuotaReservation) => ({ reservationId: r.id, binding: r.binding, operationKey: randomUUID(), expectedRevision: r.revision });
    return { circleId, circleGrantId, fixture, actor, service, makeService, reserve, startInput, seed };
  }
  async function observedLock() {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const rows = await observer.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM pg_stat_activity
        WHERE datname = 'circle_quota_qa' AND wait_event_type = 'Lock' AND wait_event = 'advisory'`;
      if (rows[0].n > 0n) return;
      await delay(30);
    }
    throw new Error("LOCAL_PG_EXPECTED_LOCK_WAIT_NOT_OBSERVED");
  }
  async function competing<T, U>(first: (tx: Prisma.TransactionClient) => Promise<T>, second: () => Promise<U>) {
    const entered = gate(), release = gate();
    let firstFailed = false;
    const firstPromise = transaction(a, async tx => { try { const result = await first(tx); entered.release(); await release.promise; return result; } catch (error) { firstFailed = true; entered.release(); throw error; } });
    const capturedFirst = firstPromise.then(value => ({ ok: true as const, value }), error => ({ ok: false as const, error }));
    await entered.promise;
    if (firstFailed) { const result = await capturedFirst; if (!result.ok) throw result.error; }
    const secondPromise = second().then(value => ({ ok: true as const, value }), error => ({ ok: false as const, error }));
    try { await observedLock(); } finally { release.release(); }
    return Promise.all([capturedFirst, secondPromise]);
  }

  it("组合服务双连接竞争仅一次领取，重放保留同一供应商键", async () => {
    const h = await setup(); const service = new CircleCapabilityDispatchService(h.service, repo, dispatches);
    const prepared = await transaction(a, tx => service.reserveInTransaction(tx, h.fixture.binding, h.actor));
    const replay = await transaction(b, tx => service.reserveInTransaction(tx, h.fixture.binding, h.actor));
    expect(replay.effect).toBe("NONE"); expect(replay.dispatch.id).toBe(prepared.dispatch.id);
    const input = { reservationId: prepared.reservation.id, binding: h.fixture.binding, expectedQuotaRevision: 1, expectedDispatchRevision: 1, leaseSeconds: 10 };
    const results = await competing(tx => service.claimInTransaction(tx, input, h.actor),
      () => transaction(b, tx => service.claimInTransaction(tx, input, h.actor)));
    expect(results.every(result => result.ok)).toBe(true);
    expect(results.map(result => result.ok ? result.value.effect : "ERROR")).toEqual(["CLAIMED", "NONE"]);
    const stored = await transaction(observer, tx => dispatches.byReservation(tx, prepared.reservation.id));
    expect(stored).toMatchObject({ state: "DISPATCHING", revision: 2, providerOperationKey: prepared.dispatch.providerOperationKey });
    expect(await totals(h.circleId)).toEqual({ reservations: 1, receipts: 2 });
    const confirmation = { reservationId: prepared.reservation.id, binding: h.fixture.binding,
      providerOperationKey: stored!.providerOperationKey, leaseToken: stored!.leaseToken!, expectedDispatchRevision: 2, evidenceRef: "synthetic/callback-1" };
    expect((await transaction(a, tx => service.confirmInTransaction(tx, confirmation))).effect).toBe("CONFIRMED");
    expect((await transaction(b, tx => service.confirmInTransaction(tx, confirmation))).effect).toBe("NONE");
    await expect(transaction(a, tx => service.confirmInTransaction(tx, { ...confirmation, evidenceRef: "synthetic/other" }))).rejects.toThrow("EVIDENCE_CONFLICT");
    expect(await transaction(observer, tx => repo.byId(tx, prepared.reservation.id))).toMatchObject({ state: "ACTIVE", revision: 2 });
    expect(await totals(h.circleId)).toEqual({ reservations: 1, receipts: 2 });
  });
  it("组合领取条件更新零行时真实数据库回滚激活与回执", async () => {
    const h = await setup(); const service = new CircleCapabilityDispatchService(h.service, repo, dispatches);
    const prepared = await transaction(a, tx => service.reserveInTransaction(tx, h.fixture.binding, h.actor));
    // 仅注入最终 CAS 零行；额度激活、回执和事务回滚仍使用真实数据库。
    const failing = new CircleCapabilityDispatchRepository();
    const failure = jest.spyOn(failing, "transition").mockResolvedValue(null);
    try {
      const claimant = new CircleCapabilityDispatchService(h.service, repo, failing);
      await expect(transaction(b, tx => claimant.claimInTransaction(tx, { reservationId: prepared.reservation.id,
        binding: h.fixture.binding, expectedQuotaRevision: 1, expectedDispatchRevision: 1, leaseSeconds: 10 }, h.actor))).rejects.toThrow("DISPATCH_CLAIM_CONFLICT");
    } finally { failure.mockRestore(); }
    expect(await transaction(observer, tx => repo.byId(tx, prepared.reservation.id))).toMatchObject({ state: "HELD", revision: 1, activatedAt: null });
    expect(await transaction(observer, tx => dispatches.byReservation(tx, prepared.reservation.id))).toMatchObject({ state: "READY", revision: 1 });
    expect(await totals(h.circleId)).toEqual({ reservations: 1, receipts: 1 });
  });
  it("旧预留缺派发账本时组合器拒绝补建", async () => {
    const h = await setup(); const r = (await h.reserve(a)).reservation;
    const service = new CircleCapabilityDispatchService(h.service, repo, dispatches);
    await expect(transaction(b, tx => service.reserveInTransaction(tx, h.fixture.binding, h.actor))).rejects.toThrow("DISPATCH_REPLAY_RECORD_MISSING");
    expect(await transaction(observer, tx => dispatches.byReservation(tx, r.id))).toBeNull();
    expect(await totals(h.circleId)).toEqual({ reservations: 1, receipts: 1 });
  });
  it("派发与额度同事务提交，后续故障全部回滚", async () => {
    const h = await setup();
    await expect(transaction(a, async tx => {
      const r = (await h.service.reserveInTransaction(tx, h.fixture.binding, h.actor)).reservation;
      await dispatches.insertReady(tx, { id: randomUUID(), reservationId: r.id, providerOperationKey: randomUUID(), expectedQuotaRevision: r.revision, now: new Date() });
      await tx.$executeRaw`SELECT 1 / 0`;
    })).rejects.toThrow();
    expect(await totals(h.circleId)).toEqual({ reservations: 0, receipts: 0 });
    const rows = await observer.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM "CircleCapabilityDispatch" d JOIN "CircleCapabilityQuota" q ON q.id=d."reservationId" WHERE q."circleId"=${h.circleId}`;
    expect(rows[0].n).toBe(0n);
  });
  it("同一额度真实唯一约束阻止第二次派发", async () => {
    const h = await setup(); const r = (await h.reserve(a)).reservation;
    const input = { id: randomUUID(), reservationId: r.id, providerOperationKey: randomUUID(), expectedQuotaRevision: r.revision, now: new Date() };
    await transaction(a, async tx => { await repo.lockScope(tx, h.circleId); await dispatches.insertReady(tx, input); });
    await expect(transaction(b, async tx => { await repo.lockScope(tx, h.circleId); await dispatches.insertReady(tx, { ...input, id: randomUUID(), providerOperationKey: randomUUID() }); })).rejects.toThrow();
    expect((await transaction(observer, tx => dispatches.byReservation(tx, r.id)))!.id).toBe(input.id);
  });
  it("两连接领取同一派发只成功一方，等待者不能再次发送", async () => {
    const h = await setup(); const r = (await h.reserve(observer)).reservation;
    const record = await transaction(observer, async tx => { await repo.lockScope(tx, h.circleId);
      return dispatches.insertReady(tx, { id: randomUUID(), reservationId: r.id, providerOperationKey: randomUUID(), expectedQuotaRevision: r.revision, now: new Date() }); });
    const claim = async (tx: Prisma.TransactionClient) => {
      await repo.lockScope(tx, h.circleId); const current = (await dispatches.byReservation(tx, r.id))!;
      await h.service.activateInTransaction(tx, h.startInput(r), h.actor);
      return dispatches.transition(tx, current, record.revision, new Date(), { type: "CLAIM", leaseToken: randomUUID(), leaseUntil: r.holdUntil, holdUntil: r.holdUntil });
    };
    const results = await competing(claim, () => transaction(b, claim));
    expect(results[0]).toMatchObject({ ok: true, value: { state: "DISPATCHING", revision: 2 } });
    expect(results[1].ok).toBe(false);
  });
  it("租约超时保留未知结果和原派发身份，不能再次领取", async () => {
    const h = await setup(); const r = (await h.reserve(a)).reservation;
    await transaction(a, async tx => { await repo.lockScope(tx, h.circleId);
      const record = await dispatches.insertReady(tx, { id: randomUUID(), reservationId: r.id, providerOperationKey: randomUUID(), expectedQuotaRevision: r.revision, now: new Date() });
      await h.service.activateInTransaction(tx, h.startInput(r), h.actor);
      const now = new Date(); await dispatches.transition(tx, record, 1, now, { type: "CLAIM", leaseToken: randomUUID(), leaseUntil: new Date(now.getTime() + 100), holdUntil: r.holdUntil });
    });
    await delay(150);
    const unknown = await transaction(b, async tx => { await repo.lockScope(tx, h.circleId); const row = (await dispatches.byReservation(tx, r.id))!;
      return dispatches.transition(tx, row, row.revision, new Date(), { type: "EXPIRE_LEASE" }); });
    expect(unknown!.state).toBe("UNKNOWN");
    expect((await repo.byId(observer, r.id))!.state).toBe("ACTIVE");
    await expect(transaction(a, tx => dispatches.transition(tx, unknown!, unknown!.revision, new Date(),
      { type: "CLAIM", leaseToken: randomUUID(), leaseUntil: r.holdUntil, holdUntil: r.holdUntil }))).rejects.toThrow("CLAIM_NOT_ALLOWED");
  });

  it.each(["LIVE", "SHORT_VIDEO", "AUDIO_QUESTION", "VIDEO_QUESTION"] as CircleCapability[])("%s 真表预留/读取聚合/回执", async cap => {
    const h = await setup(cap); const result = await h.reserve(a);
    expect(result.effect).toBe("INSERT_HELD"); expect(await totals(h.circleId)).toEqual({ reservations: 1, receipts: 1 });
    const usage = await transaction(observer, tx => repo.usage(tx, [result.reservation.circleGrantId!, ...(result.reservation.providerGrantId ? [result.reservation.providerGrantId] : [])], new Date()));
    expect(usage).toHaveLength(cap.includes("QUESTION") ? 2 : 1); expect(usage.every(u => u.held === 1 && u.active === 0 && u.committed === 0)).toBe(true);
  });
  it.each(["UTC", "Asia/Shanghai", "America/Los_Angeles"])("会话时区 %s 不改变授权、账本和回执的 UTC 毫秒", async zone => {
    await Promise.all([observer, a, b].map(client => client.$executeRaw`SELECT set_config('TimeZone', ${zone}, false)`));
    const h = await setup(); const r = (await h.reserve(a)).reservation;
    const stored = (await repo.byId(observer, r.id))!;
    expect(stored.createdAt.getTime()).toBe(r.createdAt.getTime()); expect(stored.holdUntil.getTime()).toBe(r.createdAt.getTime() + 60000);
    const activated = await transaction(a, tx => h.service.activateInTransaction(tx, h.startInput(r), h.actor));
    const completed = await transaction(b, tx => h.service.settleInTransaction(tx, { ...h.startInput(activated.reservation), action: "COMPLETE", evidenceRef: "event:timezone-complete" }));
    const final = (await repo.byId(observer, r.id))!;
    expect(final.terminalAt!.getTime()).toBe(completed.reservation.updatedAt.getTime());
    expect(final.activatedAt!.getTime()).toBe(activated.reservation.updatedAt.getTime());
    const receipts = await observer.$queryRaw<Array<{ createdAt: Date; afterSnapshot: { updatedAt: string } }>>`SELECT "createdAt", "afterSnapshot" FROM "CircleCapabilityQuotaReceipt" WHERE "reservationId"=${r.id}`;
    expect(receipts).toHaveLength(3); expect(receipts.every(receipt => receipt.createdAt.toISOString() === receipt.afterSnapshot.updatedAt)).toBe(true);
    expect(await repo.usage(observer, [h.circleGrantId], new Date())).toEqual([{ grantId: h.circleGrantId, committed: 1, held: 0, active: 0 }]);
  });
  it("两个实际连接抢最后一个名额：观察到锁等待，仅一方成功", async () => {
    const h = await setup("LIVE", { maxUnits: 1, maxConcurrent: 1 }); const other = { ...h.fixture.binding, businessId: randomUUID(), requestKey: randomUUID() };
    const results = await competing(tx => h.service.reserveInTransaction(tx, h.fixture.binding, h.actor), () => h.reserve(b, other));
    expect(results[0].ok).toBe(true); expect(results[1]).toMatchObject({ ok: false, error: { status: 403 } });
    expect(await totals(h.circleId)).toEqual({ reservations: 1, receipts: 1 });
  });
  it("双连接重试同一请求只保留一笔账本与回执", async () => {
    const h = await setup(); const results = await competing(tx => h.service.reserveInTransaction(tx, h.fixture.binding, h.actor), () => h.reserve(b));
    expect(results[0]).toMatchObject({ ok: true, value: { effect: "INSERT_HELD" } }); expect(results[1]).toMatchObject({ ok: true, value: { effect: "NONE" } });
    expect(await totals(h.circleId)).toEqual({ reservations: 1, receipts: 1 });
  });
  it("双连接同业务换 key 不能绕过业务唯一性", async () => {
    const h = await setup(); const results = await competing(tx => h.service.reserveInTransaction(tx, h.fixture.binding, h.actor),
      () => h.reserve(b, { ...h.fixture.binding, requestKey: randomUUID() }));
    expect(results[1]).toMatchObject({ ok: false, error: { status: 409 } }); expect(await totals(h.circleId)).toEqual({ reservations: 1, receipts: 1 });
  });
  it("回执故障与后续业务 SQL 错误都真实回滚，没有半笔预留", async () => {
    const h = await setup(); const failing = new CircleCapabilityQuotaRepository(); failing.writeReceipt = async () => { throw new Error("LOCAL_AUDIT_FAILURE"); };
    await expect(transaction(a, tx => h.makeService(failing).reserveInTransaction(tx, h.fixture.binding, h.actor))).rejects.toThrow("LOCAL_AUDIT_FAILURE");
    expect(await totals(h.circleId)).toEqual({ reservations: 0, receipts: 0 });
    await expect(transaction(a, async tx => { await h.service.reserveInTransaction(tx, h.fixture.binding, h.actor); await tx.$executeRaw`SELECT 1 / 0`; })).rejects.toThrow();
    expect(await totals(h.circleId)).toEqual({ reservations: 0, receipts: 0 });
    expect((await h.reserve(a)).effect).toBe("INSERT_HELD");
  });
  it("撤权先取得锁，排队的激活读取新状态后拒绝", async () => {
    const h = await setup(); const r = (await h.reserve(observer)).reservation;
    const results = await competing(async tx => { await repo.lockScope(tx, h.circleId); await tx.$executeRaw`UPDATE "CircleCapabilityGrant" SET state='REVOKED', revision=revision+1 WHERE id=${h.circleGrantId}`; },
      () => transaction(b, tx => h.service.activateInTransaction(tx, h.startInput(r), h.actor)));
    expect(results[1]).toMatchObject({ ok: false, error: { status: 403 } }); expect((await repo.byId(observer, r.id))!.state).toBe("HELD");
  });
  it("激活先提交后撤权，可信收尾仍完成且累计消费不返还", async () => {
    const h = await setup(); const r = (await h.reserve(observer)).reservation;
    const results = await competing(tx => h.service.activateInTransaction(tx, h.startInput(r), h.actor), () => transaction(b, async tx => {
      await repo.lockScope(tx, h.circleId); await tx.$executeRaw`UPDATE "CircleCapabilityGrant" SET state='REVOKED', revision=revision+1 WHERE id=${h.circleGrantId}`;
    }));
    expect(results.every(r => r.ok)).toBe(true);
    const current = (await repo.byId(observer, r.id))!;
    const input = { ...h.startInput(current), action: "COMPLETE" as const, evidenceRef: "event:local-pg-complete" };
    const end = await transaction(a, tx => h.service.settleInTransaction(tx, input)); expect(end.reservation.state).toBe("COMPLETED");
    expect((await transaction(b, tx => h.service.settleInTransaction(tx, input))).effect).toBe("NONE");
    expect(await repo.usage(observer, [h.circleGrantId], new Date())).toEqual([{ grantId: h.circleGrantId, committed: 1, held: 0, active: 0 }]);
  });
  it("未开始超时可回收，真实 SQL 聚合不再占位", async () => {
    const h = await setup(); h.fixture.binding.holdSeconds = 1; const r = (await h.reserve(a)).reservation;
    await delay(Math.max(0, r.holdUntil.getTime() - Date.now()) + 20);
    await expect(transaction(a, tx => h.service.activateInTransaction(tx, h.startInput(r), h.actor))).rejects.toMatchObject({ status: 409 });
    const end = await transaction(b, tx => h.service.settleInTransaction(tx, { ...h.startInput(r), action: "EXPIRE", evidenceRef: "event:local-pg-expire" }));
    expect(end.reservation.state).toBe("EXPIRED"); expect(await repo.usage(observer, [h.circleGrantId], new Date())).toEqual([{ grantId: h.circleGrantId, committed: 0, held: 0, active: 0 }]);
  });
  it("候选十项增量按真实字典序执行且可整体回滚，不改已有业务行", async () => {
    const names = [
      "manual_add_circle_capability_01_workflow", "manual_add_circle_capability_02_quota_ledger",
      "manual_add_circle_capability_03_dispatch", "manual_add_circle_platform_direct_grant",
      "manual_add_consult_call_media_boundary", "manual_add_consult_call_media_evidence",
      "manual_add_consult_call_stop_intent", "manual_add_live_media_credential_boundary",
      "manual_add_live_media_evidence", "manual_add_live_media_stop_intent",
    ].sort();
    await expect(transaction(a, async tx => {
      await tx.$executeRawUnsafe('CREATE SCHEMA candidate_ten_migrations_qa');
      await tx.$executeRawUnsafe('SET LOCAL search_path TO candidate_ten_migrations_qa');
      // 最小依赖形状，仅合成业务行；新建隔离 schema，不触碰本测试库原有账本。
      for (const table of ["User", "Circle", "LiveRoom"]) {
        await tx.$executeRawUnsafe(`CREATE TABLE "${table}" (id TEXT PRIMARY KEY)`);
        await tx.$executeRawUnsafe(`INSERT INTO "${table}" (id) VALUES ('synthetic-existing')`);
      }
      await tx.$executeRawUnsafe('CREATE TABLE "ConsultCall" (id TEXT PRIMARY KEY, "rtcRoomId" TEXT)');
      await tx.$executeRawUnsafe("INSERT INTO \"ConsultCall\" VALUES ('synthetic-existing', 'synthetic-room')");
      for (const name of names) {
        const sql = readFileSync(path.resolve(serverRoot, `prisma/migrations/${name}/migration.sql`), "utf8");
        for (const statement of sql.replace(/--[^\n]*/g, "").split(';').filter(part => part.trim())) {
          await tx.$executeRawUnsafe(statement);
        }
      }
      const tables = await tx.$queryRaw<Array<{ table_name: string }>>`SELECT table_name FROM information_schema.tables
        WHERE table_schema='candidate_ten_migrations_qa' AND table_type='BASE TABLE' ORDER BY table_name`;
      expect(tables.map(row => row.table_name)).toEqual([
        "Circle", "CircleCapabilityAudit", "CircleCapabilityDispatch", "CircleCapabilityGrant", "CircleCapabilityQuota",
        "CircleCapabilityQuotaReceipt", "ConsultCall", "ConsultCallMediaBoundary", "LiveMediaCredentialBoundary",
        "LiveMediaEvidence", "LiveMediaStopIntent", "LiveRoom", "User",
      ].sort());
      const fields = await tx.$queryRaw<Array<{ column_name: string; data_type: string; is_nullable: string }>>`
        SELECT column_name, data_type, is_nullable FROM information_schema.columns
        WHERE table_schema='candidate_ten_migrations_qa' AND table_name='ConsultCallMediaBoundary'
          AND column_name IN ('mediaEvidence','stopIntent') ORDER BY column_name`;
      expect(fields).toEqual([
        { column_name: "mediaEvidence", data_type: "jsonb", is_nullable: "YES" },
        { column_name: "stopIntent", data_type: "jsonb", is_nullable: "YES" },
      ]);
      const grants = await tx.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM "CircleCapabilityGrant"`;
      expect(grants[0].count).toBe(0n);
      for (const table of ["User", "Circle", "LiveRoom", "ConsultCall"]) {
        expect(await tx.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM "${table}"`))
          .toEqual([{ id: "synthetic-existing" }]);
      }
      throw new Error("CANDIDATE_TEN_MIGRATIONS_ROLLBACK");
    })).rejects.toThrow("CANDIDATE_TEN_MIGRATIONS_ROLLBACK");
    expect(await observer.$queryRaw`SELECT to_regnamespace('candidate_ten_migrations_qa')::text AS schema`)
      .toEqual([{ schema: null }]);
  });
  it("不同服务者共同受同一圈级名额限制", async () => {
    const h = await setup("VIDEO_QUESTION", { maxUnits: 1, maxConcurrent: 1 }); const another = randomUUID(); await h.seed(another);
    const binding: QuotaBinding = { ...h.fixture.binding, subjectUserId: another, businessId: randomUUID(), requestKey: randomUUID() };
    const results = await competing(tx => h.service.reserveInTransaction(tx, h.fixture.binding, h.actor), () => h.reserve(b, binding));
    expect(results[1]).toMatchObject({ ok: false, error: { status: 403 } }); expect(await totals(h.circleId)).toEqual({ reservations: 1, receipts: 1 });
  });
});
