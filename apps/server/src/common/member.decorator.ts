import { SetMetadata } from "@nestjs/common";
import { MemberLevel } from "@prisma/client";

export const MEMBER_LEVELS_KEY = "member_levels";

/**
 * 标记路由需要特定会员等级才能访问。
 * 等级从低到高: NONE < MONTHLY < YEARLY < LIFETIME
 * LIFETIME 自动满足 MONTHLY 和 YEARLY 的要求。
 *
 * 用法: @RequireMember("MONTHLY", "YEARLY", "LIFETIME")
 */
export const RequireMember = (...levels: MemberLevel[]) =>
  SetMetadata(MEMBER_LEVELS_KEY, levels);
