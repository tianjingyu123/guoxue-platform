import { Test } from "@nestjs/testing";
import { BrowseHistoryService } from "./browse-history.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  browseHistory: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe("BrowseHistoryService", () => {
  let svc: BrowseHistoryService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        BrowseHistoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(BrowseHistoryService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("list", () => {
    it("返回分页浏览记录", async () => {
      const records = [
        { id: "h1", targetType: "ARTICLE", targetId: "a1", title: "测试", cover: null, createdAt: new Date() },
      ];
      mockPrisma.browseHistory.findMany.mockResolvedValue(records);
      mockPrisma.browseHistory.count.mockResolvedValue(1);

      const result = await svc.list("u1", { page: 1, pageSize: 20 });
      expect(result.data).toEqual(records);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it("按 targetType 过滤", async () => {
      mockPrisma.browseHistory.findMany.mockResolvedValue([]);
      mockPrisma.browseHistory.count.mockResolvedValue(0);

      await svc.list("u1", { page: 1, pageSize: 10, targetType: "COURSE" });
      expect(mockPrisma.browseHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "u1", targetType: "COURSE" } }),
      );
    });

    it("默认分页参数生效", async () => {
      mockPrisma.browseHistory.findMany.mockResolvedValue([]);
      mockPrisma.browseHistory.count.mockResolvedValue(0);

      const result = await svc.list("u1", {});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(mockPrisma.browseHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });

  describe("remove", () => {
    it("删除自己的浏览记录", async () => {
      mockPrisma.browseHistory.findFirst.mockResolvedValue({ id: "h1", userId: "u1" });
      mockPrisma.browseHistory.delete.mockResolvedValue({});

      const result = await svc.remove("u1", "h1");
      expect(result.message).toBe("已删除");
      expect(mockPrisma.browseHistory.delete).toHaveBeenCalledWith({ where: { id: "h1" } });
    });

    it("记录不存在返回提示", async () => {
      mockPrisma.browseHistory.findFirst.mockResolvedValue(null);

      const result = await svc.remove("u1", "nonexist");
      expect(result.message).toBe("记录不存在");
      expect(mockPrisma.browseHistory.delete).not.toHaveBeenCalled();
    });
  });

  describe("clearAll", () => {
    it("清除用户全部浏览记录", async () => {
      mockPrisma.browseHistory.deleteMany.mockResolvedValue({ count: 10 });

      const result = await svc.clearAll("u1");
      expect(result.message).toBe("全部清除");
      expect(mockPrisma.browseHistory.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
    });
  });
});
