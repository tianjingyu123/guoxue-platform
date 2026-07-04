import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { CompetitionAdminService } from "./competition-admin.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  competition: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  competitionStage: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  competitionQuestion: {
    findMany: jest.fn(),
  },
};

/** 合法双阶段配置（明日起，两阶段首尾相接） */
function validStages() {
  const base = Date.now() + 24 * 3600 * 1000;
  const iso = (offsetH: number) => new Date(base + offsetH * 3600 * 1000).toISOString();
  return [
    { name: "海选·答题", format: "QUIZ", startAt: iso(0), endAt: iso(2), advanceRule: { type: "count" as const, value: 10 } },
    { name: "决赛·直播PK", format: "LIVE_PK", startAt: iso(3), endAt: iso(5) },
  ];
}

describe("CompetitionAdminService", () => {
  let service: CompetitionAdminService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CompetitionAdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = mod.get(CompetitionAdminService);
  });

  beforeEach(() => jest.clearAllMocks());

  // ═══════ stagesConfig 校验 ═══════

  describe("validateStagesConfig", () => {
    it("合法配置通过并规整（补 seq/ISO 时间）", () => {
      const out = service.validateStagesConfig(validStages() as any);
      expect(out).toHaveLength(2);
      expect(out[0].seq).toBe(1);
      expect(out[1].seq).toBe(2);
      expect(out[0].advanceRule).toEqual({ type: "count", value: 10 });
    });

    it("空数组拒绝", () => {
      expect(() => service.validateStagesConfig([] as any)).toThrow(BadRequestException);
    });

    it("时间重叠拒绝（后一阶段早于前一阶段结束）", () => {
      const stages = validStages();
      stages[1].startAt = stages[0].startAt; // 与阶段1重叠
      expect(() => service.validateStagesConfig(stages as any)).toThrow(/递增不重叠/);
    });

    it("开始晚于结束拒绝", () => {
      const stages = validStages();
      [stages[0].startAt, stages[0].endAt] = [stages[0].endAt, stages[0].startAt];
      expect(() => service.validateStagesConfig(stages as any)).toThrow(/早于结束时间/);
    });

    it("非末尾阶段缺晋级规则拒绝", () => {
      const stages = validStages();
      delete (stages[0] as any).advanceRule;
      expect(() => service.validateStagesConfig(stages as any)).toThrow(/晋级规则/);
    });

    it("percent 超 100 拒绝", () => {
      const stages = validStages();
      (stages[0] as any).advanceRule = { type: "percent", value: 120 };
      expect(() => service.validateStagesConfig(stages as any)).toThrow(/percent/);
    });

    it("count 非正整数拒绝", () => {
      const stages = validStages();
      (stages[0] as any).advanceRule = { type: "count", value: 0.5 };
      expect(() => service.validateStagesConfig(stages as any)).toThrow(/count/);
    });

    it("非法 format 拒绝", () => {
      const stages = validStages();
      (stages[0] as any).format = "KARAOKE";
      expect(() => service.validateStagesConfig(stages as any)).toThrow(/format/);
    });
  });

  // ═══════ judgePanel 校验 ═══════

  describe("validateJudgePanel", () => {
    it("合法评审团通过", () => {
      expect(() => service.validateJudgePanel([
        { userId: "u1", title: "特邀评审", weight: 0.5 },
        { userId: "u2", title: "首席评审", weight: 0.5 },
      ])).not.toThrow();
    });

    it("userId 重复拒绝", () => {
      expect(() => service.validateJudgePanel([
        { userId: "u1" }, { userId: "u1" },
      ])).toThrow(/重复/);
    });

    it("缺 userId 拒绝", () => {
      expect(() => service.validateJudgePanel([{ userId: "" }])).toThrow(/userId/);
    });
  });

  // ═══════ 创建 / 更新 ═══════

  describe("createCompetition / updateCompetition", () => {
    it("创建时校验并规整 stagesConfig", async () => {
      mockPrisma.competition.create.mockResolvedValue({ id: "c1" });
      const result = await service.createCompetition({
        title: "测试赛", type: "POETRY", stagesConfig: validStages(),
      } as any);
      expect(result.id).toBe("c1");
      const data = mockPrisma.competition.create.mock.calls[0][0].data;
      expect(data.stagesConfig[0].seq).toBe(1);
    });

    it("创建时非法 stagesConfig 直接拒绝不落库", async () => {
      await expect(service.createCompetition({
        title: "测试赛", type: "POETRY", stagesConfig: [{ name: "" }],
      } as any)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.competition.create).not.toHaveBeenCalled();
    });

    it("未开赛（DRAFT）可更新", async () => {
      mockPrisma.competition.findUnique.mockResolvedValue({ id: "c1", status: "DRAFT" });
      mockPrisma.competition.update.mockResolvedValue({ id: "c1" });
      const result = await service.updateCompetition("c1", { title: "新标题" } as any);
      expect(result.id).toBe("c1");
    });

    it("已开赛（IN_PROGRESS）拒绝更新", async () => {
      mockPrisma.competition.findUnique.mockResolvedValue({ id: "c1", status: "IN_PROGRESS" });
      await expect(service.updateCompetition("c1", { title: "x" } as any))
        .rejects.toThrow(/不可修改/);
      expect(mockPrisma.competition.update).not.toHaveBeenCalled();
    });
  });

  // ═══════ 阶段生成（幂等） ═══════

  describe("generateStages", () => {
    it("首跑全新建，重跑幂等 upsert，运行中阶段跳过", async () => {
      mockPrisma.competition.findUnique.mockResolvedValue({
        id: "c1", status: "DRAFT", stagesConfig: validStages(),
      });
      // 已存在：seq1 RUNNING（保护），seq2 PENDING（可覆盖）
      mockPrisma.competitionStage.findMany
        .mockResolvedValueOnce([
          { id: "st1", seq: 1, status: "RUNNING" },
          { id: "st2", seq: 2, status: "PENDING" },
        ])
        .mockResolvedValueOnce([{ id: "st1" }, { id: "st2" }]);
      mockPrisma.competitionStage.upsert.mockResolvedValue({});
      mockPrisma.competitionStage.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.generateStages("c1");
      expect(result.skipped).toBe(1); // RUNNING 不覆盖
      expect(result.updated).toBe(1); // PENDING 幂等更新
      expect(result.created).toBe(0);
      expect(mockPrisma.competitionStage.upsert).toHaveBeenCalledTimes(1);
      // 幂等键 = competitionId + seq
      expect(mockPrisma.competitionStage.upsert.mock.calls[0][0].where)
        .toEqual({ competitionId_seq: { competitionId: "c1", seq: 2 } });
    });

    it("无 stagesConfig 拒绝生成", async () => {
      mockPrisma.competition.findUnique.mockResolvedValue({ id: "c1", stagesConfig: null });
      await expect(service.generateStages("c1")).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════ AI 组卷（纯规则） ═══════

  describe("generatePaper", () => {
    const makeQ = (id: string, difficulty: number, tags: string[] = []) => ({
      id, type: "SINGLE", score: 10, difficulty, stem: `题${id}`, options: [], tags,
    });

    it("按默认难度分布抽题·不含标准答案", async () => {
      mockPrisma.competition.findUnique.mockResolvedValue({ id: "c1" });
      mockPrisma.competitionQuestion.findMany.mockResolvedValue([
        makeQ("q1", 1), makeQ("q2", 2), makeQ("q3", 3), makeQ("q4", 3), makeQ("q5", 5),
      ]);
      const result = await service.generatePaper("c1", { count: 5 });
      expect(result.total).toBe(5);
      expect(result.totalScore).toBe(50);
      expect(result.questions.every((q: any) => !("answer" in q))).toBe(true);
    });

    it("分类过滤走 tags hasSome", async () => {
      mockPrisma.competition.findUnique.mockResolvedValue({ id: "c1" });
      mockPrisma.competitionQuestion.findMany.mockResolvedValue([makeQ("q1", 1, ["诗词"])]);
      await service.generatePaper("c1", { count: 1, categories: ["诗词"] });
      const where = mockPrisma.competitionQuestion.findMany.mock.calls[0][0].where;
      expect(where.tags).toEqual({ hasSome: ["诗词"] });
      expect(where.isPublished).toBe(true);
    });

    it("题库不足如实返回（不虚构）", async () => {
      mockPrisma.competition.findUnique.mockResolvedValue({ id: "c1" });
      mockPrisma.competitionQuestion.findMany.mockResolvedValue([makeQ("q1", 1), makeQ("q2", 3)]);
      const result = await service.generatePaper("c1", { count: 10 });
      expect(result.total).toBe(2);
      expect(result.requested).toBe(10);
    });

    it("题库为空拒绝组卷", async () => {
      mockPrisma.competition.findUnique.mockResolvedValue({ id: "c1" });
      mockPrisma.competitionQuestion.findMany.mockResolvedValue([]);
      await expect(service.generatePaper("c1", { count: 10 })).rejects.toThrow(/题库/);
    });

    it("自定义难度权重生效（全 hard）", async () => {
      mockPrisma.competition.findUnique.mockResolvedValue({ id: "c1" });
      mockPrisma.competitionQuestion.findMany.mockResolvedValue([
        makeQ("q1", 1), makeQ("q2", 4), makeQ("q3", 5), makeQ("q4", 5),
      ]);
      const result = await service.generatePaper("c1", {
        count: 2, difficultyMix: { easy: 0, medium: 0, hard: 1 },
      });
      expect(result.total).toBe(2);
      expect(result.questions.every((q: any) => q.difficulty >= 4)).toBe(true);
    });
  });
});
