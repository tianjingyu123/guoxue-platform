import { IsString, IsOptional, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class CreateCommentDto {
  @IsString()
  targetType: string;

  @IsString()
  targetId: string;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}

export class CommentQueryDto {
  @IsString()
  targetType: string;

  @IsString()
  targetId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
