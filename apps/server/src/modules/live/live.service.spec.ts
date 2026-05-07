import { Test } from "@nestjs/testing";
import { LiveService } from "./live.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

const mockPrisma = {
  liveRoom: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

describe("LiveService", () => {
  let svc: LiveService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        LiveService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(LiveService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("createRoom", () => {
    it("创建直播间成功", async () => {
      mockPrisma.liveRoom.create.mockResolvedValue({ id: "r1", title: "国学直播", products: [] });
      const result = await svc.createRoom("u1", { title: "国学直播", hostUserId: "u1" });
      expect(result.id).toBe("r1");
    });

    it("带商品创建直播间成功", async () => {
      mockPrisma.liveRoom.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "r1", ...data, products: [{ productId: "p1" }] }),
      );
      const result = await svc.createRoom("u1", {
        title: "直播", hostUserId: "u1", productIds: ["p1"],
      });
      expect(result.products).toBeDefined();
    });

    it("未指定 hostUserId 时默认为当前用户", async () => {
      mockPrisma.liveRoom.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "r1", ...data, products: [] }),
      );
      const result = await svc.createRoom("u1", { title: "直播", hostUserId: "u1" });
      expect(result.hostUserId).toBe("u1");
    });
  });

  describe("updateRoom", () => {
    it("更新直播间成功", async () => {
      mockPrisma.liveRoom.update.mockResolvedValue({ id: "r1", title: "新标题" });
      const result = await svc.updateRoom("r1", { title: "新标题" });
      expect(result.title).toBe("新标题");
    });
  });

  describe("updateStatus", () => {
    it("更新为 LIVING 状态", async () => {
      mockPrisma.liveRoom.update.mockResolvedValue({ id: "r1", status: "LIVING", pushUrl: "rtmp://example.com" });
      const result = await svc.updateStatus("r1", "LIVING", { pushUrl: "rtmp://example.com" });
      expect(result.status).toBe("LIVING");
    });

    it("更新为 ENDED 状态", async () => {
      mockPrisma.liveRoom.update.mockImplementation(({ data }) =>
        Promise.resolve({ id: "r1", ...data }),
      );
      const result = await svc.updateStatus("r1", "ENDED");
      expect(result.status).toBe("ENDED");
      expect(result.endTime).toBeInstanceOf(Date);
    });

    it("更新为 REPLAY 状态带回放地址", async () => {
      mockPrisma.liveRoom.update.mockImplementation(({ data }) =>
        Promise.resolve({ id: "r1", ...data }),
      );
      const result = await svc.updateStatus("r1", "REPLAY", { replayUrl: "https://example.com/replay.mp4" });
      expect(result.replayUrl).toBe("https://example.com/replay.mp4");
    });
  });

  describe("endRoom", () => {
    it("结束直播间成功", async () => {
      mockPrisma.liveRoom.update.mockResolvedValue({ id: "r1", status: "ENDED" });
      const result = await svc.endRoom("r1");
      expect(result.status).toBe("ENDED");
    });
  });

  describe("listRooms", () => {
    it("列出直播间（无过滤）", async () => {
      mockPrisma.liveRoom.findMany.mockResolvedValue([]);
      mockPrisma.liveRoom.count.mockResolvedValue(0);
      const result = await svc.listRooms();
      expect(result).toHaveProperty("rooms");
      expect(result.total).toBe(0);
    });

    it("按状态过滤", async () => {
      mockPrisma.liveRoom.findMany.mockResolvedValue([]);
      mockPrisma.liveRoom.count.mockResolvedValue(0);
      await svc.listRooms("LIVING");
      expect(mockPrisma.liveRoom.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "LIVING" } }),
      );
    });
  });

  describe("getRoom", () => {
    it("获取直播间详情成功", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: "r1", title: "直播", user: {}, circle: {}, products: [],
      });
      mockPrisma.liveRoom.update.mockResolvedValue({});
      const result = await svc.getRoom("r1");
      expect(result.id).toBe("r1");
    });

    it("直播间不存在抛出 NotFoundException", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(null);
      await expect(svc.getRoom("invalid")).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteRoom", () => {
    it("删除直播间成功", async () => {
      mockPrisma.liveRoom.delete.mockResolvedValue({});
      const result = await svc.deleteRoom("r1");
      expect(result.success).toBe(true);
    });
  });
});
