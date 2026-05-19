import { IsString, IsOptional, IsBoolean, IsIn, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateAppVersionDto {
  @ApiProperty({ description: "平台: ios/android" })
  @IsString() @IsIn(["ios", "android"])
  platform: string;

  @ApiProperty({ description: "版本号 如 1.0.0" })
  @IsString() @MinLength(1)
  version: string;

  @ApiPropertyOptional({ description: "构建号" })
  @IsOptional() @IsString()
  buildNumber?: string;

  @ApiPropertyOptional({ description: "更新日志" })
  @IsOptional() @IsString()
  changelog?: string;

  @ApiPropertyOptional({ description: "是否强制更新", default: false })
  @IsOptional() @Type(() => Boolean) @IsBoolean()
  forceUpdate?: boolean;

  @ApiPropertyOptional({ description: "下载地址" })
  @IsOptional() @IsString()
  downloadUrl?: string;
}

export class UpdateAppVersionDto {
  @ApiPropertyOptional({ description: "版本号" })
  @IsOptional() @IsString() @MinLength(1)
  version?: string;

  @ApiPropertyOptional({ description: "构建号" })
  @IsOptional() @IsString()
  buildNumber?: string;

  @ApiPropertyOptional({ description: "更新日志" })
  @IsOptional() @IsString()
  changelog?: string;

  @ApiPropertyOptional({ description: "是否强制更新" })
  @IsOptional() @Type(() => Boolean) @IsBoolean()
  forceUpdate?: boolean;

  @ApiPropertyOptional({ description: "下载地址" })
  @IsOptional() @IsString()
  downloadUrl?: string;
}
