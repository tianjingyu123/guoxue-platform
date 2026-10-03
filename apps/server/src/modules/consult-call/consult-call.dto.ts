import { IsString, MinLength, MaxLength, IsIn, IsOptional, IsInt, Min, Max, IsArray, ArrayMaxSize } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class InitiateCallDto {
  @ApiProperty({ description: "圈子ID" })
  @IsString() @MinLength(1)
  circleId: string;

  @ApiProperty({ description: "达人（被叫）用户ID" })
  @IsString() @MinLength(1)
  expertId: string;

  @ApiProperty({ description: "通话类型", enum: ["VOICE", "VIDEO"] })
  @IsIn(["VOICE", "VIDEO"])
  type: "VOICE" | "VIDEO";
}

export class CancelCallDto {
  @ApiPropertyOptional({ description: "取消原因", enum: ["MISSED", "REFUNDED"] })
  @IsOptional() @IsIn(["MISSED", "REFUNDED"])
  reason?: "MISSED" | "REFUNDED";
}

/** 通话评价（待办 #31）：星级 1-5 + 标签多选 + 文字 ≤200 字 */
export class RateCallDto {
  @ApiProperty({ description: "星级 1-5", minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt() @Min(1) @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: "快捷评价标签（多选，最多 5 个）", type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(5) @IsString({ each: true }) @MaxLength(20, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: "文字评价（选填，最多 200 字）" })
  @IsOptional() @IsString() @MaxLength(200, { message: "评价文字最多 200 字" })
  comment?: string;
}

/** 24 小时账单申诉：对时长/金额有异议 */
export class DisputeCallDto {
  @ApiProperty({ description: "申诉原因（对时长或金额的异议说明）" })
  @IsString() @MinLength(1, { message: "请填写申诉原因" }) @MaxLength(500, { message: "申诉原因最多 500 字" })
  reason: string;
}

/** 管理端处理申诉：只记结论（资金零触碰，退款走人工金币退款审批流） */
export class ResolveDisputeDto {
  @ApiProperty({ description: "处理结论", enum: ["RESOLVED", "REJECTED"] })
  @IsIn(["RESOLVED", "REJECTED"])
  status: "RESOLVED" | "REJECTED";

  @ApiPropertyOptional({ description: "处理备注（如：核查属实，已转人工退款审批）" })
  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}
