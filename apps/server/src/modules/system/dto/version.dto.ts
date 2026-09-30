import { IsString, IsOptional, IsBoolean, IsIn, Matches, MaxLength,
  IsInt,
  Min,
  Max,
  IsArray,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class DistributionQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-z][a-z0-9-]{1,47}$/)
  applicationId?: string;
  @IsOptional()
  @IsString()
  @Matches(/^[a-z][a-z0-9-]{1,47}$/)
  channelId?: string;
  @IsOptional()
  @IsString()
  @Matches(/^[a-z][a-z0-9._-]{1,79}$/)
  clientKey?: string;
}

export class CreateAppVersionDto extends DistributionQueryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  targetUserIds?: string[];
  @ApiProperty({ description: "平台: ios/android/harmony" })
  @IsString() @IsIn(["ios", "android", "harmony"])
  platform: string;

  @ApiProperty({ description: "版本号 如 1.0.0" })
  @IsString() @Matches(/^v?\d+(?:\.\d+){0,3}(?:-[0-9A-Za-z.-]+)?$/, {
    message: "version 必须是数字点分版本号，如 1.2.0",
  })
  version: string;

  @ApiPropertyOptional({ description: "构建号" })
  @IsOptional() @IsString() @Matches(/^\d+$/, { message: "buildNumber 必须是非负整数" })
  buildNumber?: string;

  @ApiPropertyOptional({ description: "更新日志" })
  @IsOptional() @IsString() @MaxLength(4000)
  changelog?: string;

  @ApiPropertyOptional({ description: "是否强制更新", default: false })
  @IsOptional() @Type(() => Boolean) @IsBoolean()
  forceUpdate?: boolean;

  @ApiPropertyOptional({ description: "下载地址" })
  @IsOptional() @IsString() @MaxLength(2048)
  downloadUrl?: string;

  @ApiPropertyOptional({ description: "安装包 SHA-256（直链包推荐填写）" })
  @IsOptional() @IsString() @Matches(/^[a-fA-F0-9]{64}$/, { message: "checksumSha256 必须是 64 位十六进制 SHA-256" })
  checksumSha256?: string;
}

export class UpdateAppVersionDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  targetUserIds?: string[];
  @ApiPropertyOptional({ description: "版本号" })
  @IsOptional() @IsString() @Matches(/^v?\d+(?:\.\d+){0,3}(?:-[0-9A-Za-z.-]+)?$/, {
    message: "version 必须是数字点分版本号，如 1.2.0",
  })
  version?: string;

  @ApiPropertyOptional({ description: "构建号" })
  @IsOptional() @IsString() @Matches(/^\d+$/, { message: "buildNumber 必须是非负整数" })
  buildNumber?: string;

  @ApiPropertyOptional({ description: "更新日志" })
  @IsOptional() @IsString() @MaxLength(4000)
  changelog?: string;

  @ApiPropertyOptional({ description: "是否强制更新" })
  @IsOptional() @Type(() => Boolean) @IsBoolean()
  forceUpdate?: boolean;

  @ApiPropertyOptional({ description: "下载地址" })
  @IsOptional() @IsString() @MaxLength(2048)
  downloadUrl?: string;

  @ApiPropertyOptional({ description: "安装包 SHA-256（直链包推荐填写）" })
  @IsOptional() @IsString() @Matches(/^[a-fA-F0-9]{64}$/, { message: "checksumSha256 必须是 64 位十六进制 SHA-256" })
  checksumSha256?: string;
}

export class CheckAppVersionDto extends DistributionQueryDto {
  @ApiProperty({ description: "平台: ios/android/harmony" })
  @IsString() @IsIn(["ios", "android", "harmony"])
  platform: string;

  @ApiProperty({ description: "当前展示版本号，如 1.0.0" })
  @IsString() @Matches(/^v?\d+(?:\.\d+){0,3}(?:-[0-9A-Za-z.-]+)?$/, {
    message: "version 必须是数字点分版本号，如 1.2.0",
  })
  version: string;

  @ApiPropertyOptional({ description: "当前构建号" })
  @IsOptional() @IsString() @Matches(/^\d+$/, { message: "buildNumber 必须是非负整数" })
  buildNumber?: string;
}
