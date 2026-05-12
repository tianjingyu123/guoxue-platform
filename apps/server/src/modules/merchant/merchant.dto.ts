import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString, IsOptional, IsArray, IsBoolean, IsNumber, IsIn, Min, Max, MaxLength, Matches, IsNumberString,
} from "class-validator";
import { Type } from "class-transformer";

// ─── 入驻申请 ───

export class CreateMerchantApplyDto {
  @ApiProperty({ description: "店铺名称" })
  @IsString()
  shopName: string;

  @ApiPropertyOptional({ description: "店铺Logo URL" })
  @IsOptional() @IsString()
  shopLogo?: string;

  @ApiPropertyOptional({ description: "店铺简介" })
  @IsOptional() @IsString() @MaxLength(500)
  shopIntro?: string;

  @ApiProperty({ description: "联系人姓名" })
  @IsString()
  contactName: string;

  @ApiProperty({ description: "联系电话" })
  @IsString() @Matches(/^1[3-9]\d{9}$/)
  contactPhone: string;

  @ApiProperty({ description: "身份证号" })
  @IsString() @Matches(/^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/)
  idCardNumber: string;

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
  title: string;

  @ApiProperty({ description: "违规描述" })
  @IsString()
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

// ─── 结算 ───

export class PaySettlementDto {
  @ApiProperty({ description: "结算金额" })
  @IsNumber() @Min(0)
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional() @IsString()
  remark?: string;
}

// ─── 协议管理 ───

export class CreateAgreementDto {
  @ApiProperty({ description: "版本号" })
  @IsString()
  version: string;

  @ApiProperty({ description: "协议标题" })
  @IsString()
  title: string;

  @ApiProperty({ description: "协议内容（HTML/Markdown）" })
  @IsString()
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
  company: string;

  @ApiProperty({ description: "快递单号" })
  @IsString()
  trackingNo: string;
}

export class RejectRefundDto {
  @ApiProperty({ description: "拒绝原因" })
  @IsString()
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
  reply: string;
}

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

export class MerchantProductDto {
  @ApiProperty({ description: "商品标题" })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: "商品简介" })
  @IsOptional() @IsString()
  intro?: string;

  @ApiProperty({ description: "商品详情（HTML）" })
  @IsString()
  detail: string;

  @ApiPropertyOptional({ description: "商品图片" })
  @IsOptional() @IsArray() @IsString({ each: true })
  images?: string[];

  @ApiProperty({ description: "商品价格" })
  @IsNumber() @Min(0)
  @Type(() => Number)
  price: number;

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
