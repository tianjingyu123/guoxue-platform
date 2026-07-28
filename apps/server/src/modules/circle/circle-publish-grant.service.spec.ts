import { CirclePublishGrantStatus, IdentityLevel } from "@prisma/client";
import { BusinessException } from "../../common/business.exception";
import { PrismaService } from "../../prisma/prisma.service";
import { CirclePublishGrantService } from "./circle-publish-grant.service";

const createPrismaMock = () => ({
  userRole: {
    findFirst: jest.fn(),
  },
  circle: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  circlePublishGrant: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  circleMember: {
    count: jest.fn(),
  },
  post: {
    count: jest.fn(),
  },
  article: {
    count: jest.fn(),
  },
  course: {
    count: jest.fn(),
  },
  video: {
    count: jest.fn(),
  },
  liveRoom: {
    count: jest.fn(),
  },
});

describe("CirclePublishGrantService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: CirclePublishGrantService;

  beforeEach(() => {
    prisma = createPrismaMock();
    prisma.userRole.findFirst.mockResolvedValue(null);
    service = new CirclePublishGrantService(prisma as unknown as PrismaService);
  });

  describe("assertCanPublish", () => {
    it("平台管理员可直接发布，不要求圈子授权", async () => {
      await expect(service.assertCanPublish("admin-1", undefined, "SHORT_VIDEO", true)).resolves.toBeUndefined();
      expect(prisma.circle.findFirst).not.toHaveBeenCalled();
    });

    it("L1 实名且已有短视频授权的圈主可以全平台发布", async () => {
      prisma.circle.findFirst.mockResolvedValue({ id: "circle-1" });
      prisma.user.findUnique.mockResolvedValue({ identityLevel: IdentityLevel.L1 });
      prisma.circlePublishGrant.findFirst.mockResolvedValue({ id: "grant-1" });

      await expect(
        service.assertCanPublish("owner-1", "circle-1", "SHORT_VIDEO"),
      ).resolves.toBeUndefined();
    });

    it("直播全平台发布必须完成 L2 人脸核身", async () => {
      prisma.circle.findFirst.mockResolvedValue({ id: "circle-1" });
      prisma.user.findUnique.mockResolvedValue({ identityLevel: IdentityLevel.L1 });
      prisma.circlePublishGrant.findFirst.mockResolvedValue({ id: "grant-1" });

      await expect(service.assertCanPublish("owner-1", "circle-1", "LIVE")).rejects.toBeInstanceOf(
        BusinessException,
      );
    });

    it("即使前端被绕过，没有服务端授权也不能全平台发布", async () => {
      prisma.circle.findFirst.mockResolvedValue({ id: "circle-1" });
      prisma.user.findUnique.mockResolvedValue({ identityLevel: IdentityLevel.L2 });
      prisma.circlePublishGrant.findFirst.mockResolvedValue(null);

      await expect(
        service.assertCanPublish("owner-1", "circle-1", "COURSE"),
      ).rejects.toBeInstanceOf(BusinessException);
    });
  });

  describe("apply", () => {
    const ownedCircle = {
      id: "circle-1",
      name: "国学研习圈",
      ownerId: "owner-1",
      memberCount: 100,
      status: "ACTIVE",
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    };

    beforeEach(() => {
      prisma.circle.findFirst.mockResolvedValue(ownedCircle);
      prisma.user.findUnique.mockResolvedValue({ identityLevel: IdentityLevel.L1 });
      prisma.circlePublishGrant.findFirst.mockResolvedValue(null);
      prisma.circleMember.count.mockResolvedValue(100);
    });

    it("常规通道运营指标不足时拒绝申请", async () => {
      prisma.post.count.mockResolvedValue(0);
      prisma.article.count.mockResolvedValue(0);
      prisma.course.count.mockResolvedValue(0);
      prisma.video.count.mockResolvedValue(0);
      prisma.liveRoom.count.mockResolvedValue(0);

      await expect(
        service.apply("owner-1", {
          circleId: "circle-1",
          scopes: ["SHORT_VIDEO"],
          channel: "REGULAR",
        }),
      ).rejects.toBeInstanceOf(BusinessException);
      expect(prisma.circlePublishGrant.create).not.toHaveBeenCalled();
    });

    it("达到运营指标后创建待审核授权申请", async () => {
      prisma.post.count.mockResolvedValue(10);
      prisma.article.count.mockResolvedValue(5);
      prisma.course.count.mockResolvedValue(5);
      prisma.video.count.mockResolvedValue(5);
      prisma.liveRoom.count.mockResolvedValue(5);
      prisma.circlePublishGrant.create.mockResolvedValue({
        id: "grant-1",
        status: CirclePublishGrantStatus.PENDING,
      });

      await expect(
        service.apply("owner-1", {
          circleId: "circle-1",
          scopes: ["SHORT_VIDEO"],
          channel: "REGULAR",
        }),
      ).resolves.toEqual(expect.objectContaining({ id: "grant-1" }));
      expect(prisma.circlePublishGrant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            circleId: "circle-1",
            applicantId: "owner-1",
            scopes: ["SHORT_VIDEO"],
          }),
        }),
      );
    });
  });
});
