import { Test } from "@nestjs/testing";
import { MerchantPunishmentService, PUNISHMENT_SYSTEM_OPERATOR } from "./merchant-punishment.service";
import { MerchantCreditService } from "./merchant-credit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { NotificationService } from "../notification/notification.service";
import { SystemService } from "../system/system.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

const mockRedis = {
  runExclusive: jest.fn(async (_n: string, _t: number, fn: () => Promise<unknown>) => fn()),
};

const mockNotification = { send: jest.fn().mockResolvedValue({ id: "n1" }) };
const mockSystem = { isAutomationEnabled: jest.fn().mockResolvedValue(true) };

const mockPrisma: any = {
  merchant: { findUnique: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
  product: { findMany: jest.fn(), updateMany: jest.fn() },
  merchantPunishment: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
  merchantCreditLog: { findMany: jest.fn() },
  auditLog: { create: jest.fn() },
  opsTask: { findFirst: jest.fn(), create: jest.fn() },
};

const MERCHANT = { id: "m1", userId: "u1", status: "ACTIVE", shopName: "明德轩" };

describe("MerchantPunishmentService", () => {
  let svc: MerchantPunishmentService;
  let credit: MerchantCreditService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        MerchantPunishmentService,
        MerchantCreditService, // 真实实例：自动触发借用 weekKeyOf 周键计算
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: NotificationService, useValue: mockNotification },
        { provide: SystemService, useValue: mockSystem },
      ],
    }).compile();
    svc = mod.get(MerchantPunishmentService);
    credit = mod.get(MerchantCreditService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSystem.isAutomationEnabled.mockResolvedValue(true);
    mockPrisma.merchant.findUnique.mockResolvedValue({ ...MERCHANT });
    mockPrisma.merchantPunishment.findFirst.mockResolvedValue(null); // 默认无同因在罚
    mockPrisma.merchantPunishment.create.mockImplementation(async ({ data }: any) => ({ id: "p1", ...data, createdAt: new Date() }));
    mockPrisma.merchantPunishment.update.mockImplementation(async ({ data }: any) => ({ id: "p1", ...data }));
    mockPrisma.auditLog.create.mockResolvedValue({ id: "a1" });
    mockNotification.send.mockResolvedValue({ id: "n1" });
  });

  // ── 用例一：WARNING = 只记录+通知（不动商品/商家状态） ──
  it("WARNING：只落处罚行+审计+站内信，不改动任何商品/商家状态", async () => {
    const r = await svc.createPunishment({ merchantId: "m1", type: "WARNING", reason: "首次抽检不合格" }, "admin1");

    expect(r.id).toBe("p1");
    expect(mockPrisma.merchantPunishment.create).toHaveBeenCalledTimes(1);
    const row = mockPrisma.merchantPunishment.create.mock.calls[0][0].data;
    expect(row).toMatchObject({ merchantId: "m1", type: "WARNING", reason: "首次抽检不合格", status: "ACTIVE", operatorId: "admin1" });
    // 无状态改动
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.merchant.updateMany).not.toHaveBeenCalled();
    // 全部走审计 + 站内信
    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.auditLog.create.mock.calls[0][0].data).toMatchObject({
      executor: "admin1", action: "商家处罚-WARNING", targetType: "MERCHANT_PUNISHMENT", targetId: "p1",
    });
    expect(mockNotification.send).toHaveBeenCalledWith("u1", expect.objectContaining({
      type: "SYSTEM", targetType: "MERCHANT_PUNISHMENT", targetId: "p1",
    }));
    expect(mockNotification.send.mock.calls[0][1].content).toContain("警告");
  });

  // ── 用例二：PRODUCT_DOWN = 指定商品 CAS 下架并记录原状态 ──
  describe("PRODUCT_DOWN", () => {
    it("evidence.productIds 指定商品 CAS 置 OFF_SHELF（现有下架语义值·契约 OFF_SALE 无此值），evidence.snapshot 记录原状态", async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: "pd1", status: "ON_SALE" },
        { id: "pd2", status: "OFF_SHELF" }, // 已下架：记录但不改动
      ]);
      mockPrisma.product.updateMany.mockResolvedValue({ count: 1 });

      await svc.createPunishment(
        { merchantId: "m1", type: "PRODUCT_DOWN", reason: "抽检不合格", evidence: { productIds: ["pd1", "pd2"] } },
        "admin1",
      );

      // 仅 pd1 需要改动，CAS 带原状态条件
      expect(mockPrisma.product.updateMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: "pd1", status: "ON_SALE" },
        data: { status: "OFF_SHELF" },
      });
      const evidence = mockPrisma.merchantPunishment.create.mock.calls[0][0].data.evidence;
      expect(evidence.productIds).toEqual(["pd1", "pd2"]);
      expect(evidence.snapshot.products).toEqual([
        { id: "pd1", prevStatus: "ON_SALE", applied: true },
        { id: "pd2", prevStatus: "OFF_SHELF", applied: false },
      ]);
    });

    it("未指定 productIds 拒绝执行；商品不属于该商家拒绝执行（防误伤）", async () => {
      await expect(
        svc.createPunishment({ merchantId: "m1", type: "PRODUCT_DOWN", reason: "抽检不合格" }, "admin1"),
      ).rejects.toThrow("productIds");

      mockPrisma.product.findMany.mockResolvedValue([]); // 按 userId 过滤后查无此商品
      await expect(
        svc.createPunishment({ merchantId: "m1", type: "PRODUCT_DOWN", reason: "抽检不合格2", evidence: { productIds: ["other"] } }, "admin1"),
      ).rejects.toThrow("不属于该商家");
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ userId: "u1" }),
      }));
    });
  });

  // ── 用例三：SHOP_SUSPEND = 商家 CAS 置 SUSPENDED + ON_SALE 商品全下架记录清单 ──
  it("SHOP_SUSPEND：商家 CAS ACTIVE→SUSPENDED，其 ON_SALE 商品全部下架并记录清单", async () => {
    mockPrisma.merchant.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.product.findMany.mockResolvedValue([{ id: "pd1" }, { id: "pd2" }]);
    mockPrisma.product.updateMany.mockResolvedValue({ count: 1 });

    await svc.createPunishment({ merchantId: "m1", type: "SHOP_SUSPEND", reason: "30 天内 2 次三级处罚", expiresAt: "2026-07-20T00:00:00+08:00" }, "admin1");

    expect(mockPrisma.merchant.updateMany).toHaveBeenCalledWith({
      where: { id: "m1", status: "ACTIVE" }, // CAS：并发改变则不动
      data: { status: "SUSPENDED" },
    });
    expect(mockPrisma.product.updateMany).toHaveBeenCalledTimes(2);
    const row = mockPrisma.merchantPunishment.create.mock.calls[0][0].data;
    expect(row.expiresAt).toEqual(new Date("2026-07-20T00:00:00+08:00"));
    expect(row.evidence.snapshot).toEqual({
      prevMerchantStatus: "ACTIVE",
      merchantApplied: true,
      products: [
        { id: "pd1", prevStatus: "ON_SALE", applied: true },
        { id: "pd2", prevStatus: "ON_SALE", applied: true },
      ],
    });
    expect(mockNotification.send.mock.calls[0][1].content).toContain("暂停经营");
  });

  // ── 用例四：CLEAR_OUT = 标记待清退（不自动执行资金清算） ──
  it("CLEAR_OUT：标记待清退（复用 SUSPENDED 停业语义·处罚行即清退真源），🔴不触碰任何保证金/结算资金", async () => {
    mockPrisma.merchant.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.product.findMany.mockResolvedValue([]);

    const r = await svc.createPunishment({ merchantId: "m1", type: "CLEAR_OUT", reason: "售假实锤" }, "admin1");

    expect(r.type).toBe("CLEAR_OUT");
    expect(mockPrisma.merchant.updateMany).toHaveBeenCalledWith({
      where: { id: "m1", status: "ACTIVE" },
      data: { status: "SUSPENDED" },
    });
    // 红线：服务不含任何资金操作——mock 里根本没有 deposit/settlement 模型，如有调用会直接抛错；
    // 显式断言处罚行与审计均无资金字段
    const row = mockPrisma.merchantPunishment.create.mock.calls[0][0].data;
    expect(JSON.stringify(row)).not.toContain("deposit");
    expect(mockNotification.send.mock.calls[0][1].content).toContain("人工处理");
  });

  // ── 用例五：幂等（同因未撤销不重复罚） ──
  it("同商家+同类型+同原因且 ACTIVE 已存在 → 409 CONFLICT 不重复罚；已撤销的同因可再罚", async () => {
    mockPrisma.merchantPunishment.findFirst.mockResolvedValue({ id: "p0" });
    await expect(
      svc.createPunishment({ merchantId: "m1", type: "WARNING", reason: "同一原因" }, "admin1"),
    ).rejects.toMatchObject({ errorCode: ErrorCode.CONFLICT });
    expect(mockPrisma.merchantPunishment.create).not.toHaveBeenCalled();
    // 幂等查询只看未撤销的（status: ACTIVE）
    expect(mockPrisma.merchantPunishment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { merchantId: "m1", type: "WARNING", reason: "同一原因", status: "ACTIVE" },
    }));
  });

  // ── 用例六：撤销恢复 + 诚实跳过 ──
  describe("revoke", () => {
    it("按快照恢复：商家/商品 CAS 回原状态；已被其他原因改变（CAS 计 0）与处罚时未改动的诚实跳过并记录", async () => {
      mockPrisma.merchantPunishment.findUnique.mockResolvedValue({
        id: "p1", merchantId: "m1", type: "SHOP_SUSPEND", status: "ACTIVE",
        evidence: {
          snapshot: {
            prevMerchantStatus: "ACTIVE",
            merchantApplied: true,
            products: [
              { id: "pd1", prevStatus: "ON_SALE", applied: true }, // 恢复成功
              { id: "pd2", prevStatus: "ON_SALE", applied: true }, // 已被其他原因改变 → 跳过
              { id: "pd3", prevStatus: "OFF_SHELF", applied: false }, // 处罚时未改动 → 跳过
            ],
          },
        },
      });
      mockPrisma.merchant.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.product.updateMany
        .mockResolvedValueOnce({ count: 1 }) // pd1 恢复
        .mockResolvedValueOnce({ count: 0 }); // pd2 状态已变

      await svc.revoke("p1", "admin2", "申诉成立");

      // 商家恢复：CAS 仍处 SUSPENDED 才回写原状态
      expect(mockPrisma.merchant.updateMany).toHaveBeenCalledWith({
        where: { id: "m1", status: "SUSPENDED" },
        data: { status: "ACTIVE" },
      });
      // 商品恢复：只对 applied=true 的执行，共 2 次（pd3 不执行）
      expect(mockPrisma.product.updateMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: "pd1", status: "OFF_SHELF" },
        data: { status: "ON_SALE" },
      });
      const upd = mockPrisma.merchantPunishment.update.mock.calls[0][0].data;
      expect(upd.status).toBe("REVOKED");
      expect(upd.revokedBy).toBe("admin2");
      expect(upd.evidence.revoke.reason).toBe("申诉成立");
      expect(upd.evidence.revoke.result.merchant.restored).toBe(true);
      expect(upd.evidence.revoke.result.products).toEqual([
        { id: "pd1", restored: true },
        { id: "pd2", restored: false, note: expect.stringContaining("诚实跳过") },
        { id: "pd3", restored: false, note: expect.stringContaining("跳过") },
      ]);
      // 审计 + 通知商家
      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.auditLog.create.mock.calls[0][0].data.action).toBe("商家处罚撤销-SHOP_SUSPEND");
      expect(mockNotification.send).toHaveBeenCalledWith("u1", expect.objectContaining({ targetId: "p1" }));
    });

    it("不存在 404；已撤销的重复撤销 409", async () => {
      mockPrisma.merchantPunishment.findUnique.mockResolvedValueOnce(null);
      await expect(svc.revoke("no", "admin2")).rejects.toMatchObject({ errorCode: ErrorCode.NOT_FOUND });

      mockPrisma.merchantPunishment.findUnique.mockResolvedValueOnce({ id: "p1", status: "REVOKED", merchantId: "m1", type: "WARNING", evidence: {} });
      await expect(svc.revoke("p1", "admin2")).rejects.toMatchObject({ errorCode: ErrorCode.CONFLICT });
    });
  });

  // ── 用例七：自动触发（信用 D 级连续 2 周 → 自动 WARNING·operatorId=SYSTEM） ──
  describe("checkConsecutiveDGrade 自动触发", () => {
    const now = new Date("2026-07-06T03:00:00+08:00"); // 周一 03:00
    const curWeek = "2026-07-06";
    const prevWeek = "2026-06-29";

    it("近两周信用 log 均 <55 → automation_enabled 开 → 自动 WARNING（SYSTEM）", async () => {
      mockPrisma.merchant.findMany.mockResolvedValue([{ id: "m1", shopName: "明德轩" }]);
      mockPrisma.merchantCreditLog.findMany.mockResolvedValue([
        { newScore: 50, factors: { weekKey: curWeek } },
        { newScore: 52, factors: { weekKey: prevWeek } },
      ]);

      const r = await svc.checkConsecutiveDGrade(now);

      expect(r).toEqual({ checked: 1, hits: 1, warned: 1, tasks: 0 });
      const row = mockPrisma.merchantPunishment.create.mock.calls[0][0].data;
      expect(row.type).toBe("WARNING");
      expect(row.operatorId).toBe(PUNISHMENT_SYSTEM_OPERATOR);
      expect(row.reason).toContain(prevWeek);
      expect(row.reason).toContain(curWeek);
      // 自动处罚同样走审计+站内信
      expect(mockPrisma.auditLog.create.mock.calls[0][0].data.executor).toBe("SYSTEM");
      expect(mockNotification.send).toHaveBeenCalled();
      expect(mockPrisma.opsTask.create).not.toHaveBeenCalled();
    });

    it("仅本周 D（上周 ≥55）→ 不触发；只有一条 log 的新降级商家 → 不触发", async () => {
      mockPrisma.merchant.findMany.mockResolvedValue([{ id: "m1", shopName: "明德轩" }, { id: "m2", shopName: "新降级" }]);
      mockPrisma.merchantCreditLog.findMany
        .mockResolvedValueOnce([
          { newScore: 50, factors: { weekKey: curWeek } },
          { newScore: 60, factors: { weekKey: prevWeek } }, // 上周非 D
        ])
        .mockResolvedValueOnce([{ newScore: 50, factors: { weekKey: curWeek } }]); // 仅 1 周

      const r = await svc.checkConsecutiveDGrade(now);
      expect(r).toEqual({ checked: 2, hits: 0, warned: 0, tasks: 0 });
      expect(mockPrisma.merchantPunishment.create).not.toHaveBeenCalled();
    });

    it("同周重跑：createPunishment 撞同因幂等 CONFLICT → 静默跳过不算 warned", async () => {
      mockPrisma.merchant.findMany.mockResolvedValue([{ id: "m1", shopName: "明德轩" }]);
      mockPrisma.merchantCreditLog.findMany.mockResolvedValue([
        { newScore: 50, factors: { weekKey: curWeek } },
        { newScore: 52, factors: { weekKey: prevWeek } },
      ]);
      mockPrisma.merchantPunishment.findFirst.mockResolvedValue({ id: "p0" }); // 本周已罚过

      const r = await svc.checkConsecutiveDGrade(now);
      expect(r).toEqual({ checked: 1, hits: 1, warned: 0, tasks: 0 });
      expect(mockPrisma.merchantPunishment.create).not.toHaveBeenCalled();
    });

    // ── 用例八：开关关 → 只建 OpsTask 转人工 ──
    it("automation_enabled=false（一键接管）→ 不自动处罚，只建 OpsTask 转人工（同标题 pending 不重复建）", async () => {
      mockSystem.isAutomationEnabled.mockResolvedValue(false);
      mockPrisma.merchant.findMany.mockResolvedValue([{ id: "m1", shopName: "明德轩" }]);
      mockPrisma.merchantCreditLog.findMany.mockResolvedValue([
        { newScore: 50, factors: { weekKey: curWeek } },
        { newScore: 52, factors: { weekKey: prevWeek } },
      ]);
      mockPrisma.opsTask.findFirst.mockResolvedValueOnce(null);
      mockPrisma.opsTask.create.mockResolvedValue({ id: "t1" });

      const r1 = await svc.checkConsecutiveDGrade(now);
      expect(r1).toEqual({ checked: 1, hits: 1, warned: 0, tasks: 1 });
      expect(mockPrisma.merchantPunishment.create).not.toHaveBeenCalled();
      const task = mockPrisma.opsTask.create.mock.calls[0][0].data;
      expect(task).toMatchObject({ type: "REVIEW", priority: "HIGH", status: "pending" });
      expect(task.payload).toMatchObject({ merchantId: "m1", rule: "CREDIT_D_2WEEKS", suggestedType: "WARNING" });

      // 重跑：同标题 pending 已存在 → 不重复建
      mockPrisma.opsTask.findFirst.mockResolvedValueOnce({ id: "t1" });
      const r2 = await svc.checkConsecutiveDGrade(now);
      expect(r2.tasks).toBe(0);
      expect(mockPrisma.opsTask.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── 附加：列表查询按商家/状态筛选 ──
  it("list：按 merchantId/status/type 组合筛选并分页", async () => {
    mockPrisma.merchantPunishment.findMany.mockResolvedValue([{ id: "p1" }]);
    mockPrisma.merchantPunishment.count.mockResolvedValue(1);

    const r = await svc.list({ merchantId: "m1", status: "ACTIVE", page: 2, pageSize: 10 });
    expect(r).toEqual({ list: [{ id: "p1" }], total: 1, page: 2, pageSize: 10 });
    expect(mockPrisma.merchantPunishment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { merchantId: "m1", status: "ACTIVE" },
      skip: 10,
      take: 10,
    }));
  });

  it("list: page='abc' 非法入参 → skip 不为 NaN（safePagination 兜底）", async () => {
    mockPrisma.merchantPunishment.findMany.mockResolvedValue([]);
    mockPrisma.merchantPunishment.count.mockResolvedValue(0);
    await svc.list({ page: "abc" as any, pageSize: "xyz" as any });
    const callArg = mockPrisma.merchantPunishment.findMany.mock.calls[0][0];
    expect(Number.isNaN(callArg.skip)).toBe(false);
    expect(callArg.skip).toBe(0);
  });

  it("商家不存在 → MERCHANT_NOT_FOUND；未知处罚类型 → 参数校验失败", async () => {
    mockPrisma.merchant.findUnique.mockResolvedValue(null);
    await expect(svc.createPunishment({ merchantId: "no", type: "WARNING", reason: "x原因" }, "admin1"))
      .rejects.toMatchObject({ errorCode: ErrorCode.MERCHANT_NOT_FOUND });
    await expect(svc.createPunishment({ merchantId: "m1", type: "BAN" as never, reason: "x原因" }, "admin1"))
      .rejects.toMatchObject({ errorCode: ErrorCode.VALIDATION_ERROR });
  });
});
