import { MinLength, IsString, IsOptional, IsInt, IsArray, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  targetType: string;

  @IsString()
  @MinLength(1)
  targetId: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}

export class UpdateCommentDto {
  @IsString()
  @MinLength(1)
  content: string;
}

export class BatchHideDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

export class CommentQueryDto {
  @IsString()
  @IsOptional()
  targetType?: string;

  @IsOptional()
  @IsString()
  targetId?: string;

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
