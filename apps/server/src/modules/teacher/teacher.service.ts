import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { ApplyCertificationDto } from "./teacher.dto";
import { safePagination } from "../../common/pagination";

/** 讲师影响力指数结构（课题二工作台 P3） */
export interface TeacherInfluence {
  /** 综合影响力指数 0-100 */
  score: number;
  /** 等级中文名 */
  level: string;
  /** 等级枚举键（前端配色/图标用） */
  levelKey: "starter" | "rising" | "growing" | "senior" | "master";
  /** 四维分解（各维当前得分，便于展示雷达/进度条与「哪一项可提升」） */
  breakdown: { reach: number; output: number; reputation: number; trust: number };
}

/**
 * 讲师影响力指数（0-100·课题二五角色工作台 P3）。
 * 纯函数·无随机·全部基于公开可核对数据加权（符合 CLAUDE.md 禁纯随机/假算法）：
 * - reach 学员规模 40：log10 缩放，约 2000 学员触顶（防头部碾压、尾部也有区分度）
 * - output 内容产出 20：约 8 门课触顶
 * - reputation 口碑评分 25：5 星满分；无评价记 0（口碑尚未建立·诚实不虚高）
 * - trust 信任背书 15：评价条数 log10 缩放，约 100 条触顶
 */
export function computeTeacherInfluence(stats: {
  courseCount: number;
  studentCount: number;
  avgRating?: number;
  reviewCount?: number;
}): TeacherInfluence {
  const students = Math.max(0, stats.studentCount || 0);
  const courses = Math.max(0, stats.courseCount || 0);
  const rating = Math.max(0, Math.min(5, stats.avgRating ?? 0));
  const reviews = Math.max(0, stats.reviewCount || 0);

  const reach = Math.min(40, Math.round(Math.log10(students + 1) * 12));
  const output = Math.min(20, Math.round(courses * 2.5));
  const reputation = Math.min(25, Math.round((rating / 5) * 25));
  const trust = Math.min(15, Math.round(Math.log10(reviews + 1) * 7.5));

  const score = Math.min(100, reach + output + reputation + trust);
  const { level, levelKey } = teacherInfluenceLevel(score);
  return { score, level, levelKey, breakdown: { reach, output, reputation, trust } };
}

function teacherInfluenceLevel(score: number): { level: string; levelKey: TeacherInfluence["levelKey"] } {
  if (score >= 80) return { level: "名师影响力", levelKey: "master" };
  if (score >= 60) return { level: "资深影响力", levelKey: "senior" };
  if (score >= 40) return { level: "成长影响力", levelKey: "growing" };
  if (score >= 20) return { level: "新锐影响力", levelKey: "rising" };
  return { level: "起步阶段", levelKey: "starter" };
}

@Injectable()
export class TeacherService {
  constructor(private prisma: PrismaService) {}

  /** 获取我的讲师认证状态（无记录返回 null，幂等供前端门控判断） */
  async getMyCertification(userId: string) {
    return this.prisma.teacherCertification.findUnique({
      where: { userId },
    });
  }

  /**
   * 提交讲师认证申请。
   * 身份核验复用平台实名认证（identityVerified），不重复采集身份证。
   * - 未实名：不可申请
   * - 已 APPROVED：不可重复申请
   * - 审核中(PENDING)：不可重复提交
   * - 已驳回(REJECTED)：允许重新提交，覆盖原记录并回到 PENDING
   */
  async applyCertification(userId: string, dto: ApplyCertificationDto) {
    // 前置：必须先完成实名认证
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { identityVerified: true },
    });
    if (!user?.identityVerified) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "请先完成实名认证后再申请讲师认证");
    }

    const existing = await this.prisma.teacherCertification.findUnique({
      where: { userId },
    });

    if (existing) {
      if (existing.status === "APPROVED") {
        throw new BusinessException(ErrorCode.CONFLICT, "您已通过讲师认证，无需重复申请");
      }
      if (existing.status === "PENDING") {
        throw new BusinessException(ErrorCode.CONFLICT, "认证申请审核中，请耐心等待");
      }
      // REJECTED → 重新提交
      return this.prisma.teacherCertification.update({
        where: { userId },
        data: {
          realName: dto.realName,
          title: dto.title,
          intro: dto.intro,
          credentials: dto.credentials ?? [],
          status: "PENDING",
          rejectReason: null,
          reviewedAt: null,
        },
      });
    }

    return this.prisma.teacherCertification.create({
      data: {
        userId,
        realName: dto.realName,
        title: dto.title,
        intro: dto.intro,
        credentials: dto.credentials ?? [],
        status: "PENDING",
      },
    });
  }

  /**
   * 讲师公开主页（无需登录）。仅认证通过(APPROVED)的讲师可见，否则 404。
   * 聚合：昵称/头像 + 认证头衔/简介 + 线上课程(按学习人数前6) + 课程评价均分
   *      + 线下授课驿站（StationTeacher.sourceUserId 反查，仅在岗讲师×运营中驿站）。
   * 脱敏：只回公开展示字段，不含手机号/证件/realName 等任何敏感信息。
   */
  async getPublicProfile(userId: string) {
    const cert = await this.prisma.teacherCertification.findUnique({
      where: { userId },
      select: { verifiedTitle: true, intro: true, status: true },
    });
    if (!cert || cert.status !== "APPROVED") {
      throw new BusinessException(ErrorCode.NOT_FOUND, "该讲师暂未开通公开主页");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nickname: true, avatar: true },
    });
    if (!user) throw new BusinessException(ErrorCode.NOT_FOUND, "讲师不存在");

    // 仅公开已过审、未删除的课程
    const courseWhere = { userId, auditStatus: "APPROVED", deletedAt: null };
    const [courses, courseCount, studentAgg, ratingAgg, stationLinks, instituteMember] = await Promise.all([
      this.prisma.course.findMany({
        where: courseWhere,
        select: { id: true, title: true, cover: true, price: true, studentCount: true, type: true },
        orderBy: { studentCount: "desc" },
        take: 6,
      }),
      this.prisma.course.count({ where: courseWhere }),
      this.prisma.course.aggregate({ where: courseWhere, _sum: { studentCount: true } }),
      this.prisma.courseReview.aggregate({
        where: { status: "PUBLISHED", course: courseWhere },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      this.prisma.stationTeacher.findMany({
        where: { sourceUserId: userId, status: "ACTIVE", station: { status: "ACTIVE" } },
        select: { station: { select: { id: true, name: true, city: true, cover: true, type: true } } },
      }),
      // 研究院会籍（T9-P0a 签约金标）：仅取等级/状态两个展示位，不含押金等资金字段
      // T9-P1 多院化：userId 不再全局唯一，findFirst 优先取 SIGNED 会籍（金标语义）
      this.prisma.instituteMember.findFirst({
        where: { userId },
        orderBy: [{ lecturerLevel: "desc" }, { joinedAt: "asc" }],
        select: { lecturerLevel: true, status: true },
      }),
    ]);

    // 驿站去重（正常一站一条，防御性处理历史脏数据）
    const seen = new Set<string>();
    const offlineStations: { id: string; name: string; city: string; cover: string | null; type: string | null }[] = [];
    for (const link of stationLinks) {
      if (!link.station || seen.has(link.station.id)) continue;
      seen.add(link.station.id);
      offlineStations.push(link.station);
    }

    const reviewCount = ratingAgg._count.rating;
    const stats: { courseCount: number; studentCount: number; avgRating?: number; reviewCount?: number } = {
      courseCount,
      studentCount: studentAgg._sum.studentCount ?? 0,
    };
    // 无评价时省略 avgRating（诚实降级，前端 v-if 隐藏评分位）
    if (reviewCount > 0 && ratingAgg._avg.rating != null) {
      stats.avgRating = Math.round(Number(ratingAgg._avg.rating) * 10) / 10;
      stats.reviewCount = reviewCount;
    }

    return {
      userId: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      verifiedTitle: cert.verifiedTitle,
      intro: cert.intro,
      stats,
      // 影响力指数（课题二工作台 P3·纯函数·基于上方公开 stats 加权）
      influence: computeTeacherInfluence(stats),
      courses,
      offlineStations,
      // 研究院签约金标（T9-P0a）：在册(ACTIVE)成员补 institute 字段，非成员省略（前端 v-if 诚实降级）
      ...(instituteMember && instituteMember.status === "ACTIVE"
        ? { institute: { signed: instituteMember.lecturerLevel === "SIGNED", lecturerLevel: instituteMember.lecturerLevel } }
        : {}),
    };
  }

  // ═══════════════════ 管理端 — 讲师认证审核 ═══════════════════

  /** 管理员：讲师认证列表（可按状态过滤，含申请人信息） */
  async listCertifications(status?: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.teacherCertification.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatar: true, phone: true } } },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.teacherCertification.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /**
   * 管理员：审核讲师认证。
   * APPROVE → status=APPROVED（可附 verifiedTitle 认证头衔）
   * REJECT  → status=REJECTED（需 rejectReason 驳回原因）
   */
  async reviewCertification(
    id: string,
    action: "APPROVE" | "REJECT",
    opts: { verifiedTitle?: string; rejectReason?: string } = {},
  ) {
    const cert = await this.prisma.teacherCertification.findUnique({ where: { id } });
    if (!cert) throw new BusinessException(ErrorCode.NOT_FOUND, "认证申请不存在");

    if (action === "APPROVE") {
      return this.prisma.teacherCertification.update({
        where: { id },
        data: {
          status: "APPROVED",
          verifiedTitle: opts.verifiedTitle || cert.title || "认证讲师",
          rejectReason: null,
          reviewedAt: new Date(),
        },
      });
    }

    if (!opts.rejectReason?.trim()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "驳回时必须填写原因");
    }
    return this.prisma.teacherCertification.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectReason: opts.rejectReason.trim(),
        reviewedAt: new Date(),
      },
    });
  }
}
