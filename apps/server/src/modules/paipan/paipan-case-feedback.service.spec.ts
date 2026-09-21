import { PaipanCaseFeedbackService } from "./paipan-case-feedback.service";
import { BusinessException } from "../../common/business.exception";

/**
 * 应验回访服务（2026-09-19）。
 *
 * 这组用例盯的是**三条底线**，不是 CRUD：
 *   一、报告在前、结果在后（否则就是事后追认，案例一文不值）
 *   二、必须收未命中，统计不许按 verdict 过滤（否则准确率数字失去意义）
 *   三、原始反馈不是案例——通过审核必须填「可迁移规律」
 *
 * 这三条一旦破了，攒出来的案例库不但没用，还会把「怎么圆都行」这个毛病固化进模型。
 */
describe("排盘应验回访", () => {
  const makePrisma = (over: Record<string, any> = {}) => ({
    paipanRecord: {
      findFirst: jest.fn().mockResolvedValue({
        id: "rec1",
        paipanType: "QIMEN-YIN",
        inputParams: { matter: "今年生意能不能赚钱" },
      }),
    },
    aiAnalysisRecord: {
      findFirst: jest.fn().mockResolvedValue({ id: "an1", createdAt: new Date("2026-08-01T10:00:00Z") }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    paipanCaseFeedback: {
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "fb1", ...data })),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue({ id: "fb1" }),
      update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "fb1", ...data })),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    ...over,
  });

  const svc = (prisma: any) => new PaipanCaseFeedbackService(prisma as any);

  // ── 底线一：报告在前、结果在后 ──

  it("没有报告就不能回访——没有断语谈不上应验与否", async () => {
    const prisma = makePrisma();
    prisma.aiAnalysisRecord.findFirst.mockResolvedValue(null);
    await expect(
      svc(prisma).submit("u1", { paipanRecordId: "rec1", verdict: "HIT", outcome: "赚了" }),
    ).rejects.toBeInstanceOf(BusinessException);
  });

  it("回访取的是最早那份报告——针对最初那句断语，不是后来重生成的版本", async () => {
    const prisma = makePrisma();
    await svc(prisma).submit("u1", { paipanRecordId: "rec1", verdict: "HIT", outcome: "赚了" });
    expect(prisma.aiAnalysisRecord.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "asc" } }),
    );
  });

  it("记录下 reportedAt 与 outcomeAt，且结果晚于报告", async () => {
    const prisma = makePrisma();
    const r: any = await svc(prisma).submit("u1", { paipanRecordId: "rec1", verdict: "PARTIAL", outcome: "一半对" });
    expect(r.reportedAt).toEqual(new Date("2026-08-01T10:00:00Z"));
    expect(r.outcomeAt.getTime()).toBeGreaterThan(r.reportedAt.getTime());
  });

  it("排盘记录不属于当前用户时拒绝", async () => {
    const prisma = makePrisma();
    prisma.paipanRecord.findFirst.mockResolvedValue(null);
    await expect(
      svc(prisma).submit("u1", { paipanRecordId: "rec1", verdict: "HIT", outcome: "x" }),
    ).rejects.toBeInstanceOf(BusinessException);
  });

  // ── 底线二：收未命中，统计不过滤 ──

  it("MISS 照样收——说错的案例价值常常更高", async () => {
    const prisma = makePrisma();
    const r: any = await svc(prisma).submit("u1", {
      paipanRecordId: "rec1",
      verdict: "MISS",
      outcome: "完全没发生",
      whichWrong: "说会有合作，实际一个都没谈成",
    });
    expect(r.verdict).toBe("MISS");
    expect(r.whichWrong).toContain("没谈成");
  });

  it("统计以全部回访为分母，UNKNOWN 也计入——不许筛掉再算比例", async () => {
    const prisma = makePrisma();
    prisma.paipanCaseFeedback.groupBy.mockResolvedValue([
      { paipanType: "qimen-yin", channel: "prompted", verdict: "HIT", _count: { _all: 3 } },
      { paipanType: "qimen-yin", channel: "prompted", verdict: "PARTIAL", _count: { _all: 2 } },
      { paipanType: "qimen-yin", channel: "prompted", verdict: "MISS", _count: { _all: 4 } },
      { paipanType: "qimen-yin", channel: "prompted", verdict: "UNKNOWN", _count: { _all: 1 } },
    ]);
    const [row]: any = await svc(prisma).stats({ paipanType: "qimen-yin" });
    expect(row.total).toBe(10);
    // 3/10，不是 3/9（剔除 UNKNOWN）、更不是 3/5（只算有定论的）
    expect(row.hitRate).toBe(0.3);
    expect(row.anyRightRate).toBe(0.5);
  });

  it("自发反馈与回访推送分开统计，并标注选择偏差", async () => {
    const prisma = makePrisma();
    prisma.paipanCaseFeedback.groupBy.mockResolvedValue([
      { paipanType: "qimen-yin", channel: "prompted", verdict: "HIT", _count: { _all: 1 } },
      { paipanType: "qimen-yin", channel: "voluntary", verdict: "HIT", _count: { _all: 9 } },
    ]);
    const rows: any[] = await svc(prisma).stats({});
    expect(rows).toHaveLength(2);
    const vol = rows.find((r) => r.channel === "voluntary");
    expect(vol.note).toContain("选择偏差");
    expect(vol.note).toContain("不可与回访推送的数据合并解读");
  });

  // ── 底线三：原始反馈不是案例 ──

  it("通过审核必须填「可迁移规律」，否则拒绝", async () => {
    const prisma = makePrisma();
    await expect(svc(prisma).review("admin1", "fb1", { status: "APPROVED" })).rejects.toBeInstanceOf(
      BusinessException,
    );
    await expect(
      svc(prisma).review("admin1", "fb1", { status: "APPROVED", lesson: "   " }),
    ).rejects.toBeInstanceOf(BusinessException);
  });

  it("驳回不需要填可迁移规律", async () => {
    const prisma = makePrisma();
    const r: any = await svc(prisma).review("admin1", "fb1", { status: "REJECTED", reviewNote: "信息太少" });
    expect(r.status).toBe("REJECTED");
  });

  it("填了可迁移规律才能通过", async () => {
    const prisma = makePrisma();
    const r: any = await svc(prisma).review("admin1", "fb1", {
      status: "APPROVED",
      lesson: "生门逢空时不要报「有财」，要报「看着有实际抓不住」——空亡是变性不是打折",
    });
    expect(r.status).toBe("APPROVED");
    expect(prisma.paipanCaseFeedback.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reviewedBy: "admin1" }) }),
    );
  });

  // ── 回访挑选 ──

  it("已回访过的盘不再重复推送", async () => {
    const prisma = makePrisma();
    prisma.aiAnalysisRecord.findMany.mockResolvedValue([
      { id: "a1", userId: "u1", paipanRecordId: "r1", createdAt: new Date("2026-08-01"), inputSummary: "甲" },
      { id: "a2", userId: "u2", paipanRecordId: "r2", createdAt: new Date("2026-08-02"), inputSummary: "乙" },
    ]);
    prisma.paipanCaseFeedback.findMany.mockResolvedValue([{ paipanRecordId: "r1" }]);
    const due: any[] = await svc(prisma).dueForFollowUp({});
    expect(due.map((d) => d.paipanRecordId)).toEqual(["r2"]);
  });

  it("导出的案例是七段结构，且标明哪几段还要人工补", async () => {
    const prisma = makePrisma();
    prisma.paipanCaseFeedback.findMany.mockResolvedValue([
      {
        id: "fb1", matter: "问财", verdict: "MISS", outcome: "没赚到",
        whichRight: null, whichWrong: "说的合作没成",
        lesson: "生门逢空要读成虚", reportedAt: new Date("2026-08-01"), outcomeAt: new Date("2026-09-01"),
        analysisId: "an1", consent: true,
      },
    ]);
    const [c]: any = await svc(prisma).exportApproved("qimen-yin");
    expect(Object.keys(c.分段)).toEqual(["问事", "盘面", "取象", "修正", "断语", "反馈", "可迁移"]);
    // 需要人工补的段落要明说，不能留空让人以为已经齐了
    expect(c.分段.取象).toContain("需从报告正文");
    expect(c.分段.反馈).toContain("没有应验");
    expect(c.分段.可迁移).toBe("生门逢空要读成虚");
  });
});
