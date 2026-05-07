import { IsString, IsOptional, IsInt, IsBoolean, IsEnum, IsNumber, Min, IsArray } from "class-validator";
import { Type } from "class-transformer";

export enum CourseType {
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  TEXT = "TEXT",
  EBOOK = "EBOOK",
  COMBO = "COMBO",
}

export class CreateCourseDto {
  @IsOptional() @IsString()
  circleId?: string;

  @IsString()
  title: string;

  @IsOptional() @IsString()
  cover?: string;

  @IsOptional() @IsString()
  intro?: string;

  @IsOptional() @IsEnum(CourseType)
  type?: CourseType;

  @IsOptional() @IsNumber()
  price?: number;

  @IsOptional() @IsNumber()
  originalPrice?: number;
}

export class UpdateCourseDto {
  @IsOptional() @IsString()
  title?: string;

  @IsOptional() @IsString()
  cover?: string;

  @IsOptional() @IsString()
  intro?: string;

  @IsOptional() @IsEnum(CourseType)
  type?: CourseType;

  @IsOptional() @IsNumber()
  price?: number;

  @IsOptional() @IsNumber()
  originalPrice?: number;
}

export class CreateChapterDto {
  @IsString()
  title: string;

  @IsOptional() @IsString()
  content?: string;

  @IsOptional() @IsString()
  mediaUrl?: string;

  @IsOptional() @IsInt()
  duration?: number;

  @IsOptional() @IsInt()
  sortOrder?: number;

  @IsOptional() @IsBoolean()
  freeTrial?: boolean;
}

export class UpdateChapterDto {
  @IsOptional() @IsString()
  title?: string;

  @IsOptional() @IsString()
  content?: string;

  @IsOptional() @IsString()
  mediaUrl?: string;

  @IsOptional() @IsInt()
  duration?: number;

  @IsOptional() @IsInt()
  sortOrder?: number;

  @IsOptional() @IsBoolean()
  freeTrial?: boolean;
}

export class UpdateProgressDto {
  @IsNumber()
  @Min(0)
  progress: number;
}

export class SubmitWorkDto {
  @IsString()
  content: string;
}

export class CourseListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt()
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  pageSize?: number;

  @IsOptional() @IsString()
  circleId?: string;

  @IsOptional() @IsString()
  auditStatus?: string;
}
