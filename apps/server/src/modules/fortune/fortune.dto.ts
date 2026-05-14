import { IsString, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateFortuneSubscriptionDto {
  @ApiProperty({ description: "运势类型 DAILY/WEEKLY/MONTHLY/YEARLY" })
  @IsString() fortuneType: string;

  @ApiProperty({ description: "推送渠道 TEMPLATE_MSG/SMS/APP" })
  @IsString() pushChannel: string;

  @ApiPropertyOptional({ description: "推送时间 HH:mm" })
  @IsOptional() @IsString() pushTime?: string;
}

export class FortuneQueryDto {
  @ApiPropertyOptional({ description: "运势类型" })
  @IsOptional() @IsString() fortuneType?: string;

  @ApiPropertyOptional({ description: "周期 2026-05-14 / 2026-W20 / 2026-05 / 2026" })
  @IsOptional() @IsString() period?: string;
}
