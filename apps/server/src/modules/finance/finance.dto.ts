import { IsOptional, IsString, IsNumber, IsIn, IsDateString, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// ───────── 对账中心 ─────────

export class CreateReconciliationDto {
  @IsString()
  @IsIn(["WECHAT", "ALIPAY", "UNIONPAY"])
  source: string;

  @IsDateString()
  billDate: string;
}

export class ReconciliationQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(["WECHAT", "ALIPAY", "UNIONPAY"])
  source?: string;

  @IsOptional()
  @IsString()
  @IsIn(["PENDING", "MATCHED", "MISMATCH"])
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
  orderId: string;

  @IsString()
  @IsIn(["PERSONAL", "COMPANY"])
  type: string;

  @IsString()
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
  invoiceUrl: string;
}

export class MailInvoiceDto {
  @IsString()
  expressNo: string;
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
  @IsString()
  userId: string;

  @IsString()
  period: string;
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
  reviewNote: string;
}

// ───────── 财务报表 ─────────

export class MonthlyReportDto {
  @IsString()
  period: string;
}

// ───────── 资金冻结/解冻 ─────────

export class FreezeAmountDto {
  @ApiProperty({ description: "订单ID" })
  @IsString()
  orderId: string;

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
