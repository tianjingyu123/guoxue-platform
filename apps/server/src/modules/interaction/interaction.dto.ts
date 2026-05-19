import { IsString, IsOptional, IsInt, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class LikeDto {
  @IsString()
  @MinLength(1)
  targetType: string;

  @IsString()
  @MinLength(1)
  targetId: string;
}

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  targetType: string;

  @IsString()
  @MinLength(1)
  targetId: string;

  @IsOptional() @IsString()
  parentId?: string;

  @IsString()
  @MinLength(1)
  content: string;
}

export class CollectDto {
  @IsString()
  @MinLength(1)
  targetType: string;

  @IsString()
  @MinLength(1)
  targetId: string;
}

export class FollowDto {
  @IsString()
  @MinLength(1)
  followedUserId: string;
}

export class ReportDto {
  @IsString()
  @MinLength(1)
  targetType: string;

  @IsString()
  @MinLength(1)
  targetId: string;

  @IsString()
  @MinLength(1)
  reason: string;
}

export class CommentListQueryDto {
  @ApiPropertyOptional({ description: "目标类型" })
  @IsOptional() @IsString()
  targetType?: string;

  @ApiPropertyOptional({ description: "目标ID" })
  @IsOptional() @IsString()
  targetId?: string;

  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @Type(() => Number) @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: "每页条数", default: 20 })
  @IsOptional() @Type(() => Number) @IsInt()
  pageSize?: number;

  @ApiPropertyOptional({ description: "用户ID" })
  @IsOptional() @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: "状态" })
  @IsOptional() @IsString()
  status?: string;
}

export class ReportListQueryDto {
  @IsOptional() @IsString()
  targetType?: string;

  @IsOptional() @IsString()
  status?: string;

  @IsOptional() @Type(() => Number) @IsInt()
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  pageSize?: number;
}
