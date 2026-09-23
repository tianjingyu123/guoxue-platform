import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

/**
 * 应验回访的入参（2026-09-19）。
 *
 * 文案设计上有一条要守住：**必须允许用户说「还看不出来」**（verdict=UNKNOWN）。
 * 把回访做成「必须给个说法」，逼出来的反馈质量最差，还会让用户反感。
 */
export class SubmitCaseFeedbackDto {
  @ApiProperty({ description: "排盘记录 id" })
  @IsString() @MaxLength(64)
  paipanRecordId: string;

  @ApiProperty({
    description: "应验判定：HIT 基本应验 / PARTIAL 部分对 / MISS 没对上 / UNKNOWN 还看不出来",
    example: "PARTIAL",
  })
  @IsIn(["HIT", "PARTIAL", "MISS", "UNKNOWN"])
  verdict: "HIT" | "PARTIAL" | "MISS" | "UNKNOWN";

  @ApiProperty({ description: "后来实际发生了什么" })
  @IsString() @MaxLength(4000)
  outcome: string;

  @ApiPropertyOptional({ description: "哪几条说对了" })
  @IsOptional() @IsString() @MaxLength(2000)
  whichRight?: string;

  @ApiPropertyOptional({ description: "哪几条说错了——这一栏往往比说对的更有价值" })
  @IsOptional() @IsString() @MaxLength(2000)
  whichWrong?: string;

  @ApiPropertyOptional({ description: "来源：prompted 回访推送 / voluntary 用户自发", default: "voluntary" })
  @IsOptional() @IsIn(["prompted", "voluntary"])
  channel?: "prompted" | "voluntary";

  @ApiPropertyOptional({ description: "是否同意本案例（脱敏后）用于平台的教学与知识整理" })
  @IsOptional() @IsBoolean()
  consent?: boolean;
}

export class ReviewCaseFeedbackDto {
  @ApiProperty({ description: "APPROVED / REJECTED" })
  @IsIn(["APPROVED", "REJECTED"])
  status: "APPROVED" | "REJECTED";

  @ApiPropertyOptional({
    description: "可迁移规律：从这一例能抽出什么可复用的判断模式。**通过审核时必填**——没有它这条记录只是轶事",
  })
  @IsOptional() @IsString() @MaxLength(2000)
  lesson?: string;

  @ApiPropertyOptional({ description: "审核备注" })
  @IsOptional() @IsString() @MaxLength(500)
  reviewNote?: string;
}

export class CaseFeedbackQueryDto {
  @ApiPropertyOptional({ description: "按盘类型过滤，如 qimen-yin" })
  @IsOptional() @IsString() @MaxLength(32)
  paipanType?: string;

  @ApiPropertyOptional({ description: "条数", default: 50 })
  @IsOptional() @IsInt() @Min(1) @Max(200)
  limit?: number;
}

export class FollowUpQueryDto extends CaseFeedbackQueryDto {
  @ApiPropertyOptional({ description: "距报告生成至少多少天才回访", default: 14 })
  @IsOptional() @IsInt() @Min(1) @Max(3650)
  minDays?: number;
}
