import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { BrowseHistoryController } from "./browse-history.controller";
import { BrowseHistoryService } from "./browse-history.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockService: Record<string, jest.Mock> = {
  list: jest.fn(),
  remove: jest.fn(),
  clearAll: jest.fn(),
};

const mockGuard: CanActivate = { canActivate: () => true };

describe("BrowseHistoryController", () => {
  let ctrl: BrowseHistoryController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [BrowseHistoryController],
      providers: [{ provide: BrowseHistoryService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(BrowseHistoryController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  it("获取浏览历史分页列表", async () => {
    mockService.list.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20 });
    const result: any = await ctrl.list({ user: { id: "u1" } } as any, {} as any);
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("按类型筛选浏览历史", async () => {
    mockService.list.mockResolvedValue({ data: [], total: 0 });
    await ctrl.list({ user: { id: "u1" } } as any, { targetType: "article" } as any);
    expect(mockService.list).toHaveBeenCalledWith("u1", expect.objectContaining({ targetType: "article" }));
  });

  it("删除单条浏览历史", async () => {
    mockService.remove.mockResolvedValue({ message: "已删除" });
    const result: any = await ctrl.remove({ user: { id: "u1" } } as any, "h1");
    expect(result.message).toBe("已删除");
    expect(mockService.remove).toHaveBeenCalledWith("u1", "h1");
  });

  it("清空全部浏览历史", async () => {
    mockService.clearAll.mockResolvedValue({ message: "全部清除" });
    const result: any = await ctrl.clearAll({ user: { id: "u1" } } as any);
    expect(result.message).toBe("全部清除");
    expect(mockService.clearAll).toHaveBeenCalledWith("u1");
  });
});
