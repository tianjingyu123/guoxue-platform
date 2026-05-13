import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsArray, MinLength, MaxLength, IsNumber, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class CreateCircleDto {
  @ApiProperty({ description: "圈子名称", minLength: 2, maxLength: 30, example: "国学论语圈" })
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  name: string;

  @ApiProperty({ description: "圈子简介", minLength: 10, maxLength: 500 })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  intro: string;

  @ApiPropertyOptional({ description: "封面图URL" })
  @IsString()
  @IsOptional()
  cover?: string;

  @ApiProperty({ description: "标签列表", type: [String], example: ["论语", "经典"] })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiProperty({ description: "圈子类型", enum: ["FREE", "PAID", "YEARLY"], example: "FREE" })
  @IsString()
  @MinLength(1)
  type: string;

  @ApiPropertyOptional({ description: "付费金额（分），PAID/YEARLY 时必填" })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ description: "押金金额（分）" })
  @IsNumber()
  @IsOptional()
  depositAmount?: number;

  @ApiPropertyOptional({ description: "所属分站ID" })
  @IsString()
  @IsOptional()
  stationId?: string;
}

export class UpdateCircleDto {
  @ApiPropertyOptional({ description: "圈子名称" })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(30)
  name?: string;

  @ApiPropertyOptional({ description: "圈子简介" })
  @IsString()
  @IsOptional()
  intro?: string;

  @ApiPropertyOptional({ description: "封面图URL" })
  @IsString()
  @IsOptional()
  cover?: string;

  @ApiPropertyOptional({ description: "标签列表" })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: "付费金额" })
  @IsNumber()
  @IsOptional()
  price?: number;
}

export class CreatePostDto {
  @ApiProperty({ description: "帖子类型", enum: ["TEXT", "IMAGE", "VIDEO", "FILE", "LINK"], example: "TEXT" })
  @IsString()
  @MinLength(1)
  type: string;

  @ApiPropertyOptional({ description: "帖子标题" })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: "帖子内容" })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ description: "图片URL列表" })
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ description: "视频URL" })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiPropertyOptional({ description: "文件URL" })
  @IsString()
  @IsOptional()
  fileUrl?: string;

  @ApiPropertyOptional({ description: "链接URL" })
  @IsString()
  @IsOptional()
  linkUrl?: string;

  @ApiPropertyOptional({ description: "状态：PUBLISHED 发布 / DRAFT 草稿", default: "PUBLISHED" })
  @IsString()
  @IsOptional()
  status?: string;
}

export class JoinCircleDto {
  @ApiPropertyOptional({ description: "推荐人ID" })
  @IsString()
  @IsOptional()
  referrerId?: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ description: "成员角色", enum: ["PARTNER", "ADMIN", "GUEST", "VOLUNTEER", "MEMBER"] })
  @IsString()
  @MinLength(1)
  role: string;
}

export class ListPostQueryDto {
  @ApiPropertyOptional({ description: "帖子类型" })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: "精华筛选" })
  @IsString()
  @IsOptional()
  isEssence?: string;

  @ApiPropertyOptional({ description: "页码", default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number;
}

export class ExpertConfigDto {
  @ApiProperty({ description: "提问价格（虚拟币），0=不接提问", minimum: 0 })
  @IsInt()
  @Min(0)
  questionPriceCoin: number;

  @ApiProperty({ description: "超时退款时间（小时）", minimum: 1, maximum: 720 })
  @IsInt()
  @Min(1)
  @Max(720)
  questionTimeoutHours: number;

  @ApiProperty({ description: "连麦价格（虚拟币/分钟），0=不接连麦", minimum: 0 })
  @IsInt()
  @Min(0)
  callPricePerMinuteCoin: number;

  @ApiPropertyOptional({ description: "可接听时段" })
  @IsOptional()
  callAvailableHours?: Array<{
    day: string;
    start: string;
    end: string;
  }>;
}
