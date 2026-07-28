import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export const CIRCLE_PUBLISH_SCOPES = ["SHORT_VIDEO", "LIVE", "COURSE"] as const;
export type CirclePublishScopeValue = (typeof CIRCLE_PUBLISH_SCOPES)[number];

export class ApplyCirclePublishGrantDto {
  @ApiProperty({ description: "申请授权的圈子 ID" })
  @IsString()
  circleId: string;

  @ApiProperty({
    description: "申请开放到全平台的内容类型",
    enum: CIRCLE_PUBLISH_SCOPES,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(CIRCLE_PUBLISH_SCOPES, { each: true })
  scopes: CirclePublishScopeValue[];

  @ApiPropertyOptional({ description: "申请通道", enum: ["REGULAR", "FAST_TRACK"] })
  @IsOptional()
  @IsIn(["REGULAR", "FAST_TRACK"])
  channel?: "REGULAR" | "FAST_TRACK";

  @ApiPropertyOptional({ description: "快速通道的外部平台名称" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  externalPlatform?: string;

  @ApiPropertyOptional({ description: "快速通道的外部主页链接" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  externalProfileUrl?: string;

  @ApiPropertyOptional({ description: "快速通道的外部粉丝数" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  externalFollowerCount?: number;

  @ApiPropertyOptional({ description: "快速通道证明材料", type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  evidenceUrls?: string[];
}

export class ReviewCirclePublishGrantDto {
  @ApiPropertyOptional({
    description: "批准的内容类型；不传时批准申请的全部类型",
    enum: CIRCLE_PUBLISH_SCOPES,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(CIRCLE_PUBLISH_SCOPES, { each: true })
  scopes?: CirclePublishScopeValue[];

  @ApiPropertyOptional({ description: "审核说明或驳回原因" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
