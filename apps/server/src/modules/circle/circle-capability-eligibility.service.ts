import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { CIRCLE_CAPABILITY_CONFIG_KEY, CapabilityFacts, evaluateCircleCapabilityEligibility, readCircleCapabilityRule } from "./circle-capability.policy";

/**
 * 新能力申请的只读事实采集器；写流程必须传入同一主库事务，不读写全平台发布授权。
 * 当前只统计有效圈内帖子，不能把这个指标称为全部内容量；指标版本随配置协议固定。
 */
@Injectable()
export class CircleCapabilityEligibilityService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluateOwner(circleId: string, actorId: string, capability: string, db: Prisma.TransactionClient = this.prisma, now = new Date()) {
    const circle = await db.circle.findFirst({
      where: { id: circleId, ownerId: actorId, deletedAt: null },
      select: { id: true, ownerId: true, status: true, createdAt: true,
        owner: { select: { status: true, deletedAt: true, identityLevel: true } } },
    });
    if (!circle) throw new BusinessException(ErrorCode.FORBIDDEN, "只有当前圈主可以查看能力申请进度");
    // 不走一小时缓存：配置关闭、修订后下一次判定立即生效。
    const row = await db.configSystem.findUnique({ where: { configKey: CIRCLE_CAPABILITY_CONFIG_KEY } });
    const policy = readCircleCapabilityRule(row?.configValue, capability);
    const base: CapabilityFacts = { circleId: circle.id, ownerId: circle.ownerId, actorId,
      circleActive: circle.status === "ACTIVE", actorActive: circle.owner.status === "ACTIVE" && !circle.owner.deletedAt,
      ownerMembershipValid: false, identity: circle.owner.identityLevel,
      operatingDays: Math.max(0, Math.floor((now.getTime() - circle.createdAt.getTime()) / 86400000)),
      validMembers: 0, publishedPosts: 0, recentPosts: 0, activeViolations: 0 };
    const wrap = (facts: CapabilityFacts) => ({ capability, evaluatedAt: now.toISOString(),
      policyRevision: policy.ok ? policy.rule.revision : null, metricSchema: "valid-circle-posts-v1",
      eligibility: evaluateCircleCapabilityEligibility(policy, facts) });
    if (!policy.ok || !base.circleActive || !base.actorActive) return wrap(base);
    const memberWhere: Prisma.CircleMemberWhereInput = { circleId, user: { status: "ACTIVE", deletedAt: null },
      OR: [{ expireAt: null }, { expireAt: { gt: now } }] };
    const membership = await db.circleMember.findFirst({
      where: { ...memberWhere, userId: actorId, role: "OWNER" }, select: { id: true },
    });
    if (!membership) return wrap(base);
    // auditStatus 是推首页审核状态，不把普通圈内帖的 PENDING 错当未发布；明确被拒内容不计入。
    const postWhere: Prisma.PostWhereInput = { circleId, status: "PUBLISHED", auditStatus: { not: "REJECTED" },
      user: { status: "ACTIVE", deletedAt: null }, OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] };
    const since = new Date(now.getTime() - policy.rule.recentWindowDays * 86400000);
    const [validMembers, publishedPosts, recentPosts, activeViolations] = await Promise.all([
      db.circleMember.count({ where: memberWhere }),
      db.post.count({ where: postWhere }),
      db.post.count({ where: { ...postWhere, createdAt: { gte: since, lte: now } } }),
      db.circleViolation.count({ where: { circleId, status: "ACTIVE", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
    ]);
    return wrap({ ...base, ownerMembershipValid: true, validMembers, publishedPosts, recentPosts, activeViolations });
  }
}
