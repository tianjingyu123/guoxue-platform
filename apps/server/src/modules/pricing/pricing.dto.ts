import { IsString, IsOptional, IsNumber, IsInt, IsBoolean, IsObject, IsArray, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePricingRuleDto {
  @ApiProperty({ description: "规则名称" })
  @IsString() name: string;

  @ApiProperty({ description: "目标类型 COURSE/PRODUCT/CONSULT/SERVICE" })
  @IsString() targetType: string;

  @ApiPropertyOptional({ description: "目标ID列表" })
  @IsOptional() @IsArray() targetIds?: string[];

  @ApiPropertyOptional({ description: "基础价格" })
  @IsOptional() @IsNumber() basePrice?: number;

  @ApiPropertyOptional({ description: "最低价格" })
  @IsOptional() @IsNumber() minPrice?: number;

  @ApiPropertyOptional({ description: "最高价格" })
  @IsOptional() @IsNumber() maxPrice?: number;

  @ApiProperty({ description: "策略 FIXED/TIME_DISCOUNT/USER_TAG/DEMAND_BASED" })
  @IsString() strategy: string;

  @ApiProperty({ description: "策略配置" })
  @IsObject() strategyConfig: Record<string, unknown>;

  @ApiPropertyOptional({ description: "优先级" })
  @IsOptional() @IsInt() priority?: number;

  @ApiPropertyOptional({ description: "是否启用" })
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdatePricingRuleDto {
  @ApiPropertyOptional({ description: "规则名称" })
  @IsOptional() @IsString() name?: string;

  @ApiPropertyOptional({ description: "基础价格" })
  @IsOptional() @IsNumber() basePrice?: number;

  @ApiPropertyOptional({ description: "最低价格" })
  @IsOptional() @IsNumber() minPrice?: number;

  @ApiPropertyOptional({ description: "最高价格" })
  @IsOptional() @IsNumber() maxPrice?: number;

  @ApiPropertyOptional({ description: "策略" })
  @IsOptional() @IsString() strategy?: string;

  @ApiPropertyOptional({ description: "策略配置" })
  @IsOptional() @IsObject() strategyConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "优先级" })
  @IsOptional() @IsInt() priority?: number;

  @ApiPropertyOptional({ description: "是否启用" })
  @IsOptional() @IsBoolean() isActive?: boolean;
}
