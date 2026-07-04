import { Injectable, Optional } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { InstituteRole } from "@prisma/client";
import { ArchiveLectureDto } from "./institute.dto";

const MGMT_ROLES: InstituteRole[] = ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY_GENERAL"];

/** 讲座来源标识（Course.courseOrigin） */
export const COURSE_ORIGIN_LECTURE = "INSTITUTE_LECTURE";

/**
 * 研-P1 研究院大师讲座知识库（设计 §三·课题四A收口·D4）
 * 内容资产飞轮：分享考核产出的直播/录播 → 归档动作 → 沉淀为「大师讲座」付费知识库。
 * 载体决策：复用课程系统（Course.courseOrigin=INSTITUTE_LECTURE），不新建内容体系——
 * 讲座=特殊课程，天然获得播放/购买/分佣/评价全能力；审核走课程现有 auditStatus 流（默认 PENDING）。
 */
@Injectable()
export class LectureArchiveService {
  constructor(
    private prisma: PrismaService,
    @Optional() private redis?: RedisService,
  ) {}

  /** 研究院管理端守卫（与 institute.service.assertManagement 同范式：ACTIVE 管理层会籍） */
  private async assertManagement(userId: string) {
    const member = await this.prisma.instituteMember.findFirst({
      where: { userId, status: "ACTIVE", role: { in: MGMT_ROLES } },
      select: { id: true, instituteId: true, role: true },
    });
    if (!member) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "仅研究院管理层可操作");
    }
    return member;
  }

  /**
   * 归档动作：选定回放（videoUrl 或 liveRoomId 的 replayUrl）+ 讲义 → 生成讲座课程条目。
   * - Course 归属讲师名下（userId=lecturerUserId），auditStatus 走课程审核默认值（PENDING）
   * - 单章=回放视频；讲义（可选）归档为第二章节
   * - TODO(研-P1 后续)：AI 回放自动转写 → 生成图文摘要与章节点（依赖媒资转写服务·本单不做）
   */
  async archiveLecture(operatorUserId: string, dto: ArchiveLectureDto) {
    const mgr = await this.assertManagement(operatorUserId);

    // 1. 解析回放地址：videoUrl 优先，否则取直播间回放
    let videoUrl = dto.videoUrl?.trim();
    if (!videoUrl && dto.liveRoomId) {
      const room = await this.prisma.liveRoom.findUnique({
        where: { id: dto.liveRoomId },
        select: { id: true, replayUrl: true },
      });
      if (!room) throw new BusinessException(ErrorCode.NOT_FOUND, "直播间不存在");
      if (!room.replayUrl) throw new BusinessException(ErrorCode.BAD_REQUEST, "该直播间尚无回放，无法归档");
      videoUrl = room.replayUrl;
    }
    if (!videoUrl) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请提供回放视频 URL 或含回放的直播间 ID");
    }

    // 2. 讲师资格：本院 ACTIVE 成员（讲座挂讲师认证徽章·跨院成员不可由本院归档）
    const lecturer = await this.prisma.instituteMember.findFirst({
      where: { instituteId: mgr.instituteId, userId: dto.lecturerUserId, status: "ACTIVE" },
      select: { id: true, lecturerLevel: true },
    });
    if (!lecturer) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "讲师须为本研究院 ACTIVE 成员");
    }

    // 3. 防重复归档：同一回放已沉淀过讲座则拒绝
    const dup = await this.prisma.course.findFirst({
      where: {
        courseOrigin: COURSE_ORIGIN_LECTURE,
        deletedAt: null,
        chapters: { some: { content: videoUrl } },
      },
      select: { id: true, title: true },
    });
    if (dup) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `该回放已归档为讲座《${dup.title}》，请勿重复归档`);
    }

    // 4. 建课（最小合法字段集与 course.service.create 对齐）：单章=回放视频，讲义为可选第二章节
    const chapters: { title: string; content: string; mediaUrl: string; sortOrder: number; freeTrial: boolean }[] = [
      { title: "讲座回放", content: videoUrl, mediaUrl: videoUrl, sortOrder: 0, freeTrial: false },
    ];
    const materialUrl = dto.materialUrl?.trim();
    if (materialUrl) {
      chapters.push({ title: "讲义资料", content: materialUrl, mediaUrl: materialUrl, sortOrder: 1, freeTrial: false });
    }

    const course = await this.prisma.course.create({
      data: {
        userId: dto.lecturerUserId,
        title: dto.title,
        intro: dto.intro,
        cover: dto.cover,
        type: "VIDEO",
        price: dto.price ?? 0,
        tags: ["大师讲座", "研究院出品"],
        courseOrigin: COURSE_ORIGIN_LECTURE,
        // auditStatus 不显式传 → 走 Course 默认值 PENDING（现有课程审核流）
        chapters: { create: chapters },
      },
      include: { chapters: { orderBy: { sortOrder: "asc" } } },
    });

    // TODO(研-P1 后续)：AI 转写摘要接线——回放自动转写→AI 生成图文摘要与章节点（依赖媒资转写服务，本单不做）

    await this.redis?.delByPattern?.("courses:list:*");
    return course;
  }

  /**
   * 讲座频道列表（公开）：Course where courseOrigin=INSTITUTE_LECTURE（仅过审+未删）
   * 附讲师信息（昵称/头像/研究院讲师等级/认证头衔）供前端渲染「研究院出品」标与讲师认证徽章。
   */
  async listLectures(page = 1, pageSize = 20) {
    const p = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const ps = Number.isFinite(pageSize) && pageSize > 0 ? Math.min(Math.floor(pageSize), 50) : 20;

    const where = { courseOrigin: COURSE_ORIGIN_LECTURE, auditStatus: "APPROVED", deletedAt: null } as const;
    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        select: {
          id: true, title: true, cover: true, intro: true, price: true,
          studentCount: true, createdAt: true, userId: true,
          user: { select: { id: true, nickname: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (p - 1) * ps,
        take: ps,
      }),
      this.prisma.course.count({ where }),
    ]);

    // 讲师徽章 enrich：研究院讲师等级 + 线上讲师认证头衔
    const lecturerIds = [...new Set(courses.map((c) => c.userId))];
    const [members, certs] = lecturerIds.length
      ? await Promise.all([
          this.prisma.instituteMember.findMany({
            where: { userId: { in: lecturerIds }, status: "ACTIVE" },
            select: { userId: true, lecturerLevel: true },
          }),
          this.prisma.teacherCertification.findMany({
            where: { userId: { in: lecturerIds }, status: "APPROVED" },
            select: { userId: true, verifiedTitle: true },
          }),
        ])
      : [[], []];
    const levelMap = new Map(members.map((m) => [m.userId, m.lecturerLevel]));
    const titleMap = new Map(certs.map((c) => [c.userId, c.verifiedTitle]));

    const items = courses.map((c) => ({
      id: c.id,
      title: c.title,
      cover: c.cover,
      intro: c.intro,
      price: Number(c.price),
      studentCount: c.studentCount,
      createdAt: c.createdAt,
      lecturer: {
        id: c.user.id,
        nickname: c.user.nickname,
        avatar: c.user.avatar,
        lecturerLevel: levelMap.get(c.userId) ?? "NONE",
        verifiedTitle: titleMap.get(c.userId) ?? null,
      },
    }));

    return { items, total, page: p, pageSize: ps };
  }
}
