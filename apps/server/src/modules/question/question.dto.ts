import { IsString, IsInt, IsOptional, IsArray, IsBoolean, Min, Max, MaxLength, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AskQuestionDto {
  @ApiProperty({ description: "圈子ID" })
  @IsString()
  @MinLength(1)
  circleId: string;

  @ApiProperty({ description: "回答者用户ID" })
  @IsString()
  @MinLength(1)
  answererId: string;

  @ApiProperty({ description: "问题标题", maxLength: 100, example: "请问老师，如何判断八字中的用神？" })
  @IsString()
  @MaxLength(100)
  questionTitle: string;

  @ApiProperty({ description: "问题详细描述", maxLength: 500 })
  @IsString()
  @MaxLength(500)
  question: string;

  @ApiPropertyOptional({ description: "问题配图" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ description: "提问价格（币）", example: 50, minimum: 10 })
  @IsInt()
  @Min(10)
  priceCoin: number;

  @ApiPropertyOptional({ description: "围观价格（币），0=不可围观", default: 0, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  peekPriceCoin?: number;

  @ApiPropertyOptional({ description: "是否公开（公开后可被围观）", default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class AnswerQuestionDto {
  @ApiProperty({ description: "回答内容（富文本）", maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  answer: string;

  @ApiPropertyOptional({ description: "回答配图" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: "回答语音URL" })
  @IsOptional()
  @IsString()
  answerAudioUrl?: string;
}

export class PeekQuestionDto {
  @ApiPropertyOptional({ description: "分页页码", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class QuestionQueryDto {
  @ApiPropertyOptional({ description: "圈子ID筛选" })
  @IsOptional()
  @IsString()
  circleId?: string;

  @ApiPropertyOptional({ description: "状态筛选: PENDING/ANSWERED/REJECTED/REFUNDED/EXPIRED/CLOSED" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "是否仅公开", default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class RejectQuestionDto {
  @ApiPropertyOptional({ description: "拒绝理由", maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
