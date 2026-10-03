import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsISO8601, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class GrantEntitlementDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  userId: string;

  @ApiProperty({ example: "course.access" })
  @IsString()
  @MaxLength(100)
  entitlementKey: string;

  @ApiProperty({ example: "ACCESS" })
  @IsString()
  @MaxLength(32)
  kind: string;

  @ApiPropertyOptional({ example: "COURSE" })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  resourceType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  resourceId?: string;

  @ApiPropertyOptional({ default: "GLOBAL" })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  scope?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  unlimited?: boolean;

  @ApiPropertyOptional()
  @IsISO8601()
  @IsOptional()
  validUntil?: string;

  @ApiProperty({ description: "调用方生成的全局幂等键" })
  @IsString()
  @MaxLength(200)
  idempotencyKey: string;
}

export class RevokeEntitlementSourceDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  userId: string;

  @ApiProperty({ example: "ORDER" })
  @IsString()
  @MaxLength(32)
  sourceType: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  sourceId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(200)
  reason?: string;
}
