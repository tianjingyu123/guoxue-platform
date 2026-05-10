import { Test } from "@nestjs/testing";
import { MixedStrategy } from "./mixed.strategy";
import { BaseRecommendStrategy, RecommendContext, RecommendItem } from "./base.strategy";
import { RecommendScene } from "../recommend.dto";

/** 测试用 mock 子策略 */
class MockStrategy extends BaseRecommendStrategy {
  name = "mock";
  private shouldSupport: boolean;
  private items: RecommendItem[];
  constructor(name: string, shouldSupport: boolean, items: RecommendItem[]) {
    super();
    this.name = name;
    this.shouldSupport = shouldSupport;
    this.items = items;
  }
  supports(_scene: RecommendScene): boolean {
    return this.shouldSupport;
  }
  async recommend(_ctx: RecommendContext): Promise<RecommendItem[]> {
    return this.items;
  }
}

const makeItem = (id: string, type: RecommendItem["type"], score: number): RecommendItem => ({
  id, type, title: id, score, reason: "test", strategies: [type],
});

describe("MixedStrategy", () => {
  let svc: MixedStrategy;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [MixedStrategy],
    }).compile();
    svc = mod.get(MixedStrategy);
  });

  describe("supports", () => {
    it("始终返回 true 作为兜底策略", () => {
      expect(svc.supports(RecommendScene.GUESS_LIKE)).toBe(true);
      expect(svc.supports(RecommendScene.ARTICLE_DETAIL)).toBe(true);
      expect(svc.supports(RecommendScene.PAIPAN_RESULT)).toBe(true);
    });
  });

  describe("recommend", () => {
    it("无子策略时返回空数组", async () => {
      const result = await svc.recommend({ scene: RecommendScene.GUESS_LIKE, page: 1, pageSize: 10 });
      expect(result).toEqual([]);
    });

    it("子策略不支持当前场景时被跳过", async () => {
      svc.use(new MockStrategy("s1", false, [makeItem("a", "ARTICLE", 100)]), 1);
      const result = await svc.recommend({ scene: RecommendScene.GUESS_LIKE, page: 1, pageSize: 10 });
      expect(result).toEqual([]);
    });

    it("单个子策略按权重缩放分数", async () => {
      // 重新创建 module 得到空的 MixedStrategy
      const mod = await Test.createTestingModule({ providers: [MixedStrategy] }).compile();
      const s = mod.get(MixedStrategy);
      s.use(new MockStrategy("s1", true, [makeItem("a", "ARTICLE", 100)]), 0.4);
      const result = await s.recommend({ scene: RecommendScene.GUESS_LIKE, page: 1, pageSize: 10 });
      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(40); // 100 * 0.4
      expect(result[0].strategies).toContain("mixed");
    });

    it("多子策略结果合并去重，保留最高分", async () => {
      const mod = await Test.createTestingModule({ providers: [MixedStrategy] }).compile();
      const s = mod.get(MixedStrategy);
      // 两个策略返回同 id 内容
      s.use(new MockStrategy("s1", true, [makeItem("dup", "COURSE", 200)]), 0.5);
      s.use(new MockStrategy("s2", true, [makeItem("dup", "COURSE", 300)]), 0.6);
      const result = await s.recommend({ scene: RecommendScene.GUESS_LIKE, page: 1, pageSize: 10 });
      // 保留 300 * 0.6 = 180，而非 200 * 0.5 = 100
      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(180);
    });

    it("子策略异常时被静默吞掉", async () => {
      class BrokenStrategy extends BaseRecommendStrategy {
        name = "broken";
        supports() { return true; }
        async recommend(): Promise<RecommendItem[]> { throw new Error("boom"); }
      }
      const mod = await Test.createTestingModule({ providers: [MixedStrategy] }).compile();
      const s = mod.get(MixedStrategy);
      s.use(new BrokenStrategy(), 1);
      s.use(new MockStrategy("ok", true, [makeItem("a", "ARTICLE", 50)]), 1);
      const result = await s.recommend({ scene: RecommendScene.GUESS_LIKE, page: 1, pageSize: 10 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("a");
    });

    it("结果截断到 pageSize * 2", async () => {
      const mod = await Test.createTestingModule({ providers: [MixedStrategy] }).compile();
      const s = mod.get(MixedStrategy);
      const items = Array.from({ length: 30 }, (_, i) => makeItem(`c${i}`, "COURSE", i * 10));
      s.use(new MockStrategy("s1", true, items), 1);
      const result = await s.recommend({ scene: RecommendScene.GUESS_LIKE, page: 1, pageSize: 5 });
      expect(result).toHaveLength(10); // 5 * 2
    });
  });
});
