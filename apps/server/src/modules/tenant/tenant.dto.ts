import { IsString, IsOptional, IsInt, IsArray, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTenantDto {
  @ApiProperty({ description: "企业名称" })
  @IsString()
  name: string;

  @ApiProperty({ description: "联系人" })
  @IsString()
  contactName: string;

  @ApiPropertyOptional({ description: "联系电话" })
  @IsOptional() @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: "联系邮箱" })
  @IsOptional() @IsString()
  contactEmail?: string;

  @ApiPropertyOptional({ description: "套餐 PLAN: BASIC/PRO/ENTERPRISE/CUSTOM" })
  @IsOptional() @IsString()
  plan?: string;

  @ApiPropertyOptional({ description: "总配额" })
  @IsOptional() @IsInt() @Min(0)
  quotaTotal?: number;

  @ApiPropertyOptional({ description: "配额重置周期 MONTHLY/YEARLY/NONE" })
  @IsOptional() @IsString()
  quotaResetCycle?: string;

  @ApiPropertyOptional({ description: "到期时间" })
  @IsOptional() @IsString()
  expireAt?: string;

  @ApiPropertyOptional({ description: "IP白名单" })
  @IsOptional() @IsArray()
  ipWhitelist?: string[];

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional() @IsString()
  remark?: string;
}

export class UpdateTenantDto {
  @ApiPropertyOptional({ description: "企业名称" })
  @IsOptional() @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "联系人" })
  @IsOptional() @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: "联系电话" })
  @IsOptional() @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: "联系邮箱" })
  @IsOptional() @IsString()
  contactEmail?: string;

  @ApiPropertyOptional({ description: "套餐" })
  @IsOptional() @IsString()
  plan?: string;

  @ApiPropertyOptional({ description: "状态 ACTIVE/DISABLED/EXPIRED" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "总配额" })
  @IsOptional() @IsInt() @Min(0)
  quotaTotal?: number;

  @ApiPropertyOptional({ description: "重置周期" })
  @IsOptional() @IsString()
  quotaResetCycle?: string;

  @ApiPropertyOptional({ description: "到期时间" })
  @IsOptional() @IsString()
  expireAt?: string;

  @ApiPropertyOptional({ description: "IP白名单" })
  @IsOptional() @IsArray()
  ipWhitelist?: string[];

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional() @IsString()
  remark?: string;
}

export class TenantRechargeDto {
  @ApiProperty({ description: "充值额度（调用次数）" })
  @IsInt() @Min(1)
  quotaAmount: number;

  @ApiPropertyOptional({ description: "充值金额（人民币）" })
  @IsOptional()
  amountRmb?: number;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional() @IsString()
  remark?: string;
}

export class TenantConsumeDto {
  @ApiProperty({ description: "API类型: BAZI_PAIPAN/AI_ANALYSIS/CLASSIC_SEARCH/ZIWEI_PAIPAN" })
  @IsString()
  apiType: string;

  @ApiPropertyOptional({ description: "消耗配额数（默认1）" })
  @IsOptional() @IsInt() @Min(1)
  cost?: number;

  @ApiPropertyOptional({ description: "AI Token消耗数" })
  @IsOptional() @IsInt()
  tokensUsed?: number;

  @ApiPropertyOptional({ description: "端点路径" })
  @IsOptional() @IsString()
  endpoint?: string;
}

export class TenantListDto {
  @ApiPropertyOptional({ description: "页码" })
  @IsOptional() page?: number;

  @ApiPropertyOptional({ description: "每页数量" })
  @IsOptional() pageSize?: number;

  @ApiPropertyOptional({ description: "状态过滤" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "搜索关键词" })
  @IsOptional() @IsString()
  keyword?: string;
}
