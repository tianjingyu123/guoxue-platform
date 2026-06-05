import { IsString, IsOptional, IsInt, IsNumber, IsEnum, IsArray, Min, Max, IsBoolean, IsObject, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum ProductStatus {
  PENDING = "PENDING",
  ON_SALE = "ON_SALE",
  OFF_SHELF = "OFF_SHELF",
}

export class CreateProductDto {
  @ApiPropertyOptional({ description: "所属圈子ID" })
  @IsOptional() @IsString()
  circleId?: string;

  @ApiProperty({ description: "商品标题" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ description: "分类ID" })
  @IsOptional() @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: "分类" })
  @IsOptional() @IsString()
  category?: string;

  @ApiPropertyOptional({ description: "商品简介" })
  @IsOptional() @IsString()
  intro?: string;

  @ApiPropertyOptional({ description: "商品详情" })
  @IsOptional() @IsString()
  detail?: string;

  @ApiPropertyOptional({ description: "商品图片列表" })
  @IsOptional() @IsArray()
  images?: string[];

  @ApiPropertyOptional({ description: "封面图" })
  @IsOptional() @IsString()
  cover?: string;

  @ApiPropertyOptional({ description: "视频地址" })
  @IsOptional() @IsString()
  videoUrl?: string;

  @ApiProperty({ description: "价格（元）" })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: "原价" })
  @IsOptional() @IsNumber()
  originalPrice?: number;

  @ApiPropertyOptional({ description: "库存数量" })
  @IsOptional() @IsInt()
  stock?: number;

  @ApiPropertyOptional({ description: "SKU列表", type: () => [CreateSkuDto] })
  @IsOptional() @IsArray()
  skus?: CreateSkuDto[];

  @ApiPropertyOptional({ description: "所属驿站ID" })
  @IsOptional() @IsString()
  stationId?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ description: "商品标题" })
  @IsOptional() @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "商品简介" })
  @IsOptional() @IsString()
  intro?: string;

  @ApiPropertyOptional({ description: "商品详情" })
  @IsOptional() @IsString()
  detail?: string;

  @ApiPropertyOptional({ description: "商品图片列表" })
  @IsOptional() @IsArray()
  images?: string[];

  @ApiPropertyOptional({ description: "价格（元）" })
  @IsOptional() @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: "库存数量" })
  @IsOptional() @IsInt()
  stock?: number;

  @ApiPropertyOptional({ description: "商品状态", enum: ProductStatus })
  @IsOptional() @IsEnum(ProductStatus)
  status?: ProductStatus;
}

export class CreateSkuDto {
  @ApiPropertyOptional({ description: "规格名称（如 颜色:红色）" })
  @IsOptional() @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "规格属性（如 {颜色: '红色', 尺寸: 'M'}）" })
  @IsOptional() @IsObject()
  specs?: Record<string, string>;

  @ApiProperty({ description: "SKU价格（元）" })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ description: "SKU库存" })
  @IsOptional() @IsInt()
  stock?: number;

  @ApiPropertyOptional({ description: "SKU编码" })
  @IsOptional() @IsString()
  skuCode?: string;
}

export class CreateOrderDto {
  @ApiProperty({ description: "订单类型（COURSE/PRODUCT/MEMBER/CIRCLE/BOT）" })
  @IsString()
  @MinLength(1)
  type: string;

  @ApiProperty({ description: "购买目标ID" })
  @IsString()
  @MinLength(1)
  targetId: string;

  @ApiPropertyOptional({ description: "SKU ID" })
  @IsOptional() @IsString()
  skuId?: string;

  @ApiProperty({ description: "购买数量", minimum: 1 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ description: "优惠券ID" })
  @IsOptional() @IsString()
  couponId?: string;

  @ApiPropertyOptional({ description: "推荐人ID" })
  @IsOptional() @IsString()
  referrerId?: string;

  @ApiPropertyOptional({ description: "临时推荐人ID" })
  @IsOptional() @IsString()
  tempReferrerId?: string;
}

export class CreateCouponDto {
  @ApiProperty({ description: "优惠券类型（FIXED/DISCOUNT）" })
  @IsString()
  @MinLength(1)
  type: string;

  @ApiProperty({ description: "优惠面值（固定减或折扣率如0.8）" })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiPropertyOptional({ description: "最低消费金额" })
  @IsOptional() @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: "适用范围" })
  @IsOptional() @IsString()
  scope?: string;

  @ApiPropertyOptional({ description: "适用范围ID" })
  @IsOptional() @IsString()
  scopeId?: string;

  @ApiProperty({ description: "发放总数" })
  @IsInt()
  totalCount: number;

  @ApiProperty({ description: "有效期起始（ISO datetime）" })
  @IsString()
  @MinLength(1)
  validStart: string;

  @ApiProperty({ description: "有效期截止（ISO datetime）" })
  @IsString()
  @MinLength(1)
  validEnd: string;
}

export class ProductListQueryDto {
  @ApiPropertyOptional({ description: "页码", default: 1, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20, minimum: 1, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ description: "分类ID" })
  @IsOptional() @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: "商品状态" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "驿站ID" })
  @IsOptional() @IsString()
  stationId?: string;

  @ApiPropertyOptional({ description: "商品名称关键词搜索" })
  @IsOptional() @IsString()
  keyword?: string;
}

export class JsapiPayDto {
  @ApiProperty({ description: "微信openid" })
  @IsString()
  @MinLength(1)
  openid: string;

  @ApiPropertyOptional({ description: "回调通知地址" })
  @IsOptional() @IsString()
  notifyUrl?: string;
}

export class NativePayDto {
  @ApiPropertyOptional({ description: "回调通知地址" })
  @IsOptional() @IsString()
  notifyUrl?: string;
}

export class RefundOrderDto {
  @ApiPropertyOptional({ description: "退款原因" })
  @IsOptional() @IsString()
  reason?: string;
}

export class OrderListQueryDto {
  @ApiPropertyOptional({ description: "页码", default: 1, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20, minimum: 1, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ description: "订单号" })
  @IsOptional() @IsString()
  orderNo?: string;

  @ApiPropertyOptional({ description: "订单类型" })
  @IsOptional() @IsString()
  type?: string;

  @ApiPropertyOptional({ description: "订单状态" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "用户ID（管理员可筛选）" })
  @IsOptional() @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: "开始日期（YYYY-MM-DD）" })
  @IsOptional() @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: "结束日期（YYYY-MM-DD）" })
  @IsOptional() @IsString()
  endDate?: string;
}

// ── 优惠券 DTO ──

export class CreateCouponV2Dto {
  @ApiProperty({ description: "优惠券类型" })
  @IsString()
  @MinLength(1)
  type: string;

  @ApiPropertyOptional({ description: "优惠券名称" })
  @IsOptional() @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "优惠面值" })
  @IsOptional() @IsNumber()
  @Min(0)
  value?: number;

  @ApiPropertyOptional({ description: "固定减免金额" })
  @IsOptional() @IsNumber()
  @Min(0.01)
  discountAmount?: number;

  @ApiPropertyOptional({ description: "折扣率（0-1）" })
  @IsOptional() @IsNumber()
  @Min(0)
  @Max(1)
  discountRate?: number;

  @ApiPropertyOptional({ description: "最低消费金额" })
  @IsOptional() @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: "适用范围" })
  @IsOptional() @IsString()
  scope?: string;

  @ApiPropertyOptional({ description: "适用范围ID" })
  @IsOptional() @IsString()
  scopeId?: string;

  @ApiPropertyOptional({ description: "发放总数" })
  @IsOptional() @IsInt()
  totalCount?: number;

  @ApiPropertyOptional({ description: "优惠券状态" })
  @IsOptional() @IsString()
  status?: string;

  @ApiProperty({ description: "有效期起始" })
  @IsString()
  @MinLength(1)
  validStart: string;

  @ApiProperty({ description: "有效期截止" })
  @IsString()
  @MinLength(1)
  validEnd: string;
}

// ── 商品评价 DTO ──

export class CreateReviewDto {
  @ApiProperty({ description: "评分（1-5）", minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ description: "评价内容" })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ description: "评价图片" })
  @IsOptional() @IsArray()
  images?: string[];
}

// ── 物流 DTO ──

// ── 运费模板 DTO ──

export class CreateFreightTemplateDto {
  @ApiProperty({ description: "模板名称" })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ description: "计费方式", enum: ["FREE", "FIXED", "CONDITIONAL"] })
  @IsOptional() @IsString()
  type?: string;

  @ApiProperty({ description: "默认运费" })
  @IsOptional() @IsNumber()
  defaultFee?: number;

  @ApiProperty({ description: "包邮条件JSON" })
  @IsOptional() @IsObject()
  conditionFree?: Record<string, unknown>;

  @ApiProperty({ description: "区域运费JSON" })
  @IsOptional() @IsObject()
  regions?: Record<string, unknown>;

  @ApiProperty({ description: "是否启用" })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class UpdateFreightTemplateDto {
  @ApiPropertyOptional({ description: "模板名称" })
  @IsOptional() @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "计费方式" })
  @IsOptional() @IsString()
  type?: string;

  @ApiPropertyOptional({ description: "默认运费" })
  @IsOptional() @IsNumber()
  defaultFee?: number;

  @ApiPropertyOptional({ description: "包邮条件JSON" })
  @IsOptional() @IsObject()
  conditionFree?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "区域运费JSON" })
  @IsOptional() @IsObject()
  regions?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "是否启用" })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

// ── 评价回复 DTO ──

export class ReplyReviewDto {
  @ApiProperty({ description: "回复内容" })
  @IsString()
  @MinLength(1)
  reply: string;
}

// ── 物流 DTO ──

export class UpdateLogisticsDto {
  @ApiPropertyOptional({ description: "物流公司" })
  @IsOptional() @IsString()
  company?: string;

  @ApiPropertyOptional({ description: "物流单号" })
  @IsOptional() @IsString()
  logisticsNo?: string;

  @ApiPropertyOptional({ description: "联系人姓名" })
  @IsOptional() @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: "联系电话" })
  @IsOptional() @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: "省份" })
  @IsOptional() @IsString()
  province?: string;

  @ApiPropertyOptional({ description: "城市" })
  @IsOptional() @IsString()
  city?: string;

  @ApiPropertyOptional({ description: "区县" })
  @IsOptional() @IsString()
  district?: string;

  @ApiPropertyOptional({ description: "详细地址" })
  @IsOptional() @IsString()
  address?: string;

  @ApiPropertyOptional({ description: "邮编" })
  @IsOptional() @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ description: "物流状态" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional() @IsString()
  remark?: string;
}

// ── 购物车 / 支付 / 退款补充 DTO ──

export class AddToCartDto {
  @ApiProperty({ description: "商品ID" })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: "SKU ID" })
  @IsOptional() @IsString()
  skuId?: string;

  @ApiPropertyOptional({ description: "数量", default: 1 })
  @IsOptional() @IsInt() @Min(1)
  @Type(() => Number)
  quantity?: number;
}

export class AdminPayOrderDto {
  @ApiProperty({ description: "实际支付流水号" })
  @IsString()
  payTransactionId: string;
}

export class AlipayRefundDto {
  @ApiProperty({ description: "商户订单号" })
  @IsString()
  outTradeNo: string;

  @ApiProperty({ description: "退款金额（元）" })
  @IsNumber()
  @Type(() => Number)
  refundAmount: number;

  @ApiProperty({ description: "退款单号" })
  @IsString()
  outRefundNo: string;

  @ApiPropertyOptional({ description: "退款原因" })
  @IsOptional() @IsString()
  reason?: string;
}
