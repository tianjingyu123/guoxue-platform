import { Injectable } from "@nestjs/common";
import { MemberLevel, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/** 全员推送必须显式声明的标签值（防漏传条件误推全员） */
export const AUDIENCE_TAG_ALL = "ALL";

/**
 * 推送圈人标签真源 = UserTag 表（user-tag.service.ts 每日 01:10 重算）。
 * 可用标签值（tag 传其一）：
 * - 活跃度：active_7d / silent_14d / churned_30d
 * - 付费深度：pay_none / pay_once / pay_repeat / pay_member
 * - 角色：role_creator / role_station / role_merchant / role_offline_station / role_circle_owner
 * - 偏好：pref_{兴趣tag}（如 pref_yijing）
 * - 派生：price_sensitive / high_potential_practitioner / churn_risk / whale
 * - 特殊：ALL = 显式全员
 */
export const KNOWN_AUDIENCE_TAGS = [
  AUDIENCE_TAG_ALL,
  "active_7d", "silent_14d", "churned_30d",
  "pay_none", "pay_once", "pay_repeat", "pay_member",
  "role_creator", "role_station", "role_merchant", "role_offline_station", "role_circle_owner",
  "price_sensitive", "high_potential_practitioner", "churn_risk", "whale",
] as const;

/**
 * 分群圈人条件构建（用户分群推送 + 管理员群发通知共用·唯一口径，保证「预估人数=实际发送人数」）。
 *
 * 语义（2026-07-17 审计修复：tag 此前是假参数，收下但从不生效）：
 * - tag=ALL           → 显式全员（仍可叠加 memberLevel/activeDays 收窄）
 * - tag=其他值         → 按 UserTag.tag 精确匹配圈人（真实标签，见 KNOWN_AUDIENCE_TAGS；
 *                        pref_* 为动态值故不做白名单校验，未命中标签即 0 人，诚实返回）
 * - 不传 tag          → 必须至少带 memberLevel 或 activeDays，否则拒绝（防漏传条件误推全员）
 *
 * 仅对 ACTIVE 用户圈人：封禁/注销用户收不到也不应计入发送人数。
 * 仅依赖全局 PrismaService，可在 user / notification 两个模块各自 provide（无状态，口径由代码唯一保证）。
 */
@Injectable()
export class PushAudienceService {
  constructor(private prisma: PrismaService) {}

  async buildWhere(tag: string | undefined, memberLevel: string, activeDays: number): Promise<Prisma.UserWhereInput> {
    const normalizedTag = tag?.trim() || "";
    const hasNarrowing = (!!memberLevel && memberLevel !== "ALL") || activeDays > 0;
    if (!normalizedTag && !hasNarrowing) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        "未指定任何圈选条件；如确需全员推送请显式传 tag=ALL",
      );
    }

    const where: Prisma.UserWhereInput = { status: "ACTIVE" };
    const idSets: string[][] = [];

    // 按真实用户标签圈人（UserTag 表·每日重算）
    if (normalizedTag && normalizedTag !== AUDIENCE_TAG_ALL) {
      const rows = await this.prisma.userTag.findMany({
        where: { tag: normalizedTag },
        select: { userId: true },
      });
      idSets.push(rows.map((r) => r.userId));
    }

    // 按会员等级筛选
    if (memberLevel && memberLevel !== "ALL") {
      where.memberLevel = memberLevel as MemberLevel;
    }

    // 按活跃天数筛选（通过 UserBehaviorLog）
    if (activeDays > 0) {
      const activeSince = new Date();
      activeSince.setDate(activeSince.getDate() - activeDays);
      const activeUserIds = await this.prisma.userBehaviorLog.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: activeSince } },
      });
      idSets.push(activeUserIds.map((u) => u.userId).filter((id): id is string => id !== null));
    }

    // 多个 id 集合取交集
    if (idSets.length === 1) {
      where.id = { in: idSets[0] };
    } else if (idSets.length > 1) {
      const [first, ...rest] = idSets;
      const restSets = rest.map((s) => new Set(s));
      where.id = { in: first.filter((id) => restSets.every((s) => s.has(id))) };
    }

    return where;
  }

  /** 圈选并返回目标用户 id 列表 */
  async resolveUserIds(tag: string | undefined, memberLevel: string, activeDays: number): Promise<string[]> {
    const where = await this.buildWhere(tag, memberLevel, activeDays);
    const users = await this.prisma.user.findMany({ where, select: { id: true } });
    return users.map((u) => u.id);
  }

  /** 圈选人数预估（dry-run） */
  async estimate(tag: string | undefined, memberLevel: string, activeDays: number): Promise<number> {
    const where = await this.buildWhere(tag, memberLevel, activeDays);
    return this.prisma.user.count({ where });
  }
}
