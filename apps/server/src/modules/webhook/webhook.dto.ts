import { IsString, IsOptional, IsUrl, IsIn, IsBoolean } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { WebhookEvent } from "./webhook.service";

/** 支持的 Webhook 事件类型（与 WebhookEvent 保持一致） */
export const WEBHOOK_EVENTS: WebhookEvent[] = [
  "ORDER_PAID",
  "ORDER_REFUNDED",
  "USER_REGISTERED",
  "CONTENT_PUBLISHED",
  "WITHDRAWAL_REQUESTED",
  "COURSE_ENROLLED",
  "LIVE_STARTED",
  "LIVE_ENDED",
];

/**
 * URL 仅允许 http/https，且要求带 TLD/协议头。
 * 注意：内网/元数据地址（127./10./172.16-31./192.168./169.254.）的拦截
 * 在 WebhookService.validateWebhookUrl 中做 DNS 解析后二次校验（防 SSRF）。
 */
const URL_OPTIONS = { protocols: ["http", "https"], require_protocol: true };

export class CreateWebhookDto {
  @ApiProperty({ description: "事件类型", enum: WEBHOOK_EVENTS })
  @IsIn(WEBHOOK_EVENTS, { message: "不支持的事件类型" })
  event: WebhookEvent;

  @ApiProperty({ description: "回调地址（仅 http/https）" })
  @IsUrl(URL_OPTIONS, { message: "URL 格式不合法（仅支持 http/https）" })
  url: string;

  @ApiPropertyOptional({ description: "签名密钥" })
  @IsOptional() @IsString() secret?: string;

  @ApiPropertyOptional({ description: "描述" })
  @IsOptional() @IsString() description?: string;
}

export class UpdateWebhookDto {
  @ApiPropertyOptional({ description: "回调地址（仅 http/https）" })
  @IsOptional() @IsUrl(URL_OPTIONS, { message: "URL 格式不合法（仅支持 http/https）" })
  url?: string;

  @ApiPropertyOptional({ description: "签名密钥" })
  @IsOptional() @IsString() secret?: string;

  @ApiPropertyOptional({ description: "描述" })
  @IsOptional() @IsString() description?: string;
}

export class ToggleWebhookDto {
  @ApiProperty({ description: "是否启用" })
  @IsBoolean() isActive: boolean;
}
