import { IsString, IsOptional, IsInt, IsNumber, IsBoolean } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateStationDto {
  @ApiProperty({ description: "驿站名称" })
  @IsString()
  name: string;

  @ApiProperty({ description: "城市" })
  @IsString()
  city: string;

  @ApiProperty({ description: "详细地址" })
  @IsString()
  address: string;

  @ApiProperty({ description: "联系电话" })
  @IsString()
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
  stationId: string;

  @ApiProperty({ description: "课程标题" })
  @IsString()
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
  startTime: string;

  @ApiProperty({ description: "结束时间" })
  @IsString()
  endTime: string;

  @ApiProperty({ description: "上课地点" })
  @IsString()
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
  status: string;
}

// ───────── 课程报名 ─────────

export class RegisterCourseDto {
  @ApiProperty({ description: "课程ID" })
  @IsString()
  courseId: string;
}

export class SignInCourseDto {
  @ApiProperty({ description: "签到码/QR码" })
  @IsString()
  qrCode: string;
}

// ───────── 驿站商品 ─────────

export class CreateProductDto {
  @ApiProperty({ description: "商品名称" })
  @IsString()
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
  teacherId: string;

  @ApiProperty({ description: "关联课程ID" })
  @IsOptional() @IsString()
  courseId?: string;

  @ApiProperty({ description: "预约日期" })
  @IsString()
  bookingDate: string;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional() @IsString()
  remark?: string;
}

// ───────── 订单 ─────────

export class CreateStationOrderDto {
  @ApiProperty({ description: "订单类型: OFFLINE_COURSE/PRODUCT/SERVICE" })
  @IsString()
  orderType: string;

  @ApiProperty({ description: "目标ID（课程ID或商品ID）" })
  @IsString()
  targetId: string;

  @ApiProperty({ description: "金额（分）" })
  @Type(() => Number) @IsNumber()
  amount: number;
}

// ───────── 结算 ─────────

export class CreateSettlementDto {
  @ApiProperty({ description: "结算周期，如 2026-05" })
  @IsString()
  period: string;

  @ApiProperty({ description: "驿站收入总额" })
  @Type(() => Number) @IsNumber()
  totalIncome: number;
}
