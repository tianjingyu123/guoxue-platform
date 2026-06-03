import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { ExportController } from "./export.controller";
import { ExportService } from "./export.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockService: Record<string, jest.Mock> = {
  exportUsers: jest.fn(),
  exportOrders: jest.fn(),
  exportCourses: jest.fn(),
  exportArticles: jest.fn(),
  exportWithdrawals: jest.fn(),
};

const mockGuard: CanActivate = { canActivate: () => true };

const makeRes = (): any => ({
  setHeader: jest.fn(),
  send: jest.fn(),
});

describe("ExportController", () => {
  let ctrl: ExportController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [ExportController],
      providers: [{ provide: ExportService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(ExportController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  it("导出用户列表CSV", async () => {
    const res = makeRes();
    mockService.exportUsers.mockResolvedValue("id,nickname\n1,张三");
    await ctrl.exportUsers(undefined, undefined, undefined, undefined, res);
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv; charset=utf-8");
    expect(res.send).toHaveBeenCalledWith("id,nickname\n1,张三");
  });

  it("导出用户列表——带筛选条件", async () => {
    const res = makeRes();
    mockService.exportUsers.mockResolvedValue("");
    await ctrl.exportUsers("ACTIVE", "张三", "2025-01-01", "2025-12-31", res);
    expect(mockService.exportUsers).toHaveBeenCalledWith({
      status: "ACTIVE", keyword: "张三", startDate: "2025-01-01", endDate: "2025-12-31",
    });
  });

  it("导出订单列表CSV", async () => {
    const res = makeRes();
    mockService.exportOrders.mockResolvedValue("id,amount\n1,99");
    await ctrl.exportOrders(undefined, undefined, undefined, undefined, res);
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", expect.stringContaining("orders_"));
    expect(res.send).toHaveBeenCalledWith("id,amount\n1,99");
  });

  it("导出课程列表CSV", async () => {
    const res = makeRes();
    mockService.exportCourses.mockResolvedValue("id,title\n1,国学入门");
    await ctrl.exportCourses(undefined, undefined, undefined, res);
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", expect.stringContaining("courses_"));
    expect(res.send).toHaveBeenCalledWith("id,title\n1,国学入门");
  });

  it("导出课程列表——按审核状态过滤", async () => {
    const res = makeRes();
    mockService.exportCourses.mockResolvedValue("");
    await ctrl.exportCourses("APPROVED", "2025-01-01", "2025-06-01", res);
    expect(mockService.exportCourses).toHaveBeenCalledWith({
      auditStatus: "APPROVED", startDate: "2025-01-01", endDate: "2025-06-01",
    });
  });

  it("导出文章列表CSV", async () => {
    const res = makeRes();
    mockService.exportArticles.mockResolvedValue("id,title\n1,文章标题");
    await ctrl.exportArticles(undefined, undefined, undefined, undefined, res);
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", expect.stringContaining("articles_"));
    expect(res.send).toHaveBeenCalledWith("id,title\n1,文章标题");
  });

  it("导出提现记录CSV", async () => {
    const res = makeRes();
    mockService.exportWithdrawals.mockResolvedValue("id,amount\n1,100");
    await ctrl.exportWithdrawals(undefined, undefined, undefined, res);
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", expect.stringContaining("withdrawals_"));
    expect(res.send).toHaveBeenCalledWith("id,amount\n1,100");
  });

  it("导出提现记录——按状态过滤", async () => {
    const res = makeRes();
    mockService.exportWithdrawals.mockResolvedValue("");
    await ctrl.exportWithdrawals("PENDING", "2025-01-01", "2025-12-31", res);
    expect(mockService.exportWithdrawals).toHaveBeenCalledWith({
      status: "PENDING", startDate: "2025-01-01", endDate: "2025-12-31",
    });
  });
});
