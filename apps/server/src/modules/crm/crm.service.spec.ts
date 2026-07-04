import { Test } from "@nestjs/testing";
import { CrmService, computeRfmTier } from "./crm.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { BusinessException } from "../../common/business.exception";
import { decrypt } from "../../common/crypto.util";
import { CLIENT_LIMIT_TRIAL } from "./crm.dto";

// 确保 serverConfig.encryptionKey 为 32 字节（加密落库断言需真实往返）
process.env.ENCRYPTION_KEY = "abcdefghijklmnopqrstuvwxyz123456";

// cron 多实例锁：透传执行（单测不测锁竞争）
const mockRedis = { runExclusive: jest.fn((_k: string, _t: number, fn: () => unknown) => fn()) };

// AI 网关：单测环境 service 内部 NODE_ENV=test 直接走模板，不会打到这里
const mockGateway = { chat: jest.fn() };

const mockPrisma = {
  clientBook: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  clientServeLog: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), aggregate: jest.fn() },
  clientReminder: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  userRole: { findFirst: jest.fn() },
  station: { findUnique: jest.fn() },
  stationOffline: { findFirst: jest.fn() },
  merchant: { findFirst: jest.fn() },
  order: { findFirst: jest.fn(), findMany: jest.fn() },
  user: { findUnique: jest.fn(), findMany: jest.fn() },
  auditLog: { create: jest.fn() },
  $transaction: jest.fn(),
};

const OWNER = "owner-1";
const DAY_MS = 86_400_000;

/** 造一条 clientBook 行 */
function clientRow(over: Record<string, unknown> = {}) {
  return {
    id: "c-1",
    ownerId: OWNER,
    name: "王姐",
    phoneEnc: null,
    birthEnc: null,
    gender: null,
    tags: [],
    source: "manual",
    sourceUserId: null,
    lastServeAt: null,
    serveCount: 0,
    totalSpend: 0,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

describe("CrmService", () => {
  let svc: CrmService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CrmService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: AiGatewayService, useValue: mockGateway },
      ],
    }).compile();
    svc = mod.get(CrmService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // 默认：无 B 端角色实体
    mockPrisma.userRole.findFirst.mockResolvedValue(null);
    mockPrisma.station.findUnique.mockResolvedValue(null);
    mockPrisma.stationOffline.findFirst.mockResolvedValue(null);
    mockPrisma.merchant.findFirst.mockResolvedValue(null);
    mockPrisma.clientBook.count.mockResolvedValue(0);
    mockPrisma.clientBook.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve(clientRow(data)),
    );
    mockPrisma.clientReminder.findFirst.mockResolvedValue(null);
    mockPrisma.clientReminder.create.mockResolvedValue({ id: "r-1" });
  });

  // ───────── 数据隔离 ─────────

  describe("ownerId 数据隔离", () => {
    it("查他人 clientId：findFirst 带 ownerId 条件查不到 → 404", async () => {
      mockPrisma.clientBook.findFirst.mockResolvedValue(null); // 他人客户在带 ownerId 的查询下不可见
      await expect(svc.getClient(OWNER, "other-client")).rejects.toThrow(BusinessException);
      const where = mockPrisma.clientBook.findFirst.mock.calls[0][0].where;
      expect(where).toEqual({ id: "other-client", ownerId: OWNER });
    });

    it("改/删他人服务记录同样 404", async () => {
      mockPrisma.clientServeLog.findFirst.mockResolvedValue(null);
      await expect(svc.deleteServeLog(OWNER, "other-log")).rejects.toThrow(BusinessException);
      expect(mockPrisma.clientServeLog.findFirst.mock.calls[0][0].where).toEqual({ id: "other-log", ownerId: OWNER });
    });

    it("完成他人提醒 404", async () => {
      mockPrisma.clientReminder.findFirst.mockResolvedValue(null);
      await expect(svc.completeReminder(OWNER, "other-rem")).rejects.toThrow(BusinessException);
    });
  });

  // ───────── M4 加密落库 ─────────

  describe("M4 加密落库", () => {
    it("创建客户：phone/birth 落库为密文（非明文）且可解回原文", async () => {
      await svc.createClient(OWNER, { name: "王姐", phone: "13812345678", birth: "1980-02-06" });
      const data = mockPrisma.clientBook.create.mock.calls[0][0].data;
      expect(data.phoneEnc).toBeDefined();
      expect(data.phoneEnc).not.toBe("13812345678"); // 非明文
      expect(decrypt(data.phoneEnc)).toBe("13812345678"); // 可逆
      expect(data.birthEnc).not.toBe("1980-02-06");
      expect(decrypt(data.birthEnc)).toBe("1980-02-06");
      // 不存在任何明文 phone/birth 字段
      expect(data.phone).toBeUndefined();
      expect(data.birth).toBeUndefined();
    });

    it("列表返回脱敏手机号，不返回明文", async () => {
      const { encrypt } = await import("../../common/crypto.util");
      mockPrisma.clientBook.findMany.mockResolvedValue([clientRow({ phoneEnc: encrypt("13812345678") })]);
      const res = await svc.listClients(OWNER, {});
      expect(res.items[0].phoneMasked).toBe("138****5678");
      expect(JSON.stringify(res.items)).not.toContain("13812345678");
    });
  });

  // ───────── 提醒三类生成（幂等）─────────

  describe("generateReminders 三类提醒", () => {
    it("生日：生辰月日在未来3天内 → 生成 BIRTHDAY（dueAt=当年生日）", async () => {
      const now = new Date(2026, 6, 10, 8, 0, 0); // 2026-07-10
      const { encrypt } = await import("../../common/crypto.util");
      mockPrisma.clientBook.findMany
        .mockResolvedValueOnce([
          { id: "c-b", ownerId: OWNER, birthEnc: encrypt("1980-07-12") }, // 2天后生日 → 命中
          { id: "c-x", ownerId: OWNER, birthEnc: encrypt("1980-08-20") }, // 远期 → 不命中
        ]) // 生日段
        .mockResolvedValueOnce([]); // 复购段
      const counts = await svc.generateReminders(now);
      expect(counts.birthday).toBe(1);
      const created = mockPrisma.clientReminder.create.mock.calls[0][0].data;
      expect(created).toMatchObject({ clientId: "c-b", ownerId: OWNER, kind: "BIRTHDAY" });
      expect(created.dueAt).toEqual(new Date(2026, 6, 12));
    });

    it("立春：2月4日窗口内全量客户生成 LICHUN；已有当年提醒则幂等跳过", async () => {
      const now = new Date(2026, 1, 4, 8, 0, 0); // 2026-02-04（窗口内）
      mockPrisma.clientBook.findMany
        .mockResolvedValueOnce([]) // 生日段（无生辰客户）
        .mockResolvedValueOnce([
          { id: "c-1", ownerId: OWNER },
          { id: "c-2", ownerId: OWNER },
        ]) // 立春段全量
        .mockResolvedValueOnce([]); // 复购段
      // c-1 已有当年立春提醒（幂等），c-2 没有
      mockPrisma.clientReminder.findFirst
        .mockResolvedValueOnce({ id: "exists" })
        .mockResolvedValueOnce(null);
      const counts = await svc.generateReminders(now);
      expect(counts.lichun).toBe(1);
      expect(mockPrisma.clientReminder.create.mock.calls[0][0].data).toMatchObject({
        clientId: "c-2",
        kind: "LICHUN",
        dueAt: new Date(2026, 1, 4),
      });
    });

    it("非立春窗口（2月6日）不生成 LICHUN", async () => {
      const now = new Date(2026, 1, 6, 8, 0, 0);
      mockPrisma.clientBook.findMany
        .mockResolvedValueOnce([]) // 生日段
        .mockResolvedValueOnce([]); // 复购段（立春段被跳过，不发起全量查询）
      const counts = await svc.generateReminders(now);
      expect(counts.lichun).toBe(0);
      // findMany 只被调 2 次（生日+复购），立春全量查询未发起
      expect(mockPrisma.clientBook.findMany).toHaveBeenCalledTimes(2);
    });

    it("复购：上次服务≥90天 → 生成 REPURCHASE；已有待办不重复", async () => {
      const now = new Date(2026, 6, 10);
      mockPrisma.clientBook.findMany
        .mockResolvedValueOnce([]) // 生日段
        .mockResolvedValueOnce([
          { id: "c-old", ownerId: OWNER },
          { id: "c-pend", ownerId: OWNER },
        ]); // 复购段（DB 已按 lastServeAt<=90天前过滤）
      mockPrisma.clientReminder.findFirst
        .mockResolvedValueOnce(null) // c-old 无待办 → 生成
        .mockResolvedValueOnce({ id: "pending" }); // c-pend 已有 → 跳过
      const counts = await svc.generateReminders(now);
      expect(counts.repurchase).toBe(1);
      expect(mockPrisma.clientReminder.create.mock.calls[0][0].data).toMatchObject({ clientId: "c-old", kind: "REPURCHASE" });
      // 复购段 DB 过滤条件正确（lastServeAt ≤ now-90d）
      const repurchaseWhere = mockPrisma.clientBook.findMany.mock.calls[1][0].where;
      expect(repurchaseWhere.lastServeAt.lte).toEqual(new Date(now.getTime() - 90 * DAY_MS));
    });
  });

  // ───────── AI 话术降级 ─────────

  describe("draftReminder", () => {
    it("单测环境走模板话术并写回 aiDraft（AI 失败降级路径同源）", async () => {
      mockPrisma.clientReminder.findFirst.mockResolvedValue({
        id: "r-1",
        kind: "BIRTHDAY",
        client: { name: "王姐", tags: ["老客"] },
      });
      mockPrisma.clientReminder.update.mockImplementation(({ data }: { data: { aiDraft: string } }) =>
        Promise.resolve({ id: "r-1", aiDraft: data.aiDraft }),
      );
      const res = await svc.draftReminder(OWNER, "r-1");
      expect(res.aiDraft).toContain("王姐");
      expect(res.aiDraft).toContain("生日");
      expect(mockGateway.chat).not.toHaveBeenCalled(); // NODE_ENV=test 不打 AI
    });
  });

  // ───────── RFM 边界 ─────────

  describe("computeRfmTier 边界", () => {
    const now = new Date(2026, 6, 10);
    const daysAgo = (n: number) => new Date(now.getTime() - n * DAY_MS);

    it("从未服务 → 沉睡", () => {
      expect(computeRfmTier({ lastServeAt: null, serveCount: 0, totalSpend: 0 }, now)).toBe("DORMANT");
    });
    it("R=30天整 → 活跃（边界含）", () => {
      expect(computeRfmTier({ lastServeAt: daysAgo(30), serveCount: 1, totalSpend: 10 }, now)).toBe("ACTIVE");
    });
    it("R=31天 → 流失预警", () => {
      expect(computeRfmTier({ lastServeAt: daysAgo(31), serveCount: 1, totalSpend: 10 }, now)).toBe("AT_RISK");
    });
    it("R=90天整 → 流失预警（边界含）", () => {
      expect(computeRfmTier({ lastServeAt: daysAgo(90), serveCount: 1, totalSpend: 10 }, now)).toBe("AT_RISK");
    });
    it("R=91天 → 沉睡", () => {
      expect(computeRfmTier({ lastServeAt: daysAgo(91), serveCount: 1, totalSpend: 10 }, now)).toBe("DORMANT");
    });
    it("M=1000整+近90天有服务 → 高价值（优先于活跃）", () => {
      expect(computeRfmTier({ lastServeAt: daysAgo(10), serveCount: 1, totalSpend: 1000 }, now)).toBe("HIGH_VALUE");
    });
    it("F=5次+R=60天 → 高价值（高价值判定优先于流失预警）", () => {
      expect(computeRfmTier({ lastServeAt: daysAgo(60), serveCount: 5, totalSpend: 0 }, now)).toBe("HIGH_VALUE");
    });
    it("高消费但超90天未服务 → 沉睡（高价值需近90天有服务）", () => {
      expect(computeRfmTier({ lastServeAt: daysAgo(120), serveCount: 9, totalSpend: 5000 }, now)).toBe("DORMANT");
    });
  });

  // ───────── 体验档 20 上限 ─────────

  describe("体验档客户上限", () => {
    it(`无 B 端角色且已有 ${CLIENT_LIMIT_TRIAL} 个 → 创建被拒(403)`, async () => {
      mockPrisma.clientBook.count.mockResolvedValue(CLIENT_LIMIT_TRIAL);
      await expect(svc.createClient(OWNER, { name: "新客" })).rejects.toThrow(/体验档/);
      expect(mockPrisma.clientBook.create).not.toHaveBeenCalled();
    });

    it("站长角色（UserRole）满20仍可创建", async () => {
      mockPrisma.userRole.findFirst.mockResolvedValue({ id: "role-1" }); // STATION_MASTER
      mockPrisma.clientBook.count.mockResolvedValue(CLIENT_LIMIT_TRIAL + 5);
      const res = await svc.createClient(OWNER, { name: "新客" });
      expect(res.name).toBe("新客");
    });

    it("商家实体（无 UserRole）满20仍可创建", async () => {
      mockPrisma.merchant.findFirst.mockResolvedValue({ id: "m-1" });
      mockPrisma.clientBook.count.mockResolvedValue(CLIENT_LIMIT_TRIAL);
      const res = await svc.createClient(OWNER, { name: "新客" });
      expect(res.name).toBe("新客");
    });

    it("订单归因入库同样受上限约束", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ userId: "buyer-1" });
      mockPrisma.clientBook.findFirst.mockResolvedValue(null); // 未入库
      mockPrisma.clientBook.count.mockResolvedValue(CLIENT_LIMIT_TRIAL);
      await expect(svc.createClientFromOrder(OWNER, { orderId: "o-1" })).rejects.toThrow(/体验档/);
    });
  });

  // ───────── 订单归因入库 ─────────

  describe("createClientFromOrder", () => {
    it("非我 ref 的订单 → 404（防订单号探测）", async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);
      await expect(svc.createClientFromOrder(OWNER, { orderId: "o-x" })).rejects.toThrow("订单不存在或非经你推荐成交");
      expect(mockPrisma.order.findFirst.mock.calls[0][0].where.referrerId).toBe(OWNER);
    });

    it("成功建档：只取昵称，不取手机号/生辰", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ userId: "buyer-1" });
      mockPrisma.clientBook.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ nickname: "李四" });
      await svc.createClientFromOrder(OWNER, { orderId: "o-1" });
      const data = mockPrisma.clientBook.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ ownerId: OWNER, name: "李四", source: "order", sourceUserId: "buyer-1" });
      expect(data.phoneEnc).toBeUndefined();
      expect(data.birthEnc).toBeUndefined();
    });

    it("已入库 → 409 冲突", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ userId: "buyer-1" });
      mockPrisma.clientBook.findFirst.mockResolvedValue({ id: "exists" });
      await expect(svc.createClientFromOrder(OWNER, { orderId: "o-1" })).rejects.toThrow("已在你的客户簿");
    });
  });

  // ───────── suggested-clients 脱敏 ─────────

  describe("suggestedClients", () => {
    it("近30天 ref 成交未入库买家：昵称脱敏返回", async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { id: "o-1", userId: "buyer-1", payAmount: 100, amount: 100, createdAt: new Date() },
        { id: "o-2", userId: "buyer-1", payAmount: 50, amount: 50, createdAt: new Date() },
      ]);
      mockPrisma.clientBook.findMany.mockResolvedValue([]); // 均未入库
      mockPrisma.user.findMany.mockResolvedValue([{ id: "buyer-1", nickname: "张三丰" }]);
      const res = await svc.suggestedClients(OWNER);
      expect(res.items).toHaveLength(1);
      expect(res.items[0]).toMatchObject({ orderId: "o-1", orderCount: 2, totalAmount: 150 });
      expect(res.items[0].nickname).toBe("张**"); // 脱敏
    });

    it("已入库买家不再出现", async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { id: "o-1", userId: "buyer-1", payAmount: 100, amount: 100, createdAt: new Date() },
      ]);
      mockPrisma.clientBook.findMany.mockResolvedValue([{ sourceUserId: "buyer-1" }]);
      const res = await svc.suggestedClients(OWNER);
      expect(res.items).toHaveLength(0);
    });
  });
});
