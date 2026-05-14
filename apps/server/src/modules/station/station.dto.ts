import { IsString, IsOptional, IsHexColor, IsObject, MaxLength, IsInt, MinLength } from "class-validator";

export class CreateStationDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsString()
  @MaxLength(30)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  intro?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsHexColor()
  themeColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  miniAppId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  mpAppId?: string;

  @IsOptional()
  @IsObject()
  miniPages?: Record<string, string>;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  templateId?: string;

  @IsOptional()
  @IsObject()
  templateConfig?: Record<string, unknown>;
}

export class SetStationTemplateDto {
  @IsString()
  @MaxLength(30)
  templateId: string;

  @IsOptional()
  @IsObject()
  templateConfig?: Record<string, unknown>;
}

export class UpdateStationDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  intro?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsHexColor()
  themeColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  miniAppId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  mpAppId?: string;

  @IsOptional()
  @IsObject()
  miniPages?: Record<string, string>;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  templateId?: string;

  @IsOptional()
  @IsObject()
  templateConfig?: Record<string, unknown>;
}

export class CreateOperatorDto {
  @IsString()
  @MinLength(1)
  level: string;

  @IsOptional()
  @IsInt()
  containQuota?: number;

  @IsOptional()
  @IsString()
  parentOperatorId?: string;

  @IsOptional()
  @IsString()
  expireAt?: string;
}
