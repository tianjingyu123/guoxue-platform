import { IsString, MinLength, IsIn, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class InitiateCallDto {
  @ApiProperty({ description: "圈子ID" })
  @IsString() @MinLength(1)
  circleId: string;

  @ApiProperty({ description: "达人（被叫）用户ID" })
  @IsString() @MinLength(1)
  expertId: string;

  @ApiProperty({ description: "通话类型", enum: ["VOICE", "VIDEO"] })
  @IsIn(["VOICE", "VIDEO"])
  type: "VOICE" | "VIDEO";
}

export class CancelCallDto {
  @ApiPropertyOptional({ description: "取消原因", enum: ["MISSED", "REFUNDED"] })
  @IsOptional() @IsIn(["MISSED", "REFUNDED"])
  reason?: "MISSED" | "REFUNDED";
}
