import { MinLength,  IsOptional, IsString, IsDateString, IsNumber, IsIn, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// ───────── 对账中心 ─────────

export class CreateReconciliationDto {
  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsString()
  @IsIn(["WECHAT", "ALIPAY", "UNIONPAY"])
  source?: string;

  @IsOptional()
  @IsDateString()
  billDate?: string;
}

export class ReconciliationQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(["WECHAT", "ALIPAY", "UNIONPAY"])
  source?: string;

  @IsOptional()
  @IsString()
  @IsIn(["PENDING", "MATCHED", "MISMATCHED"])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  pageSize?: number;
}

// ───────── 发票管理 ─────────

export class CreateInvoiceDto {
  @IsString()
  @MinLength(1)
  orderId: string;

  @IsString()
  @IsIn(["PERSONAL", "COMPANY"])
  type: string;

  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  taxNo?: string;

  @IsNumber()
  amount: number;
}

export class InvoiceQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(["PENDING", "ISSUED", "MAILED", "REJECTED"])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  pageSize?: number;
}

export class IssueInvoiceDto {
  @IsString()
  @MinLength(1)
  invoiceUrl: string;
}

export class MailInvoiceDto {
  @IsString()
  @MinLength(1)
  expressNo: string;
}

export class RejectInvoiceDto {
  @ApiPropertyOptional({ description: "驳回原因" })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ───────── 结算单 ─────────

export class SettlementQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsString()
  @IsIn(["PENDING", "APPROVED", "PAID", "REJECTED"])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  pageSize?: number;
}

export class GenerateSettlementDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// ───────── 提现审批 ─────────

export class WithdrawalQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(["PENDING", "APPROVED", "REJECTED", "PAID"])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  pageSize?: number;
}

export class ApproveWithdrawalDto {
  @IsOptional()
  @IsString()
  reviewNote?: string;
}

export class RejectWithdrawalDto {
  @IsString()
  @MinLength(1)
  reviewNote: string;
}

/** 提现打款：payoutRef=银行/微信/支付宝转账流水号，必填（出款幂等键·替代 MANUAL-占位） */
export class PayWithdrawalDto {
  @ApiProperty({ description: "打款流水号（银行/微信/支付宝转账凭证号），必填且全局唯一" })
  @IsString()
  @MinLength(1)
  payoutRef: string;
}

/** 结算单打款：payoutRef 必填，存入 detail JSON 并全局查重 */
export class PaySettlementDto {
  @ApiProperty({ description: "打款流水号（银行/支付宝转账凭证号），必填且全局唯一" })
  @IsString()
  @MinLength(1)
  payoutRef: string;
}

// ───────── 财务报表 ─────────

export class MonthlyReportDto {
  @IsString()
  @MinLength(1)
  period: string;
}

// ───────── 资金冻结/解冻 ─────────

export class FreezeAmountDto {
  @ApiPropertyOptional({ description: "用户ID" })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: "订单ID" })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty({ description: "冻结金额" })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: "冻结原因" })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UnfreezeAmountDto {
  @ApiProperty({ description: "订单ID" })
  @IsString()
  @MinLength(1)
  orderId: string;

  @ApiPropertyOptional({ description: "解冻原因" })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class FreezeRecordQueryDto {
  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  pageSize?: number;
}
