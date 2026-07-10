import { LiveService } from "./live.service";
import { BusinessException } from "../../common/business.exception";

/**
 * #21 回放章节点单测：标注权限（仅主播）/入参校验/排序落库/详情合并（raw 读失败不阻断）。
 * 直接实例化 LiveService（mock 必填依赖），只测章节相关路径。
 */

function buildSvc() {
  const prisma = {
    liveRoom: { findUnique: jest.fn(), update: jest.fn() },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };
  const redis = {};
  const stream = {};
  const webhook = { fire: jest.fn().mockResolvedValue(undefined) };
  const audit = {};
  const svc = new LiveService(
    prisma as never,
    redis as never,
    stream as never,
    webhook as never,
    audit as never,
  );
  return { svc, prisma };
}

describe("LiveService · #21 回放章节点", () => {
  it("房间不存在 → 抛业务异常", async () => {
    const { svc, prisma } = buildSvc();
    prisma.liveRoom.findUnique.mockResolvedValue(null);
    await expect(svc.setReplayChapters("u1", "r1", [{ t: 10, title: "开场" }])).rejects.toThrow(BusinessException);
  });

  it("非主播本人 → 拒绝（仅主播可标注）", async () => {
    const { svc, prisma } = buildSvc();
    prisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "host-1" });
    await expect(svc.setReplayChapters("someone-else", "r1", [{ t: 10, title: "开场" }])).rejects.toThrow(
      "仅主播本人可标注回放章节",
    );
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it("t 为负数 / 标题为空 → 参数校验失败", async () => {
    const { svc, prisma } = buildSvc();
    prisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "host-1" });
    await expect(svc.setReplayChapters("host-1", "r1", [{ t: -5, title: "开场" }])).rejects.toThrow(BusinessException);
    await expect(svc.setReplayChapters("host-1", "r1", [{ t: 5, title: "  " }])).rejects.toThrow(BusinessException);
  });

  it("主播正常标注：按 t 升序规整落库并返回条数", async () => {
    const { svc, prisma } = buildSvc();
    prisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "host-1" });
    prisma.$executeRaw.mockResolvedValue(1);

    const r = await svc.setReplayChapters("host-1", "r1", [
      { t: 1120, title: "观众提问解答" },
      { t: 195.9, title: "开场" }, // 小数取整 195
    ]);
    expect(r.success).toBe(true);
    expect(r.count).toBe(2);
    expect(r.replayChapters).toEqual([
      { t: 195, title: "开场" },
      { t: 1120, title: "观众提问解答" },
    ]);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it("getRoom 详情合并 replayChapters；raw 查询失败（列未应用）不阻断详情", async () => {
    const { svc, prisma } = buildSvc();
    const room = { id: "r1", title: "直播", hostUserId: "h1" };
    prisma.liveRoom.findUnique.mockResolvedValue(room);
    prisma.liveRoom.update.mockResolvedValue(room);

    // ① 正常合并
    prisma.$queryRaw.mockResolvedValueOnce([{ replayChapters: [{ t: 60, title: "第一章" }] }]);
    const d1 = await svc.getRoom("r1");
    expect(d1.replayChapters).toEqual([{ t: 60, title: "第一章" }]);

    // ② raw 失败 → replayChapters 为 null，详情照常返回
    prisma.$queryRaw.mockRejectedValueOnce(new Error('column "replayChapters" does not exist'));
    const d2 = await svc.getRoom("r1");
    expect(d2.title).toBe("直播");
    expect(d2.replayChapters).toBeNull();
  });
});
