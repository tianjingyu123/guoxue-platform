import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsInt, IsNumber, IsArray, Min, Max, ValidateNested, MinLength, IsIn } from "class-validator";
import { Type } from "class-transformer";

export class CreateVideoDto {
  @ApiPropertyOptional({ description: "关联圈子ID" })
  @IsOptional() @IsString()
  circleId?: string;

  @ApiPropertyOptional({ description: "视频标题" })
  @IsOptional() @IsString()
  title?: string;

  @ApiProperty({ description: "视频URL" })
  @IsString()
  @MinLength(1)
  videoUrl: string;

  @ApiPropertyOptional({ description: "封面图URL" })
  @IsOptional() @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ description: "时长（秒）" })
  @IsOptional() @IsInt()
  duration?: number;

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
  @ValidateNested({ each: true })
  @Type(() => PullUrlItem)
  urls: PullUrlItem[];

  @ApiPropertyOptional({ description: "媒资名称" })
  @IsOptional() @IsString()
  mediaName?: string;

  @ApiPropertyOptional({ description: "封面URL" })
  @IsOptional() @IsString()
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
  @IsString()
  @MinLength(1)
  url: string;

  @ApiPropertyOptional({ description: "文件名" })
  @IsOptional() @IsString()
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
  @IsNumber()
  startTimeOffset: number;

  @ApiProperty({ description: "结束偏移（秒）" })
  @IsNumber()
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
