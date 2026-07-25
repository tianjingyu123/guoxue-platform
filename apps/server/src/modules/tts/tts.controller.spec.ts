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
    const req: any = { user: { id: "u1" }, headers: {} };
    const res: any = { set: jest.fn(), send: jest.fn(), status: jest.fn().mockReturnThis(), end: jest.fn() };
    await ctrl.synthesizeGet(req, "你好", "female", "1.0", res);
    expect(mockTtsSvc.synthesize).toHaveBeenCalledWith({ text: "你好", voice: "female", rate: "1.0" });
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
      "Accept-Ranges": "bytes",
      "Content-Length": "5",
    }));
    expect(res.send).toHaveBeenCalled();
  });

  it("GET /tts/synthesize — Range 请求返回 206 音频分片", async () => {
    const req: any = { headers: { range: "bytes=1-3" } };
    const res: any = { set: jest.fn(), send: jest.fn(), status: jest.fn().mockReturnThis(), end: jest.fn() };
    await ctrl.synthesizeGet(req, "你好", "female", "1.0", res);
    expect(res.status).toHaveBeenCalledWith(206);
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
      "Accept-Ranges": "bytes",
      "Content-Length": "3",
      "Content-Range": "bytes 1-3/5",
    }));
    expect(res.send).toHaveBeenCalledWith(Buffer.from("udi"));
  });

  it("GET /tts/synthesize — 非法 Range 返回 416", async () => {
    const req: any = { headers: { range: "bytes=99-100" } };
    const res: any = { set: jest.fn(), send: jest.fn(), status: jest.fn().mockReturnThis(), end: jest.fn() };
    await ctrl.synthesizeGet(req, "你好", "female", "1.0", res);
    expect(res.status).toHaveBeenCalledWith(416);
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({ "Content-Range": "bytes */5" }));
    expect(res.end).toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it("GET /tts/voices — 获取语音列表", async () => {
    const result: any = await ctrl.getVoices();
    expect(result).toHaveLength(1);
    expect(mockTtsSvc.getVoices).toHaveBeenCalled();
  });
});
