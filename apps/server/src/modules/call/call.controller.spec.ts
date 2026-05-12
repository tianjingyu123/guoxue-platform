import { Test } from "@nestjs/testing";
import { CallController } from "./call.controller";
import { CallService } from "./call.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockCallSvc = {
  create: jest.fn().mockResolvedValue({ id: "call1", status: "WAITING" }),
  accept: jest.fn().mockResolvedValue({ id: "call1", status: "ACTIVE", trtcToken: "tk123" }),
  hangup: jest.fn().mockResolvedValue({ id: "call1", status: "ENDED", cost: 50 }),
  getStatus: jest.fn().mockResolvedValue({ id: "call1", status: "ACTIVE", duration: 120 }),
  listCalls: jest.fn().mockResolvedValue([{ id: "call1", status: "ENDED" }]),
};

describe("CallController", () => {
  let ctrl: CallController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [CallController],
      providers: [{ provide: CallService, useValue: mockCallSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(CallController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /call/create — 发起连麦", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { toUserId: "u2", circleId: "c1" };
    const result: any = await ctrl.create(req, dto);
    expect(result.status).toBe("WAITING");
    expect(mockCallSvc.create).toHaveBeenCalledWith("u1", dto);
  });

  it("POST /call/:id/accept — 接听连麦", async () => {
    const req: any = { user: { id: "u2" } };
    const result: any = await ctrl.accept(req, "call1");
    expect(result.status).toBe("ACTIVE");
    expect(mockCallSvc.accept).toHaveBeenCalledWith("u2", "call1");
  });

  it("POST /call/:id/hangup — 挂断连麦", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.hangup(req, "call1");
    expect(result.status).toBe("ENDED");
    expect(mockCallSvc.hangup).toHaveBeenCalledWith("u1", "call1");
  });

  it("GET /call/:id/status — 通话状态", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getStatus(req, "call1");
    expect(result.duration).toBe(120);
    expect(mockCallSvc.getStatus).toHaveBeenCalledWith("call1", "u1");
  });

  it("GET /call — 通话记录", async () => {
    const req: any = { user: { id: "u1" } };
    const q: any = { page: 1, pageSize: 20 };
    const result: any = await ctrl.listCalls(req, q);
    expect(result).toHaveLength(1);
    expect(mockCallSvc.listCalls).toHaveBeenCalledWith("u1", q);
  });
});
