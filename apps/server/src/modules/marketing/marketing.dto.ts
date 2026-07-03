import {
  IsString, IsOptional, IsInt, IsNumber, IsArray, IsBoolean,
  Min, Max, IsDateString, MinLength, MaxLength, ArrayNotEmpty, IsIn,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// ════════════════════════════════════════
// 分页查询通用 DTO
// ════════════════════════════════════════

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;
}

// ════════════════════════════════════════
// 秒杀管理 DTO
// ════════════════════════════════════════

export class CreateFlashSaleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  warmupMinutes?: number;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  flashPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limitPerUser?: number;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  scopePageId?: string;
}

export class UpdateFlashSaleDto {
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  warmupMinutes?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  scopePageId?: string;
}

export class FlashSaleFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateFlashSaleItemDto {
  @IsString()
  @MinLength(1)
  productId: string;

  @IsOptional()
  @IsString()
  skuId?: string;

  @IsNumber()
  @Min(0)
  flashPrice: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limitCount?: number;

  @IsInt()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateFlashSaleItemDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  flashPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limitCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

// ════════════════════════════════════════
// 拼团管理 DTO
// ════════════════════════════════════════

export class CreateGroupBuyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsString()
  @MinLength(1)
  productId: string;

  @IsOptional()
  @IsString()
  skuId?: string;

  @IsNumber()
  @Min(0)
  groupPrice: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  minMembers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  expireMinutes?: number;

  @IsOptional()
  @IsBoolean()
  autoComplete?: boolean;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  scopePageId?: string;
}

export class UpdateGroupBuyDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  groupPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  minMembers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  expireMinutes?: number;

  @IsOptional()
  @IsBoolean()
  autoComplete?: boolean;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  scopePageId?: string;
}

export class GroupBuyFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;
}

// ════════════════════════════════════════
// 优惠券管理 DTO
// ════════════════════════════════════════

export class CreateCouponTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(1)
  type: string; // FIXED / PERCENT / SHIPPING

  @IsNumber()
  @Min(0)
  faceValue: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalCount?: number;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  validDays?: number;

  @IsOptional()
  applicableScope?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  aiPrecision?: boolean;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  scopePageId?: string;
}

export class UpdateCouponTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  faceValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalCount?: number;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  validDays?: number;

  @IsOptional()
  applicableScope?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  aiPrecision?: boolean;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  scopePageId?: string;
}

export class CouponFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class GrantCouponDto {
  @IsString()
  @MinLength(1)
  userId: string;
}

export class BatchGrantCouponDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  userIds: string[];
}

export class CouponRecordFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string; // UNUSED / USED / EXPIRED
}

/** 我的优惠券筛选（用户端） */
export class MyCouponFilterDto {
  @ApiPropertyOptional({ description: "券状态筛选", enum: ["UNUSED", "USED", "EXPIRED"] })
  @IsOptional()
  @IsIn(["UNUSED", "USED", "EXPIRED"])
  status?: string;
}

// ════════════════════════════════════════
// 限时折扣 DTO
// ════════════════════════════════════════

export class CreateDiscountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsInt()
  @Min(1)
  @Max(99)
  discountPct: number;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  courseIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  circleIds?: string[];

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  scopePageId?: string;
}

export class UpdateDiscountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  discountPct?: number;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  courseIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  circleIds?: string[];

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  scopePageId?: string;
}

export class DiscountFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;
}

// ════════════════════════════════════════
// 微页面 DTO
// ════════════════════════════════════════

export class CreateMarketingPageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(1)
  route: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  stationId?: string;

  @IsOptional()
  entryConfig?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  entryVisible?: boolean;
}

export class UpdateMarketingPageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  entryConfig?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  entryVisible?: boolean;
}

export class CreatePageComponentDto {
  @IsString()
  @MinLength(1)
  type: string; // banner / countdown / flashsale / groupbuy / coupon / recommend / richtext / tabs

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  config?: Record<string, any>;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  audience?: Record<string, any>;
}

export class UpdatePageComponentDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  config?: Record<string, any>;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  audience?: Record<string, any>;
}

export class SortComponentsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  componentIds: string[];
}

// ════════════════════════════════════════
// 活动管理 DTO
// ════════════════════════════════════════

export class CreateActivityDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsString()
  pageId?: string;
}

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsString()
  pageId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class ActivityFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;
}

// ════════════════════════════════════════
// 满减送 DTO
// ════════════════════════════════════════

export class CreateFullReductionDto {
  @ApiProperty({ description: "活动名称" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: "满金额（元）" })
  @IsNumber()
  @Min(0)
  threshold: number;

  @ApiProperty({ description: "减金额（元）" })
  @IsNumber()
  @Min(0)
  reduction: number;

  @ApiPropertyOptional({ description: "赠品商品ID" })
  @IsOptional()
  @IsString()
  giftProductId?: string;

  @ApiPropertyOptional({ description: "赠品数量" })
  @IsOptional()
  @IsInt()
  @Min(1)
  giftCount?: number;

  @ApiPropertyOptional({ description: "开始时间" })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: "结束时间" })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: "适用商品ID列表（空=全场）" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @ApiPropertyOptional({ description: "状态", enum: ["DRAFT", "ACTIVE", "ENDED"] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "展示范围", enum: ["GLOBAL", "PAGE_ONLY"] })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({ description: "关联微页面ID" })
  @IsOptional()
  @IsString()
  scopePageId?: string;
}

export class UpdateFullReductionDto {
  @ApiPropertyOptional({ description: "活动名称" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "满金额" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold?: number;

  @ApiPropertyOptional({ description: "减金额" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reduction?: number;

  @ApiPropertyOptional({ description: "赠品商品ID" })
  @IsOptional()
  @IsString()
  giftProductId?: string;

  @ApiPropertyOptional({ description: "赠品数量" })
  @IsOptional()
  @IsInt()
  @Min(1)
  giftCount?: number;

  @ApiPropertyOptional({ description: "开始时间" })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: "结束时间" })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: "适用商品ID列表" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @ApiPropertyOptional({ description: "状态" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "展示范围", enum: ["GLOBAL", "PAGE_ONLY"] })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({ description: "关联微页面ID" })
  @IsOptional()
  @IsString()
  scopePageId?: string;
}
