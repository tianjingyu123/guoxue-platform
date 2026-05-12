import { Test } from "@nestjs/testing";
import { TtsController } from "./tts.controller";
import { TtsService } from "./tts.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockTtsSvc = {
  synthesize: jest.fn().mockResolvedValue({ audio: Buffer.from("audio"), contentType: "audio/mpeg" }),
  getVoices: jest.fn().mockResolvedValue([{ id: "v1", name: "标准女声" }]),
};

describe("TtsController", () => {
  let ctrl: TtsController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [TtsController],
      providers: [{ provide: TtsService, useValue: mockTtsSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(TtsController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /tts/synthesize — 文本转语音POST", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { text: "你好世界", voice: "female" };
    const res: any = { set: jest.fn(), send: jest.fn() };
    await ctrl.synthesize(req, dto, res);
    expect(mockTtsSvc.synthesize).toHaveBeenCalledWith(dto);
    expect(res.set).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalled();
  });

  it("GET /tts/synthesize — 文本转语音GET", async () => {
    const req: any = { user: { id: "u1" } };
    const res: any = { set: jest.fn(), send: jest.fn() };
    await ctrl.synthesizeGet(req, "你好", "female", "1.0", res);
    expect(mockTtsSvc.synthesize).toHaveBeenCalledWith({ text: "你好", voice: "female", rate: "1.0" });
    expect(res.send).toHaveBeenCalled();
  });

  it("GET /tts/voices — 获取语音列表", async () => {
    const result: any = await ctrl.getVoices();
    expect(result).toHaveLength(1);
    expect(mockTtsSvc.getVoices).toHaveBeenCalled();
  });
});
