import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString, Length, Matches } from "class-validator";

export class SaveQualificationDto {
  @ApiProperty({ description: "主体类型", enum: ["MERCHANT", "OFFLINE_STATION", "CIRCLE", "INSTITUTE"] })
  @IsIn(["MERCHANT", "OFFLINE_STATION", "CIRCLE", "INSTITUTE"])
  subjectType: string;

  @ApiProperty({ description: "主体ID（商家/驿站/圈子的 id）" })
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @ApiProperty({ description: "主体名称（须与营业执照完全一致）" })
  @IsString()
  @IsNotEmpty()
  subjectName: string;

  @ApiProperty({ description: "统一社会信用代码（18位）" })
  @IsString()
  @Length(15, 18)
  licenseNo: string;

  @ApiPropertyOptional({ description: "营业执照图片 URL" })
  @IsOptional()
  @IsString()
  licenseImage?: string;

  @ApiProperty({ description: "法人姓名" })
  @IsString()
  @IsNotEmpty()
  legalName: string;

  @ApiProperty({ description: "法人身份证号（加密存储·接口返回只回尾号）" })
  @IsString()
  @Matches(/^\d{17}[\dXx]$/, { message: "身份证号格式不正确" })
  legalIdCard: string;

  @ApiPropertyOptional({ description: "法人身份证正面照" })
  @IsOptional()
  @IsString()
  legalIdFront?: string;

  @ApiPropertyOptional({ description: "法人身份证反面照" })
  @IsOptional()
  @IsString()
  legalIdBack?: string;

  @ApiPropertyOptional({ description: "结算银行" })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: "开户支行" })
  @IsOptional()
  @IsString()
  bankBranch?: string;

  @ApiProperty({ description: "结算账号（加密存储·接口返回只回尾号）" })
  @IsString()
  @Length(8, 32)
  bankAccount: string;

  @ApiProperty({ description: "结算户名（对公须与主体名称一致）" })
  @IsString()
  @IsNotEmpty()
  bankHolder: string;
}
