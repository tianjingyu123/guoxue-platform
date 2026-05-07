import { IsInt, IsOptional, IsString, IsIn, Min } from "class-validator";

export class RechargeDto {
  @IsInt()
  @Min(10)
  amountCoin: number; // 充值币数

  @IsString()
  @IsIn(["WECHAT", "ALIPAY"])
  payMethod: string;

  @IsString()
  orderNo: string; // 外部支付订单号
}

export class AdminRechargeDto {
  @IsString()
  userId: string;

  @IsInt()
  @Min(10)
  amountCoin: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class SpendDto {
  @IsInt()
  @Min(1)
  amountCoin: number;

  @IsString()
  scene: string;

  @IsOptional()
  @IsString()
  refId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CoinTransactionQueryDto {
  @IsOptional()
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @IsInt()
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  scene?: string;
}

export class RechargeConfigDto {
  @IsInt()
  @Min(10)
  amountCoin: number;

  @IsString()
  @IsIn(["WECHAT", "ALIPAY"])
  payMethod: string;
}
