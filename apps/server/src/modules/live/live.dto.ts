import { IsString, IsOptional, IsNumber, IsArray, IsInt, IsIn, Min, Max, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateRoomDto {
  @ApiPropertyOptional({ description: "圈子ID" })
  @IsOptional() @IsString()
  circleId?: string;

  @ApiProperty({ description: "直播标题" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ description: "封面图URL" })
  @IsOptional() @IsString()
  cover?: string;

  @ApiPropertyOptional({ description: "预约开播时间（ISO 字符串）" })
  @IsOptional() @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: "主播用户ID，不传则默认为当前用户" })
  @IsOptional() @IsString()
  hostUserId?: string;

  @ApiPropertyOptional({ description: "副播用户ID列表" })
  @IsOptional() @IsArray()
  coHostIds?: string[];

  @ApiPropertyOptional({ description: "画质档: basic(标清免费)/hd(720p转码)/uhd(1080p转码)", enum: ["basic", "hd", "uhd"] })
  @IsOptional() @IsString() @IsIn(["basic", "hd", "uhd"])
  quality?: string;

  @ApiPropertyOptional({ description: "收费类型: FREE/PAID/CIRCLE_ONLY/MEMBER_FREE" })
  @IsOptional() @IsString()
  chargeType?: string;

  @ApiPropertyOptional({ description: "收费价格（元）" })
  @IsOptional() @IsNumber()
  chargePrice?: number;

  @ApiPropertyOptional({ description: "关联商品ID列表" })
  @IsOptional() @IsArray()
  productIds?: string[];

  @ApiPropertyOptional({ description: "关联课程ID，回放将自动同步为课程章节" })
  @IsOptional() @IsString()
  courseId?: string;

  @ApiPropertyOptional({ description: "分站ID" })
  @IsOptional() @IsString()
  stationId?: string;
}

export class UpdateRoomDto {
  @ApiPropertyOptional({ description: "直播标题" })
  @IsOptional() @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "封面图URL" })
  @IsOptional() @IsString()
  cover?: string;
}

// ───────── 麦位管理 ─────────

export class MicManageDto {
  @ApiProperty({ description: "用户ID" })
  @IsString()
  @MinLength(1)
  userId: string;

  @ApiProperty({ description: "麦位序号 (1-6)", minimum: 1, maximum: 6 })
  @Type(() => Number)
  @IsInt()
  @Min(1) @Max(6)
  position: number;

  @ApiPropertyOptional({ description: "操作: MUTE/UNMUTE/KICK/INVITE" })
  @IsOptional() @IsString()
  action?: string;
}

// ───────── 课件管理 ─────────

export class SlideCreateDto {
  @ApiProperty({ description: "课件标题" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ description: "课件URL（COS地址）" })
  @IsString()
  @MinLength(1)
  url: string;

  @ApiPropertyOptional({ description: "课件类型: PPT/PDF/IMAGE", default: "IMAGE" })
  @IsOptional() @IsString()
  type?: string;

  @ApiPropertyOptional({ description: "排序序号", default: 0 })
  @Type(() => Number)
  @IsOptional() @IsInt()
  sortOrder?: number;
}

// ───────── 禁言管理 ─────────

export class MuteUserDto {
  @ApiProperty({ description: "被禁言用户ID" })
  @IsString()
  @MinLength(1)
  userId: string;

  @ApiPropertyOptional({ description: "禁言时长（分钟），为空=永久禁言" })
  @Type(() => Number)
  @IsOptional() @IsInt()
  @Min(1)
  durationMinutes?: number;
}

// ───────── 秒杀管理 ─────────

export class FlashSaleDto {
  @ApiProperty({ description: "商品ID" })
  @IsString()
  @MinLength(1)
  productId: string;

  @ApiProperty({ description: "秒杀价格（币）" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  flashPrice: number;

  @ApiProperty({ description: "秒杀库存" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  stock: number;

  @ApiProperty({ description: "秒杀开始时间" })
  @IsString()
  @MinLength(1)
  startTime: string;

  @ApiProperty({ description: "秒杀结束时间" })
  @IsString()
  @MinLength(1)
  endTime: string;
}

// ── 礼物 / 评论 / 秒杀补充 DTO ──

export class CreateGiftDto {
  @ApiProperty({ description: "礼物名称" })
  @IsString() @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: "礼物图标" })
  @IsOptional() @IsString()
  icon?: string;

  @ApiProperty({ description: "价格（平台币）" })
  @IsNumber()
  @Type(() => Number)
  priceCoin: number;

  @ApiPropertyOptional({ description: "等级" })
  @IsOptional() @IsString()
  level?: string;

  @ApiPropertyOptional({ description: "排序" })
  @IsOptional() @IsInt()
  @Type(() => Number)
  sortOrder?: number;
}

export class UpdateGiftDto {
  @ApiProperty({ description: "礼物名称", required: false })
  name?: string;
  @ApiProperty({ description: "礼物图标", required: false })
  icon?: string;
  @ApiProperty({ description: "价格(金币)", required: false })
  priceCoin?: number;
  @ApiProperty({ description: "礼物等级", required: false })
  level?: string;
  @ApiProperty({ description: "状态", required: false })
  status?: string;
  @ApiProperty({ description: "排序", required: false })
  sortOrder?: number;
}

export class SendGiftDto {
  @ApiProperty({ description: "礼物ID" })
  @IsString()
  giftId: string;

  @ApiPropertyOptional({ description: "数量", default: 1 })
  @IsOptional() @IsInt() @Min(1)
  @Type(() => Number)
  quantity?: number;
}

export class SendCommentDto {
  @ApiProperty({ description: "评论内容" })
  @IsString() @MinLength(1)
  content: string;
}
