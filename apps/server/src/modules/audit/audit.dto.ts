import { IsString, IsOptional, IsInt, MinLength } from "class-validator";
import { Type } from "class-transformer";

export class AuditListQueryDto {
  @IsOptional() @IsString()
  userId?: string;

  @IsOptional() @IsString()
  action?: string;

  @IsOptional() @IsString()
  targetType?: string;

  @IsOptional() @IsString()
  targetId?: string;

  @IsOptional() @Type(() => Number) @IsInt()
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  pageSize?: number;

  @IsOptional() @IsString()
  startDate?: string;

  @IsOptional() @IsString()
  endDate?: string;
}

export class ModerateImageDto {
  @IsOptional() @IsString()
  imageUrl?: string;

  @IsOptional() @IsString()
  imageBase64?: string;

  @IsOptional() @IsString()
  bizType?: string;
}

export class ModerateTextDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional() @IsString()
  bizType?: string;

  @IsOptional() @IsString()
  dataId?: string;
}

export class OperationLogListQueryDto {
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsString() targetType?: string;
  @IsOptional() @IsString() targetId?: string;
  @IsOptional() @Type(() => Number) @IsInt() page?: number;
  @IsOptional() @Type(() => Number) @IsInt() pageSize?: number;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
}
