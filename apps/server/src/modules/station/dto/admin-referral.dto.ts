import { IsString, IsOptional, IsNumber, IsDateString, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTempReferralDto {
  @ApiPropertyOptional({ description: "分站ID" })
  @IsOptional() @IsString()
  stationId?: string;

  @ApiPropertyOptional({ description: "运营商ID" })
  @IsOptional() @IsString()
  operatorId?: string;

  @ApiProperty({ description: "佣金比例 0-100" })
  @Type(() => Number) @IsNumber() @Min(0)
  commissionRate: number;

  @ApiProperty({ description: "生效开始时间" })
  @IsDateString()
  validFrom: string;

  @ApiProperty({ description: "生效结束时间" })
  @IsDateString()
  validTo: string;
}

export class UpdateTempReferralDto {
  @ApiPropertyOptional({ description: "佣金比例" })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  commissionRate?: number;

  @ApiPropertyOptional({ description: "生效开始时间" })
  @IsOptional() @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: "生效结束时间" })
  @IsOptional() @IsDateString()
  validTo?: string;
}
