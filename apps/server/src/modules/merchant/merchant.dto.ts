import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString, IsOptional, IsArray, IsBoolean, IsNumber, IsIn, Min, Max, MaxLength, Matches, MinLength, IsDateString,
} from "class-validator";
import { Type } from "class-transformer";

// ─── 操作员管理（多操作员·官方旗舰店） ───

export class AddMerchantMemberDto {
  @ApiProperty({ description: "操作员手机号（须已注册平台）" })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: "手机号格式不正确" })
  phone: string;
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

  @ApiPropertyOptional({ description: "保证金金额（开启自动计算时忽略）" })
  @IsOptional() @IsNumber() @Min(0)
  @Type(() => Number)
  depositAmount?: number;
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
  @ApiPropertyOptional({ description: "保证金金额" })
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
  company: string;

  @ApiProperty({ description: "快递单号" })
  @IsString()
  @MinLength(1)
  trackingNo: string;
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
