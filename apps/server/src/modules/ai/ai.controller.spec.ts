import { Test } from "@nestjs/testing";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { RolesGuard } from "../../common/roles.guard";
import { ThrottleGuard } from "../../common/throttle.guard";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockAiSvc: Record<string, jest.Mock> = {
  sentenceRecognition: jest.fn().mockResolvedValue({ text: "识别结果" } as any),
  createRecTask: jest.fn().mockResolvedValue({ taskId: 123 } as any),
  queryRecTask: jest.fn().mockResolvedValue({ status: "SUCCESS", text: "长语音结果" } as any),
  generalBasicOCR: jest.fn().mockResolvedValue({ text: "识别文字" } as any),
  generalHandwritingOCR: jest.fn().mockResolvedValue({ text: "手写文字" } as any),
  ancientBookOCR: jest.fn().mockResolvedValue({ text: "古籍文字" } as any),
  sentimentAnalyze: jest.fn().mockResolvedValue({ sentiment: "positive", confidence: 0.9 } as any),
  extractKeywords: jest.fn().mockResolvedValue({ keywords: ["国学", "传统文化"] } as any),
  translateText: jest.fn().mockResolvedValue({ translated: "translated text" } as any),
  detectLanguage: jest.fn().mockResolvedValue({ language: "zh" } as any),
  getAiUsageStats: jest.fn().mockResolvedValue({ totalCalls: 100, totalTokens: 50000 } as any),
  getAiCallLogs: jest.fn().mockResolvedValue({ items: [], total: 0 } as any),
  getAiAbnormalAlerts: jest.fn().mockResolvedValue([] as any),
  getCircuitBreakerStatus: jest.fn().mockReturnValue([
    { service: "asr", state: "CLOSED" },
    { service: "ocr", state: "CLOSED" },
    { service: "nlp", state: "CLOSED" },
    { service: "tmt", state: "CLOSED" },
  ]),
};

describe("AiController", () => {
  let ctrl: AiController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: AiService, useValue: mockAiSvc }],
    })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(ThrottleGuard).useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(AiController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  // ── 鉴权守卫（C10：防匿名刷付费 AI 翻译）──
  it("翻译与语种识别接口必须挂 JwtAuthGuard", () => {
    const tGuards = Reflect.getMetadata("__guards__", AiController.prototype.translateText) || [];
    const dGuards = Reflect.getMetadata("__guards__", AiController.prototype.detectLanguage) || [];
    expect(tGuards).toContain(JwtAuthGuard);
    expect(dGuards).toContain(JwtAuthGuard);
  });

  // ── 语音识别 ──

  it("POST /ai/asr/sentence — 一句话识别", async () => {
    const result: any = await ctrl.sentenceRecognize({ audio: "base64...", format: "wav" } as any);
    expect(result.text).toBe("识别结果");
  });

  it("POST /ai/asr/task — 创建长语音任务", async () => {
    const result: any = await ctrl.createRecTask({ audioUrl: "https://...", callbackUrl: "https://..." } as any);
    expect(result.taskId).toBe(123);
  });

  it("GET /ai/asr/task — 查询语音识别结果", async () => {
    const result: any = await ctrl.queryRecTask(123);
    expect(result.status).toBe("SUCCESS");
  });

  // ── OCR ──

  it("POST /ai/ocr/general — 通用印刷体识别", async () => {
    const result: any = await ctrl.generalOCR({ image: "base64..." } as any);
    expect(result.text).toBe("识别文字");
  });

  it("POST /ai/ocr/handwriting — 手写体识别", async () => {
    const result: any = await ctrl.handwritingOCR({ image: "base64..." } as any);
    expect(result.text).toBe("手写文字");
  });

  it("POST /ai/ocr/ancient — 古籍文字识别", async () => {
    const result: any = await ctrl.ancientBookOCR({ image: "base64..." } as any);
    expect(result.text).toBe("古籍文字");
  });

  // ── NLP ──

  it("POST /ai/nlp/sentiment — 情感分析", async () => {
    const result: any = await ctrl.sentimentAnalyze({ text: "国学博大精深" } as any);
    expect(result.sentiment).toBe("positive");
  });

  it("POST /ai/nlp/keywords — 关键词提取", async () => {
    const result: any = await ctrl.extractKeywords({ text: "国学传统文化", count: 5 } as any);
    expect(result.keywords).toContain("国学");
  });

  // ── 翻译 ──

  it("POST /ai/translate — 文本翻译", async () => {
    const result: any = await ctrl.translateText({ text: "你好", sourceLang: "zh", targetLang: "en" } as any);
    expect(result.translated).toBe("translated text");
  });

  it("POST /ai/detect-language — 语种识别", async () => {
    const result: any = await ctrl.detectLanguage({ text: "你好世界" } as any);
    expect(result.language).toBe("zh");
  });

  // ── AI 调用监控 ──

  it("GET /ai/usage-stats — AI使用统计", async () => {
    const result: any = await ctrl.getAiUsageStats("day");
    expect(result.totalCalls).toBe(100);
  });

  it("GET /ai/call-logs — AI调用日志", async () => {
    const result: any = await ctrl.getAiCallLogs();
    expect(result.items).toHaveLength(0);
  });

  it("GET /ai/abnormal-alerts — AI异常告警", async () => {
    const result: any = await ctrl.getAiAbnormalAlerts();
    expect(result).toHaveLength(0);
  });

  it("GET /ai/circuit-breaker — 断路器状态", () => {
    const result: any = ctrl.getCircuitBreakerStatus();
    expect(result).toHaveLength(4);
    expect(result[0].service).toBe("asr");
    expect(result[0].state).toBe("CLOSED");
  });
});
