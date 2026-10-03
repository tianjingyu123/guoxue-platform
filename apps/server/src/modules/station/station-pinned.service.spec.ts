import { PrismaService } from "../../prisma/prisma.service";
import { StationPinnedService } from "./station-pinned.service";

const mockPrisma = {
  station: { findFirst: jest.fn(), findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  referralRelation: { findFirst: jest.fn() },
  stationPinnedContent: { findMany: jest.fn() },
  product: { findMany: jest.fn() },
};

describe("StationPinnedService C端主推归因", () => {
  let service: StationPinnedService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StationPinnedService(mockPrisma as unknown as PrismaService);
    mockPrisma.stationPinnedContent.findMany.mockResolvedValue([]);
    mockPrisma.product.findMany.mockResolvedValue([]);
  });

  it("临时E分站优先于C用户永久归属的B分站", async () => {
    mockPrisma.station.findFirst.mockResolvedValueOnce({
      id: "station-e",
      userId: "station-e-user",
      name: "E分站",
      code: "E001",
      logo: null,
      themeColor: "#8B4513",
    });
    mockPrisma.stationPinnedContent.findMany.mockResolvedValueOnce([
      { contentType: "product", contentId: "product-e", slotIndex: 0 },
    ]);
    mockPrisma.product.findMany.mockResolvedValueOnce([
      { id: "product-e", title: "E站主推", images: ["e.jpg"], price: 99 },
    ]);

    const result = await service.getPublicBoard("mall", "customer-c", "station-e-user");

    expect(result.station).toEqual(expect.objectContaining({ id: "station-e", userId: "station-e-user" }));
    expect(result.items).toEqual([expect.objectContaining({ id: "product-e", title: "E站主推" })]);
    expect(mockPrisma.station.findFirst).toHaveBeenNthCalledWith(1, {
      where: { status: "ACTIVE", OR: [{ userId: "station-e-user" }, { code: "station-e-user" }] },
      select: expect.any(Object),
    });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.referralRelation.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.stationPinnedContent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { stationId: "station-e", board: "mall", isActive: true } }),
    );
  });

  it("没有有效临时分站时回落到用户永久归属B分站", async () => {
    mockPrisma.station.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "station-b",
        userId: "station-b-user",
        name: "B分站",
        code: "B001",
        logo: null,
        themeColor: "#8B4513",
      });
    mockPrisma.user.findUnique.mockResolvedValueOnce({ attributionStationId: "station-b" });

    const result = await service.getPublicBoard("home", "customer-c", "ordinary-user-ref");

    expect(result.station).toEqual(expect.objectContaining({ id: "station-b" }));
    expect(mockPrisma.station.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: "station-b", status: "ACTIVE" },
      select: expect.any(Object),
    });
  });

  it("已下架商品即使仍被锁位也不会下发给C端", async () => {
    mockPrisma.station.findFirst.mockResolvedValueOnce({
      id: "station-e",
      userId: "station-e-user",
      name: "E分站",
      code: "E001",
      logo: null,
      themeColor: "#8B4513",
    });
    mockPrisma.stationPinnedContent.findMany.mockResolvedValueOnce([
      { contentType: "product", contentId: "off-shelf", slotIndex: 0 },
    ]);

    const result = await service.getPublicBoard("mall", undefined, "E001");

    expect(result.items).toEqual([]);
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["off-shelf"] }, status: "ON_SALE", deletedAt: null },
      }),
    );
  });
});
