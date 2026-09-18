import { IsString, IsOptional, IsIn, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

/** 用户反馈的工单状态（与 Feedback.status 既有取值一致，不改 schema） */
export const FEEDBACK_STATUSES = ["pending", "processing", "resolved"] as const;

/**
 * 信息流「不感兴趣」复用了同一张表（`lib/feed-data.ts` 写 type='feed_dislike'，
 * content 是一段 JSON）。它是推荐负反馈信号，不是人工工单，默认不进工单池。
 */
export const NON_TICKET_TYPES = ["feed_dislike"] as const;

export class FeedbackListQueryDto {
  @ApiPropertyOptional({ description: "反馈类型：bug/suggestion/complaint/other/course_rating" })
  @IsOptional() @IsString()
  type?: string;

  @ApiPropertyOptional({ description: "工单状态", enum: FEEDBACK_STATUSES })
  @IsOptional() @IsIn(FEEDBACK_STATUSES as unknown as string[])
  status?: string;

  @ApiPropertyOptional({ description: "关键词（只匹配已脱敏后的正文片段与反馈 id）" })
  @IsOptional() @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: "起始日期 YYYY-MM-DD" })
  @IsOptional() @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: "结束日期 YYYY-MM-DD" })
  @IsOptional() @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: "是否只看非工单信号（feed_dislike 等），默认 false" })
  @IsOptional() @IsString()
  signalsOnly?: string;

  @ApiPropertyOptional({ description: "页码，默认 1" })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "每页条数，默认 20，上限 100" })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;
}

export class UpdateFeedbackStatusDto {
  @ApiPropertyOptional({ description: "目标状态", enum: FEEDBACK_STATUSES })
  @IsIn(FEEDBACK_STATUSES as unknown as string[])
  status!: string;

  /** 置为 resolved 时必填；回退到 pending 时必填（写明原因） */
  @ApiPropertyOptional({ description: "处理结果 / 回退原因" })
  @IsOptional() @IsString()
  result?: string;
}
