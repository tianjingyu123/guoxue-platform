import { Test } from "@nestjs/testing";
import { HttpException, HttpStatus } from "@nestjs/common";
import { MediaAiController } from "./media-ai.controller";
import { MediaAiService } from "./media-ai.service";
import { AiLoggerService } from "./ai-logger.service";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

describe("MediaAiController", () => {
  let ctrl: MediaAiController;
  let mediaAi: jest.Mocked<MediaAiService>;
  let aiLogger: jest.Mocked<AiLoggerService>;

  const mockReq = { user: { id: "u1" } } as any;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [MediaAiController],
      providers: [
        {
          provide: MediaAiService,
          useValue: {
            auditImage: jest.fn(),
            textToSpeech: jest.fn(),
            transcribeAudio: jest.fn(),
          },
        },
        {
          provide: AiLoggerService,
          useValue: { query: jest.fn() },
        },
      ],
    })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(MediaAiController);
    mediaAi = mod.get(MediaAiService) as jest.Mocked<MediaAiService>;
    aiLogger = mod.get(AiLoggerService) as jest.Mocked<AiLoggerService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("auditImage — AI图像内容审核", () => {
    it("调用 service.auditImage 并返回审核结果", async () => {
      mediaAi.auditImage.mockResolvedValue({
        imageUrl: "https://example.com/img.jpg",
        safe: true,
        category: null,
        reason: "内容正常",
        confidence: 0.98,
        model: "deepseek-v4-flash",
        tokensUsed: 100,
      });

      const result = await ctrl.auditImage(
        { imageUrl: "https://example.com/img.jpg", context: "测试" },
        mockReq,
      );

      expect(mediaAi.auditImage).toHaveBeenCalledWith({
        imageUrl: "https://example.com/img.jpg",
        context: "测试",
        userId: "u1",
      });
      expect(result.safe).toBe(true);
      expect(result.imageUrl).toBe("https://example.com/img.jpg");
    });

    it("不传 context 时传入 undefined", async () => {
      mediaAi.auditImage.mockResolvedValue({
        imageUrl: "https://example.com/img.jpg",
        safe: true,
        category: null,
        reason: "正常",
        confidence: 0.95,
        model: "deepseek-v4-flash",
        tokensUsed: 50,
      });

      await ctrl.auditImage(
        { imageUrl: "https://example.com/img.jpg" },
        mockReq,
      );

      expect(mediaAi.auditImage).toHaveBeenCalledWith({
        imageUrl: "https://example.com/img.jpg",
        context: undefined,
        userId: "u1",
      });
    });

    it("imageUrl 为空时抛出 400", async () => {
      await expect(
        ctrl.auditImage({ imageUrl: "" }, mockReq),
      ).rejects.toThrow(
        new HttpException("imageUrl 不能为空", HttpStatus.BAD_REQUEST),
      );
    });
  });

  describe("textToSpeech — 文字转语音", () => {
    it("调用 service.textToSpeech 并返回音频信息", async () => {
      mediaAi.textToSpeech.mockResolvedValue({
        text: "你好",
        voice: "female",
        audioBase64: "AAAA",
        contentType: "audio/mp3",
        size: 100,
      });

      const result = await ctrl.textToSpeech(
        { text: "你好", voice: "female", speed: 1.2 },
        mockReq,
      );

      expect(mediaAi.textToSpeech).toHaveBeenCalledWith({
        text: "你好",
        voice: "female",
        speed: 1.2,
        userId: "u1",
      });
      expect(result.text).toBe("你好");
      expect(result.contentType).toBe("audio/mp3");
    });

    it("不传可选参数时正确透传", async () => {
      mediaAi.textToSpeech.mockResolvedValue({
        text: "你好",
        voice: "xiaoxiao",
        audioBase64: "AAAA",
        contentType: "audio/mp3",
        size: 50,
      });

      await ctrl.textToSpeech({ text: "你好" } as any, mockReq);

      expect(mediaAi.textToSpeech).toHaveBeenCalledWith({
        text: "你好",
        voice: undefined,
        speed: undefined,
        userId: "u1",
      });
    });
  });

  describe("transcribeAudio — 语音转文字", () => {
    it("调用 service.transcribeAudio 并返回转写结果", async () => {
      mediaAi.transcribeAudio.mockResolvedValue({
        audioUrl: "https://example.com/audio.mp3",
        text: "转写结果",
        language: "zh-CN",
        confidence: 0.95,
        model: "tencent-asr",
      });

      const result = await ctrl.transcribeAudio(
        { audioUrl: "https://example.com/audio.mp3", language: "zh" },
        mockReq,
      );

      expect(mediaAi.transcribeAudio).toHaveBeenCalledWith({
        audioUrl: "https://example.com/audio.mp3",
        language: "zh",
        userId: "u1",
      });
      expect(result.text).toBe("转写结果");
    });

    it("不传 language 时透传", async () => {
      mediaAi.transcribeAudio.mockResolvedValue({
        audioUrl: "a.mp3",
        text: "结果",
        language: "zh",
        confidence: 0.9,
        model: "tencent-asr",
      });

      await ctrl.transcribeAudio({ audioUrl: "a.mp3" } as any, mockReq);

      expect(mediaAi.transcribeAudio).toHaveBeenCalledWith({
        audioUrl: "a.mp3",
        language: undefined,
        userId: "u1",
      });
    });
  });

  describe("getTasks — 媒体处理任务列表", () => {
    it("默认查询所有场景", async () => {
      aiLogger.query.mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 20 });

      const result = await ctrl.getTasks();

      expect(aiLogger.query).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        scenes: ["media_audit", "media_tts", "media_transcribe"],
      });
      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("按 image_audit 过滤", async () => {
      aiLogger.query.mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 10 });

      await ctrl.getTasks("1", "10", "image_audit");

      expect(aiLogger.query).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
        scenes: ["media_audit"],
      });
    });

    it("按 tts 过滤", async () => {
      aiLogger.query.mockResolvedValue({ list: [], total: 0, page: 2, pageSize: 20 });

      await ctrl.getTasks("2", "20", "tts");

      expect(aiLogger.query).toHaveBeenCalledWith({
        page: 2,
        pageSize: 20,
        scenes: ["media_tts"],
      });
    });

    it("按 transcribe 过滤", async () => {
      aiLogger.query.mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 20 });

      await ctrl.getTasks("1", "20", "transcribe");

      expect(aiLogger.query).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        scenes: ["media_transcribe"],
      });
    });

    it("分页参数默认值", async () => {
      aiLogger.query.mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 20 });

      await ctrl.getTasks(undefined, undefined, undefined);

      expect(aiLogger.query).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        scenes: ["media_audit", "media_tts", "media_transcribe"],
      });
    });
  });
});
