import { IsString, IsOptional, IsInt, IsNumber, IsBoolean, IsIn, MinLength } from "class-validator";
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

  @ApiPropertyOptional({ description: "价格（分）", default: 0 })
  @IsOptional() @Type(() => Number) @IsInt()
  price?: number;

  @ApiProperty({ description: "最大报名人数" })
  @Type(() => Number) @IsInt()
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
  @ApiProperty({ description: "订单状态" })
  status: string;
}

// ───────── 老师邀约 ─────────

export class CreateTeacherRequestDto {
  @ApiProperty({ description: "教师ID", required: false })
  teacherId?: string;
  @ApiProperty({ description: "课程标题", required: false })
  courseTitle?: string;
  @ApiProperty({ description: "课程简介", required: false })
  courseIntro?: string;
  @ApiProperty({ description: "建议费用", required: false })
  proposedFee?: number;
  @ApiProperty({ description: "建议日期", required: false })
  proposeDate?: string;
}

export class RespondTeacherRequestDto {
  @ApiProperty({ description: "响应状态" })
  status: string;
}
