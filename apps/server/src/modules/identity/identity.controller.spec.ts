import { Test } from "@nestjs/testing";
import { IdentityController } from "./identity.controller";
import { IdentityService } from "./identity.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockIdentitySvc = {
  idCardOcr: jest.fn().mockResolvedValue({ name: "张三", idCard: "110101..." }),
  idCardVerification: jest.fn().mockResolvedValue({ valid: true }),
  getFaceIdToken: jest.fn().mockResolvedValue({ token: "tk123", url: "https://..." }),
  getFaceIdResult: jest.fn().mockResolvedValue({ passed: true, score: 95 }),
  getIdentityAuditList: jest.fn().mockResolvedValue([{ id: "r1", status: "PENDING" }]),
  approveIdentity: jest.fn().mockResolvedValue({ id: "r1", status: "APPROVED" }),
  rejectIdentity: jest.fn().mockResolvedValue({ id: "r1", status: "REJECTED" }),
};

describe("IdentityController", () => {
  let ctrl: IdentityController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [IdentityController],
      providers: [{ provide: IdentityService, useValue: mockIdentitySvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(IdentityController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /identity/ocr — 身份证OCR", async () => {
    const body: any = { idCardFrontUrl: "https://...front.jpg" };
    const result: any = await ctrl.ocr(body);
    expect(result.name).toBe("张三");
    expect(mockIdentitySvc.idCardOcr).toHaveBeenCalledWith(body);
  });

  it("POST /identity/verify — 二要素核验", async () => {
    const body = { name: "张三", idCard: "110101199001011234" };
    const result: any = await ctrl.verify(body);
    expect(result.valid).toBe(true);
    expect(mockIdentitySvc.idCardVerification).toHaveBeenCalledWith("张三", "110101199001011234");
  });

  it("POST /identity/face/token — 人脸核身URL", async () => {
    const body = { name: "张三", idCard: "110101...", returnUrl: "https://..." };
    const result: any = await ctrl.faceToken(body);
    expect(result.token).toBe("tk123");
    expect(mockIdentitySvc.getFaceIdToken).toHaveBeenCalledWith("张三", "110101...", "https://...");
  });

  it("GET /identity/face/result/:token — 人脸核身结果", async () => {
    const result: any = await ctrl.faceResult("tk123");
    expect(result.passed).toBe(true);
    expect(mockIdentitySvc.getFaceIdResult).toHaveBeenCalledWith("tk123");
  });

  it("GET /identity/admin/audit-list — 审核列表", async () => {
    const result: any = await ctrl.getAuditList("PENDING", 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockIdentitySvc.getIdentityAuditList).toHaveBeenCalledWith(1, 20, "PENDING");
  });

  it("POST /identity/admin/approve/:id — 通过认证", async () => {
    const dto: any = { id: "r1", remark: "审核通过" };
    const result: any = await ctrl.approveIdentity("r1", dto);
    expect(result.status).toBe("APPROVED");
    expect(mockIdentitySvc.approveIdentity).toHaveBeenCalledWith("r1", "审核通过");
  });

  it("POST /identity/admin/reject/:id — 拒绝认证", async () => {
    const dto: any = { id: "r1", remark: "信息不匹配" };
    const result: any = await ctrl.rejectIdentity("r1", dto);
    expect(result.status).toBe("REJECTED");
    expect(mockIdentitySvc.rejectIdentity).toHaveBeenCalledWith("r1", "信息不匹配");
  });

  it("POST /identity/admin/reject/:id — 拒绝时默认备注", async () => {
    const dto: any = {};
    await ctrl.rejectIdentity("r1", dto);
    expect(mockIdentitySvc.rejectIdentity).toHaveBeenCalledWith("r1", "未通过审核");
  });
});
