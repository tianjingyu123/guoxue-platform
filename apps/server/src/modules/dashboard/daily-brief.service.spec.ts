import { Test } from "@nestjs/testing";
import { DailyBriefService } from "./daily-brief.service";
import { DailyBriefController } from "./daily-brief.controller";
import { DashboardDailyService } from "./dashboard-daily.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { ROLES_KEY } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockPrisma = {
  dashboardDaily: { findUnique: jest.fn() },
  notification: { findFirst: jest.fn(), createMany: jest.fn() },
  userRole: { findMany: jest.fn() },
  withdrawalApplication: { count: jest.fn() },
  withdrawal: { count: jest.fn() },
  product: { count: jest.fn() },
  complianceScanRecord: { count: jest.fn() },
  ledgerEntry: { count: jest.fn() },
};

const mockRedis = {
  runExclusive: jest.fn((_name: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
};

const mockDaily = {
  dateStrShanghai: jest.fn((offset = 0) => (offset === -1 ? "2026-07-02" : "2026-07-03")),
  rebuildDate: jest.fn(),
};

const mockGateway = { chat: jest.fn() };

/** 昨日/前日聚合行 + 待办计数 + 收件人的标准 mock 布景 */
function primeMocks() {
  mockPrisma.notification.findFirst.mockResolvedValue(null);
  mockPrisma.dashboardDaily.findUnique.mockImplementation(({ where }: { where: { date: string } }) => {
    if (where.date === "2026-07-02") {
      return Promise.resolve({
        metrics: { dau: 130, pv: 999, newUsers: 7, gmv: 2600, ordersPaid: 9, memberNew: 3, commissionSum: 130, moduleHeat: [], errors24h: 60 },
      });
    }
    if (where.date === "2026-07-01") {
      return Promise.resolve({
        metrics: { dau: 100, pv: 800, newUsers: 10, gmv: 2000, ordersPaid: 8, memberNew: 0, commissionSum: 130, moduleHeat: [], errors24h: 5 },
      });
    }
    return Promise.resolve(null);
  });
  mockPrisma.withdrawalApplication.count.mockResolvedValue(2);
  mockPrisma.withdrawal.count.mockResolvedValue(3);
  mockPrisma.product.count.mockResolvedValue(4);
  mockPrisma.complianceScanRecord.count.mockResolvedValue(6);
  mockPrisma.ledgerEntry.count.mockResolvedValue(1);
  // 收件人含重复 userId，验证去重
  mockPrisma.userRole.findMany.mockResolvedValue([{ userId: "admin-1" }, { userId: "admin-2" }, { userId: "admin-1" }]);
  mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });
  mockGateway.chat.mockResolvedValue({ content: "GMV 与 DAU 环比大涨但新增用户下滑三成，建议排查获客渠道。" });
}

describe("DailyBriefService（看-P2）", () => {
  let svc: DailyBriefService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        DailyBriefService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: DashboardDailyService, useValue: mockDaily },
        { provide: AiGatewayService, useValue: mockGateway },
      ],
    }).compile();
    svc = mod.get(DailyBriefService);
  });

  beforeEach(() => jest.clearAllMocks());

  // 1. 组装正确：核心数+环比箭头+异常⚠+待办各一行，站内信发给去重后的管理员
  it("sendBrief：简报组装正确并给全部管理员建 SYSTEM 站内信", async () => {
    primeMocks();

    const res = await svc.sendBrief("2026-07-02");

    expect(res.skipped).toBe(false);
    expect(res.degraded).toBe(false);
    expect(res.title).toBe("运营日报 2026-07-02");
    // 核心数与环比：dau 100→130 = ⚠↑30.0%；newUsers 10→7 = ⚠↓30.0%；佣金持平 →0.0%；memberNew 0→3 = ↑新增
    expect(res.text).toContain("DAU 130（⚠↑30.0%）");
    expect(res.text).toContain("新增用户 7（⚠↓30.0%）");
    expect(res.text).toContain("GMV ¥2600.00（⚠↑30.0%）");
    expect(res.text).toContain("佣金 ¥130.00（→0.0%）");
    expect(res.text).toContain("会员新购 3（↑新增）");
    // errors24h=60 > 50 标 ⚠
    expect(res.text).toContain("⚠ 前端错误 60（超阈值 50）");
    // 待办摘要各一行：提现=WithdrawalApplication 2 + Withdrawal 3
    expect(res.text).toContain("待审提现 5 笔");
    expect(res.text).toContain("待审商品 4 件");
    expect(res.text).toContain("合规扫描待处理 6 条");
    expect(res.text).toContain("冻结分账待复核 1 笔");
    // AI 解读段
    expect(res.text).toContain("── AI 解读 ──");
    expect(mockGateway.chat).toHaveBeenCalledWith(
      expect.objectContaining({ scene: "data-summary", options: expect.objectContaining({ maxTokens: 200 }) }),
    );
    // 站内信：去重后 2 人，各一条 SYSTEM
    expect(res.sentTo).toBe(2);
    const data = mockPrisma.notification.createMany.mock.calls[0][0].data;
    expect(data).toHaveLength(2);
    expect(data.map((d: { userId: string }) => d.userId).sort()).toEqual(["admin-1", "admin-2"]);
    for (const d of data) {
      expect(d.type).toBe("SYSTEM");
      expect(d.title).toBe("运营日报 2026-07-02");
      expect(d.content).toBe(res.text);
    }
    // 当日聚合已存在 → 不触发重算
    expect(mockDaily.rebuildDate).not.toHaveBeenCalled();
  });

  // 2. 昨日聚合缺失 → 先调看-P1 rebuildDate 生成再组装
  it("sendBrief：昨日无聚合行时先调用 DashboardDailyService.rebuildDate", async () => {
    primeMocks();
    mockPrisma.dashboardDaily.findUnique.mockResolvedValue(null); // 当日/前日均缺
    mockDaily.rebuildDate.mockResolvedValue({
      date: "2026-07-02",
      metrics: { dau: 8, pv: 20, newUsers: 1, gmv: 66, ordersPaid: 1, memberNew: 0, commissionSum: 0, moduleHeat: [], errors24h: 0 },
    });

    const res = await svc.sendBrief("2026-07-02");

    expect(mockDaily.rebuildDate).toHaveBeenCalledWith("2026-07-02");
    expect(res.text).toContain("DAU 8（—）"); // 前日无数据 → 环比诚实为 —
    expect(res.sentTo).toBe(2);
  });

  // 3. AI 挂 → 降级纯数字版，简报照发不缺席
  it("sendBrief：AI 解读失败降级纯数字版，站内信照发", async () => {
    primeMocks();
    mockGateway.chat.mockRejectedValue(new Error("AI 网关超时"));

    const res = await svc.sendBrief("2026-07-02");

    expect(res.degraded).toBe(true);
    expect(res.aiInsight).toBeUndefined();
    expect(res.text).not.toContain("AI 解读");
    expect(res.text).toContain("DAU 130"); // 纯数字版仍完整
    expect(res.text).toContain("待审提现 5 笔");
    expect(res.sentTo).toBe(2);
    expect(mockPrisma.notification.createMany).toHaveBeenCalledTimes(1);
  });

  // 4. 幂等：当日已发（同标题 SYSTEM 站内信已存在）→ 跳过不重发
  it("sendBrief：当日已发过则幂等跳过", async () => {
    primeMocks();
    mockPrisma.notification.findFirst.mockResolvedValue({ id: "n-existed" });

    const res = await svc.sendBrief("2026-07-02");

    expect(res.skipped).toBe(true);
    expect(res.sentTo).toBe(0);
    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
    expect(mockGateway.chat).not.toHaveBeenCalled();
    expect(mockPrisma.dashboardDaily.findUnique).not.toHaveBeenCalled();
  });

  // 5. cron 走 runExclusive("daily-brief") 互斥·默认昨日
  it("sendYesterdayBrief：经 redis.runExclusive('daily-brief') 互斥执行昨日简报", async () => {
    primeMocks();

    await svc.sendYesterdayBrief();

    expect(mockRedis.runExclusive).toHaveBeenCalledWith("daily-brief", 600, expect.any(Function));
    const title = mockPrisma.notification.createMany.mock.calls[0][0].data[0].title;
    expect(title).toBe("运营日报 2026-07-02"); // dateStrShanghai(-1)
  });

  // 6. 非法日期拒绝
  it("sendBrief：非法日期抛异常且无副作用", async () => {
    await expect(svc.sendBrief("20260702")).rejects.toThrow();
    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
  });
});

describe("DailyBriefController 权限守卫（看-P2）", () => {
  it("控制器挂载 JwtAuthGuard + RolesGuard", () => {
    const guards: unknown[] = Reflect.getMetadata("__guards__", DailyBriefController) ?? [];
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it("brief/send 端点仅 SUPER_ADMIN", () => {
    const roles: string[] = Reflect.getMetadata(ROLES_KEY, DailyBriefController.prototype.send) ?? [];
    expect(roles).toEqual(["SUPER_ADMIN"]);
  });
});
