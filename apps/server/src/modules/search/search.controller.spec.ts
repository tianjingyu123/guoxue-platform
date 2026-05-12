import { Test } from "@nestjs/testing";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { SearchWeightService } from "./search-weight.service";
import { ThrottleGuard } from "../../common/throttle.guard";

const mockSearchSvc = {
  search: jest.fn().mockResolvedValue({ q: "论语", articles: [], courses: [], products: [] }),
  getHotSearches: jest.fn().mockResolvedValue([{ keyword: "论语", count: 10 }]),
  saveHistory: jest.fn().mockResolvedValue(undefined),
  getHistory: jest.fn().mockResolvedValue([{ id: "h1", keyword: "论语", createdAt: new Date() }]),
  suggest: jest.fn().mockResolvedValue([{ label: "论语", type: "article", id: "a1" }]),
  clearHistory: jest.fn().mockResolvedValue({ success: true }),
  getStats: jest.fn().mockResolvedValue({ totalSearches: 100, todaySearches: 5, hotKeywords: [], recentSearches: [] }),
};

const mockWeightSvc = {
  getWeightMap: jest.fn().mockResolvedValue(new Map([["article:all", 1.0]])),
};

describe("SearchController", () => {
  let ctrl: SearchController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        { provide: SearchService, useValue: mockSearchSvc },
        { provide: SearchWeightService, useValue: mockWeightSvc },
      ],
    })
      .overrideGuard(ThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(SearchController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /search — 全局搜索", async () => {
    const result: any = await ctrl.search("论语", undefined, 1 as any, 20 as any);
    expect(result).toHaveProperty("articles");
    expect(mockWeightSvc.getWeightMap).toHaveBeenCalled();
  });

  it("GET /search/hot — 热门搜索", async () => {
    const result: any = await ctrl.hotSearches(10 as any);
    expect(result).toHaveLength(1);
    expect(result[0].keyword).toBe("论语");
  });

  it("GET /search/history/save — 保存搜索历史", async () => {
    const req: any = { user: { id: "u1" } };
    await ctrl.saveHistory(req, "论语");
    expect(mockSearchSvc.saveHistory).toHaveBeenCalledWith("u1", "论语");
  });

  it("GET /search/history — 获取我的搜索历史", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getHistory(req);
    expect(result).toHaveLength(1);
  });

  it("GET /search/suggest — 搜索建议", async () => {
    const result: any = await ctrl.suggest("论语");
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("article");
  });

  it("DELETE /search/history — 清除搜索历史", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.clearHistory(req);
    expect(result.success).toBe(true);
  });

  it("GET /search/stats — 搜索统计", async () => {
    const result: any = await ctrl.getStats();
    expect(result.totalSearches).toBe(100);
  });

  it("GET /search/stream — SSE空查询立即结束", async () => {
    const res: any = {
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };
    await ctrl.searchStream("", res);
    expect(res.end).toHaveBeenCalled();
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining("done"));
  });
});
