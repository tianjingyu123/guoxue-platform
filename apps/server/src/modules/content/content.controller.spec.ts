import { Test } from "@nestjs/testing";
import { ContentController } from "./content.controller";
import { ContentService } from "./content.service";
import { SystemService } from "../system/system.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { ActiveUserGuard } from "../../common/active-user.guard";
import { StationIsolationGuard } from "../../common/station-isolation.guard";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";
import { Logger } from "@nestjs/common";

const mockContentSvc = {
  create: jest.fn().mockResolvedValue({ id: "ct1", title: "国学经典" }),
  list: jest.fn().mockResolvedValue([{ id: "ct1", title: "国学经典" }]),
  detail: jest.fn().mockResolvedValue({ id: "ct1", title: "国学经典", body: "..." }),
  update: jest.fn().mockResolvedValue({ id: "ct1", title: "更新标题" }),
  remove: jest.fn().mockResolvedValue({ success: true }),
  batchUpdateStatus: jest.fn().mockResolvedValue({ count: 5 }),
  getStats: jest.fn().mockResolvedValue({ total: 100, published: 80 }),
  getFeatured: jest.fn().mockResolvedValue([{ id: "ct1", views: 1000 }]),
};

const mockSystemSvc = {
  logAudit: jest.fn().mockResolvedValue(undefined),
};

describe("ContentController", () => {
  let ctrl: ContentController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [
        { provide: ContentService, useValue: mockContentSvc },
        { provide: SystemService, useValue: mockSystemSvc },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(FeatureFlagGuard).useValue({ canActivate: () => true })
      .overrideGuard(ActiveUserGuard).useValue({ canActivate: () => true })
      .overrideGuard(StationIsolationGuard).useValue({ canActivate: () => true })
      .overrideGuard(OptionalAuthGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(ContentController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /contents — 创建内容", async () => {
    const dto: any = { title: "国学经典", body: "...", type: "article" };
    const req: any = { user: { id: "u1" }, ip: "127.0.0.1" };
    const result: any = await ctrl.create(dto, req);
    expect(result.id).toBe("ct1");
    expect(mockContentSvc.create).toHaveBeenCalledWith(dto);
    expect(mockSystemSvc.logAudit).toHaveBeenCalled();
  });

  it("GET /contents — 内容列表", async () => {
    const q: any = { type: "article", page: 1, pageSize: 20 };
    const result: any = await ctrl.list(q, { user: { roles: ["SUPER_ADMIN"] } } as any);
    expect(result).toHaveLength(1);
    expect(mockContentSvc.list).toHaveBeenCalledWith(q);
  });

  it("GET /contents/:id — 内容详情", async () => {
    const result: any = await ctrl.detail("ct1", {} as any);
    expect(result.title).toBe("国学经典");
    expect(mockContentSvc.detail).toHaveBeenCalledWith("ct1", false);
  });

  it.each([undefined, ["USER"], ["FINANCE_ADMIN"]])("访客或非内容管理角色 %s 不能通过筛选读取草稿", async roles => {
    await ctrl.list({ status: "DRAFT" }, { user: roles ? { roles } : undefined } as any);
    expect(mockContentSvc.list).toHaveBeenCalledWith({ status: "PUBLISHED" });
  });

  it("内容审核员可读取待审内容详情", async () => {
    await ctrl.detail("ct1", { user: { roles: ["CONTENT_AUDITOR"] } } as any);
    expect(mockContentSvc.detail).toHaveBeenCalledWith("ct1", true);
  });

  it("PUT /contents/:id — 更新内容", async () => {
    const dto: any = { title: "更新标题" };
    const req: any = { user: { id: "u1" }, ip: "127.0.0.1" };
    const result: any = await ctrl.update("ct1", dto, req);
    expect(result.title).toBe("更新标题");
    expect(mockContentSvc.update).toHaveBeenCalledWith("ct1", dto);
    expect(mockSystemSvc.logAudit).toHaveBeenCalled();
  });

  it("DELETE /contents/:id — 删除内容", async () => {
    const req: any = { user: { id: "u1" }, ip: "127.0.0.1" };
    const result: any = await ctrl.remove("ct1", req);
    expect(result.success).toBe(true);
    expect(mockContentSvc.remove).toHaveBeenCalledWith("ct1");
  });

  it("PUT /contents/batch/status — 批量更新状态", async () => {
    const dto = { ids: ["ct1", "ct2"], status: "PUBLISHED" };
    const req: any = { user: { id: "u1" }, ip: "127.0.0.1" };
    const result: any = await ctrl.batchUpdateStatus(dto, req);
    expect(result.count).toBe(5);
    expect(mockContentSvc.batchUpdateStatus).toHaveBeenCalledWith(dto.ids, dto.status);
  });

  it("GET /contents/stats/overview — 统计概览", async () => {
    const result: any = await ctrl.getStats();
    expect(result.total).toBe(100);
    expect(mockContentSvc.getStats).toHaveBeenCalled();
  });

  it("GET /contents/featured — 精选内容", async () => {
    const result: any = await ctrl.getFeatured("article");
    expect(result).toHaveLength(1);
    expect(mockContentSvc.getFeatured).toHaveBeenCalledWith("article");
  });
});
