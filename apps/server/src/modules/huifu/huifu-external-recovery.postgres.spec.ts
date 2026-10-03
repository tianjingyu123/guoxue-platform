import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { HuifuService } from "./huifu.service";
import { PrismaService } from "../../prisma/prisma.service";
import { FundApprovalService } from "../fund-approval/fund-approval.service";
import { FundApprovalExecutor } from "../fund-approval/fund-approval.executor";

const testUrl = process.env.HUIFU_RECOVERY_TEST_DATABASE_URL;
const databaseName = "entitlement_notice_qa_phase96_huifu_recovery";
if (testUrl) {
  const u = new URL(testUrl);
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || u.port !== "55480" || u.username !== "qa_voice" || u.pathname !== `/${databaseName}`) throw new Error("出款恢复仅允许指定本机合成库");
}
type Kind = "REFUND" | "SPLIT";
const kinds: Kind[] = ["REFUND", "SPLIT"];
const deferred = () => { let release!: () => void; const promise = new Promise<void>(r => { release = r; }); return { promise, release }; };
jest.setTimeout(30000);

/** 实库负责事务、持久化与并发；callApi合成响应不是汇付渠道验收。 */
(testUrl ? describe : describe.skip)("汇付未知出款先查后决真实事务", () => {
  let db: PrismaClient;
  const ids: string[] = [], users: string[] = [];
  const realFetch = global.fetch;
  const fixture = async (baseline = true) => {
    const id = randomUUID(); ids.push(id);
    const record = await db.huifuSplitRecord.create({ data: { orderId: id, outTradeNo: `PAY${id.replace(/-/g, "").slice(0, 29)}`, totalAmount: 100, createdAt: new Date("2026-01-01T12:00:00Z"), rawRequest: { req_date: "20260101" } } });
    await db.huifuSplitRecord.update({ where: { orderId: id }, data: { rawRequest: { req_date: "20260101", req_seq_id: record.outTradeNo } } });
    if (baseline) await db.auditLog.create({ data: { action: "HUIFU_PAYMENT_RECOVERY_BASELINE", targetType: "HUIFU_SPLIT", targetId: id, detail: JSON.stringify({ version: 1, orderId: id, outTradeNo: record.outTradeNo, merchantId: "synthetic-merchant" }) } });
    return id;
  };
  const result = (data: any, stat = "P") => ({ resp_code: "00000000", trans_stat: stat, huifu_id: data.huifu_id, org_req_date: data.org_req_date, org_req_seq_id: data.org_req_seq_id, ord_amt: "100.00" });
  const service = (client: unknown = db, day = "20261001", responder: any = (_path: string, data: any) => result(data)) => {
    const svc = new HuifuService(client as PrismaService, { del: jest.fn() } as any);
    jest.spyOn(svc as any, "getConfig").mockImplementation(async (key: any) => key === "merchantId" ? "synthetic-merchant" : "https://example.test/notify");
    jest.spyOn(svc as any, "reqDate").mockImplementation((date: any) => date ? "20260101" : day);
    const call = jest.spyOn(svc as any, "callApi").mockImplementation(responder);
    return { svc, call };
  };
  const dto = (id: string) => ({ orderId: id, amount: 100, receivers: [{ acctId: "synthetic-receiver", amount: 100, name: "合成接收方" }] });
  const invoke = (svc: HuifuService, kind: Kind, id: string) => kind === "REFUND" ? svc.createRefund(dto(id)) : svc.createSplit(dto(id));
  const query = (svc: HuifuService, kind: Kind, id: string) => kind === "REFUND" ? svc.queryRefund(id) : svc.querySplit(id);
  const intent = async (kind: Kind, id: string) => {
    const row = await db.auditLog.findFirstOrThrow({ where: { action: `HUIFU_${kind}_INTENT`, targetId: id } });
    return JSON.parse(row.detail!).request;
  };
  const isQuery = (path: string) => path.endsWith("query");
  const failBeforeCommit = () => new Proxy(db, { get(target, key) {
    const value = Reflect.get(target, key);
    if (key === "$transaction") return (callback: (tx: unknown) => Promise<unknown>, options: unknown) => Reflect.apply(value, target, [async (tx: unknown) => { await callback(tx); throw new Error("合成提交前故障"); }, options]);
    return typeof value === "function" ? value.bind(target) : value;
  } });
  beforeAll(async () => {
    global.fetch = jest.fn(async () => { throw new Error("禁止真实渠道网络请求"); }) as any;
    db = new PrismaClient({ datasources: { db: { url: testUrl } } });
    const [identity] = await db.$queryRaw<Array<{ port: number; db: string; user: string }>>`SELECT inet_server_port() AS port, current_database() AS db, current_user AS "user"`;
    expect(identity).toEqual({ port: 55480, db: databaseName, user: "qa_voice" });
  });
  afterEach(async () => {
    await db.fundApproval.deleteMany({ where: { requestedBy: { in: users } } });
    await db.auditLog.deleteMany({ where: { targetId: { in: ids } } });
    await db.huifuSplitRecord.deleteMany({ where: { orderId: { in: ids } } });
    await db.order.deleteMany({ where: { id: { in: ids.splice(0) } } });
    await db.userRole.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
    jest.restoreAllMocks();
  });
  afterAll(async () => { global.fetch = realFetch; await db.$disconnect(); });

  it.each(kinds)("%s首次记录先提交，跨日新实例只查询原出款日期流水", async kind => {
    const id = await fixture();
    const first = service(db, "20261001", async (path: string) => {
      expect(isQuery(path)).toBe(false);
      const saved = await intent(kind, id); expect(saved.req_date).toBe("20261001"); expect(saved.org_req_date).toBe("20260101");
      return { resp_code: "00000000", trans_stat: "P" };
    });
    await invoke(first.svc, kind, id);
    const saved = await intent(kind, id), second = service(db, "20261002");
    const recovered = await invoke(second.svc, kind, id);
    expect(recovered).toMatchObject({ resultUnknown: false });
    expect(second.call).toHaveBeenCalledTimes(1);
    expect(second.call).toHaveBeenCalledWith(kind === "REFUND" ? "/v3/trade/payment/scanpay/refundquery" : "/v2/trade/payment/delaytrans/confirmquery", { huifu_id: "synthetic-merchant", org_req_date: "20261001", org_req_seq_id: saved.req_seq_id }, true);
    expect(await db.auditLog.count({ where: { action: `HUIFU_${kind}_INTENT`, targetId: id } })).toBe(1);
  });
  it.each(kinds)("%s提交前故障实际回滚且未出站，重试仅首次发送", async kind => {
    const id = await fixture(), first = service(failBeforeCommit());
    await expect(invoke(first.svc, kind, id)).rejects.toThrow("合成提交前故障"); expect(first.call).not.toHaveBeenCalled();
    expect(await db.auditLog.count({ where: { action: `HUIFU_${kind}_INTENT`, targetId: id } })).toBe(0);
    expect((await db.huifuSplitRecord.findUniqueOrThrow({ where: { orderId: id } })).splitStatus).toBe("PENDING");
    const retry = service(); await invoke(retry.svc, kind, id); expect(retry.call).toHaveBeenCalledTimes(1); expect(isQuery(retry.call.mock.calls[0][0] as string)).toBe(false);
  });
  it.each(["REFUND", "SPLIT", "PAYMENT"])("%s首次审计实际SQL失败全部回滚，禁止出站", async kind => {
    const id = kind === "PAYMENT" ? randomUUID() : await fixture();
    let userId = "";
    if (kind === "PAYMENT") {
      ids.push(id); const user = await db.user.create({ data: { nickname: "合成SQL故障用户" } }); users.push(user.id); userId = user.id;
      await db.order.create({ data: { id, userId, type: "PRODUCT", targetId: "synthetic-product", amount: 100 } });
    }
    await db.$executeRawUnsafe(`CREATE FUNCTION qa_huifu_audit_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."targetId"='${id}' AND NEW.action='HUIFU_${kind === "PAYMENT" ? "PAYMENT_RECOVERY_BASELINE" : `${kind}_INTENT`}' THEN PERFORM 1/0; END IF; RETURN NEW; END $$`);
    await db.$executeRawUnsafe('CREATE TRIGGER qa_huifu_audit_fault BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION qa_huifu_audit_fault()');
    const hf = service();
    try {
      const attempt = kind === "PAYMENT" ? hf.svc.createPayment(userId, { orderId: id, payType: "ALIPAY" }) : invoke(hf.svc, kind as Kind, id);
      await expect(attempt).rejects.toThrow(); expect(hf.call).not.toHaveBeenCalled();
      expect(await db.auditLog.count({ where: { targetId: id, action: { not: "HUIFU_PAYMENT_RECOVERY_BASELINE" } } })).toBe(0);
      if (kind === "PAYMENT") { expect(await db.huifuSplitRecord.count({ where: { orderId: id } })).toBe(0); expect((await db.order.findUniqueOrThrow({ where: { id } })).payTransactionId).toBeNull(); }
      else expect((await db.huifuSplitRecord.findUniqueOrThrow({ where: { orderId: id } })).splitStatus).toBe("PENDING");
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER qa_huifu_audit_fault ON "AuditLog"'); await db.$executeRawUnsafe('DROP FUNCTION qa_huifu_audit_fault()');
    }
  });
  it.each(kinds.flatMap(kind => ["网络超时", "汇付资金响应验签失败", "已受理但响应丢失"].map(fault => [kind, fault] as const)))("%s%s保留身份，重启后不重复发送", async (kind, fault) => {
    const id = await fixture(), first = service(db, "20261001", async () => { throw new Error(fault); });
    await expect(invoke(first.svc, kind, id)).rejects.toThrow(fault); expect((await intent(kind, id)).req_date).toBe("20261001");
    const retry = service(db, "20261003"); await invoke(retry.svc, kind, id); expect(retry.call).toHaveBeenCalledTimes(1); expect(isQuery(retry.call.mock.calls[0][0] as string)).toBe(true);
  });
  it.each(kinds)("%s网络等待期间释放数据库锁，并发另一实例只查询", async kind => {
    const id = await fixture(), ready = deferred(), gate = deferred();
    const first = service(db, "20261001", async () => { ready.release(); await gate.promise; return { resp_code: "00000000", trans_stat: "P" }; });
    const pending = invoke(first.svc, kind, id); await ready.promise;
    try {
      await db.$transaction(async tx => { await tx.$executeRawUnsafe("SET LOCAL lock_timeout='500ms'"); await tx.huifuSplitRecord.update({ where: { orderId: id }, data: { errorMsg: "合成锁释放验证" } }); });
      const second = service(); await invoke(second.svc, kind, id); expect(second.call).toHaveBeenCalledTimes(1); expect(isQuery(second.call.mock.calls[0][0] as string)).toBe(true);
      expect(await db.auditLog.count({ where: { action: `HUIFU_${kind}_INTENT`, targetId: id } })).toBe(1);
    } finally { gate.release(); await pending; }
    expect(first.call).toHaveBeenCalledTimes(1);
  });
  const mutations = ["查询失败", "原交易不存在", "初始态", "缺商户", "错商户", "缺日期", "错日期", "错流水", "缺状态"];
  it.each(kinds.flatMap(kind => mutations.map(mutation => [kind, mutation] as const)))("%s%s保持未知且不重发", async (kind, mutation) => {
    const id = await fixture(); await invoke(service().svc, kind, id);
    const next = service(db, "20261002", async (_path: string, data: any) => {
      const r: any = result(data, "S");
      if (mutation === "查询失败") r.resp_code = "90000000";
      if (mutation === "原交易不存在") { r.resp_code = "10000000"; r.resp_desc = "原交易不存在"; }
      if (mutation === "初始态") r.trans_stat = "I";
      if (mutation === "缺商户") delete r.huifu_id;
      if (mutation === "错商户") r.huifu_id = "other";
      if (mutation === "缺日期") delete r.org_req_date;
      if (mutation === "错日期") r.org_req_date = "20261002";
      if (mutation === "错流水") r.org_req_seq_id = "other";
      if (mutation === "缺状态") delete r.trans_stat;
      return r;
    });
    const before = await db.huifuSplitRecord.findUniqueOrThrow({ where: { orderId: id } });
    expect(await query(next.svc, kind, id)).toMatchObject({ resultUnknown: true });
    await expect(invoke(next.svc, kind, id)).rejects.toThrow("不自动重新发起");
    expect(next.call.mock.calls.every(([path]) => isQuery(path as string))).toBe(true);
    expect(await db.huifuSplitRecord.findUniqueOrThrow({ where: { orderId: id } })).toEqual(before);
  });
  it.each([undefined, "99.99", "100.001", "NaN", "Infinity"])("退款查询金额%s不可信保持未知", async amount => {
    const id = await fixture(); await invoke(service().svc, "REFUND", id);
    const next = service(db, "20261002", (_path: string, data: any) => ({ ...result(data, "S"), ord_amt: amount }));
    expect(await next.svc.queryRefund(id)).toMatchObject({ resultUnknown: true });
  });
  it.each(kinds.flatMap(kind => ["P", "S", "F"].map(stat => [kind, stat] as const)))("%s身份可信的%s与查询失败区分", async (kind, stat) => {
    const id = await fixture(); await invoke(service().svc, kind, id);
    const next = service(db, "20261002", (_path: string, data: any) => result(data, stat));
    expect(await query(next.svc, kind, id)).toMatchObject({ resultUnknown: false, [kind === "REFUND" ? "refundStatus" : "splitStatus"]: ({ P: "PROCESSING", S: "SUCCESS", F: "FAILED" } as any)[stat] });
  });
  it.each(kinds)("%s无旧日志也不能把旧支付追认成从未出款", async kind => {
    const id = await fixture(false), next = service(); await expect(invoke(next.svc, kind, id)).rejects.toThrow("不自动重新发起"); expect(next.call).not.toHaveBeenCalled();
    expect(await db.auditLog.count({ where: { targetId: id } })).toBe(0);
  });
  it.each(kinds.flatMap(kind => ["损坏记录", "重复记录"].map(mode => [kind, mode] as const)))("%s%s不猜首次日期且不出站", async (kind, mode) => {
    const id = await fixture(); await invoke(service().svc, kind, id);
    const row = await db.auditLog.findFirstOrThrow({ where: { action: `HUIFU_${kind}_INTENT`, targetId: id } });
    if (mode === "损坏记录") await db.auditLog.update({ where: { id: row.id }, data: { detail: "bad-json" } });
    else await db.auditLog.create({ data: { action: row.action, targetType: row.targetType, targetId: row.targetId, detail: row.detail } });
    const next = service(); await expect(invoke(next.svc, kind, id)).rejects.toThrow("不自动重新发起"); expect(next.call).not.toHaveBeenCalled();
  });
  it("已有旧退款结果日志不再发起", async () => {
    const id = await fixture(); await db.auditLog.create({ data: { action: "HUIFU_REFUND", targetType: "HUIFU_SPLIT", targetId: id, detail: "{}" } });
    const next = service(); await expect(next.svc.createRefund(dto(id))).rejects.toThrow("不自动重新发起"); expect(next.call).not.toHaveBeenCalled();
  });
  it("原分账接收方变化拒绝且不重发", async () => {
    const id = await fixture(); await service().svc.createSplit(dto(id)); const next = service();
    await expect(next.svc.createSplit({ ...dto(id), receivers: [{ acctId: "other", amount: 100, name: "合成其他人" }] })).rejects.toThrow("已变化"); expect(next.call).not.toHaveBeenCalled();
  });
  it("分账查询成功后迟到的首次处理中响应不能覆盖成功", async () => {
    const id = await fixture(), ready = deferred(), gate = deferred();
    const first = service(db, "20261001", async () => { ready.release(); await gate.promise; return { resp_code: "00000000", trans_stat: "P" }; });
    const pending = first.svc.createSplit(dto(id)); await ready.promise;
    try { expect(await service(db, "20261002", (_path: string, data: any) => result(data, "S")).svc.querySplit(id)).toMatchObject({ splitStatus: "SUCCESS" }); }
    finally { gate.release(); }
    expect(await pending).toMatchObject({ splitStatus: "SUCCESS" });
    expect((await db.huifuSplitRecord.findUniqueOrThrow({ where: { orderId: id } })).splitStatus).toBe("SUCCESS");
    expect(await service().svc.querySplit(id)).toMatchObject({ splitStatus: "SUCCESS" });
  });
  it("分账受理后实际结果写库失败，首次意图保留且重试只查询", async () => {
    const id = await fixture();
    await db.$executeRawUnsafe(`CREATE FUNCTION qa_huifu_result_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."orderId"='${id}' AND NEW."rawResponse"->>'trans_stat'='P' THEN PERFORM 1/0; END IF; RETURN NEW; END $$`);
    await db.$executeRawUnsafe('CREATE TRIGGER qa_huifu_result_fault BEFORE UPDATE ON "HuifuSplitRecord" FOR EACH ROW EXECUTE FUNCTION qa_huifu_result_fault()');
    const first = service();
    try { await expect(first.svc.createSplit(dto(id))).rejects.toThrow(); expect(first.call).toHaveBeenCalledTimes(1); expect(await intent("SPLIT", id)).toBeDefined(); }
    finally { await db.$executeRawUnsafe('DROP TRIGGER qa_huifu_result_fault ON "HuifuSplitRecord"'); await db.$executeRawUnsafe('DROP FUNCTION qa_huifu_result_fault()'); }
    const retry = service(db, "20261002", (_path: string, data: any) => result(data, "S"));
    expect(await retry.svc.createSplit(dto(id))).toMatchObject({ splitStatus: "SUCCESS" }); expect(isQuery(retry.call.mock.calls[0][0] as string)).toBe(true);
  });
  it("退款结果日志实际SQL失败，首次意图保留且重试只查询", async () => {
    const id = await fixture();
    await db.$executeRawUnsafe(`CREATE FUNCTION qa_huifu_result_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."targetId"='${id}' AND NEW.action='HUIFU_REFUND' THEN PERFORM 1/0; END IF; RETURN NEW; END $$`);
    await db.$executeRawUnsafe('CREATE TRIGGER qa_huifu_result_fault BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION qa_huifu_result_fault()');
    const first = service();
    try { await first.svc.createRefund(dto(id)); expect(await intent("REFUND", id)).toBeDefined(); expect(await db.auditLog.count({ where: { action: "HUIFU_REFUND", targetId: id } })).toBe(0); }
    finally { await db.$executeRawUnsafe('DROP TRIGGER qa_huifu_result_fault ON "AuditLog"'); await db.$executeRawUnsafe('DROP FUNCTION qa_huifu_result_fault()'); }
    const retry = service(); await retry.svc.createRefund(dto(id)); expect(isQuery(retry.call.mock.calls[0][0] as string)).toBe(true); expect(first.call).toHaveBeenCalledTimes(1);
  });
  it.each(kinds.flatMap(kind => ["20260230", "20261301", "invalid"].map(date => [kind, date] as const)))("%s损坏首次日期%s不猜日期查询", async (kind, date) => {
    const id = await fixture(); await invoke(service().svc, kind, id);
    const row = await db.auditLog.findFirstOrThrow({ where: { action: `HUIFU_${kind}_INTENT`, targetId: id } }); const detail = JSON.parse(row.detail!); detail.request.req_date = date;
    await db.auditLog.update({ where: { id: row.id }, data: { detail: JSON.stringify(detail) } });
    const next = service(); expect(await query(next.svc, kind, id)).toMatchObject({ resultUnknown: true }); expect(next.call).not.toHaveBeenCalled();
  });
  it.each(kinds)("%s原支付流水改变不查询不重发", async kind => {
    const id = await fixture(); await invoke(service().svc, kind, id);
    await db.huifuSplitRecord.update({ where: { orderId: id }, data: { outTradeNo: `CHANGED${id.replace(/-/g, "")}` } });
    const next = service(); expect(await query(next.svc, kind, id)).toMatchObject({ resultUnknown: true }); expect(next.call).not.toHaveBeenCalled();
  });
  it.each(kinds)("%s实际审批失败回待审，后续查询成功只批准一次", async kind => {
    const id = await fixture(), actor = await db.user.create({ data: { nickname: "合成发起者" } }), reviewer = await db.user.create({ data: { nickname: "合成财务" } }); users.push(actor.id, reviewer.id);
    await db.userRole.create({ data: { userId: reviewer.id, roleType: "FINANCE_ADMIN" } });
    const approvals = new FundApprovalService(db as unknown as PrismaService);
    const approval = await approvals.create({ type: kind === "REFUND" ? "REFUND" : "HUIFU_SPLIT", payload: dto(id), amount: 100, summary: "合成未知出款审批", requestedBy: actor.id });
    const hf = service(db, "20261001", async () => { throw new Error("合成渠道结果未知"); });
    const executor = (svc: HuifuService) => new FundApprovalExecutor(approvals, undefined!, svc, undefined!, undefined!, undefined!, undefined!, undefined!);
    await expect(executor(hf.svc).review(approval.approvalId, true, undefined, reviewer.id)).rejects.toThrow("合成渠道结果未知");
    expect((await approvals.findById(approval.approvalId)).status).toBe("PENDING"); expect(await intent(kind, id)).toBeDefined();
    const recovered = service(db, "20261003", (_path: string, data: any) => result(data, "S"));
    expect(await executor(recovered.svc).review(approval.approvalId, true, undefined, reviewer.id)).toMatchObject({ approved: true });
    expect((await approvals.findById(approval.approvalId)).status).toBe("APPROVED"); expect(isQuery(recovered.call.mock.calls[0][0] as string)).toBe(true); expect(hf.call).toHaveBeenCalledTimes(1);
    await expect(executor(recovered.svc).review(approval.approvalId, true, undefined, reviewer.id)).rejects.toThrow(); expect(recovered.call).toHaveBeenCalledTimes(1);
  });
  it("分账提交已成功但回执丢失，待审重试须查询原成功结果", async () => {
    const id = await fixture(), actor = await db.user.create({ data: { nickname: "合成发起者" } }), reviewer = await db.user.create({ data: { nickname: "合成财务" } }); users.push(actor.id, reviewer.id);
    await db.userRole.create({ data: { userId: reviewer.id, roleType: "FINANCE_ADMIN" } });
    const approvals = new FundApprovalService(db as unknown as PrismaService), approval = await approvals.create({ type: "HUIFU_SPLIT", payload: dto(id), amount: 100, summary: "合成提交回执丢失", requestedBy: actor.id });
    let transactions = 0;
    const client = new Proxy(db, { get(target, key) {
      const value = Reflect.get(target, key);
      if (key === "$transaction") return async (...args: unknown[]) => { const result = await Reflect.apply(value, target, args); if (++transactions === 2) throw new Error("合成已提交回执丢失"); return result; };
      return typeof value === "function" ? value.bind(target) : value;
    } });
    const first = service(client, "20261001", () => ({ resp_code: "00000000", trans_stat: "S" }));
    const executor = (svc: HuifuService) => new FundApprovalExecutor(approvals, undefined!, svc, undefined!, undefined!, undefined!, undefined!, undefined!);
    await expect(executor(first.svc).review(approval.approvalId, true, undefined, reviewer.id)).rejects.toThrow("合成已提交回执丢失");
    expect((await db.huifuSplitRecord.findUniqueOrThrow({ where: { orderId: id } })).splitStatus).toBe("SUCCESS"); expect((await approvals.findById(approval.approvalId)).status).toBe("PENDING");
    const next = service(db, "20261002", (_path: string, data: any) => result(data, "S"));
    expect(await executor(next.svc).review(approval.approvalId, true, undefined, reviewer.id)).toMatchObject({ approved: true });
    expect(next.call).toHaveBeenCalledTimes(1); expect(isQuery(next.call.mock.calls[0][0] as string)).toBe(true); expect(first.call).toHaveBeenCalledTimes(1);
  });
  it.each([false, true])("新支付基线与订单认领同事务，提交故障=%s", async fault => {
    const user = await db.user.create({ data: { nickname: "合成支付用户" } }); users.push(user.id);
    const order = await db.order.create({ data: { userId: user.id, type: "PRODUCT", targetId: "synthetic-product", amount: 100 } }); ids.push(order.id);
    const hf = service(fault ? failBeforeCommit() : db, "20261001", async () => {
      expect(await db.auditLog.count({ where: { action: "HUIFU_PAYMENT_RECOVERY_BASELINE", targetId: order.id } })).toBe(1);
      return { resp_code: "00000100", trans_stat: "P", qr_code: "https://example.test/qr" };
    });
    const attempt = hf.svc.createPayment(user.id, { orderId: order.id, payType: "ALIPAY" });
    if (fault) {
      await expect(attempt).rejects.toThrow("合成提交前故障"); expect(hf.call).not.toHaveBeenCalled();
      expect(await db.huifuSplitRecord.count({ where: { orderId: order.id } })).toBe(0); expect(await db.auditLog.count({ where: { targetId: order.id } })).toBe(0);
      expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).payTransactionId).toBeNull();
    } else {
      await attempt; expect(hf.call).toHaveBeenCalledTimes(1);
      await db.auditLog.deleteMany({ where: { targetId: order.id } });
      await hf.svc.createPayment(user.id, { orderId: order.id, payType: "ALIPAY" });
      expect(await db.auditLog.count({ where: { targetId: order.id } })).toBe(0); expect(hf.call).toHaveBeenCalledTimes(1);
    }
  });
});
