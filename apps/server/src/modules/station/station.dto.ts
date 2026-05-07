import { IsString, IsOptional, IsHexColor, MaxLength } from "class-validator";

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
}

export class CreateOperatorDto {
  @IsString()
  level: string;

  @IsOptional()
  containQuota?: number;

  @IsOptional()
  @IsString()
  parentOperatorId?: string;

  @IsOptional()
  @IsString()
  expireAt?: string;
}
