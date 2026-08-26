import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsInt, IsNumber, IsArray, IsBoolean, Min, Max, ValidateNested, MinLength, IsIn, IsUrl, ArrayMinSize, ArrayMaxSize, MaxLength } from "class-validator";
import { Type, Transform } from "class-transformer";

export class CreateVideoDto {
  @ApiPropertyOptional({ description: "关联圈子ID" })
  @IsOptional() @IsString()
  circleId?: string;

  @ApiPropertyOptional({ description: "视频标题" })
  @IsOptional() @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "视频描述/简介" })
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ description: "视频URL" })
  @IsString()
  @MinLength(1)
  videoUrl: string;

  @ApiPropertyOptional({ description: "封面图URL" })
  @IsOptional() @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ description: "时长（秒·自动取整）" })
  @IsOptional()
  // 视频时长天然带小数秒(如15.7)，前端/AI 传入一律四舍五入为整数，避免 @IsInt 误拒；空值归 undefined
  @Transform(({ value }) => (value === null || value === undefined || value === "" ? undefined : Math.round(Number(value))))
  @IsInt()
  duration?: number;

  @ApiPropertyOptional({ description: "话题标签（最多5个）" })
  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: "是否仅自己可见" })
  @IsOptional() @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({ description: "开放范围：CIRCLE_ONLY=仅本圈（默认）/ PLATFORM=全平台（需平台审核）", enum: ["CIRCLE_ONLY", "PLATFORM"] })
  @IsOptional() @IsIn(["CIRCLE_ONLY", "PLATFORM"])
  visibility?: "CIRCLE_ONLY" | "PLATFORM";

  @ApiPropertyOptional({ description: "关联带货商品ID列表（最多5件）" })
  @IsOptional() @IsArray() @IsString({ each: true })
  products?: string[];

  @ApiPropertyOptional({ description: "所属分站ID" })
  @IsOptional() @IsString()
  stationId?: string;
}

export class UpdateVideoDto {
  @ApiPropertyOptional({ description: "标题" })
  @IsOptional() @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "封面图URL" })
  @IsOptional() @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ description: "状态" })
  @IsOptional() @IsString()
  status?: string;
}

export class AuditVideoDto {
  @ApiProperty({ description: "审核动作", enum: ["approve", "reject"] })
  @IsString()
  @IsIn(["approve", "reject"])
  action: "approve" | "reject";

  @ApiPropertyOptional({ description: "驳回原因（reject 时建议填写）" })
  @IsOptional() @IsString()
  reason?: string;
}

export class VideoListQueryDto {
  @ApiPropertyOptional({ description: "圈子ID" })
  @IsOptional() @IsString()
  circleId?: string;

  @ApiPropertyOptional({ description: "状态筛选" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "查询范围：all=不限开放范围（仅管理员生效·管理端用）", enum: ["all"] })
  @IsOptional() @IsIn(["all"])
  scope?: string;

  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ description: "分站ID" })
  @IsOptional() @IsString()
  stationId?: string;
}

// ═══════════════════ VOD 增强 DTO ═══════════════════

export class PullUploadDto {
  @ApiProperty({ description: "拉取URL列表", type: [Object] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PullUrlItem)
  urls: PullUrlItem[];

  @ApiPropertyOptional({ description: "媒资名称" })
  @IsOptional() @IsString()
  mediaName?: string;

  @ApiPropertyOptional({ description: "封面URL" })
  @IsOptional() @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  coverUrl?: string;

  @ApiPropertyOptional({ description: "上传后执行的任务流" })
  @IsOptional() @IsString()
  procedure?: string;

  @ApiPropertyOptional({ description: "分类ID" })
  @IsOptional() @IsInt()
  classId?: number;
}

export class PullUrlItem {
  @ApiProperty({ description: "视频源URL" })
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  url: string;

  @ApiPropertyOptional({ description: "文件名" })
  @IsOptional() @IsString() @MaxLength(128)
  fileName?: string;
}

export class ProcessMediaDto {
  @ApiPropertyOptional({ description: "转码模板ID列表", type: [Number], example: [10, 20, 30] })
  @IsOptional() @IsArray() @IsInt({ each: true })
  transcodeDefinitions?: number[];

  @ApiPropertyOptional({ description: "水印模板ID" })
  @IsOptional() @IsInt()
  watermarkDefinition?: number;

  @ApiPropertyOptional({ description: "自适应码流模板ID" })
  @IsOptional() @IsInt()
  adaptiveDefinition?: number;

  @ApiPropertyOptional({ description: "截图模板ID" })
  @IsOptional() @IsInt()
  snapshotDefinition?: number;
}

export class ClipVideoDto {
  @ApiProperty({ description: "源文件ID" })
  @IsString()
  @MinLength(1)
  fileId: string;

  @ApiProperty({ description: "起始偏移（秒）" })
  @IsNumber() @Min(0)
  startTimeOffset: number;

  @ApiProperty({ description: "结束偏移（秒）" })
  @IsNumber() @Min(0)
  endTimeOffset: number;

  @ApiPropertyOptional({ description: "剪辑后文件名" })
  @IsOptional() @IsString()
  clipName?: string;

  @ApiPropertyOptional({ description: "分类ID" })
  @IsOptional() @IsInt()
  classId?: number;
}

export class UploadSignatureDto {
  @ApiPropertyOptional({ description: "视频名称" })
  @IsOptional() @IsString()
  videoName?: string;

  @ApiPropertyOptional({ description: "上传后执行的任务流" })
  @IsOptional() @IsString()
  procedure?: string;

  @ApiPropertyOptional({ description: "分类ID" })
  @IsOptional() @IsInt()
  classId?: number;

  @ApiPropertyOptional({ description: "签名有效期（秒）" })
  @IsOptional() @IsInt()
  expireSeconds?: number;
}

export class PlaybackStatsQueryDto {
  @ApiProperty({ description: "开始日期 YYYY-MM-DD" })
  @IsString()
  @MinLength(1)
  startDate: string;

  @ApiProperty({ description: "结束日期 YYYY-MM-DD" })
  @IsString()
  @MinLength(1)
  endDate: string;
}
