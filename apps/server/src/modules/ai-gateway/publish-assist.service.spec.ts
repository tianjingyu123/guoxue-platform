import { Test } from "@nestjs/testing";
import { PublishAssistService } from "./publish-assist.service";
import { AiGatewayService } from "./ai-gateway.service";

describe("PublishAssistService", () => {
  let svc: PublishAssistService;
  let gateway: jest.Mocked<AiGatewayService>;
  const mockFetch = jest.fn();

  beforeAll(async () => {
    global.fetch = mockFetch;
    const mod = await Test.createTestingModule({
      providers: [
        PublishAssistService,
        { provide: AiGatewayService, useValue: { chat: jest.fn() } },
      ],
    }).compile();
    svc = mod.get(PublishAssistService);
    gateway = mod.get(AiGatewayService) as jest.Mocked<AiGatewayService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.TENCENT_SECRET_ID;
    delete process.env.TENCENT_SECRET_KEY;
  });

  describe("polishText", () => {
    it("返回润色后的文本", async () => {
      gateway.chat.mockResolvedValue({ content: "润色后的优美文本" } as any);
      const result = await svc.polishText("原始文本");
      expect(result.polished).toBe("润色后的优美文本");
    });

    it("上游AI报错时返回友好业务提示，不透传供应商原始响应体", async () => {
      gateway.chat.mockRejectedValue(
        new Error('DeepSeek API返回 402: {"error":{"message":"Insufficient Balance","type":"unknown_error"}}'),
      );
      const promise = svc.polishText("原始文本");
      await expect(promise).rejects.toThrow("AI 服务暂时不可用，请稍后再试");
      await expect(promise).rejects.not.toThrow(/DeepSeek|Insufficient|402/);
    });
  });

  describe("optimizeTitle", () => {
    it("按换行分割返回标题数组", async () => {
      gateway.chat.mockResolvedValue({ content: "标题1\n标题2\n标题3" } as any);
      const result = await svc.optimizeTitle("内容正文");
      expect(result.titles).toEqual(["标题1", "标题2", "标题3"]);
    });
  });

  describe("suggestTags", () => {
    it("按逗号分割返回标签数组", async () => {
      gateway.chat.mockResolvedValue({ content: "国学,易经,风水,传统文化,哲学" } as any);
      const result = await svc.suggestTags("文章内容");
      expect(result.tags).toEqual(["国学", "易经", "风水", "传统文化", "哲学"]);
    });
  });

  describe("generateCover", () => {
    it("腾讯云凭证存在时调用 API 成功返回 imageUrl", async () => {
      process.env.TENCENT_SECRET_ID = "testId";
      process.env.TENCENT_SECRET_KEY = "testKey";
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ Response: { ResultImage: "base64imgdata" } }),
      });

      const result = await svc.generateCover("山水画");
      expect(result.imageUrl).toContain("data:image/png;base64");
      expect(result.source).toBe("tencent_aiart");
    });

    it("无腾讯云凭证回退到 designPrompt", async () => {
      gateway.chat.mockResolvedValue({ content: "国风水墨风格" } as any);
      const result = await svc.generateCover("梅花");
      expect(result.imageUrl).toBeNull();
      expect(result.source).toBe("fallback");
      expect(result.designPrompt).toBe("国风水墨风格");
    });

    it("API 返回错误时回退到 designPrompt", async () => {
      process.env.TENCENT_SECRET_ID = "testId";
      process.env.TENCENT_SECRET_KEY = "testKey";
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ Response: { Error: { Code: "FailedOperation", Message: "余额不足" } } }),
      });
      gateway.chat.mockResolvedValue({ content: "水墨梅花设计" } as any);

      const result = await svc.generateCover("梅花");
      expect(result.source).toBe("fallback");
      expect(result.designPrompt).toBe("水墨梅花设计");
    });
  });
});
