import { Test } from "@nestjs/testing";
import { ContentGuideService } from "./content-guide.service";
import { SearchService } from "./search.service";

const mockSearch = {
  search: jest.fn().mockResolvedValue({
    classics: [{ id: "c1", title: "论语", author: "孔子", dynasty: "春秋", category: "经" }],
    articles: [{ id: "a1", title: "如何读论语", excerpt: "一篇导读" }],
    courses: [],
    circles: [{ id: "g1", name: "国学交流圈", intro: "交流" }],
    contents: [],
  }),
};

describe("ContentGuideService", () => {
  let svc: ContentGuideService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ContentGuideService,
        { provide: SearchService, useValue: mockSearch },
      ],
    }).compile();
    svc = mod.get(ContentGuideService);
  });

  beforeEach(() => jest.clearAllMocks());

  it("空查询返回空卡片", async () => {
    const result = await svc.guide("   ");
    expect(result.cards).toHaveLength(0);
  });

  it("把各类型结果映射成带导航目标的来源卡片", async () => {
    const result = await svc.guide("论语");

    expect(result.cards).toHaveLength(2);
    const classic = result.cards.find((c) => c.type === "classic");
    expect(classic?.id).toBe("c1");
    expect(classic?.target).toContain("pkg-classics/detail");
    expect(classic?.subtitle).toContain("孔子");

    expect(result.cards.some((c) => c.type === "circle" || c.type === "course")).toBe(false);

    const article = result.cards.find((c) => c.type === "article");
    expect(article?.target).toBe("/pkg-circle/articles/detail?id=a1");
  });

  it("所有导航目标都是 pages.json 中真实存在的页面", async () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const pagesJson = fs.readFileSync(
      path.resolve(__dirname, "../../../../mobile/src/pages.json"),
      "utf8",
    ).replace(/\/\/.*$/gm, "");
    const pages = JSON.parse(pagesJson);
    const routes = new Set<string>();
    for (const p of pages.pages || []) routes.add(`/${p.path}`);
    for (const sp of pages.subPackages || []) {
      for (const p of sp.pages || []) routes.add(`/${sp.root}/${p.path}`);
    }
    mockSearch.search.mockResolvedValueOnce({
      classics: [{ id: "c1", title: "论语" }],
      articles: [{ id: "a1", title: "文" }],
      courses: [{ id: "k1", title: "课" }],
      circles: [{ id: "g1", name: "圈" }],
      contents: [{ id: "t1", title: "内容" }],
    });
    const result = await svc.guide("推荐入门课程和圈子", 10);
    expect(result.cards).toHaveLength(5);
    for (const card of result.cards) {
      expect(routes.has(card.target.split("?")[0])).toBe(true);
    }
  });

  it("topK 限制卡片数量", async () => {
    mockSearch.search.mockResolvedValue({
      classics: [
        { id: "1", title: "甲" }, { id: "2", title: "乙" },
        { id: "3", title: "丙" }, { id: "4", title: "丁" },
      ],
      articles: [], courses: [], circles: [], contents: [],
    });
    const result = await svc.guide("测", 2);
    expect(result.cards.length).toBeLessThanOrEqual(2);
  });

  it("学习问题优先课程，并在类型之间轮取", async () => {
    mockSearch.search.mockResolvedValue({
      classics: [{ id: "b1", title: "八字原典" }, { id: "b2", title: "另一原典" }],
      articles: [{ id: "a1", title: "八字文章" }],
      courses: [{ id: "c1", title: "八字入门课", price: "99" }],
      circles: [{ id: "g1", name: "学习圈", price: "0" }],
      contents: [],
    });
    const result = await svc.guide("八字如何入门", 4);
    expect(result.cards.map((card) => card.type)).toEqual(["course", "article", "classic", "classic"]);
    expect(result.cards[0].price).toBe(99);
  });

  it("只找课程或圈子时不混入另一种商业入口", async () => {
    mockSearch.search.mockResolvedValue({
      classics: [], articles: [], contents: [],
      courses: [{ id: "k1", title: "论语课程" }],
      circles: [{ id: "g1", name: "论语圈子" }],
    });
    expect((await svc.guide("推荐论语课程")).cards.map((card) => card.type)).toEqual(["course"]);
    expect((await svc.guide("推荐论语圈子")).cards.map((card) => card.type)).toEqual(["circle"]);
    expect((await svc.guide("推荐论语课程和圈子")).cards.map((card) => card.type)).toEqual(["course", "circle"]);
  });

  it("寒暄和服务问题不检索内容", async () => {
    expect((await svc.guide("你好")).cards).toEqual([]);
    expect((await svc.guide("我的订单退款失败怎么办")).cards).toEqual([]);
    expect(mockSearch.search).not.toHaveBeenCalled();
  });

  it("泛知识问题不夹带课程或圈子卡片", async () => {
    mockSearch.search.mockResolvedValue({
      classics: [{ id: "c1", title: "论语" }],
      articles: [],
      courses: [{ id: "k1", title: "论语课" }],
      circles: [{ id: "g1", name: "论语圈" }],
      contents: [],
    });
    const result = await svc.guide("论语中的仁是什么意思");
    expect(result.cards.map((card) => card.type)).toEqual(["classic"]);
  });

  it("自然问句零命中时按明确主题补检一次", async () => {
    mockSearch.search.mockResolvedValueOnce({ articles: [], classics: [], courses: [], circles: [], contents: [] });
    mockSearch.search.mockResolvedValueOnce({ articles: [{ id: "a1", title: "论语入门" }] });
    const result = await svc.guide("我想知道论语中的仁是什么意思", 4);
    expect(mockSearch.search).toHaveBeenNthCalledWith(2, { q: "论语", page: 1, pageSize: 20 });
    expect(result.cards[0].id).toBe("a1");
  });
});
