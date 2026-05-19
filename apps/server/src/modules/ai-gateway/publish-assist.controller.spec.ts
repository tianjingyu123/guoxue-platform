import { Test } from "@nestjs/testing";
import { PublishAssistController } from "./publish-assist.controller";
import { PublishAssistService } from "./publish-assist.service";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

describe("PublishAssistController", () => {
  let ctrl: PublishAssistController;
  let svc: jest.Mocked<PublishAssistService>;

  const mockReq = { user: { id: "u1" } } as any;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [PublishAssistController],
      providers: [
        {
          provide: PublishAssistService,
          useValue: {
            polishText: jest.fn(),
            optimizeTitle: jest.fn(),
            suggestTags: jest.fn(),
            generateCover: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(PublishAssistController);
    svc = mod.get(PublishAssistService) as jest.Mocked<PublishAssistService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("polish — AI文字润色", () => {
    it("调用 service.polishText 并返回润色结果", async () => {
      svc.polishText.mockResolvedValue({ polished: "润色后的文本" });

      const result = await ctrl.polish(mockReq, { text: "原始文本" });

      expect(svc.polishText).toHaveBeenCalledWith("原始文本", "u1");
      expect(result.polished).toBe("润色后的文本");
    });
  });

  describe("optimizeTitle — AI标题优化", () => {
    it("调用 service.optimizeTitle 并返回优化后标题", async () => {
      svc.optimizeTitle.mockResolvedValue({ titles: ["优化后的标题"] });

      const result = await ctrl.optimizeTitle(mockReq, {
        content: "文章内容",
      });

      expect(svc.optimizeTitle).toHaveBeenCalledWith("文章内容", "u1");
      expect(result.titles).toEqual(["优化后的标题"]);
    });
  });

  describe("suggestTags — AI标签推荐", () => {
    it("调用 service.suggestTags 并返回标签列表", async () => {
      svc.suggestTags.mockResolvedValue({ tags: ["国学", "易经"] });

      const result = await ctrl.suggestTags(mockReq, { content: "内容正文" });

      expect(svc.suggestTags).toHaveBeenCalledWith("内容正文", "u1");
      expect(result.tags).toEqual(["国学", "易经"]);
    });
  });

  describe("generateCover — AI封面图生成", () => {
    it("调用 service.generateCover 并返回封面 URL（API 成功）", async () => {
      svc.generateCover.mockResolvedValue({
        imageUrl: "data:image/png;base64,xxxx",
        imageBase64: "xxxx",
        designPrompt: "国学风格插画，水墨山水",
        source: "tencent_aiart",
      });

      const result = await ctrl.generateCover(mockReq, { prompt: "水墨山水" });

      expect(svc.generateCover).toHaveBeenCalledWith("水墨山水", "u1");
      expect(result.imageUrl).toContain("data:image/png");
      expect(result.source).toBe("tencent_aiart");
    });

    it("API 失败时回退到文本提示", async () => {
      svc.generateCover.mockResolvedValue({
        designPrompt: "设计提示词内容",
        imageUrl: null,
        source: "fallback",
        message: "封面图生成提示词已生成",
      });

      const result = await ctrl.generateCover(mockReq, { prompt: "test" });

      expect(result.imageUrl).toBeNull();
      expect(result.source).toBe("fallback");
    });
  });
});
