import { Test } from "@nestjs/testing";
import { PaipanController } from "./paipan.controller";
import { PaipanService } from "./paipan.service";
import { PaipanAiService } from "./paipan-ai.service";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

const mockPaipanSvc = {
  calcBaziPreview: jest.fn().mockResolvedValue({ bazi: "甲子 乙丑 丙寅 丁卯", dayun: [] }),
  calcBaziAndSave: jest.fn().mockResolvedValue({ id: "r1", bazi: "甲子 乙丑 丙寅 丁卯" }),
  getBaziRecord: jest.fn().mockResolvedValue({ id: "r1", resultData: {} }),
  getUserBaziHistory: jest.fn().mockResolvedValue([{ id: "r1", createdAt: new Date() }]),
  calcZiweiPreview: jest.fn().mockResolvedValue({ minggong: "子", shenggong: "午" }),
  calcZiweiAndSave: jest.fn().mockResolvedValue({ id: "z1" }),
  getZiweiRecord: jest.fn().mockResolvedValue({ id: "z1" }),
  getUserZiweiHistory: jest.fn().mockResolvedValue([{ id: "z1" }]),
  getAllRecords: jest.fn().mockResolvedValue([{ id: "r1", type: "bazi" }]),
};

const mockPaipanAiSvc = {
  analyzeBazi: jest.fn().mockResolvedValue({ id: "a1", content: "AI分析结果" }),
  getAnalysisByPaipanRecord: jest.fn().mockResolvedValue({ id: "a1", content: "AI分析结果" }),
  getUserAnalysisHistory: jest.fn().mockResolvedValue([{ id: "a1" }]),
};

describe("PaipanController", () => {
  let ctrl: PaipanController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [PaipanController],
      providers: [
        { provide: PaipanService, useValue: mockPaipanSvc },
        { provide: PaipanAiService, useValue: mockPaipanAiSvc },
        { provide: PrismaService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(PaipanController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /paipan/bazi/preview — 八字预览（无需登录）", async () => {
    const dto: any = { year: 1990, month: 1, day: 15, hour: 8, gender: "男" };
    const result: any = await ctrl.baziPreview(dto);
    expect(result.bazi).toContain("甲子");
    expect(mockPaipanSvc.calcBaziPreview).toHaveBeenCalledWith(dto);
  });

  it("GET /paipan/bazi/public — 八字公开查询（CDN缓存）", async () => {
    const result: any = await ctrl.baziPublic(1990 as any, 1 as any, 15 as any, 8 as any, 30 as any, "male");
    expect(result.bazi).toBeTruthy();
    const callArg = mockPaipanSvc.calcBaziPreview.mock.calls[0][0];
    expect(callArg.gender).toBe("男");
  });

  it("GET /paipan/bazi/public — 默认gender为男", async () => {
    await ctrl.baziPublic(1990 as any, 1 as any, 15 as any, 8 as any);
    const callArg = mockPaipanSvc.calcBaziPreview.mock.calls[0][0];
    expect(callArg.gender).toBe("男");
  });

  it("POST /paipan/bazi — 八字排盘并保存", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { year: 1990, month: 1, day: 15, hour: 8, gender: "男" };
    const result: any = await ctrl.baziCalc(req, dto);
    expect(result.id).toBe("r1");
    expect(mockPaipanSvc.calcBaziAndSave).toHaveBeenCalledWith("u1", dto);
  });

  it("GET /paipan/bazi/:id — 排盘记录详情", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.baziRecord("r1", req);
    expect(result.id).toBe("r1");
    expect(mockPaipanSvc.getBaziRecord).toHaveBeenCalledWith("r1", "u1");
  });

  it("GET /paipan/bazi — 排盘历史", async () => {
    const req: any = { user: { id: "u1" } };
    const q: any = { page: 1, pageSize: 20 };
    const result: any = await ctrl.baziHistory(req, q);
    expect(result).toHaveLength(1);
  });

  it("POST /paipan/bazi/analyze — AI分析", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { recordId: "r1" };
    const result: any = await ctrl.baziAnalyze(req, dto);
    expect(result.content).toBe("AI分析结果");
  });

  it("GET /paipan/bazi/:id/analysis — 获取分析结果", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.baziGetAnalysis("r1", req);
    expect(result.id).toBe("a1");
  });

  it("GET /paipan/bazi/analysis/history — 分析历史", async () => {
    const req: any = { user: { id: "u1" } };
    const q: any = { page: 1, pageSize: 20 };
    const result: any = await ctrl.baziAnalysisHistory(req, q);
    expect(result).toHaveLength(1);
  });

  it("POST /paipan/ziwei/preview — 紫微预览", async () => {
    const dto: any = { year: 1990, month: 1, day: 15, hour: 8, gender: "男" };
    const result: any = await ctrl.ziweiPreview(dto);
    expect(result.minggong).toBe("子");
  });

  it("POST /paipan/ziwei — 紫微排盘并保存", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { year: 1990, month: 1, day: 15, hour: 8, gender: "男" };
    const result: any = await ctrl.ziweiCalc(req, dto);
    expect(result.id).toBe("z1");
  });

  it("GET /paipan/ziwei/:id — 紫微记录详情", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.ziweiRecord("z1", req);
    expect(result.id).toBe("z1");
  });

  it("GET /paipan/ziwei — 紫微排盘历史", async () => {
    const req: any = { user: { id: "u1" } };
    const q: any = { page: 1, pageSize: 20 };
    const result: any = await ctrl.ziweiHistory(req, q);
    expect(result).toHaveLength(1);
  });

  it("GET /paipan/admin/records — 管理员查看所有记录", async () => {
    const q: any = { page: 1, pageSize: 20, type: "bazi" };
    const result: any = await ctrl.ziweiAdminRecords(q);
    expect(result).toHaveLength(1);
  });
});
