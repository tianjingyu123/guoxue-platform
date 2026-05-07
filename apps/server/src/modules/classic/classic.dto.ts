import { IsString, IsOptional, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateBookDto {
  @IsString() title: string;
  @IsOptional() @IsString() author?: string;
  @IsOptional() @IsString() dynasty?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() cover?: string;
  @IsOptional() @IsString() intro?: string;
  @IsOptional() @IsString() source?: string;
}

export class UpdateBookDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() author?: string;
  @IsOptional() @IsString() dynasty?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() cover?: string;
  @IsOptional() @IsString() intro?: string;
  @IsOptional() @IsString() source?: string;
}

export class CreateChapterDto {
  @IsString() title: string;
  @IsString() content: string;
  @IsOptional() @IsString() translation?: string;
  @IsOptional() @IsString() annotation?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class UpdateChapterDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() translation?: string;
  @IsOptional() @IsString() annotation?: string;
}

export class UpdateProgressDto {
  @IsString() chapterId: string;
  @IsInt() @Min(0) progress: number; // 0-100
}

export class CreateBookmarkDto {
  @IsString() chapterId: string;
  @IsInt() position: number;
  @IsOptional() @IsString() note?: string;
}

export class BookListQueryDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
}
