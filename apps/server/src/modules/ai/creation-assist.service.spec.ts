import { Test } from "@nestjs/testing";
import { CreationAssistService } from "./creation-assist.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  classicChapter: { findMany: jest.fn() },
  paipanRecord: { findFirst: jest.fn() },
  post: { findMany: jest.fn() },
  contentQualityScore: { findMany: jest.fn() },
};

const mockGateway = { chat: jest.fn() };

describe("CreationAssistService（创-P2 AI 实时创作三能力）", () => {
  let svc: CreationAssistService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CreationAssistService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiGatewayService, useValue: mockGateway },
      ],
    }).compile();
    svc = mod.get(CreationAssistService);
  });

  beforeEach(() => jest.clearAllMocks());

  // ───────── 能力一：古籍引用推荐 ─────────

  const chapterRows = [
    {
      id: "c1",
      title: "乾卦",
      content: "天行健，君子以自强不息。潜龙勿用，阳在下也。",
      book: { id: "b1", title: "周易" },
    },
    {
      id: "c2",
      title: "坤卦",
      content: "地势坤，君子以厚德载物。自强不息者，天道之常也。",
      book: { id: "b1", title: "周易" },
    },
  ];

  it("古籍引用·正常链路：检索候选 → AI 复排序号生效，返回引用卡字段齐全且片段≤120字", async () => {
    mockPrisma.classicChapter.findMany.mockResolvedValue(chapterRows);
    mockGateway.chat.mockResolvedValue({ content: "[2, 1]" });

    const res = await svc.classicQuotes("u1", "谈谈自强不息与厚德载物的精神传承");

    expect(res.keywords.length).toBeGreaterThan(0);
    expect(res.items).toHaveLength(2);
    // AI 复排顺序：候选2（c2）在前
    expect(res.items[0].chapterId).toBe("c2");
    expect(res.items[1].chapterId).toBe("c1");
    for (const it of res.items) {
      expect(it.quote.length).toBeGreaterThan(0);
      expect(it.quote.length).toBeLessThanOrEqual(120);
      expect(it.bookTitle).toBe("周易");
      expect(it.chapterTitle).toBeTruthy();
      expect(it.bookId).toBe("b1");
    }
    // 检索层只查已发布未删（embedding 替换点的既有契约）
    expect(mockPrisma.classicChapter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          book: { status: "PUBLISHED", deletedAt: null },
        }),
        take: 20,
      }),
    );
  });

  it("古籍引用·降级：AI 复排失败 → 不抛错，按词频命中排返回（至多3条）", async () => {
    mockPrisma.classicChapter.findMany.mockResolvedValue(chapterRows);
    mockGateway.chat.mockRejectedValue(new Error("AI 网关超时"));

    const res = await svc.classicQuotes("u1", "谈谈自强不息与厚德载物的精神传承");

    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.length).toBeLessThanOrEqual(3);
    expect(res.items[0].chapterId).toBeTruthy();
  });

  it("古籍引用·空关键词：全停用字文本 → 不查库不调AI，返回空", async () => {
    const res = await svc.classicQuotes("u1", "的了是就都还也很");

    expect(res.items).toEqual([]);
    expect(res.keywords).toEqual([]);
    expect(mockPrisma.classicChapter.findMany).not.toHaveBeenCalled();
    expect(mockGateway.chat).not.toHaveBeenCalled();
  });

  // ───────── 能力二：命盘卡渲染 ─────────

  it("命盘卡·干支路径：合法四柱 → 返回结构化盘面（十神/纳音/五行分布计8字）", async () => {
    const card = await svc.paipanCard("u1", { nian: "甲子", yue: "丙寅", ri: "戊午", shi: "壬戌" });

    expect(card.source).toBe("ganzhi");
    expect(card.riZhu).toBe("戊午");
    expect(card.ganZhiText).toBe("甲子 丙寅 戊午 壬戌");
    expect(card.siZhu.ri.ganShiShen).toBe("日主");
    expect(card.siZhu.nian.ganShiShen).toBeTruthy(); // 复用引擎 calcShiShen 真算
    expect(card.siZhu.nian.nayin).toBeTruthy(); // 纳音复用 NA_YIN
    // 五行分布：甲木子水丙火寅木戊土午火壬水戌土 → 木2火2土2金0水2，共8
    const { 木, 火, 土, 金, 水, desc } = card.wuXing;
    expect(木 + 火 + 土 + 金 + 水).toBe(8);
    expect(金).toBe(0);
    expect(desc).toContain("缺金");
    // R3 脱敏由构造保证：卡内不含姓名/生辰字段
    expect(JSON.stringify(card)).not.toMatch(/clientName|clientBirth/);
  });

  it("命盘卡·非法干支：非六十甲子组合（甲丑）→ 抛业务异常", async () => {
    await expect(svc.paipanCard("u1", { nian: "甲丑", yue: "丙寅", ri: "戊午", shi: "壬戌" })).rejects.toThrow(
      BusinessException,
    );
  });

  it("命盘卡·缺参：既无记录ID也未给全四柱 → 抛业务异常", async () => {
    await expect(svc.paipanCard("u1", { nian: "甲子" })).rejects.toThrow(BusinessException);
  });

  it("命盘卡·记录路径：本人八字记录 → 从 resultData.siZhu 取盘面", async () => {
    mockPrisma.paipanRecord.findFirst.mockResolvedValue({
      id: "r1",
      paipanType: "BAZI",
      resultData: {
        siZhu: {
          nian: { gan: "甲", zhi: "子" },
          yue: { gan: "丙", zhi: "寅" },
          ri: { gan: "戊", zhi: "午" },
          shi: { gan: "壬", zhi: "戌" },
        },
      },
    });

    const card = await svc.paipanCard("u1", { paipanRecordId: "r1" });

    expect(card.source).toBe("record");
    expect(card.recordId).toBe("r1");
    expect(card.paipanType).toBe("BAZI");
    expect(card.riZhu).toBe("戊午");
    // R3 归属校验：where 必须带 userId
    expect(mockPrisma.paipanRecord.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "r1", userId: "u1" } }),
    );
  });

  it("命盘卡·越权（R3）：他人排盘记录（归属校验查不到）→ 404 排盘记录不存在", async () => {
    mockPrisma.paipanRecord.findFirst.mockResolvedValue(null);

    await expect(svc.paipanCard("u1", { paipanRecordId: "r-others" })).rejects.toThrow("排盘记录不存在");
  });

  it("命盘卡·盘型不支持：记录无四柱盘面（如六爻）→ 诚实抛不支持", async () => {
    mockPrisma.paipanRecord.findFirst.mockResolvedValue({
      id: "r2",
      paipanType: "LIUYAO",
      resultData: { gua: "乾为天" },
    });

    await expect(svc.paipanCard("u1", { paipanRecordId: "r2" })).rejects.toThrow(/暂不支持/);
  });

  // ───────── 能力三：相似案例检索 ─────────

  it("相似案例·正常链路：质量分优先排序，标注 isOwn，无分默认0", async () => {
    mockPrisma.post.findMany.mockResolvedValue([
      { id: "p1", title: "戊土日主案例复盘", content: "戊土身弱案例的详细分析内容", userId: "u1", createdAt: new Date() },
      { id: "p2", title: "戊土命理专题", content: "全站公开的戊土命理优质长文", userId: "u2", createdAt: new Date() },
    ]);
    mockPrisma.contentQualityScore.findMany.mockResolvedValue([{ targetId: "p2", total: 88 }]);

    const res = await svc.similarCases("u1", "戊土日主身弱如何看事业方向", ["戊土"]);

    expect(res.items).toHaveLength(2);
    // p2 质量分 88 > p1 无分默认 0 → p2 在前
    expect(res.items[0]).toMatchObject({ postId: "p2", qualityScore: 88, isOwn: false });
    expect(res.items[1]).toMatchObject({ postId: "p1", qualityScore: 0, isOwn: true });
    for (const it of res.items) {
      expect(it.title).toBeTruthy();
      expect(it.excerpt.length).toBeLessThanOrEqual(80);
    }
    // 质量分 join 契约
    expect(mockPrisma.contentQualityScore.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ targetType: "POST", targetId: { in: ["p1", "p2"] } }),
      }),
    );
  });

  it("相似案例·R3 隔离：检索域=本人帖 OR 公开已发布帖（他人未发布帖不可达）", async () => {
    mockPrisma.post.findMany.mockResolvedValue([]);

    const res = await svc.similarCases("u1", "戊土日主身弱如何看事业方向");

    expect(res.items).toEqual([]);
    const where = mockPrisma.post.findMany.mock.calls[0][0].where;
    // AND 第一个条件必须是归属/公开域的硬边界
    expect(where.AND[0]).toEqual({ OR: [{ userId: "u1" }, { status: "PUBLISHED" }] });
  });

  it("相似案例·截断：候选超过5条 → 只返回前5", async () => {
    const many = Array.from({ length: 7 }, (_, i) => ({
      id: `p${i}`,
      title: `戊土案例${i}`,
      content: `戊土相关内容${i}`,
      userId: i % 2 === 0 ? "u1" : "u9",
      createdAt: new Date(),
    }));
    mockPrisma.post.findMany.mockResolvedValue(many);
    mockPrisma.contentQualityScore.findMany.mockResolvedValue([]);

    const res = await svc.similarCases("u1", "戊土案例整理");

    expect(res.items).toHaveLength(5);
  });

  it("相似案例·空关键词：全停用字且无标签 → 不查库返回空", async () => {
    const res = await svc.similarCases("u1", "的了是就都");

    expect(res.items).toEqual([]);
    expect(mockPrisma.post.findMany).not.toHaveBeenCalled();
  });
});
