import { MinLength,  IsInt, IsOptional, IsString, IsIn, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RechargeDto {
  @ApiProperty({ description: "充值币数", example: 100, minimum: 10 })
  @IsInt()
  @Min(10)
  amountCoin: number;

  @ApiProperty({ description: "支付方式", enum: ["WECHAT", "ALIPAY"], example: "WECHAT" })
  @IsString()
  @IsIn(["WECHAT", "ALIPAY"])
  payMethod: string;

  @ApiProperty({ description: "外部支付订单号", example: "GXPAY20260509001" })
  @IsString()
  @MinLength(1)
  orderNo: string;
}

export class AdminRechargeDto {
  @ApiProperty({ description: "用户ID" })
  @IsString()
  @MinLength(1)
  userId: string;

  @ApiProperty({ description: "充值币数", example: 100, minimum: 10 })
  @IsInt()
  @Min(10)
  amountCoin: number;

  @ApiPropertyOptional({ description: "备注说明" })
  @IsOptional()
  @IsString()
  description?: string;
}

export class SpendDto {
  @ApiProperty({ description: "消费币数", example: 50, minimum: 1 })
  @IsInt()
  @Min(1)
  amountCoin: number;

  @ApiProperty({ description: "消费场景", example: "CIRCLE_JOIN" })
  @IsString()
  @MinLength(1)
  scene: string;

  @ApiPropertyOptional({ description: "关联业务ID" })
  @IsOptional()
  @IsString()
  refId?: string;

  @ApiPropertyOptional({ description: "描述" })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CoinTransactionQueryDto {
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional()
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional()
  @IsInt()
  pageSize?: number;

  @ApiPropertyOptional({ description: "交易类型: RECHARGE/SPEND/REFUND/GRANT" })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: "消费场景" })
  @IsOptional()
  @IsString()
  scene?: string;
}

export class CreateGiftDto {
  @ApiProperty({ description: "礼物名称", example: "飞花令" })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: "图标URL" })
  @IsOptional() @IsString()
  icon?: string;

  @ApiProperty({ description: "礼物价格（币）", example: 10, minimum: 1 })
  @IsInt() @Min(1)
  price: number;

  @ApiPropertyOptional({ description: "礼物价格（兼容字段）" })
  @IsOptional() @IsInt() @Min(1)
  priceCoin?: number;

  @ApiPropertyOptional({ description: "礼物等级: BASIC/MID/HIGH/TOP", default: "BASIC" })
  @IsOptional() @IsString()
  level?: string;

  @ApiPropertyOptional({ description: "特效资源URL" })
  @IsOptional() @IsString()
  effectUrl?: string;

  @ApiPropertyOptional({ description: "排序", default: 0 })
  @IsOptional() @IsInt()
  sort?: number;

  @ApiPropertyOptional({ description: "排序（兼容字段）" })
  @IsOptional() @IsInt()
  sortOrder?: number;
}

export class SendGiftDto {
  @ApiPropertyOptional({ description: "直播间ID" })
  @IsOptional() @IsString()
  liveRoomId?: string;

  @ApiPropertyOptional({ description: "接收者用户ID（直播场景）" })
  @IsOptional() @IsString()
  toUserId?: string;

  @ApiPropertyOptional({ description: "接收者用户ID（管理后台场景，等同toUserId）" })
  @IsOptional() @IsString()
  userId?: string;

  @ApiProperty({ description: "礼物ID" })
  @IsString()
  @MinLength(1)
  giftId: string;

  @ApiPropertyOptional({ description: "赠送数量", default: 1, minimum: 1 })
  @IsOptional() @IsInt() @Min(1)
  quantity?: number;
}

export class RechargeConfigDto {
  @ApiProperty({ description: "充值币数", example: 100, minimum: 10 })
  @IsInt()
  @Min(10)
  amountCoin: number;

  @ApiProperty({ description: "支付方式", enum: ["WECHAT", "ALIPAY"] })
  @IsString()
  @IsIn(["WECHAT", "ALIPAY"])
  payMethod: string;
}
