import { Test } from "@nestjs/testing";
import { OperationalSeedService } from "./operational-seed.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SystemService } from "../system/system.service";
import { ErrorCode } from "../../common/error-codes";

/**
 * 运营种子内容生成器：接真实平台知识 + 生成即草稿（不自动发布·红线）+ AI 异常处理。
 */
describe("OperationalSeedService · 运营种子内容", () => {
  let svc: OperationalSeedService;

  const mockGateway = { chat: jest.fn() };
  const mockPrisma = { content: { create: jest.fn(async ({ data }: any) => ({ id: "content-1", ...data })) } };
  const mockSystem = { getBrandConfig: jest.fn(async () => ({ siteName: "热卜国学" })) };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        OperationalSeedService,
        { provide: AiGatewayService, useValue: mockGateway },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SystemService, useValue: mockSystem },
      ],
    }).compile();
    svc = mod.get(OperationalSeedService);
  });

  beforeEach(() => jest.clearAllMocks());

  describe("listTopics", () => {
    it("返回运营选题库（含招运营商/教操作等·带建议形式）", () => {
      const res = svc.listTopics();
      expect(res.total).toBeGreaterThanOrEqual(5);
      const recruit = res.topics.find((t) => t.key === "recruit_operator");
      expect(recruit).toBeDefined();
      expect(recruit!.recommendedForms.length).toBeGreaterThan(0);
      expect(recruit!.knowledgePointCount).toBeGreaterThan(0);
    });
  });

  describe("generateDraft", () => {
    it("注入真实平台知识 + 落 DRAFT 草稿 + 标待审核 + 需人工审核", async () => {
      mockGateway.chat.mockResolvedValue({ content: "## 什么是分站运营商\n分站运营商是区域团队管理者……" });
      const res = await svc.generateDraft("recruit_operator", "article", "董事长");

      // prompt 注入了该选题的真实知识点（如"存量用户 B 端化"相关事实）
      const promptArg = mockGateway.chat.mock.calls[0][0].messages[0].content as string;
      expect(promptArg).toContain("分站运营商");
      expect(promptArg).toContain("不得编造平台不存在的功能或承诺具体收益");

      // 落库为 DRAFT，且 tag 含"待审核"、"运营种子"
      const created = mockPrisma.content.create.mock.calls[0][0].data;
      expect(created.status).toBe("DRAFT");
      expect(created.tags).toEqual(expect.arrayContaining(["运营种子", "recruit_operator", "待审核"]));
      expect(created.categoryLevel1).toBe("平台运营");

      expect(res).toMatchObject({ id: "content-1", topic: "recruit_operator", status: "DRAFT", needsHumanReview: true });
    });

    it("form 缺省时取选题第一个建议形式", async () => {
      mockGateway.chat.mockResolvedValue({ content: "脚本内容" });
      const res = await svc.generateDraft("platform_vision", undefined, "运营");
      expect(res.form).toBe("video_script"); // platform_vision 建议形式首选数字人口播脚本
    });

    it("绝不自动发布：任何选题生成的都是 DRAFT", async () => {
      mockGateway.chat.mockResolvedValue({ content: "内容" });
      await svc.generateDraft("circle_play", "post", "运营");
      expect(mockPrisma.content.create.mock.calls[0][0].data.status).toBe("DRAFT");
    });

    it("未知选题 → 404", async () => {
      await expect(svc.generateDraft("not_exist", "article", "运营")).rejects.toMatchObject({
        errorCode: ErrorCode.NOT_FOUND,
      });
      expect(mockPrisma.content.create).not.toHaveBeenCalled();
    });

    it("AI 生成失败 → THIRD_AI_FAILED，不落库", async () => {
      mockGateway.chat.mockRejectedValue(new Error("timeout"));
      await expect(svc.generateDraft("tutorial_paipan", "article", "运营")).rejects.toMatchObject({
        errorCode: ErrorCode.THIRD_AI_FAILED,
      });
      expect(mockPrisma.content.create).not.toHaveBeenCalled();
    });

    it("AI 返回空 → THIRD_AI_FAILED", async () => {
      mockGateway.chat.mockResolvedValue({ content: "   " });
      await expect(svc.generateDraft("member_benefits", "post", "运营")).rejects.toMatchObject({
        errorCode: ErrorCode.THIRD_AI_FAILED,
      });
    });
  });
});
