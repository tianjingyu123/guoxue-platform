import { IsEnum, IsString, IsOptional, IsNumber, IsNotEmpty } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * T3 供给侧定价顾问 — 请求 DTO
 *
 * 【R2 合规】仅接受商品类目维度参数 + 定价者当前拟定价格；
 * 绝不接受任何购买者/用户画像/消费能力维度参数。
 */
export enum PricingBizType {
  COURSE = "COURSE",
  PRODUCT = "PRODUCT",
}

export class PricingReferenceQueryDto {
  @ApiProperty({ description: "业务类型", enum: PricingBizType })
  @IsEnum(PricingBizType, { message: "bizType 必须为 COURSE 或 PRODUCT" })
  bizType: PricingBizType;

  @ApiProperty({ description: "一级品类" })
  @IsString()
  @IsNotEmpty({ message: "categoryLevel1 不能为空" })
  categoryLevel1: string;

  @ApiPropertyOptional({ description: "二级品类（可选，进一步收窄同类样本）" })
  @IsOptional()
  @IsString()
  categoryLevel2?: string;

  @ApiPropertyOptional({ description: "定价者当前拟定价格（用于给出区间位置提示）" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "currentPrice 必须为数字" })
  currentPrice?: number;
}
