import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString, IsOptional, IsArray, IsBoolean, IsNumber, IsIn, Min, Max, MaxLength, Matches, MinLength, IsDateString, ValidateNested,
  ArrayMinSize, ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";

// ─── 操作员管理（多操作员·官方旗舰店） ───

export class AddMerchantMemberDto {
  @ApiProperty({ description: "操作员手机号（须已注册平台）" })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: "手机号格式不正确" })
  phone: string;
}

export class MerchantQualificationFileDto {
  @ApiProperty({ description: "资质类型，如 FOOD_LICENSE、BRAND_AUTH、OTHER" })
  @IsString()
  @MinLength(1)
  type: string;

  @ApiProperty({ description: "资质名称" })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title: string;

  @ApiProperty({ description: "资质文件 URL" })
  @IsString()
  @MinLength(1)
  url: string;

  @ApiPropertyOptional({ description: "资质有效期截止日" })
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

// ─── 入驻申请 ───

export class CreateMerchantApplyDto {
  @ApiProperty({ description: "店铺名称" })
  @IsString()
  @MinLength(1)
  shopName: string;

  @ApiPropertyOptional({ description: "店铺Logo URL" })
  @IsOptional() @IsString()
  shopLogo?: string;

  @ApiPropertyOptional({ description: "店铺简介" })
  @IsOptional() @IsString() @MaxLength(500)
  shopIntro?: string;

  @ApiProperty({ description: "联系人姓名" })
  @IsString()
  @MinLength(1)
  contactName: string;

  @ApiProperty({ description: "联系电话" })
  @IsString()
  @MinLength(1)
  @Matches(/^1[3-9]\d{9}$/)
  contactPhone: string;

  @ApiProperty({ description: "身份证号" })
  @IsString()
  @MinLength(1)
  @Matches(/^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/)
  idCardNumber: string;

  @ApiPropertyOptional({ description: "身份证正面照URL" })
  @IsOptional() @IsString()
  idCardFront?: string;

  @ApiPropertyOptional({ description: "身份证反面照URL" })
  @IsOptional() @IsString()
  idCardBack?: string;

  /**
   * 营业执照 —— 新商家入驻必填（2026-07-14 资金架构拍板）。
   *
   * 不是形式要求，是合规架构的物理前提：
   *   无执照 → 办不下商户号 → 无法进件 → 无法自己收款
   *          → 只能平台代收再结算给商家 = 二清（无证清算·违法）。
   * 商家必须自收款：钱直接进商家的渠道账户，平台通过分账收技术服务费。
   * 开票关系随之厘清 —— 商家给用户开商品发票，平台给商家开服务费发票；
   * 平台不需要「结算给商家」，因为钱压根没到过平台手上。
   *
   * 注：DB 列仍可空（存量商家兼容）。硬门槛在进件环节：
   * PayeeAccount.submitToChannel 无执照直接拒绝提交，进不了件就自收不了款。
   */
  @ApiProperty({ description: "营业执照URL（必填·无执照无法进件收款）" })
  @IsString()
  @MinLength(1, { message: "营业执照为必填项：无营业执照无法开通商户号，也就无法自主收款" })
  businessLicense: string;

  @ApiPropertyOptional({ description: "品牌授权书URL" })
  @IsOptional() @IsString()
  brandAuth?: string;

  @ApiPropertyOptional({ description: "经营类目ID列表" })
  @IsOptional() @IsArray() @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: "主体类型", enum: ["ENTERPRISE", "INDIVIDUAL"] })
  @IsOptional() @IsIn(["ENTERPRISE", "INDIVIDUAL"])
  merchantType?: string;

  @ApiProperty({ description: "统一社会信用代码" })
  @IsString()
  @Matches(/^[0-9A-Z]{18}$/, { message: "统一社会信用代码应为 18 位大写字母或数字" })
  unifiedSocialCreditCode: string;

  @ApiProperty({ description: "营业执照注册地址" })
  @IsString() @MinLength(2) @MaxLength(200)
  registeredAddress: string;

  @ApiProperty({ description: "法定代表人或经营者姓名" })
  @IsString() @MinLength(2) @MaxLength(50)
  legalRepresentative: string;

  @ApiPropertyOptional({ description: "营业执照有效期起始日" })
  @IsOptional() @IsDateString()
  licenseValidFrom?: string;

  @ApiPropertyOptional({ description: "营业执照有效期截止日" })
  @IsOptional() @IsDateString()
  licenseValidUntil?: string;

  @ApiPropertyOptional({ description: "营业执照是否长期有效" })
  @IsOptional() @IsBoolean()
  licenseLongTerm?: boolean;

  @ApiPropertyOptional({ description: "行业许可、品牌授权等补充资质", type: [MerchantQualificationFileDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MerchantQualificationFileDto)
  qualificationFiles?: MerchantQualificationFileDto[];

  @ApiProperty({ description: "同意敏感信息处理及资质核验授权" })
  @IsBoolean()
  privacyConsent: boolean;

  @ApiProperty({ description: "确认提交材料真实、完整、持续有效" })
  @IsBoolean()
  complianceDeclaration: boolean;
}

export class UpdateMerchantApplyDto {
  @ApiPropertyOptional({ description: "店铺名称" })
  @IsOptional() @IsString()
  shopName?: string;

  @ApiPropertyOptional({ description: "店铺Logo URL" })
  @IsOptional() @IsString()
  shopLogo?: string;

  @ApiPropertyOptional({ description: "店铺简介" })
  @IsOptional() @IsString() @MaxLength(500)
  shopIntro?: string;

  @ApiPropertyOptional({ description: "联系人姓名" })
  @IsOptional() @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: "联系电话" })
  @IsOptional() @IsString() @Matches(/^1[3-9]\d{9}$/)
  contactPhone?: string;

  @ApiPropertyOptional({ description: "身份证号" })
  @IsOptional() @IsString()
  idCardNumber?: string;

  @ApiPropertyOptional({ description: "身份证正面照URL" })
  @IsOptional() @IsString()
  idCardFront?: string;

  @ApiPropertyOptional({ description: "身份证反面照URL" })
  @IsOptional() @IsString()
  idCardBack?: string;

  @ApiPropertyOptional({ description: "营业执照URL" })
  @IsOptional() @IsString()
  businessLicense?: string;

  @ApiPropertyOptional({ description: "品牌授权书URL" })
  @IsOptional() @IsString()
  brandAuth?: string;

  @ApiPropertyOptional({ description: "经营类目ID列表" })
  @IsOptional() @IsArray() @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: "主体类型", enum: ["ENTERPRISE", "INDIVIDUAL"] })
  @IsOptional() @IsIn(["ENTERPRISE", "INDIVIDUAL"])
  merchantType?: string;

  @ApiPropertyOptional({ description: "统一社会信用代码" })
  @IsOptional() @IsString()
  @Matches(/^[0-9A-Z]{18}$/, { message: "统一社会信用代码应为 18 位大写字母或数字" })
  unifiedSocialCreditCode?: string;

  @ApiPropertyOptional({ description: "营业执照注册地址" })
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200)
  registeredAddress?: string;

  @ApiPropertyOptional({ description: "法定代表人或经营者姓名" })
  @IsOptional() @IsString() @MinLength(2) @MaxLength(50)
  legalRepresentative?: string;

  @ApiPropertyOptional({ description: "营业执照有效期起始日" })
  @IsOptional() @IsDateString()
  licenseValidFrom?: string;

  @ApiPropertyOptional({ description: "营业执照有效期截止日" })
  @IsOptional() @IsDateString()
  licenseValidUntil?: string;

  @ApiPropertyOptional({ description: "营业执照是否长期有效" })
  @IsOptional() @IsBoolean()
  licenseLongTerm?: boolean;

  @ApiPropertyOptional({ description: "行业许可、品牌授权等补充资质", type: [MerchantQualificationFileDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MerchantQualificationFileDto)
  qualificationFiles?: MerchantQualificationFileDto[];

  @ApiPropertyOptional({ description: "同意敏感信息处理及资质核验授权" })
  @IsOptional() @IsBoolean()
  privacyConsent?: boolean;

  @ApiPropertyOptional({ description: "确认提交材料真实、完整、持续有效" })
  @IsOptional() @IsBoolean()
  complianceDeclaration?: boolean;
}

// ─── 保证金 ───

export class PayDepositDto {
  @ApiProperty({ description: "支付方式", enum: ["WECHAT", "ALIPAY"] })
  @IsString() @IsIn(["WECHAT", "ALIPAY"])
  payMethod: string;

  @ApiPropertyOptional({ description: "微信openid（JSAPI支付必传）" })
  @IsOptional() @IsString()
  openid?: string;
}

// ─── 签署协议 ───

export class SignAgreementDto {
  @ApiProperty({ description: "协议版本号" })
  @IsString()
  @MinLength(1)
  version: string;

  @ApiProperty({ description: "同意协议标识", default: true })
  @IsBoolean()
  agreed: boolean;
}

// ─── 管理员审核 ───

export class ApproveMerchantDto {
  @ApiPropertyOptional({ description: "兼容字段：当前仅允许 0，正金额将被拒绝" })
  @IsOptional() @IsNumber() @Min(0)
  @Type(() => Number)
  depositAmount?: number;

  @ApiPropertyOptional({ description: "自定义分佣比例（0~1）" })
  @IsOptional() @IsNumber() @Min(0) @Max(1)
  @Type(() => Number)
  commissionRate?: number;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional() @IsString()
  remark?: string;

  @ApiPropertyOptional({ description: "审核后的风险等级", enum: ["LOW", "MEDIUM", "HIGH"] })
  @IsOptional() @IsIn(["LOW", "MEDIUM", "HIGH"])
  riskLevel?: string;

  @ApiPropertyOptional({ description: "风险标签" })
  @IsOptional() @IsArray() @IsString({ each: true })
  riskFlags?: string[];
}

export class RejectMerchantDto {
  @ApiProperty({ description: "驳回原因" })
  @IsString()
  @MinLength(1)
  reason: string;
}

// ─── 商家状态管理 ───

export class UpdateMerchantStatusDto {
  @ApiProperty({ description: "目标状态", enum: ["ACTIVE", "SUSPENDED", "CLOSED"] })
  @IsString() @IsIn(["ACTIVE", "SUSPENDED", "CLOSED"])
  status: string;

  @ApiPropertyOptional({ description: "原因说明" })
  @IsOptional() @IsString()
  reason?: string;
}

// ─── 违规管理 ───

export class CreateViolationDto {
  @ApiProperty({ description: "违规程度", enum: ["MINOR", "MODERATE", "SEVERE"] })
  @IsString() @IsIn(["MINOR", "MODERATE", "SEVERE"])
  type: string;

  @ApiProperty({ description: "违规标题" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ description: "违规描述" })
  @IsString()
  @MinLength(1)
  description: string;

  @ApiPropertyOptional({ description: "罚款金额" })
  @IsOptional() @IsNumber() @Min(0)
  @Type(() => Number)
  penalty?: number;

  @ApiPropertyOptional({ description: "证据材料" })
  @IsOptional()
  evidence?: any;

  @ApiPropertyOptional({ description: "内部备注" })
  @IsOptional() @IsString()
  remark?: string;
}

export class HandleViolationDto {
  @ApiProperty({ description: "处理结果", enum: ["CONFIRMED", "DISMISSED"] })
  @IsString() @IsIn(["CONFIRMED", "DISMISSED"])
  status: string;

  @ApiPropertyOptional({ description: "处理说明" })
  @IsOptional() @IsString()
  note?: string;
}

export class AppealViolationDto {
  @ApiProperty({ description: "申诉内容" })
  @IsString()
  @MinLength(1)
  appeal: string;
}

// ─── 保证金管理 ───

export class AdjustDepositDto {
  @ApiProperty({ description: "新保证金金额" })
  @IsNumber() @Min(0)
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ description: "调整原因" })
  @IsOptional() @IsString()
  reason?: string;
}

export class RefundDepositDto {
  @ApiPropertyOptional({ description: "退还金额（留空则全额退还）" })
  @IsOptional() @IsNumber() @Min(0)
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional() @IsString()
  remark?: string;
}

// ─── 分佣设置 ───

export class SetCommissionRateDto {
  @ApiProperty({ description: "商家分佣比例（0~1）" })
  @IsNumber() @Min(0) @Max(1)
  @Type(() => Number)
  rate: number;
}

// ─── 分页基类 ───

export class PaginationDto {
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @IsNumber() @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional() @IsNumber() @Min(1) @Max(100)
  @Type(() => Number)
  pageSize?: number;
}

// ─── 结算 ───

export class GenerateSettlementDto {
  @ApiProperty({ description: "结算周期起始" })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ description: "结算周期截止" })
  @IsDateString()
  periodEnd: string;
}

export class SettlementListQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "结算状态：PENDING/PAID/CANCELLED" })
  @IsOptional() @IsString()
  status?: string;
}

export class PaySettlementDto {
  @ApiProperty({ description: "结算金额" })
  @IsNumber() @Min(0)
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional() @IsString()
  remark?: string;
}

// ─── 处罚（履-P3） ───

export const PUNISHMENT_TYPE_VALUES = ["WARNING", "PRODUCT_DOWN", "SHOP_SUSPEND", "CLEAR_OUT"] as const;

export class CreatePunishmentDto {
  @ApiProperty({ description: "商家ID" })
  @IsString() @MinLength(1)
  merchantId: string;

  @ApiProperty({ description: "处罚类型", enum: PUNISHMENT_TYPE_VALUES })
  @IsIn(PUNISHMENT_TYPE_VALUES as unknown as string[])
  type: (typeof PUNISHMENT_TYPE_VALUES)[number];

  @ApiProperty({ description: "处罚原因（幂等键成分：同商家+同类型+同原因且未撤销不重复罚）" })
  @IsString() @MinLength(2) @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({ description: "证据材料（PRODUCT_DOWN 必须含 productIds: string[]）" })
  @IsOptional()
  evidence?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "处罚到期时间（如暂停经营 7-30 天·到期恢复当前走人工撤销）" })
  @IsOptional() @IsDateString()
  expiresAt?: string;
}

export class PunishmentListQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "按商家筛选" })
  @IsOptional() @IsString()
  merchantId?: string;

  @ApiPropertyOptional({ description: "处罚状态：ACTIVE/REVOKED" })
  @IsOptional() @IsIn(["ACTIVE", "REVOKED"])
  status?: string;

  @ApiPropertyOptional({ description: "处罚类型", enum: PUNISHMENT_TYPE_VALUES })
  @IsOptional() @IsIn(PUNISHMENT_TYPE_VALUES as unknown as string[])
  type?: string;
}

export class RevokePunishmentDto {
  @ApiPropertyOptional({ description: "撤销原因" })
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}

// ─── 协议管理 ───

export class CreateAgreementDto {
  @ApiProperty({ description: "版本号" })
  @IsString()
  @MinLength(1)
  version: string;

  @ApiProperty({ description: "协议标题" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ description: "协议内容（HTML/Markdown）" })
  @IsString()
  @MinLength(1)
  content: string;
}

export class UpdateAgreementDto {
  @ApiPropertyOptional({ description: "协议标题" })
  @IsOptional() @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "协议内容（HTML/Markdown）" })
  @IsOptional() @IsString()
  content?: string;
}

// ─── 商家后台 ───

export class UpdateMerchantProfileDto {
  @ApiPropertyOptional({ description: "店铺名称" })
  @IsOptional() @IsString()
  shopName?: string;

  @ApiPropertyOptional({ description: "店铺Logo URL" })
  @IsOptional() @IsString()
  shopLogo?: string;

  @ApiPropertyOptional({ description: "店铺简介" })
  @IsOptional() @IsString() @MaxLength(500)
  shopIntro?: string;
}

export class MerchantListQueryDto {
  @ApiPropertyOptional({ description: "审核状态" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "商家名称搜索" })
  @IsOptional() @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @IsNumber() @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional() @IsNumber() @Min(1) @Max(100)
  @Type(() => Number)
  pageSize?: number;
}

export class ProductQueryDto {
  @ApiPropertyOptional({ description: "商品状态" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @IsNumber() @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional() @IsNumber() @Min(1) @Max(100)
  @Type(() => Number)
  pageSize?: number;
}

export class MerchantOrderQueryDto {
  @ApiPropertyOptional({ description: "订单状态" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "客户ID（商家客户档案下钻）" })
  @IsOptional() @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: "下单时间起点（ISO 日期时间，含）" })
  @IsOptional() @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "下单时间终点（ISO 日期时间，不含）" })
  @IsOptional() @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @IsNumber() @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional() @IsNumber() @Min(1) @Max(100)
  @Type(() => Number)
  pageSize?: number;
}

export class ShipOrderDto {
  @ApiProperty({ description: "物流公司" })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  company: string;

  @ApiProperty({ description: "快递单号" })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  trackingNo: string;
}

export class BatchShipOrderItemDto extends ShipOrderDto {
  @ApiProperty({ description: "订单ID" })
  @IsString()
  @MinLength(1)
  orderId: string;
}

export class BatchShipOrdersDto {
  @ApiProperty({ type: [BatchShipOrderItemDto], description: "批量发货明细，最多50单" })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BatchShipOrderItemDto)
  items: BatchShipOrderItemDto[];
}

export class RejectRefundDto {
  @ApiProperty({ description: "拒绝原因" })
  @IsString()
  @MinLength(1)
  reason: string;
}

export class ReviewQueryDto {
  @ApiPropertyOptional({ description: "评分筛选" })
  @IsOptional() @IsNumber() @Min(1) @Max(5)
  @Type(() => Number)
  rating?: number;

  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @IsNumber() @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional() @IsNumber() @Min(1) @Max(100)
  @Type(() => Number)
  pageSize?: number;
}

export class ReplyReviewDto {
  @ApiProperty({ description: "回复内容" })
  @IsString()
  @MinLength(1)
  reply: string;
}

export class ProcessAfterSaleDto {
  @ApiProperty({ description: "处理动作", enum: ["approve", "reject", "complete"] })
  @IsString() @IsIn(["approve", "reject", "complete"])
  action: string;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional() @IsString()
  remark?: string;
}

export class MerchantProductDto {
  @ApiProperty({ description: "商品标题" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ description: "商品简介" })
  @IsOptional() @IsString()
  intro?: string;

  @ApiProperty({ description: "商品详情（HTML）" })
  @IsString()
  @MinLength(1)
  detail: string;

  @ApiPropertyOptional({ description: "商品图片" })
  @IsOptional() @IsArray() @IsString({ each: true })
  images?: string[];

  @ApiProperty({ description: "商品价格" })
  @IsNumber() @Min(0)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ description: "原价（划线价·展示用，应大于售价）" })
  @IsOptional() @IsNumber() @Min(0)
  @Type(() => Number)
  originalPrice?: number;

  @ApiProperty({ description: "库存数量" })
  @IsNumber() @Min(0)
  @Type(() => Number)
  stock: number;

  @ApiPropertyOptional({ description: "商品分类ID" })
  @IsOptional() @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: "商品标签" })
  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];
}

/** 商家后台 SKU（店铺身份·操作员经 merchant.guard 归一到 owner） */
export class MerchantSkuDto {
  @ApiPropertyOptional({ description: "规格名（如 颜色:红·与 specs 二选一）" })
  @IsOptional() @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "规格键值对（如 {颜色:'红'}）" })
  @IsOptional()
  specs?: Record<string, string>;

  @ApiProperty({ description: "SKU 价格" })
  @IsNumber() @Min(0)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ description: "库存" })
  @IsOptional() @IsNumber() @Min(0)
  @Type(() => Number)
  stock?: number;
}

// ─── 商家进销存 ───

export class InventoryListQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "商品标题搜索" })
  @IsOptional() @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: "仅显示低库存" })
  @IsOptional() @Type(() => Boolean) @IsBoolean()
  lowStock?: boolean;
}

export class InventoryMovementQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "商品ID" })
  @IsOptional() @IsString()
  productId?: string;

  @ApiPropertyOptional({ description: "流水类型" })
  @IsOptional() @IsString()
  type?: string;
}

export class InventoryAdjustmentDto {
  @ApiProperty({ description: "幂等请求ID" })
  @IsString() @MinLength(8) @MaxLength(100)
  requestId: string;
  @ApiProperty({ description: "商品ID" })
  @IsString()
  productId: string;
  @ApiPropertyOptional({ description: "SKU ID；多规格商品必填" })
  @IsOptional() @IsString()
  skuId?: string;
  @ApiProperty({ description: "调整方式", enum: ["INCREASE", "DECREASE", "SET"] })
  @IsString() @IsIn(["INCREASE", "DECREASE", "SET"])
  mode: "INCREASE" | "DECREASE" | "SET";
  @ApiProperty({ description: "数量；SET 时为仓库实物总数（含待付款、待发货订单占用）" })
  @IsNumber() @Min(0) @Type(() => Number)
  quantity: number;
  @ApiProperty({ description: "调整原因" })
  @IsString() @MinLength(2) @MaxLength(200)
  reason: string;
}

export class InventoryAlertSettingDto {
  @ApiProperty({ description: "商品ID" })
  @IsString()
  productId: string;
  @ApiPropertyOptional({ description: "SKU ID" })
  @IsOptional() @IsString()
  skuId?: string;
  @ApiProperty({ description: "低库存阈值" })
  @IsNumber() @Min(0) @Max(1000000) @Type(() => Number)
  lowStockThreshold: number;
  @ApiPropertyOptional({ description: "是否启用", default: true })
  @IsOptional() @IsBoolean()
  enabled?: boolean;
}

export class PurchaseOrderItemDto {
  @ApiProperty({ description: "商品ID" })
  @IsString()
  productId: string;
  @ApiPropertyOptional({ description: "SKU ID" })
  @IsOptional() @IsString()
  skuId?: string;
  @ApiProperty({ description: "采购数量" })
  @IsNumber() @Min(1) @Type(() => Number)
  quantity: number;
  @ApiProperty({ description: "采购单价" })
  @IsNumber() @Min(0) @Type(() => Number)
  unitCost: number;
}

export class SupplierQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "供应商名称或联系人搜索" })
  @IsOptional() @IsString() @MaxLength(100)
  keyword?: string;

  @ApiPropertyOptional({ description: "档案状态", enum: ["ACTIVE", "INACTIVE"] })
  @IsOptional() @IsString() @IsIn(["ACTIVE", "INACTIVE"])
  status?: "ACTIVE" | "INACTIVE";
}

export class UpsertSupplierDto {
  @ApiProperty({ description: "供应商名称" })
  @IsString() @MinLength(1) @MaxLength(100)
  name: string;
  @ApiPropertyOptional({ description: "联系人" })
  @IsOptional() @IsString() @MaxLength(50)
  contactName?: string;
  @ApiPropertyOptional({ description: "联系电话" })
  @IsOptional() @IsString() @MaxLength(30)
  contactPhone?: string;
  @ApiPropertyOptional({ description: "发货或经营地址" })
  @IsOptional() @IsString() @MaxLength(200)
  address?: string;
  @ApiPropertyOptional({ description: "结算约定" })
  @IsOptional() @IsString() @MaxLength(100)
  settlementTerms?: string;
  @ApiPropertyOptional({ description: "常规交付周期（天）" })
  @IsOptional() @IsNumber() @Min(0) @Max(365) @Type(() => Number)
  leadTimeDays?: number;
  @ApiPropertyOptional({ description: "内部备注" })
  @IsOptional() @IsString() @MaxLength(500)
  remark?: string;
}

export class SupplierStatusDto {
  @ApiProperty({ description: "档案状态", enum: ["ACTIVE", "INACTIVE"] })
  @IsString() @IsIn(["ACTIVE", "INACTIVE"])
  status: "ACTIVE" | "INACTIVE";
}

export class CreatePurchaseOrderDto {
  @ApiPropertyOptional({ description: "供应商档案ID；传入后会校验归属并保存采购快照" })
  @IsOptional() @IsString()
  supplierId?: string;
  @ApiProperty({ description: "供应商名称" })
  @IsString() @MinLength(1) @MaxLength(100)
  supplierName: string;
  @ApiPropertyOptional({ description: "联系人" })
  @IsOptional() @IsString() @MaxLength(50)
  contactName?: string;
  @ApiPropertyOptional({ description: "联系电话" })
  @IsOptional() @IsString() @MaxLength(30)
  contactPhone?: string;
  @ApiPropertyOptional({ description: "预计到货时间" })
  @IsOptional() @IsDateString()
  expectedAt?: string;
  @ApiPropertyOptional({ description: "备注" })
  @IsOptional() @IsString() @MaxLength(500)
  remark?: string;
  @ApiProperty({ description: "采购明细", type: [PurchaseOrderItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}

export class ReceivePurchaseItemDto {
  @ApiProperty({ description: "采购明细ID" })
  @IsString()
  itemId: string;
  @ApiProperty({ description: "本次验收合格并入可售库存的数量" })
  @IsNumber() @Min(0) @Type(() => Number)
  quantity: number;
  @ApiPropertyOptional({ description: "本次验收不合格、拒收入库的数量" })
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  rejectedQuantity?: number;
  @ApiPropertyOptional({ description: "不合格原因；存在拒收数量时必填" })
  @IsOptional() @IsString() @MaxLength(200)
  rejectionReason?: string;
}

export class ReceivePurchaseOrderDto {
  @ApiProperty({ description: "幂等请求ID" })
  @IsString() @MinLength(8) @MaxLength(100)
  requestId: string;
  @ApiProperty({ description: "本次到货明细", type: [ReceivePurchaseItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReceivePurchaseItemDto)
  items: ReceivePurchaseItemDto[];
  @ApiPropertyOptional({ description: "本次收货仓库或库位" })
  @IsOptional() @IsString() @MaxLength(80)
  warehouseName?: string;
  @ApiPropertyOptional({ description: "本批验收备注" })
  @IsOptional() @IsString() @MaxLength(300)
  remark?: string;
}

export class PurchaseOrderQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "采购单状态" })
  @IsOptional() @IsString()
  status?: string;
}

export class ReturnInspectionDto {
  @ApiProperty({ description: "幂等请求ID" })
  @IsString() @MinLength(8) @MaxLength(100)
  requestId: string;
  @ApiProperty({ description: "退货验收是否合格；不合格不入库" })
  @IsBoolean()
  accepted: boolean;
  @ApiPropertyOptional({ description: "合格入库数量；默认订单全部数量" })
  @IsOptional() @IsNumber() @Min(1) @Type(() => Number)
  quantity?: number;
  @ApiPropertyOptional({ description: "验收备注" })
  @IsOptional() @IsString() @MaxLength(300)
  remark?: string;
}
