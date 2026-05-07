import { IsString, IsOptional, IsArray, IsBoolean, MinLength, MaxLength, IsNumber } from "class-validator";

export class CreateArticleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  title: string;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  cover?: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsBoolean()
  @IsOptional()
  isPushHome?: boolean;
}

export class UpdateArticleDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  cover?: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isPushHome?: boolean;
}

export class AddRecommendDto {
  @IsString()
  recommendType: string; // CIRCLE, COURSE, PRODUCT, PAIPAN, BOT

  @IsString()
  targetId: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  cover?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
