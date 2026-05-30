import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min, IsBoolean } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class HuifuPayDto {
  @ApiProperty({ description: "订单ID" })
  @IsString()
  orderId: string;

  @ApiPropertyOptional({ description: "支付方式 WECHAT/ALIPAY/UNIONPAY" })
  @IsOptional()
  @IsString()
  payType?: string;

  @ApiPropertyOptional({ description: "微信openid（JSAPI支付必填）" })
  @IsOptional()
  @IsString()
  openid?: string;

  @ApiPropertyOptional({ description: "H5支付场景类型" })
  @IsOptional()
  @IsString()
  sceneType?: string;
}

export class HuifuSplitReceiver {
  @ApiProperty({ description: "收款方账户ID" })
  @IsString()
  acctId: string;

  @ApiProperty({ description: "分账金额（元）" })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: "收款方名称" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class HuifuSplitDto {
  @ApiProperty({ description: "订单ID" })
  @IsString()
  orderId: string;

  @ApiPropertyOptional({ description: "接收方ID（单笔分账简写）" })
  @IsOptional()
  @IsString()
  receiverId?: string;

  @ApiPropertyOptional({ description: "接收方名称（单笔分账简写）" })
  @IsOptional()
  @IsString()
  receiverName?: string;

  @ApiProperty({ description: "分账金额（元）" })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: "分账接收方列表", type: [HuifuSplitReceiver] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HuifuSplitReceiver)
  receivers?: HuifuSplitReceiver[];

  @ApiPropertyOptional({ description: "是否解冻剩余金额" })
  @IsOptional()
  @IsBoolean()
  unfreezeUnsplit?: boolean;
}

export class HuifuQuerySplitDto {
  @ApiProperty({ description: "订单ID" })
  @IsString()
  orderId: string;
}

export class HuifuRefundDto {
  @ApiPropertyOptional({ description: "订单ID" })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: "原交易号" })
  @IsOptional()
  @IsString()
  outTradeNo?: string;

  @ApiProperty({ description: "退款金额（元）" })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: "退款原因" })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateConfigDto {
  @ApiProperty({ description: "配置键" })
  @IsString()
  key: string;

  @ApiProperty({ description: "配置值" })
  @IsString()
  value: string;

  @ApiPropertyOptional({ description: "描述" })
  @IsOptional()
  @IsString()
  description?: string;
}
