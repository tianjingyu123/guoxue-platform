import { IsString, IsOptional, IsNumber, IsArray } from "class-validator";

export class CreateRoomDto {
  @IsOptional() @IsString()
  circleId?: string;

  @IsString()
  title: string;

  @IsOptional() @IsString()
  cover?: string;

  @IsString()
  hostUserId: string;

  @IsOptional() @IsArray()
  coHostIds?: string[];

  @IsOptional() @IsString()
  chargeType?: string;

  @IsOptional() @IsNumber()
  chargePrice?: number;

  @IsOptional() @IsArray()
  productIds?: string[];
}

export class UpdateRoomDto {
  @IsOptional() @IsString()
  title?: string;

  @IsOptional() @IsString()
  cover?: string;
}
