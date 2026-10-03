import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import type { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { RecommendController } from "./recommend.controller";
import { RecommendContext, RecommendQueryDto, RecommendScene } from "./recommend.dto";
import { RecommendService } from "./recommend.service";
import { RecommendSceneService } from "./services/recommend-scene.service";
import { RecommendSceneCoreService } from "./services/recommend-scene-core.service";
import { RecommendSelectService } from "./services/recommend-select.service";
import { ColdStartService } from "./services/cold-start.service";
import { ScoringService } from "./services/scoring.service";
import { AbTestService } from "./services/ab-test.service";
import { RecommendInsertService } from "./services/recommend-insert.service";

const context = (city?: string): RecommendContext => ({ scene: RecommendScene.SAME_CITY, city, page: 1, pageSize: 10 });

describe("同城推荐公开边界", () => {
  const station = jest.fn();
  const offlineCourse = jest.fn();
  const stationProduct = jest.fn();
  const course = jest.fn();
  const product = jest.fn();
  const article = jest.fn();
  const fallback = jest.fn();
  const db = {
    stationOffline: { findMany: station }, offlineCourse: { findMany: offlineCourse },
    stationProduct: { findMany: stationProduct }, course: { findMany: course },
    product: { findMany: product }, article: { findMany: article },
  } as unknown as PrismaService;
  const svc = new RecommendSceneService(db, new RecommendSelectService(), { sceneFallback: fallback } as unknown as RecommendSceneCoreService);

  beforeEach(() => {
    jest.resetAllMocks();
    station.mockResolvedValue([{ id: "local-station" }]);
    offlineCourse.mockResolvedValue([]);
    stationProduct.mockResolvedValue([]);
    course.mockResolvedValue([]);
    product.mockResolvedValue([]);
    fallback.mockResolvedValue([{ id: "unrelated-national-content" }]);
  });

  it.each([undefined, "", "  ", "甲".repeat(65), "北京:上海"])("无有效城市 %s 时不读取全国数据", async (city) => {
    expect(await svc.dispatch(context(city))).toEqual([]);
    expect(station).not.toHaveBeenCalled();
    expect(fallback).not.toHaveBeenCalled();
  });

  it("旧城市编码不作为不存在的 schema 字段使用", async () => {
    expect(await svc.dispatch({ ...context(), cityCode: "110100" })).toEqual([]);
    expect(station).not.toHaveBeenCalled();
  });

  it("选城精确查询 ACTIVE 驿站，无结果不转为全国或标题关键词推荐", async () => {
    station.mockResolvedValue([]);
    expect(await svc.dispatch(context(" 北京市 "))).toEqual([]);
    expect(station).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "ACTIVE", city: "北京市" } }));
    expect(fallback).not.toHaveBeenCalled();
    expect(article).not.toHaveBeenCalled();
  });

  it("驿站有关联但没有公开平台内容时仍为空", async () => {
    expect(await svc.dispatch(context("北京市"))).toEqual([]);
    expect(course).not.toHaveBeenCalled();
    expect(product).not.toHaveBeenCalled();
    expect(fallback).not.toHaveBeenCalled();
  });

  it("只以审核发布且有效的线下关联核验平台公开目标，输出平台实际 ID 和价格", async () => {
    offlineCourse.mockResolvedValue([{ courseId: "real-course" }, { courseId: null }]);
    stationProduct.mockResolvedValue([{ productId: "real-product" }, { productId: null }]);
    course.mockResolvedValue([{ id: "real-course", title: "平台课程", cover: null, intro: null, tags: [], price: 30 }]);
    product.mockResolvedValue([{ id: "real-product", title: "平台商品", images: [], intro: null, tags: [], price: 20 }]);
    const result = await svc.dispatch(context("北京市"));
    expect(result.map((item) => [item.id, item.type, item.metadata?.price])).toEqual([["real-course", "COURSE", 30], ["real-product", "PRODUCT", 20]]);
    expect(offlineCourse).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "PUBLISHED", auditStatus: "APPROVED", endTime: { gt: expect.any(Date) }, station: { status: "ACTIVE", city: "北京市" } }) }));
    expect(course).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { in: ["real-course"] }, visibility: "PLATFORM", auditStatus: "APPROVED", deletedAt: null, OR: [{ stationId: null }] }) }));
    expect(product).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { in: ["real-product"] }, status: "ON_SALE", deletedAt: null, stock: { gt: 0 }, OR: [{ stationId: null }] }) }));
    expect(article).not.toHaveBeenCalled();
  });

  it("分站请求不读取其他分站关联的平台商品", async () => {
    stationProduct.mockResolvedValue([{ productId: "real-product" }]);
    await svc.dispatch({ ...context("北京市"), stationId: "own-station" });
    expect(product).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: [{ stationId: null }, { stationId: "own-station" }] }) }));
  });
});

describe("同城入口与编排边界", () => {
  it.each(["", "甲".repeat(65), ["北京市", "上海市"], "北京市:上海市"])("DTO 拒绝无效城市 %s", async (city) => {
    expect(await validate(plainToInstance(RecommendQueryDto, { city }))).not.toHaveLength(0);
  });

  it("DTO 修剪城市，真实控制器将选城传入服务", async () => {
    const dto = plainToInstance(RecommendQueryDto, { city: " 北京市 " });
    expect(await validate(dto)).toHaveLength(0);
    const getRecommendations = jest.fn().mockResolvedValue({ items: [] });
    const controller = new RecommendController({ getRecommendations } as unknown as RecommendService, {} as ColdStartService);
    await controller.recommend(RecommendScene.SAME_CITY, dto, {} as Request, "client-supplied-other-station");
    expect(getRecommendations).toHaveBeenCalledWith(expect.objectContaining({ city: "北京市", stationId: undefined }));
  });

  it("城市与分站分别隔离缓存，空同城不被运营强插或站长精选污染", async () => {
    const cache = new Map<string, unknown>();
    const getJson = jest.fn(async (key: string) => cache.get(key) ?? null);
    const setJson = jest.fn(async (key: string, value: unknown) => { cache.set(key, value); });
    const dispatch = jest.fn().mockResolvedValue([]);
    const applyInsertRules = jest.fn().mockResolvedValue([{ id: "national-insert" }]);
    const applyStationPicks = jest.fn().mockResolvedValue([{ id: "station-insert" }]);
    const facade = new RecommendService(
      {} as PrismaService, { getJson, setJson } as unknown as RedisService, {} as ColdStartService,
      { score: async (items: unknown[]) => items } as unknown as ScoringService,
      {} as AbTestService, { dispatch } as unknown as RecommendSceneService,
      { applyInsertRules, applyStationPicks } as unknown as RecommendInsertService, new RecommendSelectService(),
    );
    for (const city of ["北京市", "上海市"]) expect((await facade.getRecommendations(context(city))).items).toEqual([]);
    expect((await facade.getRecommendations({ ...context("北京市"), stationId: "own-station" })).items).toEqual([]);
    await facade.getRecommendations(context("北京市"));
    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(applyInsertRules).not.toHaveBeenCalled();
    expect(applyStationPicks).not.toHaveBeenCalled();
  });
});
