import { Injectable } from "@nestjs/common";
import {
  CirclePublishGrantStatus,
  CirclePublishScope,
  IdentityLevel,
  Prisma,
} from "@prisma/client";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { safePagination } from "../../common/pagination";
import { PrismaService } from "../../prisma/prisma.service";
import {
  ApplyCirclePublishGrantDto,
  CIRCLE_PUBLISH_SCOPES,
  CirclePublishScopeValue,
  ReviewCirclePublishGrantDto,
} from "./circle-publish-grant.dto";

const DAY_MS = 24 * 60 * 60 * 1000;
const REAPPLY_COOLDOWN_DAYS = 30;
const REGULAR_THRESHOLDS = {
  operatingDays: 30,
  members: 100,
  works: 30,
  recentWorks: 8,
} as const;
const FAST_TRACK_FOLLOWERS = 10_000;
const PLATFORM_ADMIN_ROLES = ["SUPER_ADMIN", "OPERATION_ADMIN"] as const;

type EligibilityMetrics = {
  operatingDays: number;
  members: number;
  works: number;
  recentWorks: number;
};

@Injectable()
export class CirclePublishGrantService {
  constructor(private readonly prisma: PrismaService) {}

  private requiredIdentityLevel(scopes: CirclePublishScopeValue[]) {
    return scopes.includes("LIVE") ? IdentityLevel.L2 : IdentityLevel.L1;
  }

  private identitySatisfied(identityLevel: IdentityLevel, scopes: CirclePublishScopeValue[]) {
    const required = this.requiredIdentityLevel(scopes);
    if (required === IdentityLevel.L2) return identityLevel === IdentityLevel.L2;
    return identityLevel === IdentityLevel.L1 || identityLevel === IdentityLevel.L2;
  }

  private async isPlatformAdmin(userId: string) {
    const role = await this.prisma.userRole.findFirst({
      where: {
        userId,
        roleType: { in: [...PLATFORM_ADMIN_ROLES] },
      },
      select: { id: true },
    });
    return !!role;
  }

  private async collectMetrics(circleId: string, createdAt: Date, memberCount: number): Promise<EligibilityMetrics> {
    const recentSince = new Date(Date.now() - 30 * DAY_MS);
    const [
      actualMembers,
      posts,
      articles,
      courses,
      videos,
      liveRooms,
      recentPosts,
      recentArticles,
      recentCourses,
      recentVideos,
      recentLiveRooms,
    ] = await Promise.all([
      this.prisma.circleMember.count({ where: { circleId } }),
      this.prisma.post.count({ where: { circleId, status: "PUBLISHED" } }),
      this.prisma.article.count({ where: { circleId, deletedAt: null } }),
      this.prisma.course.count({ where: { circleId, deletedAt: null } }),
      this.prisma.video.count({ where: { circleId, status: { notIn: ["HIDDEN", "REJECTED"] } } }),
      this.prisma.liveRoom.count({ where: { circleId } }),
      this.prisma.post.count({ where: { circleId, status: "PUBLISHED", createdAt: { gte: recentSince } } }),
      this.prisma.article.count({ where: { circleId, deletedAt: null, createdAt: { gte: recentSince } } }),
      this.prisma.course.count({ where: { circleId, deletedAt: null, createdAt: { gte: recentSince } } }),
      this.prisma.video.count({
        where: { circleId, status: { notIn: ["HIDDEN", "REJECTED"] }, createdAt: { gte: recentSince } },
      }),
      this.prisma.liveRoom.count({ where: { circleId, createdAt: { gte: recentSince } } }),
    ]);

    return {
      operatingDays: Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / DAY_MS)),
      members: Math.max(memberCount, actualMembers),
      works: posts + articles + courses + videos + liveRooms,
      recentWorks: recentPosts + recentArticles + recentCourses + recentVideos + recentLiveRooms,
    };
  }

  private buildProgress(metrics: EligibilityMetrics) {
    return {
      operatingDays: {
        current: metrics.operatingDays,
        required: REGULAR_THRESHOLDS.operatingDays,
        passed: metrics.operatingDays >= REGULAR_THRESHOLDS.operatingDays,
      },
      members: {
        current: metrics.members,
        required: REGULAR_THRESHOLDS.members,
        passed: metrics.members >= REGULAR_THRESHOLDS.members,
      },
      works: {
        current: metrics.works,
        required: REGULAR_THRESHOLDS.works,
        passed: metrics.works >= REGULAR_THRESHOLDS.works,
      },
      recentWorks: {
        current: metrics.recentWorks,
        required: REGULAR_THRESHOLDS.recentWorks,
        passed: metrics.recentWorks >= REGULAR_THRESHOLDS.recentWorks,
      },
    };
  }

  private regularEligible(metrics: EligibilityMetrics) {
    return (
      metrics.operatingDays >= REGULAR_THRESHOLDS.operatingDays &&
      metrics.members >= REGULAR_THRESHOLDS.members &&
      metrics.works >= REGULAR_THRESHOLDS.works &&
      metrics.recentWorks >= REGULAR_THRESHOLDS.recentWorks
    );
  }

  private async findOwnedCircle(circleId: string, userId: string) {
    const circle = await this.prisma.circle.findFirst({
      where: { id: circleId, ownerId: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        ownerId: true,
        memberCount: true,
        status: true,
        createdAt: true,
      },
    });
    if (!circle) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "只有圈主可以申请全平台内容发布授权");
    }
    if (circle.status !== "ACTIVE") {
      throw new BusinessException(ErrorCode.FORBIDDEN, "圈子尚未正常开放，暂时不能申请全平台发布授权");
    }
    return circle;
  }

  async getStatus(userId: string, scope?: CirclePublishScopeValue) {
    if (scope && !CIRCLE_PUBLISH_SCOPES.includes(scope)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "不支持的发布授权类型");
    }
    const requestedScopes = scope ? [scope] : (["SHORT_VIDEO", "LIVE", "COURSE"] as CirclePublishScopeValue[]);
    if (await this.isPlatformAdmin(userId)) {
      return {
        isPlatformAdmin: true,
        canPublish: true,
        requestedScopes,
        identityLevel: IdentityLevel.L2,
        circles: [],
      };
    }

    const [user, circles] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { identityLevel: true },
      }),
      this.prisma.circle.findMany({
        where: { ownerId: userId, deletedAt: null },
        select: {
          id: true,
          name: true,
          status: true,
          memberCount: true,
          createdAt: true,
          publishGrants: {
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              scopes: true,
              status: true,
              channel: true,
              rejectReason: true,
              reviewedAt: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");

    const circleStatuses = await Promise.all(
      circles.map(async (circle) => {
        const metrics = await this.collectMetrics(circle.id, circle.createdAt, circle.memberCount);
        const approvedGrant = circle.publishGrants.find(
          (grant) =>
            grant.status === CirclePublishGrantStatus.APPROVED &&
            requestedScopes.every((item) => grant.scopes.includes(item as CirclePublishScope)),
        );
        const identityReady = this.identitySatisfied(user.identityLevel, requestedScopes);
        return {
          id: circle.id,
          name: circle.name,
          status: circle.status,
          progress: this.buildProgress(metrics),
          regularEligible: this.regularEligible(metrics),
          identityReady,
          requiredIdentityLevel: this.requiredIdentityLevel(requestedScopes),
          canPublish: !!approvedGrant && identityReady,
          activeGrant: approvedGrant || circle.publishGrants[0] || null,
        };
      }),
    );

    return {
      isPlatformAdmin: false,
      canPublish: circleStatuses.some((circle) => circle.canPublish),
      requestedScopes,
      identityLevel: user.identityLevel,
      circles: circleStatuses,
    };
  }

  async apply(userId: string, dto: ApplyCirclePublishGrantDto) {
    const scopes = dto.scopes as CirclePublishScopeValue[];
    const channel = dto.channel || "REGULAR";
    const [circle, user] = await Promise.all([
      this.findOwnedCircle(dto.circleId, userId),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { identityLevel: true },
      }),
    ]);
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");
    if (!this.identitySatisfied(user.identityLevel, scopes)) {
      const required = this.requiredIdentityLevel(scopes);
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        required === IdentityLevel.L2
          ? "申请直播全平台发布前，请先完成人脸核身（L2）"
          : "申请全平台发布前，请先完成实名认证（L1）",
      );
    }

    const recentGrant = await this.prisma.circlePublishGrant.findFirst({
      where: {
        circleId: circle.id,
        applicantId: userId,
        status: {
          in: [CirclePublishGrantStatus.PENDING, CirclePublishGrantStatus.APPROVED, CirclePublishGrantStatus.REJECTED],
        },
      },
      orderBy: { createdAt: "desc" },
    });
    if (
      recentGrant &&
      (recentGrant.status === CirclePublishGrantStatus.PENDING ||
        recentGrant.status === CirclePublishGrantStatus.APPROVED) &&
      scopes.every((scope) => recentGrant.scopes.includes(scope as CirclePublishScope))
    ) {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        recentGrant.status === CirclePublishGrantStatus.PENDING ? "相同授权正在审核中" : "圈子已拥有所申请的全平台发布授权",
      );
    }
    if (
      recentGrant?.status === CirclePublishGrantStatus.REJECTED &&
      Date.now() - recentGrant.createdAt.getTime() < REAPPLY_COOLDOWN_DAYS * DAY_MS
    ) {
      const availableAt = new Date(recentGrant.createdAt.getTime() + REAPPLY_COOLDOWN_DAYS * DAY_MS);
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `上次申请被驳回后需等待 ${REAPPLY_COOLDOWN_DAYS} 天，可于 ${availableAt.toISOString().slice(0, 10)} 后重新申请`,
      );
    }

    const metrics = await this.collectMetrics(circle.id, circle.createdAt, circle.memberCount);
    if (channel === "REGULAR" && !this.regularEligible(metrics)) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "圈子运营指标尚未达到申请标准，请按页面进度继续完善");
    }
    if (channel === "FAST_TRACK") {
      if (
        (dto.externalFollowerCount || 0) < FAST_TRACK_FOLLOWERS ||
        !dto.externalPlatform?.trim() ||
        !dto.externalProfileUrl?.trim() ||
        !dto.evidenceUrls?.length
      ) {
        throw new BusinessException(
          ErrorCode.BAD_REQUEST,
          "快速通道需提交外部平台、主页、至少 1 万粉丝数据和证明材料",
        );
      }
    }

    return this.prisma.circlePublishGrant.create({
      data: {
        circleId: circle.id,
        applicantId: userId,
        scopes: scopes as CirclePublishScope[],
        channel,
        externalPlatform: dto.externalPlatform?.trim(),
        externalProfileUrl: dto.externalProfileUrl?.trim(),
        externalFollowerCount: dto.externalFollowerCount,
        evidenceUrls: (dto.evidenceUrls || []).slice(0, 10),
        eligibilitySnapshot: {
          metrics,
          progress: this.buildProgress(metrics),
          identityLevel: user.identityLevel,
          requiredIdentityLevel: this.requiredIdentityLevel(scopes),
          appliedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
  }

  async listAdmin(status?: CirclePublishGrantStatus, page = 1, pageSize = 20) {
    if (status && !Object.values(CirclePublishGrantStatus).includes(status)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "不支持的授权审核状态");
    }
    const pagination = safePagination(page, pageSize, 100);
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.circlePublishGrant.findMany({
        where,
        include: {
          circle: { select: { id: true, name: true, memberCount: true, createdAt: true } },
          applicant: { select: { id: true, nickname: true, phone: true, identityLevel: true } },
          reviewer: { select: { id: true, nickname: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
      this.prisma.circlePublishGrant.count({ where }),
    ]);
    return { items, total, page: pagination.page, pageSize: pagination.pageSize };
  }

  async approve(grantId: string, reviewerId: string, dto: ReviewCirclePublishGrantDto) {
    const grant = await this.prisma.circlePublishGrant.findUnique({ where: { id: grantId } });
    if (!grant) throw new BusinessException(ErrorCode.NOT_FOUND, "授权申请不存在");
    if (grant.status !== CirclePublishGrantStatus.PENDING) {
      throw new BusinessException(ErrorCode.CONFLICT, "该授权申请已经处理");
    }
    const scopes = (dto.scopes || grant.scopes) as CirclePublishScope[];
    if (scopes.some((scope) => !grant.scopes.includes(scope))) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "批准范围不能超出原申请范围");
    }
    const now = new Date();
    return this.prisma.circlePublishGrant.update({
      where: { id: grantId },
      data: {
        scopes,
        status: CirclePublishGrantStatus.APPROVED,
        reviewerId,
        reviewedAt: now,
        approvedAt: now,
        rejectReason: dto.reason?.trim() || null,
      },
    });
  }

  async reject(grantId: string, reviewerId: string, dto: ReviewCirclePublishGrantDto) {
    const reason = dto.reason?.trim();
    if (!reason) throw new BusinessException(ErrorCode.BAD_REQUEST, "驳回申请时必须填写原因");
    const grant = await this.prisma.circlePublishGrant.findUnique({ where: { id: grantId } });
    if (!grant) throw new BusinessException(ErrorCode.NOT_FOUND, "授权申请不存在");
    if (grant.status !== CirclePublishGrantStatus.PENDING) {
      throw new BusinessException(ErrorCode.CONFLICT, "该授权申请已经处理");
    }
    return this.prisma.circlePublishGrant.update({
      where: { id: grantId },
      data: {
        status: CirclePublishGrantStatus.REJECTED,
        reviewerId,
        reviewedAt: new Date(),
        rejectReason: reason,
      },
    });
  }

  async assertCanPublish(
    userId: string,
    circleId: string | undefined,
    scope: CirclePublishScopeValue,
    isAdmin = false,
  ) {
    if (isAdmin || (await this.isPlatformAdmin(userId))) return;
    if (!circleId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "全平台内容必须从已获授权的圈子发布");
    }
    const [circle, user, grant] = await Promise.all([
      this.prisma.circle.findFirst({
        where: { id: circleId, ownerId: userId, status: "ACTIVE", deletedAt: null },
        select: { id: true },
      }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { identityLevel: true } }),
      this.prisma.circlePublishGrant.findFirst({
        where: {
          circleId,
          applicantId: userId,
          status: CirclePublishGrantStatus.APPROVED,
          scopes: { has: scope as CirclePublishScope },
        },
        orderBy: { approvedAt: "desc" },
        select: { id: true },
      }),
    ]);
    if (!circle) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "只有已获授权的圈主可以发布全平台内容");
    }
    if (!user || !this.identitySatisfied(user.identityLevel, [scope])) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        scope === "LIVE" ? "全平台直播需要完成人脸核身（L2）" : "全平台发布需要完成实名认证（L1）",
      );
    }
    if (!grant) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "该圈子尚未获得此类内容的全平台发布授权");
    }
  }
}
