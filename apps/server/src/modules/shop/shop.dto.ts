import { IsString, IsDateString, IsOptional, IsInt, IsNumber, IsEnum, IsArray, ArrayNotEmpty, ArrayMaxSize, Min, Max, IsBoolean, IsObject, IsIn, MinLength, MaxLength, IsPositive } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum ProductStatus {
  PENDING = "PENDING",
  ON_SALE = "ON_SALE",
  OFF_SHELF = "OFF_SHELF",
}

/**
 * 场景标签白名单（供-P1·按"客户人生场景"组织的销售视角标签，可多挂）
 * 设计真源：docs/design/商城供应链重构-B2B2C设计-20260704.md §三
 */
export const PRODUCT_SCENE_TAGS = [
  "乔迁新居", "合婚嫁娶", "开业大吉", "本命年", "学业考试", "长辈寿诞", "节气时令",
] as const;
export type ProductSceneTag = (typeof PRODUCT_SCENE_TAGS)[number];

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

  @ApiPropertyOptional({ description: "场景标签（白名单七值·可多挂）", enum: PRODUCT_SCENE_TAGS, isArray: true })
  @IsOptional() @IsArray() @ArrayMaxSize(7) @IsIn(PRODUCT_SCENE_TAGS, { each: true })
  sceneTags?: ProductSceneTag[];
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

  @ApiPropertyOptional({ description: "场景标签（白名单七值·可多挂·打标即生效）", enum: PRODUCT_SCENE_TAGS, isArray: true })
  @IsOptional() @IsArray() @ArrayMaxSize(7) @IsIn(PRODUCT_SCENE_TAGS, { each: true })
  sceneTags?: ProductSceneTag[];
}

/** 商品站长推广佣金率设置（佣-V2-P1·仅平台运营可设·商家不可自设）。不传 commissionRate = 清除逐品配置回落类目默认 */
export class SetCommissionRateDto {
  @ApiPropertyOptional({ description: "站长推广佣金率（0-0.99 小数·如 0.15=15%）。不传=清除逐品配置，回落类目默认 rateA" })
  @IsOptional() @IsNumber() @Min(0) @Max(0.99)
  commissionRate?: number;
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

  @ApiPropertyOptional({ description: "收货地址ID（实物订单必填，虚拟订单可不传）" })
  @IsOptional() @IsString()
  addressId?: string;

  @ApiPropertyOptional({ description: "推荐人ID" })
  @IsOptional() @IsString()
  referrerId?: string;

  @ApiPropertyOptional({ description: "临时推荐人ID" })
  @IsOptional() @IsString()
  tempReferrerId?: string;

  @ApiPropertyOptional({ description: "内容来源类型（佣-V2-P3）：LIVE 直播间 / ARTICLE 文章 / VIDEO 短视频", enum: ["LIVE", "ARTICLE", "VIDEO"] })
  @IsOptional() @IsString() @IsIn(["LIVE", "ARTICLE", "VIDEO"])
  sourceContentType?: string;

  @ApiPropertyOptional({ description: "内容来源ID（LiveRoom.id / Article.id / Video.id·与 sourceContentType 成对传入）" })
  @IsOptional() @IsString() @MaxLength(64)
  sourceContentId?: string;
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

  @ApiPropertyOptional({ description: "圈子ID（圈内选品展示）" })
  @IsOptional() @IsString()
  circleId?: string;

  @ApiPropertyOptional({ description: "商品名称关键词搜索" })
  @IsOptional() @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: "一级品类(categoryLevel1)" })
  @IsOptional() @IsString()
  categoryLevel1?: string;

  @ApiPropertyOptional({ description: "最低价" })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  priceMin?: number;

  @ApiPropertyOptional({ description: "最高价" })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  priceMax?: number;

  @ApiPropertyOptional({ description: "排序: default/sales/price_asc/price_desc/newest" })
  @IsOptional() @IsString()
  sort?: string;
}

/** 品控巡检操作类型 */
export enum ModerateAction {
  TAKEDOWN = "takedown", // 违规下架
  RESTORE = "restore",   // 恢复上架
  WARN = "warn",         // 警告（不改状态，仅记录）
}

export class ModerateProductDto {
  @ApiProperty({ description: "操作类型：takedown=违规下架 / restore=恢复上架 / warn=警告", enum: ModerateAction })
  @IsEnum(ModerateAction)
  action: ModerateAction;

  @ApiPropertyOptional({ description: "违规原因 / 警告说明（下架建议必填）" })
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}

export class JsapiPayDto {
  @ApiPropertyOptional({ description: "微信openid（可选；不传则后端从用户已绑定的微信授权记录中查取）" })
  @IsOptional() @IsString()
  openid?: string;

  @ApiPropertyOptional({ description: "回调通知地址" })
  @IsOptional() @IsString()
  notifyUrl?: string;
}

export class RechargeJsapiDto {
  @ApiProperty({ description: "充值国学币数量" })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(1000000)
  amountCoin: number;
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
  @IsOptional() @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "结束日期（YYYY-MM-DD）" })
  @IsOptional() @IsDateString()
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
  @IsPositive()
  @Type(() => Number)
  refundAmount: number;

  @ApiProperty({ description: "退款单号" })
  @IsString()
  outRefundNo: string;

  @ApiPropertyOptional({ description: "退款原因" })
  @IsOptional() @IsString()
  reason?: string;
}

// ── 银联退款 ──

export class UnionpayRefundDto {
  @ApiProperty({ description: "商户订单号" })
  @IsString()
  outTradeNo: string;

  @ApiProperty({ description: "商户退款单号" })
  @IsString()
  outRefundNo: string;

  @ApiProperty({ description: "退款金额(分)" })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ description: "原交易查询ID" })
  @IsOptional()
  @IsString()
  origQryId?: string;
}

// ── 售后 ──

export class ApplyAfterSaleDto {
  @ApiProperty({ description: "售后类型" })
  @IsString()
  type: string;

  @ApiProperty({ description: "售后原因" })
  @IsString()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({ description: "退款金额" })
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  amount?: number;
}

// ── 商品分类 DTO ──

export class CreateCategoryDto {
  @ApiProperty({ description: "分类名称" })
  @IsString() @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: "父分类ID" })
  @IsOptional() @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: "层级" })
  @IsOptional() @IsInt()
  level?: number;

  @ApiPropertyOptional({ description: "排序" })
  @IsOptional() @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: "图标" })
  @IsOptional() @IsString()
  icon?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: "分类名称" })
  @IsOptional() @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "排序" })
  @IsOptional() @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: "图标" })
  @IsOptional() @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: "状态" })
  @IsOptional() @IsString()
  status?: string;
}

/** 批量发放优惠券（券体系统一后的唯一批量发放口） */
export class BatchGrantShopCouponDto {
  @ApiProperty({ description: "目标用户 ID 列表（去重后每人一张，已持有未用者跳过）", type: [String] })
  @IsArray()
  @ArrayNotEmpty({ message: "用户列表不能为空" })
  @ArrayMaxSize(500, { message: "单次最多发放 500 人" })
  @IsString({ each: true })
  userIds: string[];
}
