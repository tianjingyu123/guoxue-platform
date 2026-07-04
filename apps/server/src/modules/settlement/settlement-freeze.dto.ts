import { IsIn, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import type { FreezeBeneficiaryType } from "./settlement-freeze.service";

/** 事后冻结/解冻请求体（POST /settlement/freeze | /settlement/unfreeze） */
export class FreezeBeneficiaryDto {
  @ApiProperty({ description: "受益主体类型", enum: ["USER", "STATION", "OPERATOR", "MERCHANT"] })
  @IsIn(["USER", "STATION", "OPERATOR", "MERCHANT"])
  beneficiaryType: FreezeBeneficiaryType;

  @ApiProperty({ description: "受益主体 ID（如站长佣金冻结传 Station.id）" })
  @IsString()
  @MinLength(1)
  beneficiaryId: string;

  @ApiProperty({ description: "冻结/解冻原因（资金操作审计必填）" })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason: string;
}
