import { IsString, IsOptional, IsArray, IsIn, IsInt, Min, MinLength } from "class-validator";

/** 圈内事件四分类（V0 待办 #36）：互动/交易/圈务/直播；非圈子通知不带 category */
export const CIRCLE_NOTIFICATION_CATEGORIES = ["INTERACT", "TRADE", "GOVERN", "LIVE"] as const;
export type CircleNotificationCategory = (typeof CIRCLE_NOTIFICATION_CATEGORIES)[number];

export class SendNotificationDto {
  @IsOptional() @IsString()
  userId?: string;

  @IsString()
  @MinLength(1)
  type: string;

  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional() @IsString()
  targetType?: string;

  @IsOptional() @IsString()
  targetId?: string;

  /** 圈内通知分类（可选）：INTERACT/TRADE/GOVERN/LIVE */
  @IsOptional() @IsIn(CIRCLE_NOTIFICATION_CATEGORIES as unknown as string[])
  category?: CircleNotificationCategory;

  /** 事件所属圈子（可选，随 category 一起落库） */
  @IsOptional() @IsString()
  circleId?: string;
}

/**
 * 管理员按标签群发（POST /notifications/admin/broadcast）。
 * 圈人口径 = PushAudienceService（与 users/push/estimate、users/push/by-tag 完全同口径）：
 * - userIds 直接指定收件人（与 tag 二选一，userIds 优先）
 * - tag：UserTag 真实标签（active_7d/pay_once/whale…）；全员必须显式 tag=ALL
 * - 都不传且无 memberLevel/activeDays → 拒绝（防误推全员）
 */
export class BroadcastDto {
  /** UserTag 真实标签；全员显式传 "ALL" */
  @IsOptional() @IsString()
  tag?: string;

  /** 直接指定收件用户（与 tag 二选一·优先生效） */
  @IsOptional() @IsArray() @IsString({ each: true })
  userIds?: string[];

  /** 可选叠加：会员等级 */
  @IsOptional() @IsString()
  memberLevel?: string;

  /** 可选叠加：近 N 天活跃（JSON body 原生数字·无需 @Type 转换） */
  @IsOptional() @IsInt() @Min(0)
  activeDays?: number;

  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  content: string;

  /** 通知类型（缺省 SYSTEM） */
  @IsOptional() @IsString()
  type?: string;
}

export class BatchSendDto {
  @IsArray()
  userIds: string[];

  @IsString()
  @MinLength(1)
  type: string;

  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional() @IsString()
  targetType?: string;

  @IsOptional() @IsString()
  targetId?: string;

  /** 圈内通知分类（可选）：INTERACT/TRADE/GOVERN/LIVE */
  @IsOptional() @IsIn(CIRCLE_NOTIFICATION_CATEGORIES as unknown as string[])
  category?: CircleNotificationCategory;

  /** 事件所属圈子（可选） */
  @IsOptional() @IsString()
  circleId?: string;
}
