import { CirclePostService } from "./circle-post.service";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import type { PrismaService } from "../../../prisma/prisma.service";
import type { RedisService } from "../../../redis/redis.service";
import type { CircleSharedService } from "./circle-shared.service";

jest.mock("../../../common/public-content-quarantine", () => ({
  publicQuarantinedIds: () => ["quarantined-post"],
}));

describe("圈帖详情发布状态及圈子归属", () => {
  const prisma = { post: { findUnique: jest.fn() }, $queryRawUnsafe: jest.fn() };
  const shared = { checkAdmin: jest.fn() };
  let service: CirclePostService;
  const post = {
    id: "post",
    circleId: "circle",
    userId: "author",
    status: "PUBLISHED",
    content: "圈帖正文",
  };
  const detail = (options?: { userId?: string; circleId?: string; platformAdmin?: boolean }) =>
    service.getPostDetail("post", options);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.post.findUnique.mockResolvedValue(post);
    prisma.$queryRawUnsafe.mockResolvedValue([{ attachments: [] }]);
    shared.checkAdmin.mockRejectedValue(
      new BusinessException(ErrorCode.FORBIDDEN, "仅圈子管理者可执行此操作"),
    );
    service = new CirclePostService(
      prisma as unknown as PrismaService,
      {} as RedisService,
      shared as unknown as CircleSharedService,
    );
  });

  it("保持已发布帖子现有匿名详情方式", async () => {
    await expect(detail()).resolves.toMatchObject({ ...post, attachments: [] });
    expect(shared.checkAdmin).not.toHaveBeenCalled();
  });

  it.each(["DRAFT", "AUDITING", "HIDDEN"])("匿名不能读取%s正文或附件", async (status) => {
    prisma.post.findUnique.mockResolvedValue({ ...post, status });
    await expect(detail()).rejects.toThrow("帖子不存在");
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it("未知发布状态不能作为公开帖子读取", async () => {
    prisma.post.findUnique.mockResolvedValue({ ...post, status: "UNKNOWN" });
    await expect(detail()).rejects.toThrow("帖子不存在");
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it.each(["DRAFT", "AUDITING", "HIDDEN"])("作者登录后可继续预览自身%s内容", async (status) => {
    prisma.post.findUnique.mockResolvedValue({ ...post, status });
    await expect(detail({ userId: "author" })).resolves.toMatchObject({ status });
    expect(shared.checkAdmin).not.toHaveBeenCalled();
  });

  it("其他登录用户不能读取未发布内容", async () => {
    prisma.post.findUnique.mockResolvedValue({ ...post, status: "DRAFT" });
    await expect(detail({ userId: "other" })).rejects.toThrow("帖子不存在");
    expect(shared.checkAdmin).toHaveBeenCalledWith("circle", "other");
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it("真实圈子管理权限允许查看待处理内容", async () => {
    prisma.post.findUnique.mockResolvedValue({ ...post, status: "AUDITING" });
    shared.checkAdmin.mockResolvedValue(undefined);
    await expect(detail({ userId: "moderator" })).resolves.toMatchObject({ status: "AUDITING" });
    expect(shared.checkAdmin).toHaveBeenCalledWith("circle", "moderator");
  });

  it("平台管理角色可查看隐藏内容", async () => {
    prisma.post.findUnique.mockResolvedValue({ ...post, status: "HIDDEN" });
    await expect(detail({ userId: "platform-admin", platformAdmin: true })).resolves.toMatchObject({
      status: "HIDDEN",
    });
  });

  it("没有登录主体时不能仅凭管理标记读取隐藏内容", async () => {
    prisma.post.findUnique.mockResolvedValue({ ...post, status: "HIDDEN" });
    await expect(detail({ platformAdmin: true })).rejects.toThrow("帖子不存在");
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it("带圈子上下文时必须核对帖子所属圈子，作者也不能绕过", async () => {
    await expect(detail({ userId: "author", circleId: "other-circle" })).rejects.toThrow(
      "帖子不存在",
    );
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it("公共隔离名单里的帖子不因已发布而可匿名读取", async () => {
    prisma.post.findUnique.mockResolvedValue({ ...post, id: "quarantined-post" });
    await expect(detail()).rejects.toThrow("帖子不存在");
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it("管理权限读取故障也不能放行正文", async () => {
    prisma.post.findUnique.mockResolvedValue({ ...post, status: "DRAFT" });
    shared.checkAdmin.mockRejectedValue(new Error("数据库暂不可用"));
    await expect(detail({ userId: "other" })).rejects.toThrow();
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });
});
