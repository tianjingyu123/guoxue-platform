import { Test, TestingModule } from "@nestjs/testing";
import { InstituteBoardService } from "./institute-board.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

describe("InstituteBoardService（T9 私董会小组·私密子圈承载）", () => {
  let svc: InstituteBoardService;
  let prisma: any;
  let redis: any;

  const MGR = { id: "im-mgr", instituteId: "inst-1", role: "PRESIDENT" };

  beforeEach(async () => {
    prisma = {
      instituteMember: { findFirst: jest.fn() },
      instituteBoardGroup: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      circle: { create: jest.fn() },
      circleMember: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      userRole: { upsert: jest.fn() },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };
    redis = { delByPattern: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstituteBoardService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    svc = module.get(InstituteBoardService);
  });

  describe("createBoardGroup — 建组（管理层）", () => {
    it("非管理层 → 403 FORBIDDEN", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue(null); // 管理层守卫查不到
      await expect(
        svc.createBoardGroup("u-normal", { name: "破局一组", leaderId: "u-leader" }),
      ).rejects.toMatchObject({ errorCode: ErrorCode.FORBIDDEN });
      expect(prisma.circle.create).not.toHaveBeenCalled();
    });

    it("leaderId 非本院 ACTIVE 成员 → 400 拒绝", async () => {
      prisma.instituteMember.findFirst
        .mockResolvedValueOnce(MGR) // 管理层守卫过
        .mockResolvedValueOnce(null); // 组长资格查不到
      await expect(
        svc.createBoardGroup("u-mgr", { name: "破局一组", leaderId: "u-out" }),
      ).rejects.toMatchObject({ errorCode: ErrorCode.BAD_REQUEST });
      // 组长校验限定在本院 + ACTIVE
      expect(prisma.instituteMember.findFirst).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { instituteId: "inst-1", userId: "u-out", status: "ACTIVE" },
        }),
      );
      expect(prisma.circle.create).not.toHaveBeenCalled();
    });

    it("leaderId 是研修席（STUDY·非讲席）→ 400 拒绝", async () => {
      prisma.instituteMember.findFirst
        .mockResolvedValueOnce(MGR)
        .mockResolvedValueOnce({ seatType: "STUDY" });
      await expect(
        svc.createBoardGroup("u-mgr", { name: "破局一组", leaderId: "u-study" }),
      ).rejects.toBeInstanceOf(BusinessException);
      expect(prisma.circle.create).not.toHaveBeenCalled();
    });

    it("建组成功：私密圈参数正确（FREE+needApproval+ACTIVE·圈主=组长 OWNER·memberCount=1）+userRole+关联记录+缓存失效", async () => {
      prisma.instituteMember.findFirst
        .mockResolvedValueOnce(MGR)
        .mockResolvedValueOnce({ seatType: "LECTURE" });
      prisma.circle.create.mockResolvedValue({ id: "c-new" });
      prisma.instituteBoardGroup.create.mockResolvedValue({ id: "bg-1", circleId: "c-new" });

      const res = await svc.createBoardGroup("u-mgr", {
        name: "破局一组",
        topic: "客单价提升",
        leaderId: "u-leader",
        memberLimit: 8,
      });

      expect(res).toEqual({ id: "bg-1", circleId: "c-new" });

      // 私密子圈建圈参数断言（照抄 autoJoinInstituteCircle/offline 建圈惯例）
      expect(prisma.circle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "私董会·破局一组",
            type: "FREE",
            needApproval: true,
            status: "ACTIVE",
            ownerId: "u-leader",
            memberCount: 1,
            members: { create: { userId: "u-leader", role: "OWNER" } },
          }),
        }),
      );
      // 简介模板含轮流出题玩法说明
      const intro = prisma.circle.create.mock.calls[0][0].data.intro as string;
      expect(intro).toContain("轮流出题");

      // 圈主角色 upsert
      expect(prisma.userRole.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: { userId: "u-leader", roleType: "CIRCLE_OWNER", bindId: "c-new" },
        }),
      );

      // 关联记录归属管理者所在研究院
      expect(prisma.instituteBoardGroup.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            instituteId: "inst-1",
            circleId: "c-new",
            name: "破局一组",
            topic: "客单价提升",
            leaderId: "u-leader",
            memberLimit: 8,
          }),
        }),
      );

      // 圈子列表缓存失效
      expect(redis.delByPattern).toHaveBeenCalledWith("circles:list:*");
    });
  });

  describe("listBoardGroups — 列表（本院成员可见）", () => {
    it("非研究院成员 → 403 FORBIDDEN", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue(null);
      await expect(svc.listBoardGroups("u-out")).rejects.toMatchObject({ errorCode: ErrorCode.FORBIDDEN });
    });

    it("成员可见：实时 memberCount + joined/full 标注 + 组长信息", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue({ instituteId: "inst-1" });
      prisma.instituteBoardGroup.findMany.mockResolvedValue([
        { id: "bg-1", name: "破局一组", topic: "客单价提升", circleId: "c-1", leaderId: "u-l1", memberLimit: 8, status: "ACTIVE" },
        { id: "bg-2", name: "增长二组", topic: null, circleId: "c-2", leaderId: "u-l2", memberLimit: 12, status: "ACTIVE" },
      ]);
      prisma.circleMember.groupBy.mockResolvedValue([
        { circleId: "c-1", _count: { _all: 8 } }, // 满员
        { circleId: "c-2", _count: { _all: 3 } },
      ]);
      prisma.circleMember.findMany.mockResolvedValue([{ circleId: "c-2" }]); // 本人只在 c-2 圈内
      prisma.user.findMany.mockResolvedValue([
        { id: "u-l1", nickname: "王组长", avatar: "a1.png" },
        { id: "u-l2", nickname: "李组长", avatar: null },
      ]);

      const res = await svc.listBoardGroups("u-me");
      expect(res.items).toHaveLength(2);

      const g1 = res.items.find((i) => i.id === "bg-1")!;
      expect(g1).toMatchObject({
        name: "破局一组",
        circleId: "c-1",
        memberCount: 8,
        memberLimit: 8,
        full: true, // memberCount >= memberLimit → 前端置灰
        joined: false,
        status: "ACTIVE",
        leader: { userId: "u-l1", nickname: "王组长", avatar: "a1.png" },
      });

      const g2 = res.items.find((i) => i.id === "bg-2")!;
      expect(g2).toMatchObject({ memberCount: 3, full: false, joined: true });

      // 仅查 ACTIVE 组 + 限定本院
      expect(prisma.instituteBoardGroup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { instituteId: "inst-1", status: "ACTIVE" } }),
      );
    });
  });

  describe("disbandBoardGroup — 解散（管理层）", () => {
    it("解散成功：标记 DISBANDED·返回圈子保留提示语", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue(MGR);
      prisma.instituteBoardGroup.findUnique.mockResolvedValue({ id: "bg-1", instituteId: "inst-1", status: "ACTIVE" });

      const res = await svc.disbandBoardGroup("u-mgr", "bg-1");
      expect(prisma.instituteBoardGroup.update).toHaveBeenCalledWith({
        where: { id: "bg-1" },
        data: { status: "DISBANDED" },
      });
      expect(res.success).toBe(true);
      expect(res.message).toContain("圈子本体保留");
    });

    it("跨院解散他院小组 → 403；重复解散 → 400", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue(MGR);
      prisma.instituteBoardGroup.findUnique.mockResolvedValue({ id: "bg-x", instituteId: "inst-other", status: "ACTIVE" });
      await expect(svc.disbandBoardGroup("u-mgr", "bg-x")).rejects.toMatchObject({ errorCode: ErrorCode.FORBIDDEN });

      prisma.instituteBoardGroup.findUnique.mockResolvedValue({ id: "bg-1", instituteId: "inst-1", status: "DISBANDED" });
      await expect(svc.disbandBoardGroup("u-mgr", "bg-1")).rejects.toMatchObject({ errorCode: ErrorCode.BAD_REQUEST });
      expect(prisma.instituteBoardGroup.update).not.toHaveBeenCalled();
    });
  });
});
