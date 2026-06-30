import { Test } from "@nestjs/testing";
import { RecommendationService } from "./recommendation.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("RecommendationService（软性导流）", () => {
  let svc: RecommendationService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      course: { findMany: jest.fn() },
      circle: { findMany: jest.fn() },
    };
    const mod = await Test.createTestingModule({
      providers: [RecommendationService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(RecommendationService);
  });

  describe("parseProtocol（解析 Coze RECO 协议 + 剥离标记）", () => {
    it("解析合法标记并从展示文本剥离", () => {
      const raw = `学八字先打基础……\n\n<!--RECO:[{"type":"course","query":"八字","reason":"系统入门"}]-->`;
      const { clean, intents } = svc.parseProtocol(raw);
      expect(clean).toBe("学八字先打基础……");
      expect(intents).toEqual([{ type: "course", query: "八字", reason: "系统入门" }]);
    });

    it("无标记时原样返回、意图为空", () => {
      const { clean, intents } = svc.parseProtocol("普通回答");
      expect(clean).toBe("普通回答");
      expect(intents).toEqual([]);
    });

    it("标记内非法 JSON：剥离标记但意图为空（退回兜底）", () => {
      const { clean, intents } = svc.parseProtocol("答案<!--RECO:[不是JSON]-->");
      expect(clean).toBe("答案");
      expect(intents).toEqual([]);
    });

    it("过滤非法 type、最多取 2 条", () => {
      const raw = `x<!--RECO:[{"type":"course","query":"a"},{"type":"product","query":"b"},{"type":"circle","query":"c"},{"type":"course","query":"d"}]-->`;
      const { intents } = svc.parseProtocol(raw);
      expect(intents).toHaveLength(2);
      expect(intents.map((i) => i.type)).toEqual(["course", "circle"]);
    });
  });

  describe("fallbackIntents（平台兜底意图提取）", () => {
    it("学习信号 → 课程意图", () => {
      expect(svc.fallbackIntents("我想系统学一下八字")).toEqual([
        { type: "course", query: "八字", reason: "系统学习八字" },
      ]);
    });

    it("社交信号 → 圈子意图", () => {
      expect(svc.fallbackIntents("有没有紫微的圈子可以交流")).toEqual([
        { type: "circle", query: "紫微", reason: "结识紫微同好" },
      ]);
    });

    it("无国学主题 → 空", () => {
      expect(svc.fallbackIntents("今天天气怎么样")).toEqual([]);
    });
  });

  describe("match（匹配真实课程/圈子）", () => {
    it("课程意图命中 → 课程卡片", async () => {
      prisma.course.findMany.mockResolvedValue([
        { id: "c1", title: "八字入门", cover: "x.png", price: 99, studentCount: 200 },
      ]);
      const cards = await svc.match([{ type: "course", query: "八字", reason: "系统学习八字" }]);
      expect(cards).toEqual([
        { type: "course", data: { id: "c1", title: "八字入门", cover: "x.png", price: 99, studentCount: 200, reason: "系统学习八字" } },
      ]);
    });

    it("同一实体被多意图命中时去重", async () => {
      prisma.course.findMany.mockResolvedValue([{ id: "c1", title: "八字", cover: null, price: 0, studentCount: 1 }]);
      const cards = await svc.match([
        { type: "course", query: "八字" },
        { type: "course", query: "命理" },
      ]);
      expect(cards).toHaveLength(1);
    });
  });

  describe("build（综合：Coze 优先 → 兜底 → 匹配 → 征求同意话术）", () => {
    it("Coze 协议意图优先于兜底", async () => {
      prisma.course.findMany.mockResolvedValue([{ id: "c1", title: "风水课", cover: null, price: 10, studentCount: 5 }]);
      const raw = `答案<!--RECO:[{"type":"course","query":"风水","reason":"学风水"}]-->`;
      const r = await svc.build(raw, "随便问问八字"); // 用户问八字，但 Coze 指定风水 → 用 Coze
      expect(prisma.course.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ OR: expect.arrayContaining([{ title: { contains: "风水" } }]) }),
      }));
      expect(r.content).toBe("答案");
      expect(r.recommendation?.items).toHaveLength(1);
    });

    it("无 Coze 协议时走兜底意图", async () => {
      prisma.course.findMany.mockResolvedValue([{ id: "c1", title: "八字课", cover: null, price: 0, studentCount: 9 }]);
      const r = await svc.build("好好回答了八字问题", "怎么学八字");
      expect(prisma.course.findMany).toHaveBeenCalled();
      expect(r.recommendation).not.toBeNull();
      expect(r.recommendation?.consentPrompt).toContain("课程");
    });

    it("有意图但无匹配实体 → recommendation 为 null", async () => {
      prisma.course.findMany.mockResolvedValue([]);
      prisma.circle.findMany.mockResolvedValue([]);
      const r = await svc.build("回答", "怎么学八字");
      expect(r.recommendation).toBeNull();
      expect(r.content).toBe("回答");
    });

    it("课程+圈子都命中 → 话术含两者", async () => {
      prisma.course.findMany.mockResolvedValue([{ id: "c1", title: "x", cover: null, price: 0, studentCount: 1 }]);
      prisma.circle.findMany.mockResolvedValue([{ id: "g1", name: "y", cover: null, memberCount: 1, intro: "" }]);
      const raw = `答<!--RECO:[{"type":"course","query":"八字"},{"type":"circle","query":"八字"}]-->`;
      const r = await svc.build(raw, "");
      expect(r.recommendation?.consentPrompt).toContain("课程");
      expect(r.recommendation?.consentPrompt).toContain("圈子");
    });
  });
});
