import { MinLength, MaxLength, IsOptional, IsString, IsNumber, IsIn, IsPositive, Max } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ConfigUpdateDto {
  @IsOptional() @IsNumber()
  rateA?: number;

  @IsOptional() @IsNumber()
  rateB?: number;

  @IsOptional() @IsNumber()
  rateC?: number;

  @IsOptional() @IsString()
  description?: string;
}

export class WithdrawalApplyDto {
  @IsNumber()
  @IsPositive()
  @Max(50000)
  amount: number;

  @IsOptional() @IsString()
  bankName?: string;

  @IsOptional() @IsString()
  bankAccount?: string;

  @IsOptional() @IsString()
  bankHolder?: string;

  @IsOptional() @IsString()
  alipayAccount?: string;

  @IsOptional() @IsString()
  stationId?: string;
}

export class WithdrawalAuditDto {
  @IsString() @IsIn(["APPROVED", "PAID", "REJECTED"])
  status: string;

  @IsOptional() @IsString()
  remark?: string;
}

export class CreateReferralDto {
  @IsString()
  @MinLength(1)
  targetType: string;

  @IsString()
  @MinLength(1)
  targetId: string;

  @IsOptional() @IsString()
  channel?: string;
}

/** 渠道主体临时链接点击上报（佣-V2-P2） */
export class ChannelClickDto {
  @ApiProperty({ description: "渠道主体类型", enum: ["STATION", "CIRCLE", "OFFLINE_STATION"] })
  @IsString() @IsIn(["STATION", "CIRCLE", "OFFLINE_STATION"])
  subjectType: string;

  @ApiProperty({ description: "渠道主体ID（Station.id / Circle.id / StationOffline.id）" })
  @IsString() @MinLength(1) @MaxLength(64)
  subjectId: string;

  @ApiProperty({ description: "推广目标类型：PRODUCT 单品 / SHOP_ALL 全店 等" })
  @IsString() @MinLength(1) @MaxLength(32)
  targetType: string;

  @ApiProperty({ description: "推广目标ID（targetType=SHOP_ALL 时可空）", required: false })
  @IsOptional() @IsString() @MaxLength(64)
  targetId?: string;
}

export class CommissionRateDto {
  @ApiProperty({ description: "分佣类型", example: "direct" })
  @IsString()
  type: string;

  @ApiProperty({ description: "分佣比例", example: 0.1 })
  @IsNumber()
  rate: number;
}
