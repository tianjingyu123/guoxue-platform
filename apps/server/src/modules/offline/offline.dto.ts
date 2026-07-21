import { IsString, IsOptional, IsInt, IsNumber, IsBoolean, IsIn, IsArray, ArrayMaxSize, MinLength, MaxLength, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateStationDto {
  @ApiProperty({ description: "驿站名称" })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ description: "城市" })
  @IsString()
  @MinLength(1)
  city: string;

  @ApiProperty({ description: "详细地址" })
  @IsString()
  @MinLength(1)
  address: string;

  @ApiProperty({ description: "联系电话" })
  @IsString()
  @MinLength(1)
  phone: string;

  @ApiPropertyOptional({ description: "封面图" })
  @IsOptional() @IsString()
  cover?: string;

  @ApiPropertyOptional({ description: "押金金额" })
  @IsOptional() @Type(() => Number) @IsInt()
  depositAmount?: number;
}

export class CreateOfflineCourseDto {
  @ApiProperty({ description: "驿站ID" })
  @IsString()
  @MinLength(1)
  stationId: string;

  @ApiProperty({ description: "课程标题" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ description: "封面图" })
  @IsOptional() @IsString()
  cover?: string;

  @ApiPropertyOptional({ description: "课程介绍" })
  @IsOptional() @IsString()
  intro?: string;

  @ApiPropertyOptional({ description: "讲师ID" })
  @IsOptional() @IsString()
  teacherId?: string;

  @ApiPropertyOptional({ description: "价格（元，最多两位小数）", default: 0 })
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  price?: number;

  @ApiProperty({ description: "最大报名人数" })
  @Type(() => Number) @IsInt() @Min(1) @Max(10000)
  maxStudents: number;

  @ApiProperty({ description: "开始时间" })
  @IsString()
  @MinLength(1)
  startTime: string;

  @ApiProperty({ description: "结束时间" })
  @IsString()
  @MinLength(1)
  endTime: string;

  @ApiProperty({ description: "上课地点" })
  @IsString()
  @MinLength(1)
  location: string;
}

export class UpdateOfflineCourseDto {
  @ApiPropertyOptional({ description: "课程标题" })
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ description: "封面图" })
  @IsOptional() @IsString() @MaxLength(500)
  cover?: string;

  @ApiPropertyOptional({ description: "课程介绍" })
  @IsOptional() @IsString() @MaxLength(5000)
  intro?: string;

  @ApiPropertyOptional({ description: "本驿站讲师ID" })
  @IsOptional() @IsString() @MinLength(1)
  teacherId?: string;

  @ApiPropertyOptional({ description: "价格（元，最多两位小数）" })
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: "最大报名人数" })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000)
  maxStudents?: number;

  @ApiPropertyOptional({ description: "开始时间" })
  @IsOptional() @IsString() @MinLength(1)
  startTime?: string;

  @ApiPropertyOptional({ description: "结束时间" })
  @IsOptional() @IsString() @MinLength(1)
  endTime?: string;

  @ApiPropertyOptional({ description: "上课地点" })
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200)
  location?: string;
}

export class UpdateMemberDto {
  @IsOptional() @IsString()
  role?: string;

  @IsOptional() @IsString()
  status?: string;
}

export class AuditStationDto {
  @ApiProperty({ description: "审核状态: ACTIVE/DISABLED" })
  @IsString()
  @MinLength(1)
  status: string;
}

// ───────── 课程报名 ─────────

export class RegisterCourseDto {
  @ApiProperty({ description: "课程ID" })
  @IsString()
  @MinLength(1)
  courseId: string;
}

export class SignInCourseDto {
  @ApiProperty({ description: "签到码/QR码" })
  @IsString()
  @MinLength(1)
  qrCode: string;
}

export class VerifyByCodeDto {
  @ApiProperty({ description: "课程ID" })
  @IsString()
  @MinLength(1)
  courseId: string;

  @ApiProperty({ description: "学员口报的6位到店核销码" })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}

// ───────── 驿站商品 ─────────

export class CreateProductDto {
  @ApiProperty({ description: "商品名称" })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ description: "价格（分）" })
  @Type(() => Number) @IsNumber()
  price: number;

  @ApiPropertyOptional({ description: "库存", default: 0 })
  @IsOptional() @Type(() => Number) @IsInt()
  stock?: number;

  @ApiPropertyOptional({ description: "是否为平台代销", default: false })
  @IsOptional() @IsBoolean()
  isPlatform?: boolean;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ description: "商品名称" })
  @IsOptional() @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "价格（分）" })
  @IsOptional() @Type(() => Number) @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: "库存" })
  @IsOptional() @Type(() => Number) @IsInt()
  stock?: number;

  @ApiPropertyOptional({ description: "状态: ACTIVE/INACTIVE" })
  @IsOptional() @IsString()
  status?: string;
}

// ───────── 师资预约 ─────────

export class CreateTeacherBookingDto {
  @ApiProperty({ description: "讲师ID" })
  @IsString()
  @MinLength(1)
  teacherId: string;

  @ApiProperty({ description: "关联课程ID" })
  @IsOptional() @IsString()
  courseId?: string;

  @ApiProperty({ description: "预约日期" })
  @IsString()
  @MinLength(1)
  bookingDate: string;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional() @IsString()
  remark?: string;
}

// ───────── 订单 ─────────

export class CreateStationOrderDto {
  @ApiProperty({ description: "订单类型: OFFLINE_COURSE/PRODUCT/SERVICE" })
  @IsString()
  @MinLength(1)
  orderType: string;

  @ApiProperty({ description: "目标ID（课程ID或商品ID）" })
  @IsString()
  @MinLength(1)
  targetId: string;

  @ApiProperty({ description: "金额（分）" })
  @Type(() => Number) @IsNumber()
  amount: number;
}

// ───────── 结算 ─────────

export class CreateSettlementDto {
  @ApiProperty({ description: "结算周期，如 2026-05" })
  @IsString()
  @MinLength(1)
  period: string;

  @ApiProperty({ description: "驿站收入总额" })
  @Type(() => Number) @IsNumber()
  totalIncome: number;
}

// ───────── 课程审核 ─────────

export class AuditCourseDto {
  @ApiProperty({ description: "审核状态: APPROVED/REJECTED" })
  @IsString() @IsIn(["APPROVED", "REJECTED"])
  auditStatus: string;

  @ApiPropertyOptional({ description: "审核原因/驳回理由" })
  @IsOptional() @IsString()
  reason?: string;
}

// ───────── 订单状态更新 ─────────

export class UpdateOrderStatusDto {
  // ⚠️ 必须带 class-validator 装饰器，否则 ValidationPipe(whitelist:true) 会 strip 掉 status→改状态失效
  @ApiProperty({ description: "订单状态" })
  @IsString() @MinLength(1)
  status: string;
}

// ───────── 老师邀约 ─────────

export class CreateTeacherRequestDto {
  // ⚠️ 每个字段必须带 class-validator 装饰器，否则 whitelist:true 会静默 strip→创建丢字段
  @ApiProperty({ description: "教师ID", required: false })
  @IsOptional() @IsString()
  teacherId?: string;
  @ApiProperty({ description: "课程标题", required: false })
  @IsOptional() @IsString()
  courseTitle?: string;
  @ApiProperty({ description: "课程简介", required: false })
  @IsOptional() @IsString()
  courseIntro?: string;
  @ApiProperty({ description: "建议费用", required: false })
  @IsOptional() @IsNumber()
  proposedFee?: number;
  @ApiProperty({ description: "建议日期", required: false })
  @IsOptional() @IsString()
  proposeDate?: string;
}

export class RespondTeacherRequestDto {
  // ⚠️ 需 class-validator 装饰器，否则 whitelist:true 会 strip 掉 status→讲师邀约响应失效
  @ApiProperty({ description: "响应状态" })
  @IsString() @MinLength(1)
  status: string;
}

// ───────── 驿站活动系统（T8 OMO P1a） ─────────

/** 活动类型：YAJI雅集 / SALON沙龙 / READING读书会 / SOLAR_TERM节气活动 / EXPERIENCE体验课 */
export const STATION_EVENT_TYPES = ["YAJI", "SALON", "READING", "SOLAR_TERM", "EXPERIENCE"] as const;

export class CreateStationEventDto {
  @ApiProperty({ description: "活动标题" })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string;

  @ApiProperty({ description: "活动类型: YAJI雅集/SALON沙龙/READING读书会/SOLAR_TERM节气活动/EXPERIENCE体验课", enum: STATION_EVENT_TYPES })
  @IsString() @IsIn([...STATION_EVENT_TYPES])
  type: string;

  @ApiPropertyOptional({ description: "封面图" })
  @IsOptional() @IsString()
  cover?: string;

  @ApiPropertyOptional({ description: "活动详情介绍" })
  @IsOptional() @IsString()
  intro?: string;

  @ApiPropertyOptional({ description: "价格（本期免费报名，字段留支付门控后启用）", default: 0 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  price?: number;

  @ApiProperty({ description: "最大参与人数" })
  @Type(() => Number) @IsInt() @Min(1)
  maxAttendees: number;

  @ApiProperty({ description: "开场时间" })
  @IsString()
  @MinLength(1)
  startTime: string;

  @ApiProperty({ description: "结束时间" })
  @IsString()
  @MinLength(1)
  endTime: string;

  @ApiProperty({ description: "活动地点" })
  @IsString()
  @MinLength(1)
  location: string;
}

export class UpdateStationEventDto {
  @ApiPropertyOptional({ description: "活动标题" })
  @IsOptional() @IsString() @MinLength(1) @MaxLength(50)
  title?: string;

  @ApiPropertyOptional({ description: "活动类型", enum: STATION_EVENT_TYPES })
  @IsOptional() @IsString() @IsIn([...STATION_EVENT_TYPES])
  type?: string;

  @ApiPropertyOptional({ description: "封面图" })
  @IsOptional() @IsString()
  cover?: string;

  @ApiPropertyOptional({ description: "活动详情介绍" })
  @IsOptional() @IsString()
  intro?: string;

  @ApiPropertyOptional({ description: "价格" })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: "最大参与人数" })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  maxAttendees?: number;

  @ApiPropertyOptional({ description: "开场时间" })
  @IsOptional() @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: "结束时间" })
  @IsOptional() @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: "活动地点" })
  @IsOptional() @IsString()
  location?: string;
}

export class UpdateStationEventStatusDto {
  @ApiProperty({ description: "状态操作: publish发布/cancel取消（群发通知报名者）/finish结束", enum: ["publish", "cancel", "finish"] })
  @IsString() @IsIn(["publish", "cancel", "finish"])
  action: "publish" | "cancel" | "finish";
}

export class SignInEventDto {
  @ApiProperty({ description: "活动签到码/QR码" })
  @IsString()
  @MinLength(1)
  qrCode: string;
}

export class UpdateEventPhotosDto {
  @ApiProperty({ description: "回顾照片 URL 数组（最多 30 张）", type: [String] })
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  photos: string[];
}

// ───────── 品牌主页（驿-P1） ─────────

export class UpdateStationBrandDto {
  @ApiPropertyOptional({ description: "驿站故事（品牌主页正文，≤3000字）" })
  @IsOptional() @IsString() @MaxLength(3000)
  brandStory?: string;

  @ApiPropertyOptional({ description: "品牌相册 URL 数组（环境照片墙，最多 30 张）", type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({ description: "讲师阵容（本驿站 StationTeacher.id 数组，按展示顺序，最多 12 位）", type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  featuredTeacherIds?: string[];
}

// ───────── 课后评价（T8 OMO） ─────────

export class CreateCourseReviewDto {
  @ApiProperty({ description: "评分 1-5 星" })
  @Type(() => Number) @IsInt() @Min(1) @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: "评价内容（≤500字）" })
  @IsOptional() @IsString() @MaxLength(500)
  content?: string;
}
