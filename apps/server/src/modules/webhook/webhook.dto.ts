import { IsString, IsOptional, MinLength } from "class-validator";
import { WebhookEvent } from "./webhook.service";

export class CreateWebhookDto {
  event: WebhookEvent;
  @IsString() @MinLength(1) url: string;
  @IsOptional() @IsString() secret?: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateWebhookDto {
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() secret?: string;
  @IsOptional() @IsString() description?: string;
}
