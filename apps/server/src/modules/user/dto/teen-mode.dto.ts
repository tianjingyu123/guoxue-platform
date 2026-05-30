import { IsBoolean, IsOptional, IsInt, Min, Max, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateTeenModeDto {
  @ApiProperty({ description: "是否开启青少年模式" })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: "每日使用时长限制（分钟），默认40" })
  @IsInt() @Min(10) @Max(240)
  @IsOptional()
  dailyLimitMinutes?: number;

  @ApiPropertyOptional({ description: "禁用开始时间（小时，0-23），默认22" })
  @IsInt() @Min(0) @Max(23)
  @IsOptional()
  blockStartHour?: number;

  @ApiPropertyOptional({ description: "禁用结束时间（小时，0-23），默认6" })
  @IsInt() @Min(0) @Max(23)
  @IsOptional()
  blockEndHour?: number;

  @ApiPropertyOptional({ description: "内容过滤级别：strict/moderate" })
  @IsString()
  @IsOptional()
  contentFilter?: string;

  @ApiPropertyOptional({ description: "监护密码（4位数字）" })
  @IsString()
  @IsOptional()
  guardianPassword?: string;
}
