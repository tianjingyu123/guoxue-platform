import { IsString, IsOptional, IsArray, IsEnum, MinLength, MaxLength } from "class-validator";

export enum ContentType {
  ARTICLE = "ARTICLE",
  POEM = "POEM",
  CLASSIC = "CLASSIC",
}

export class CreateContentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsEnum(ContentType)
  type: ContentType;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  dynasty?: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  body: string;

  @IsString()
  @IsOptional()
  cover?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class UpdateContentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(ContentType)
  @IsOptional()
  type?: ContentType;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  dynasty?: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  cover?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class ContentListQueryDto {
  page?: number;
  pageSize?: number;
  type?: ContentType;
  keyword?: string;
  status?: string;
}
