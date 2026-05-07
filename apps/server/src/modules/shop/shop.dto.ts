import { IsString, IsOptional, IsInt, IsNumber, IsEnum, IsArray, Min, IsObject } from "class-validator";
import { Type } from "class-transformer";

export enum ProductStatus {
  PENDING = "PENDING",
  ON_SALE = "ON_SALE",
  OFF_SHELF = "OFF_SHELF",
}

export class CreateProductDto {
  @IsOptional() @IsString()
  circleId?: string;

  @IsString()
  title: string;

  @IsOptional() @IsString()
  categoryId?: string;

  @IsOptional() @IsString()
  intro?: string;

  @IsOptional() @IsString()
  detail?: string;

  @IsOptional() @IsArray()
  images?: string[];

  @IsOptional() @IsString()
  videoUrl?: string;

  @IsNumber()
  price: number;

  @IsOptional() @IsInt()
  stock?: number;

  @IsOptional() @IsArray()
  skus?: CreateSkuDto[];
}

export class UpdateProductDto {
  @IsOptional() @IsString()
  title?: string;

  @IsOptional() @IsString()
  intro?: string;

  @IsOptional() @IsString()
  detail?: string;

  @IsOptional() @IsArray()
  images?: string[];

  @IsOptional() @IsNumber()
  price?: number;

  @IsOptional() @IsInt()
  stock?: number;

  @IsOptional() @IsEnum(ProductStatus)
  status?: ProductStatus;
}

export class CreateSkuDto {
  @IsObject()
  specs: Record<string, string>;

  @IsNumber()
  price: number;

  @IsOptional() @IsInt()
  stock?: number;

  @IsOptional() @IsString()
  skuCode?: string;
}

export class CreateOrderDto {
  @IsString()
  type: string;

  @IsString()
  targetId: string;

  @IsOptional() @IsString()
  skuId?: string;

  @IsNumber()
  amount: number;

  @IsOptional() @IsString()
  couponId?: string;

  @IsOptional() @IsString()
  referrerId?: string;

  @IsOptional() @IsString()
  tempReferrerId?: string;
}

export class CreateCouponDto {
  @IsString()
  type: string;

  @IsNumber()
  value: number;

  @IsOptional() @IsNumber()
  minAmount?: number;

  @IsOptional() @IsString()
  scope?: string;

  @IsOptional() @IsString()
  scopeId?: string;

  @IsInt()
  totalCount: number;

  @IsString()
  validStart: string;

  @IsString()
  validEnd: string;
}

export class ProductListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt()
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  pageSize?: number;

  @IsOptional() @IsString()
  categoryId?: string;

  @IsOptional() @IsString()
  status?: string;
}

export class OrderListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt()
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  pageSize?: number;

  @IsOptional() @IsString()
  type?: string;

  @IsOptional() @IsString()
  status?: string;
}

// ── 优惠券 DTO ──

export class CreateCouponV2Dto {
  @IsString()
  type: string;

  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsNumber()
  value?: number;

  @IsOptional() @IsNumber()
  discountAmount?: number;

  @IsOptional() @IsNumber()
  discountRate?: number;

  @IsOptional() @IsNumber()
  minAmount?: number;

  @IsOptional() @IsString()
  scope?: string;

  @IsOptional() @IsString()
  scopeId?: string;

  @IsOptional() @IsInt()
  totalCount?: number;

  @IsOptional() @IsString()
  status?: string;

  @IsString()
  validStart: string;

  @IsString()
  validEnd: string;
}

// ── 商品评价 DTO ──

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  rating: number;

  @IsString()
  content: string;

  @IsOptional() @IsArray()
  images?: string[];
}

// ── 物流 DTO ──

export class UpdateLogisticsDto {
  @IsOptional() @IsString()
  company?: string;

  @IsOptional() @IsString()
  logisticsNo?: string;

  @IsOptional() @IsString()
  contactName?: string;

  @IsOptional() @IsString()
  contactPhone?: string;

  @IsOptional() @IsString()
  province?: string;

  @IsOptional() @IsString()
  city?: string;

  @IsOptional() @IsString()
  district?: string;

  @IsOptional() @IsString()
  address?: string;

  @IsOptional() @IsString()
  zipCode?: string;

  @IsOptional() @IsString()
  status?: string;

  @IsOptional() @IsString()
  remark?: string;
}
