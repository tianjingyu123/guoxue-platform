import { IsString, IsOptional, IsInt, Min } from "class-validator";

export class LikeDto {
  @IsString()
  targetType: string;

  @IsString()
  targetId: string;
}

export class CreateCommentDto {
  @IsString()
  targetType: string;

  @IsString()
  targetId: string;

  @IsOptional() @IsString()
  parentId?: string;

  @IsString()
  content: string;
}

export class CollectDto {
  @IsString()
  targetType: string;

  @IsString()
  targetId: string;
}

export class FollowDto {
  @IsString()
  followedUserId: string;
}

export class ReportDto {
  @IsString()
  targetType: string;

  @IsString()
  targetId: string;

  @IsString()
  reason: string;
}

export class CommentListQueryDto {
  @IsOptional() @IsString()
  targetType?: string;

  @IsOptional() @IsString()
  targetId?: string;

  @IsOptional() @IsInt()
  page?: number;

  @IsOptional() @IsInt()
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

  @IsOptional() @IsInt()
  page?: number;

  @IsOptional() @IsInt()
  pageSize?: number;
}
