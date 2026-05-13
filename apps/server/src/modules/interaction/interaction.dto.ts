import { IsString, IsOptional, IsInt, MinLength } from "class-validator";
import { Type } from "class-transformer";

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
  @IsOptional() @IsString()
  targetType?: string;

  @IsOptional() @IsString()
  targetId?: string;

  @IsOptional() @Type(() => Number) @IsInt()
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  pageSize?: number;

  @IsOptional() @IsString()
  userId?: string;

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
