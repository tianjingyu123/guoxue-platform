import { Test } from "@nestjs/testing";
import { ContentQualityService } from "./content-quality.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  contentQualityScore: { findMany: jest.fn(), create: jest.fn() },
  article: { findMany: jest.fn() },
  post: { findMany: jest.fn() },
};

describe("ContentQualityService", () => {
  let svc: ContentQualityService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [ContentQualityService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(ContentQualityService);
  });

  beforeEach(() => jest.clearAllMocks());

  describe("parseScore — AI 输出解析容错", () => {
    it("标准 JSON 正确解析并计算总分与分档", () => {
      const s = svc.parseScore('{"depth":20,"originality":22,"utility":21,"appeal":19,"reason":"引经据典"}');
      expect(s).toMatchObject({ total: 82, grade: "A", reason: "引经据典" });
    });

    it("带 markdown 包裹/前后噪声也能截取 JSON", () => {
      const s = svc.parseScore('好的，评分如下：\n```json\n{"depth":10,"originality":8,"utility":12,"appeal":9,"reason":"平实"}\n```');
      expect(s).toMatchObject({ total: 39, grade: "D" });
    });

    it("越界分数钳到 0-25", () => {
      const s = svc.parseScore('{"depth":99,"originality":-5,"utility":25,"appeal":10,"reason":""}');
      expect(s).toMatchObject({ depth: 25, originality: 0, total: 60, grade: "B" });
    });

    it("非 JSON 输出返回 null（下轮重试）", () => {
      expect(svc.parseScore("无法评分")).toBeNull();
    });
  });

  describe("getBoostMap — 流量倾斜映射", () => {
    it("A 级 +48h、D 级 -48h、B/C 不进映射", async () => {
      mockPrisma.contentQualityScore.findMany.mockResolvedValue([
        { targetType: "ARTICLE", targetId: "a1", grade: "A" },
        { targetType: "ARTICLE", targetId: "a2", grade: "B" },
        { targetType: "POST", targetId: "p1", grade: "D" },
      ]);
      const map = await svc.getBoostMap([
        { type: "ARTICLE", id: "a1" },
        { type: "ARTICLE", id: "a2" },
        { type: "POST", id: "p1" },
      ]);
      expect(map.get("ARTICLE:a1")).toBe(48 * 3_600_000);
      expect(map.get("POST:p1")).toBe(-48 * 3_600_000);
      expect(map.has("ARTICLE:a2")).toBe(false);
    });

    it("查询异常返回空映射不影响 feed", async () => {
      mockPrisma.contentQualityScore.findMany.mockRejectedValue(new Error("db"));
      const map = await svc.getBoostMap([{ type: "ARTICLE", id: "a1" }]);
      expect(map.size).toBe(0);
    });
  });
});
