import { IsString, IsOptional, IsArray, IsBoolean, MinLength, MaxLength, IsNumber, IsIn } from "class-validator";

export class CreateArticleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  title: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsString()
  @IsOptional()
  cover?: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsIn(["AUTO", "FEATURE", "SINGLE", "GALLERY", "COLUMN"])
  @IsOptional()
  layout?: "AUTO" | "FEATURE" | "SINGLE" | "GALLERY" | "COLUMN";

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsBoolean()
  @IsOptional()
  isPushHome?: boolean;

  @IsString()
  @IsOptional()
  stationId?: string;

  @IsString()
  @IsOptional()
  circleId?: string;

  @IsIn(["CIRCLE_ONLY", "PLATFORM"])
  @IsOptional()
  visibility?: "CIRCLE_ONLY" | "PLATFORM";
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

  @IsIn(["AUTO", "FEATURE", "SINGLE", "GALLERY", "COLUMN"])
  @IsOptional()
  layout?: "AUTO" | "FEATURE" | "SINGLE" | "GALLERY" | "COLUMN";

  @IsIn(["CIRCLE_ONLY", "PLATFORM"])
  @IsOptional()
  visibility?: "CIRCLE_ONLY" | "PLATFORM";

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isPushHome?: boolean;
}

export class AddRecommendDto {
  @IsString()
  @MinLength(1)
  recommendType: string; // CIRCLE, COURSE, PRODUCT, PAIPAN, BOT

  @IsString()
  @MinLength(1)
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
