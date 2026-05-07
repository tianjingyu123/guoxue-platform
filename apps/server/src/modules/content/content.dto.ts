import { IsString, IsOptional, IsEnum, IsArray } from "class-validator";
import { ContentType, ContentStatus } from "@prisma/client";

export class CreateContentDto {
  @IsString()
  title: string;

  @IsEnum(ContentType)
  type: ContentType;

  @IsString()
  body: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  dynasty?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  coverUrl?: string;
}

export class UpdateContentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  dynasty?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  coverUrl?: string;

  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;
}

export class QueryContentDto {
  @IsString()
  @IsOptional()
  type?: ContentType;

  @IsString()
  @IsOptional()
  keyword?: string;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  pageSize?: string;
}
