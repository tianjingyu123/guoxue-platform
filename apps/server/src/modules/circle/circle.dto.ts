import { IsString, IsOptional, IsArray, IsBoolean, MinLength, MaxLength, IsNumber } from "class-validator";

export class CreateCircleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  name: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  intro: string;

  @IsString()
  @IsOptional()
  cover?: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsString()
  type: string; // FREE, PAID, YEARLY

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  depositAmount?: number;
}

export class UpdateCircleDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(30)
  name?: string;

  @IsString()
  @IsOptional()
  intro?: string;

  @IsString()
  @IsOptional()
  cover?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsNumber()
  @IsOptional()
  price?: number;
}

export class CreatePostDto {
  @IsString()
  type: string; // TEXT, IMAGE, VIDEO, FILE, LINK

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  content: string;

  @IsArray()
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  linkUrl?: string;
}

export class JoinCircleDto {
  @IsString()
  @IsOptional()
  referrerId?: string;
}

export class UpdateMemberRoleDto {
  @IsString()
  role: string; // PARTNER, ADMIN, GUEST, VOLUNTEER, MEMBER
}

export class ListPostQueryDto {
  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  isEssence?: string;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  pageSize?: number;
}
