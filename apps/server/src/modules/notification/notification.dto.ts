import { IsString, IsOptional, IsArray, IsIn, MinLength } from "class-validator";

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
