import { IsString, IsOptional, IsInt, IsNumber, IsEnum, IsArray, Min, IsObject } from "class-validator";

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
  @IsOptional() @IsInt()
  page?: number;

  @IsOptional() @IsInt()
  pageSize?: number;

  @IsOptional() @IsString()
  categoryId?: string;

  @IsOptional() @IsString()
  status?: string;
}

export class OrderListQueryDto {
  @IsOptional() @IsInt()
  page?: number;

  @IsOptional() @IsInt()
  pageSize?: number;

  @IsOptional() @IsString()
  type?: string;

  @IsOptional() @IsString()
  status?: string;
}
