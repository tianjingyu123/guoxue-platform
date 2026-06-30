import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class ReviewFundApprovalDto {
  @ApiProperty({ description: "是否通过：true=通过并执行，false=拒绝" })
  @IsBoolean()
  approve: boolean;

  @ApiPropertyOptional({ description: "审批备注" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
