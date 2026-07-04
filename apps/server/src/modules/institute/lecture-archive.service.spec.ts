import { Test, TestingModule } from "@nestjs/testing";
import { LectureArchiveService, COURSE_ORIGIN_LECTURE } from "./lecture-archive.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { ErrorCode } from "../../common/error-codes";

describe("LectureArchiveService（研-P1 大师讲座归档·复用课程系统）", () => {
  let svc: LectureArchiveService;
  let prisma: any;
  let redis: any;

  const MGR = { id: "im-mgr", instituteId: "inst-1", role: "PRESIDENT" };

  beforeEach(async () => {
    prisma = {
      instituteMember: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      liveRoom: { findUnique: jest.fn() },
      course: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
      },
      teacherCertification: { findMany: jest.fn().mockResolvedValue([]) },
    };
    redis = { delByPattern: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LectureArchiveService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    svc = module.get(LectureArchiveService);
  });

  describe("archiveLecture — 归档动作（研究院管理层）", () => {
    const BASE_DTO = { lecturerUserId: "u-lect", title: "阳明心学与现代经营" };

    it("非管理层 → 403 FORBIDDEN", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue(null);
      await expect(
        svc.archiveLecture("u-normal", { ...BASE_DTO, videoUrl: "https://vod.example.com/a.mp4" }),
      ).rejects.toMatchObject({ errorCode: ErrorCode.FORBIDDEN });
      expect(prisma.course.create).not.toHaveBeenCalled();
    });

    it("videoUrl 与 liveRoomId 均缺 → 400", async () => {
      prisma.instituteMember.findFirst.mockResolvedValueOnce(MGR);
      await expect(svc.archiveLecture("u-mgr", { ...BASE_DTO })).rejects.toMatchObject({ errorCode: ErrorCode.BAD_REQUEST });
      expect(prisma.course.create).not.toHaveBeenCalled();
    });

    it("直播间不存在 → 404；直播间无回放 → 400", async () => {
      prisma.instituteMember.findFirst.mockResolvedValueOnce(MGR);
      prisma.liveRoom.findUnique.mockResolvedValueOnce(null);
      await expect(
        svc.archiveLecture("u-mgr", { ...BASE_DTO, liveRoomId: "lr-x" }),
      ).rejects.toMatchObject({ errorCode: ErrorCode.NOT_FOUND });

      prisma.instituteMember.findFirst.mockResolvedValueOnce(MGR);
      prisma.liveRoom.findUnique.mockResolvedValueOnce({ id: "lr-1", replayUrl: null });
      await expect(
        svc.archiveLecture("u-mgr", { ...BASE_DTO, liveRoomId: "lr-1" }),
      ).rejects.toMatchObject({ errorCode: ErrorCode.BAD_REQUEST });
      expect(prisma.course.create).not.toHaveBeenCalled();
    });

    it("讲师非本院 ACTIVE 成员 → 400（限定本院·防跨院归档）", async () => {
      prisma.instituteMember.findFirst
        .mockResolvedValueOnce(MGR) // 管理层守卫过
        .mockResolvedValueOnce(null); // 讲师资格查不到
      await expect(
        svc.archiveLecture("u-mgr", { ...BASE_DTO, videoUrl: "https://vod.example.com/a.mp4" }),
      ).rejects.toMatchObject({ errorCode: ErrorCode.BAD_REQUEST });
      expect(prisma.instituteMember.findFirst).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { instituteId: "inst-1", userId: "u-lect", status: "ACTIVE" },
        }),
      );
      expect(prisma.course.create).not.toHaveBeenCalled();
    });

    it("同一回放已归档 → 400 拒绝重复", async () => {
      prisma.instituteMember.findFirst
        .mockResolvedValueOnce(MGR)
        .mockResolvedValueOnce({ id: "im-lect", lecturerLevel: "SIGNED" });
      prisma.course.findFirst.mockResolvedValue({ id: "c-old", title: "旧讲座" });
      await expect(
        svc.archiveLecture("u-mgr", { ...BASE_DTO, videoUrl: "https://vod.example.com/a.mp4" }),
      ).rejects.toMatchObject({ errorCode: ErrorCode.BAD_REQUEST });
      expect(prisma.course.create).not.toHaveBeenCalled();
    });

    it("归档成功：Course 归讲师名下 + courseOrigin=INSTITUTE_LECTURE + 不显式传 auditStatus（走默认 PENDING）+ 单章回放 + 讲义第二章 + 缓存失效", async () => {
      prisma.instituteMember.findFirst
        .mockResolvedValueOnce(MGR)
        .mockResolvedValueOnce({ id: "im-lect", lecturerLevel: "SIGNED" });
      prisma.course.create.mockResolvedValue({ id: "c-new", courseOrigin: COURSE_ORIGIN_LECTURE, chapters: [] });

      const res = await svc.archiveLecture("u-mgr", {
        ...BASE_DTO,
        videoUrl: "https://vod.example.com/a.mp4",
        intro: "回放沉淀",
        materialUrl: "https://cos.example.com/notes.pdf",
        price: 19.9,
      });
      expect(res.id).toBe("c-new");

      const data = prisma.course.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        userId: "u-lect",
        title: "阳明心学与现代经营",
        type: "VIDEO",
        price: 19.9,
        courseOrigin: COURSE_ORIGIN_LECTURE,
      });
      expect(data.tags).toEqual(expect.arrayContaining(["大师讲座", "研究院出品"]));
      // auditStatus 走课程默认审核流（PENDING），归档不得直接上架
      expect(data.auditStatus).toBeUndefined();
      // 章节：0=回放视频，1=讲义资料
      expect(data.chapters.create).toEqual([
        expect.objectContaining({ title: "讲座回放", content: "https://vod.example.com/a.mp4", sortOrder: 0 }),
        expect.objectContaining({ title: "讲义资料", content: "https://cos.example.com/notes.pdf", sortOrder: 1 }),
      ]);
      expect(redis.delByPattern).toHaveBeenCalledWith("courses:list:*");
    });

    it("liveRoomId 路径：取直播间 replayUrl 作回放", async () => {
      prisma.instituteMember.findFirst
        .mockResolvedValueOnce(MGR)
        .mockResolvedValueOnce({ id: "im-lect", lecturerLevel: "SENIOR" });
      prisma.liveRoom.findUnique.mockResolvedValue({ id: "lr-1", replayUrl: "https://vod.example.com/replay-lr1.m3u8" });
      prisma.course.create.mockResolvedValue({ id: "c-2", chapters: [] });

      await svc.archiveLecture("u-mgr", { ...BASE_DTO, liveRoomId: "lr-1" });
      const data = prisma.course.create.mock.calls[0][0].data;
      expect(data.chapters.create[0].content).toBe("https://vod.example.com/replay-lr1.m3u8");
      // 无讲义则单章
      expect(data.chapters.create).toHaveLength(1);
    });
  });

  describe("listLectures — 讲座频道列表（公开）", () => {
    it("仅查过审+未删的讲座课程，附讲师等级/认证头衔徽章", async () => {
      prisma.course.findMany.mockResolvedValue([
        {
          id: "c-1", title: "阳明心学与现代经营", cover: "cover.png", intro: "简介",
          price: "19.9", studentCount: 30, createdAt: new Date("2026-07-04"),
          userId: "u-lect", user: { id: "u-lect", nickname: "王老师", avatar: "a.png" },
        },
      ]);
      prisma.course.count.mockResolvedValue(1);
      prisma.instituteMember.findMany.mockResolvedValue([{ userId: "u-lect", lecturerLevel: "SIGNED" }]);
      prisma.teacherCertification.findMany.mockResolvedValue([{ userId: "u-lect", verifiedTitle: "国学讲师" }]);

      const res = await svc.listLectures(1, 20);
      expect(res.total).toBe(1);
      expect(res.items[0]).toMatchObject({
        id: "c-1",
        price: 19.9, // Decimal → number
        lecturer: { id: "u-lect", nickname: "王老师", lecturerLevel: "SIGNED", verifiedTitle: "国学讲师" },
      });
      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { courseOrigin: COURSE_ORIGIN_LECTURE, auditStatus: "APPROVED", deletedAt: null },
        }),
      );
    });

    it("分页参数防御：非法值归一化 + pageSize 封顶 50", async () => {
      const res = await svc.listLectures(NaN as any, 999);
      expect(res.page).toBe(1);
      expect(res.pageSize).toBe(50);
      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 50 }),
      );
    });

    it("讲师无院籍/无认证 → 徽章诚实降级（NONE / null）", async () => {
      prisma.course.findMany.mockResolvedValue([
        {
          id: "c-2", title: "x", cover: null, intro: null, price: 0, studentCount: 0,
          createdAt: new Date(), userId: "u-out", user: { id: "u-out", nickname: "散人", avatar: null },
        },
      ]);
      prisma.course.count.mockResolvedValue(1);
      const res = await svc.listLectures();
      expect(res.items[0].lecturer).toMatchObject({ lecturerLevel: "NONE", verifiedTitle: null });
    });
  });
});
