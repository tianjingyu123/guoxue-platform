import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class VerifyAppleIapPurchaseDto {
  @ApiProperty({ description: "Apple 交易号", maxLength: 128 })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  transactionId: string;

  @ApiProperty({ description: "App Store Connect 中配置的 Product ID", maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  productId: string;

  @ApiPropertyOptional({ description: "StoreKit 返回的 App Receipt，仅用于摘要审计，不作为唯一订单号" })
  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  transactionReceipt?: string;
}

export class AppleIapNotificationDto {
  @ApiProperty({ description: "App Store Server Notifications V2 签名载荷" })
  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  signedPayload: string;
}
