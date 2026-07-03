import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { ApplyCertificationDto } from "./teacher.dto";

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
      this.prisma.instituteMember.findUnique({
        where: { userId },
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
  async listCertifications(status?: string, page = 1, pageSize = 20) {
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.teacherCertification.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatar: true, phone: true } } },
        skip: (page - 1) * pageSize,
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
