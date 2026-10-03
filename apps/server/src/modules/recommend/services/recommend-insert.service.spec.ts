import { PrismaService } from "../../../prisma/prisma.service";
import { RecommendScene } from "../recommend.dto";
import { RecommendItem } from "../strategies/base.strategy";
import { RecommendInsertService } from "./recommend-insert.service";
import { RecommendSelectService } from "./recommend-select.service";

const mockPrisma = {
  station: { findUnique: jest.fn() },
  stationPinnedContent: { findMany: jest.fn() },
  stationPick: { findMany: jest.fn() },
  product: { findFirst: jest.fn(), findUnique: jest.fn() },
};

const mockSelect = {
  productSelect: jest.fn().mockReturnValue({ id: true, title: true }),
};

describe("RecommendInsertService 分站主推注入", () => {
  let service: RecommendInsertService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RecommendInsertService(
      mockPrisma as unknown as PrismaService,
      mockSelect as unknown as RecommendSelectService,
    );
    mockPrisma.station.findUnique.mockResolvedValue({ status: "ACTIVE", templateConfig: {} });
  });

  it("只读StationPinnedContent，按板块槽位注入并过滤重复与下架内容", async () => {
    mockPrisma.stationPinnedContent.findMany.mockResolvedValue([
      { contentType: "product", contentId: "base-product", slotIndex: 0 },
      { contentType: "product", contentId: "station-product", slotIndex: 1 },
      { contentType: "product", contentId: "off-shelf", slotIndex: 2 },
    ]);
    mockPrisma.product.findFirst
      .mockResolvedValueOnce({
        id: "station-product",
        title: "E站主推商品",
        images: ["e.jpg"],
        intro: "",
        tags: [],
        price: 88,
        salesCount: 1,
      })
      .mockResolvedValueOnce(null);
    const base: RecommendItem[] = [
      {
        id: "base-product",
        type: "PRODUCT",
        title: "原推荐商品",
        score: 1,
        reason: "猜你喜欢",
        strategies: ["base"],
      },
    ];

    const result = await service.applyStationPicks(
      { stationId: "station-e", scene: RecommendScene.PRODUCT_DETAIL, page: 1, pageSize: 10 },
      base,
    );

    expect(mockPrisma.stationPinnedContent.findMany).toHaveBeenCalledWith({
      where: { stationId: "station-e", board: "mall", isActive: true },
      orderBy: { slotIndex: "asc" },
      take: 6,
    });
    expect(mockPrisma.stationPick.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.product.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: "station-product", status: "ON_SALE", deletedAt: null },
      select: expect.any(Object),
    });
    expect(result.map((item) => item.id)).toEqual(["station-product", "base-product"]);
    expect(result[0]).toEqual(
      expect.objectContaining({ reason: "站长主推", strategies: ["station-pinned"] }),
    );
  });

  it("分站非ACTIVE时不展示也不读取主推位", async () => {
    mockPrisma.station.findUnique.mockResolvedValueOnce({ status: "EXPIRED", templateConfig: {} });

    const result = await service.applyStationPicks(
      { stationId: "station-e", scene: RecommendScene.GUESS_LIKE, page: 1, pageSize: 10 },
      [],
    );

    expect(result).toEqual([]);
    expect(mockPrisma.stationPinnedContent.findMany).not.toHaveBeenCalled();
  });
});
