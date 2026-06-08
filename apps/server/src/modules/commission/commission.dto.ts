import { MinLength, IsOptional, IsString, IsNumber, IsIn } from "class-validator";
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

export class CommissionRateDto {
  @ApiProperty({ description: "分佣类型", example: "direct" })
  @IsString()
  type: string;

  @ApiProperty({ description: "分佣比例", example: 0.1 })
  @IsNumber()
  rate: number;
}
