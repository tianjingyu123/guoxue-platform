import { Test } from "@nestjs/testing";
import { ChannelClickService, CHANNEL_CLICK_WINDOW_MS } from "./channel-click.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  station: { findUnique: jest.fn() },
  circle: { findUnique: jest.fn() },
  stationOffline: { findUnique: jest.fn() },
  channelClick: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
};

describe("ChannelClickService（佣-V2-P2 渠道主体临时链接点击）", () => {
  let svc: ChannelClickService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [ChannelClickService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(ChannelClickService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.channelClick.findFirst.mockResolvedValue(null);
    mockPrisma.channelClick.create.mockResolvedValue({ id: "cc-1" });
    mockPrisma.channelClick.update.mockResolvedValue({ id: "cc-1" });
  });

  describe("渠道资格校验", () => {
    it("STATION 存在且 ACTIVE：落库·受益人=station.userId", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ userId: "st-user", status: "ACTIVE" });
      const result = await svc.recordClick("u1", { subjectType: "STATION", subjectId: "s1", targetType: "PRODUCT", targetId: "p1" });
      expect(result).toEqual({ accepted: true });
      const data = mockPrisma.channelClick.create.mock.calls[0][0].data;
      expect(data.beneficiaryUserId).toBe("st-user");
      expect(data.subjectType).toBe("STATION");
      expect(data.userId).toBe("u1");
      expect(data.targetId).toBe("p1");
    });

    it("STATION 状态非 ACTIVE：静默拒绝不落库", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ userId: "st-user", status: "DISABLED" });
      const result = await svc.recordClick("u1", { subjectType: "STATION", subjectId: "s1", targetType: "PRODUCT", targetId: "p1" });
      expect(result).toEqual({ accepted: false });
      expect(mockPrisma.channelClick.create).not.toHaveBeenCalled();
    });

    it("CIRCLE 存在且 ACTIVE 未软删：受益人=circle.ownerId", async () => {
      mockPrisma.circle.findUnique.mockResolvedValue({ ownerId: "c-owner", status: "ACTIVE", deletedAt: null });
      const result = await svc.recordClick("u1", { subjectType: "CIRCLE", subjectId: "c1", targetType: "SHOP_ALL" });
      expect(result).toEqual({ accepted: true });
      const data = mockPrisma.channelClick.create.mock.calls[0][0].data;
      expect(data.beneficiaryUserId).toBe("c-owner");
      expect(data.targetId).toBeNull(); // SHOP_ALL 全店无 targetId
    });

    it("CIRCLE 已软删：静默拒绝", async () => {
      mockPrisma.circle.findUnique.mockResolvedValue({ ownerId: "c-owner", status: "ACTIVE", deletedAt: new Date() });
      const result = await svc.recordClick("u1", { subjectType: "CIRCLE", subjectId: "c1", targetType: "PRODUCT", targetId: "p1" });
      expect(result).toEqual({ accepted: false });
      expect(mockPrisma.channelClick.create).not.toHaveBeenCalled();
    });

    it("OFFLINE_STATION 存在：受益人=ownerUserId", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ ownerUserId: "off-owner" });
      const result = await svc.recordClick("u1", { subjectType: "OFFLINE_STATION", subjectId: "os1", targetType: "PRODUCT", targetId: "p1" });
      expect(result).toEqual({ accepted: true });
      expect(mockPrisma.channelClick.create.mock.calls[0][0].data.beneficiaryUserId).toBe("off-owner");
    });

    it("伪造 subjectId（主体不存在）：静默拒绝不落库·不报错防探测", async () => {
      mockPrisma.circle.findUnique.mockResolvedValue(null);
      const result = await svc.recordClick("u1", { subjectType: "CIRCLE", subjectId: "fake", targetType: "PRODUCT", targetId: "p1" });
      expect(result).toEqual({ accepted: false });
      expect(mockPrisma.channelClick.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.channelClick.create).not.toHaveBeenCalled();
    });

    it("未知 subjectType：静默拒绝", async () => {
      const result = await svc.recordClick("u1", { subjectType: "USER", subjectId: "x", targetType: "PRODUCT", targetId: "p1" });
      expect(result).toEqual({ accepted: false });
      expect(mockPrisma.channelClick.create).not.toHaveBeenCalled();
    });
  });

  describe("自点与 last-click 语义", () => {
    it("自己点自己的渠道链接（受益人=点击者）：不落库", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ userId: "u1", status: "ACTIVE" });
      const result = await svc.recordClick("u1", { subjectType: "STATION", subjectId: "s1", targetType: "PRODUCT", targetId: "p1" });
      expect(result).toEqual({ accepted: false });
      expect(mockPrisma.channelClick.create).not.toHaveBeenCalled();
      expect(mockPrisma.channelClick.update).not.toHaveBeenCalled();
    });

    it("7 天窗内重复点击：更新 clickedAt/expiresAt 不堆行（last-click）", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ userId: "st-user", status: "ACTIVE" });
      mockPrisma.channelClick.findFirst.mockResolvedValue({ id: "cc-old" });
      const result = await svc.recordClick("u1", { subjectType: "STATION", subjectId: "s1", targetType: "PRODUCT", targetId: "p1" });
      expect(result).toEqual({ accepted: true });
      expect(mockPrisma.channelClick.create).not.toHaveBeenCalled();
      const updateArg = mockPrisma.channelClick.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: "cc-old" });
      expect(updateArg.data.clickedAt).toBeInstanceOf(Date);
      expect(updateArg.data.expiresAt).toBeInstanceOf(Date);
      // 去重查询只匹配未过期记录（过期旧行不复用，新开一行）
      expect(mockPrisma.channelClick.findFirst.mock.calls[0][0].where).toEqual(
        expect.objectContaining({ userId: "u1", subjectType: "STATION", subjectId: "s1", expiresAt: { gt: expect.any(Date) } }),
      );
    });

    it("窗口外（无未过期记录）：新建记录·expiresAt=clickedAt+7天", async () => {
      mockPrisma.circle.findUnique.mockResolvedValue({ ownerId: "c-owner", status: "ACTIVE", deletedAt: null });
      const result = await svc.recordClick("u1", { subjectType: "CIRCLE", subjectId: "c1", targetType: "PRODUCT", targetId: "p1" });
      expect(result).toEqual({ accepted: true });
      const data = mockPrisma.channelClick.create.mock.calls[0][0].data;
      expect(data.expiresAt.getTime() - data.clickedAt.getTime()).toBe(CHANNEL_CLICK_WINDOW_MS);
    });

    it("落库失败：静默 accepted:false 不抛错", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ userId: "st-user", status: "ACTIVE" });
      mockPrisma.channelClick.findFirst.mockRejectedValue(new Error("db down"));
      const result = await svc.recordClick("u1", { subjectType: "STATION", subjectId: "s1", targetType: "PRODUCT", targetId: "p1" });
      expect(result).toEqual({ accepted: false });
    });
  });
});
