import { VideoService } from "./video.service";
import { BusinessException } from "../../common/business.exception";
import { Prisma } from "@prisma/client";
import { InteractionService } from "../interaction/interaction.service";
import { setCacheRedisService } from "../../common/cache.decorator";

describe("视频账号互动与缓存隔离", () => {
  const snapshot = Object.freeze({ id: "v1", userId: "author", status: "PUBLISHED", visibility: "PLATFORM", likeCount: 1, collectCount: 1 });
  let prisma: any;
  let service: VideoService;

  beforeEach(() => {
    prisma = {
      video: { findUnique: jest.fn().mockResolvedValue(snapshot), findMany: jest.fn().mockResolvedValue([{ id: "v1", likeCount: 2, collectCount: 3 }]), update: jest.fn().mockResolvedValue({ likeCount: 2, collectCount: 2 }) },
      like: { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), delete: jest.fn() },
      collect: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), delete: jest.fn() },
      follow: { findMany: jest.fn().mockResolvedValue([]) },
      userBehavior: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(async (operation) => operation(prisma)),
    };
    service = new VideoService(prisma, {} as any, {} as any, {} as any);
    jest.spyOn(service, "getDetailRaw").mockResolvedValue(snapshot as any);
    jest.spyOn(service, "listRaw").mockResolvedValue({ videos: [snapshot], total: 1, page: 1, pageSize: 20 } as any);
  });

  it("详情缓存不含账号态；A已赞/藏/关注，B与游客均不继承", async () => {
    prisma.like.findMany.mockImplementation(async ({ where }: any) => where.userId === "A" ? [{ targetId: "v1" }] : []);
    prisma.collect.findMany.mockImplementation(async ({ where }: any) => where.userId === "A" ? [{ targetId: "v1" }] : []);
    prisma.follow.findMany.mockImplementation(async ({ where }: any) => where.userId === "A" ? [{ followedUserId: "author" }] : []);
    const a = await service.getDetail("v1", "A");
    const b = await service.getDetail("v1", "B");
    const guest = await service.getDetail("v1");
    expect(a).toMatchObject({ isLiked: true, isCollected: true, isFollowed: true, likeCount: 2, collectCount: 3 });
    for (const result of [b, guest]) expect(result).toMatchObject({ isLiked: false, isCollected: false, isFollowed: false });
    expect(snapshot).not.toHaveProperty("isLiked");
    expect(snapshot.likeCount).toBe(1);
    expect(prisma.like.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.like.findMany).toHaveBeenCalledWith({ where: { userId: "B", targetType: "VIDEO", targetId: { in: ["v1"] } }, select: { targetId: true } });
  });

  it("同一公共列表缓存每次补当前计数和当前账号状态", async () => {
    prisma.like.findMany.mockResolvedValueOnce([{ targetId: "v1" }]).mockResolvedValueOnce([]);
    expect((await service.list({}, "A")).videos[0]).toMatchObject({ isLiked: true, likeCount: 2 });
    expect((await service.list({}, "B")).videos[0]).toMatchObject({ isLiked: false, likeCount: 2 });
    expect(snapshot).not.toHaveProperty("isLiked");
  });

  it("已隐藏详情仍先做可见性检查，不查询或回传其他账号互动", async () => {
    jest.mocked(service.getDetailRaw).mockResolvedValue({ ...snapshot, visibility: "SELF_ONLY" } as any);
    await expect(service.getDetail("v1", "other")).rejects.toBeInstanceOf(BusinessException);
    expect(prisma.like.findMany).not.toHaveBeenCalled();
  });

  it("列表补态固定批量查询，不为每条视频逐一查询", async () => {
    prisma.video.findMany.mockResolvedValue([
      { ...snapshot, user: { nickname: "作者", avatar: "" }, _count: { products: 0 } },
      { ...snapshot, id: "v2", user: { nickname: "作者", avatar: "" }, _count: { products: 0 } },
    ]);
    prisma.like.findMany.mockResolvedValue([{ targetId: "v2" }]);
    prisma.follow.findMany.mockResolvedValue([{ followedUserId: "author" }]);
    const results = await service.listItems(1, 20, { followerId: "A" });
    expect(results.map((video) => video.isLiked)).toEqual([false, true]);
    expect(results[0].author).toMatchObject({ id: "author", isFollowed: true });
    expect(prisma.like.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.collect.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.follow.findMany).toHaveBeenCalledTimes(1);
  });

  it("点赞记录与最新计数在同一可串行化事务提交后返回", async () => {
    expect(await service.toggleLike("A", "v1")).toEqual({ liked: true, likeCount: 2 });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    expect(prisma.like.create).toHaveBeenCalledWith({ data: { userId: "A", targetType: "VIDEO", targetId: "v1" } });
  });

  it("收藏响应使用事务提交的计数", async () => {
    expect(await service.toggleCollect("A", "v1")).toEqual({ collected: true, collectCount: 2 });
    expect(prisma.collect.create).toHaveBeenCalledTimes(1);
  });

  it("历史零计数取消互动不写负数", async () => {
    prisma.video.findUnique.mockResolvedValue({ ...snapshot, likeCount: 0, collectCount: 0 });
    prisma.like.findUnique.mockResolvedValue({ id: "l1" });
    prisma.collect.findFirst.mockResolvedValue({ id: "c1" });
    await service.toggleLike("A", "v1");
    await service.toggleCollect("A", "v1");
    expect(prisma.video.update).toHaveBeenCalledWith({ where: { id: "v1" }, data: { likeCount: 0 } });
    expect(prisma.video.update).toHaveBeenCalledWith({ where: { id: "v1" }, data: { collectCount: 0 } });
  });

  it("只有已回滚并发冲突重试，次数上限为三次", async () => {
    prisma.$transaction.mockRejectedValueOnce({ code: "P2034" });
    await service.toggleLike("A", "v1");
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    prisma.$transaction.mockClear().mockRejectedValue({ code: "P2034" });
    await expect(service.toggleLike("A", "v1")).rejects.toEqual({ code: "P2034" });
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it("未知写入错误不重试、不回传成功", async () => {
    prisma.video.update.mockRejectedValue(new Error("数据库写入失败"));
    await expect(service.toggleLike("A", "v1")).rejects.toThrow("数据库写入失败");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("通用互动入口也同步视频计数，不留下只写记录的平行路径", async () => {
    const interactions = new InteractionService(prisma);
    expect(await interactions.toggleLike("A", { targetType: "VIDEO", targetId: "v1" })).toEqual({ liked: true, likeCount: 2 });
    expect(await interactions.toggleCollect("A", { targetType: "VIDEO", targetId: "v1" })).toEqual({ collected: true, collectCount: 2 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(prisma.userBehavior.create).toHaveBeenCalledWith({ data: { userId: "A", targetType: "VIDEO", targetId: "v1", behavior: "LIKE", weight: 1 } });
    expect(prisma.userBehavior.create).toHaveBeenCalledWith({ data: { userId: "A", targetType: "VIDEO", targetId: "v1", behavior: "COLLECT", weight: 2 } });
  });

  it("取消与事务失败不产生新增互动行为，防止推荐侧误计", async () => {
    const interactions = new InteractionService(prisma);
    prisma.like.findUnique.mockResolvedValue({ id: "l1" });
    prisma.collect.findFirst.mockResolvedValue({ id: "c1" });
    await interactions.toggleLike("A", { targetType: "VIDEO", targetId: "v1" });
    await interactions.toggleCollect("A", { targetType: "VIDEO", targetId: "v1" });
    prisma.$transaction.mockRejectedValue(new Error("写入失败"));
    await expect(interactions.toggleLike("A", { targetType: "VIDEO", targetId: "v1" })).rejects.toThrow("写入失败");
    expect(prisma.userBehavior.create).not.toHaveBeenCalled();
  });

  it("成功提交后失效详情、列表和本人的收藏缓存，失败不清缓存", async () => {
    const cache = { del: jest.fn(), delByPattern: jest.fn() };
    setCacheRedisService(cache as any);
    try {
      await service.toggleCollect("A", "v1");
      expect(cache.del).toHaveBeenCalledWith("video:detail:v1");
      expect(cache.delByPattern).toHaveBeenCalledWith("video:list:*");
      expect(cache.delByPattern).toHaveBeenCalledWith("video:collected:A:*");
      cache.del.mockClear();
      cache.delByPattern.mockClear();
      prisma.$transaction.mockRejectedValue(new Error("连接失败"));
      await expect(service.toggleLike("A", "v1")).rejects.toThrow("连接失败");
      expect(cache.del).not.toHaveBeenCalled();
      expect(cache.delByPattern).not.toHaveBeenCalled();
    } finally {
      setCacheRedisService(undefined as any);
    }
  });
});
