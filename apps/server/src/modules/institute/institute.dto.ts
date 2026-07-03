import { IsString, IsInt, IsOptional, IsNumber, IsBoolean, Min, Max, MinLength, MaxLength, IsIn, NotEquals } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class JoinInstituteDto {
  @ApiProperty({ description: "成员角色: INITIATOR/TYPE_A/TYPE_B" })
  @IsString()
  @MinLength(1)
  role: string;

  @ApiProperty({ description: "加入年份", example: 2026 })
  @Type(() => Number)
  @IsInt()
  joinYear: number;

  @ApiPropertyOptional({ description: "保证金金额（元）", default: 10000 })
  @Type(() => Number)
  @IsOptional() @IsNumber()
  deposit?: number;

  @ApiPropertyOptional({ description: "席位类型：LECTURE讲席（分享席·积分考核）/ STUDY研修席（学习席）", default: "LECTURE" })
  @IsOptional() @IsString()
  @IsIn(["LECTURE", "STUDY"])
  seatType?: string;
}

export class InviteMemberDto {
  @ApiProperty({ description: "被特邀用户ID" })
  @IsString()
  @MinLength(1)
  userId: string;

  @ApiPropertyOptional({ description: "席位类型：LECTURE讲席（默认）/ STUDY研修席", default: "LECTURE" })
  @IsOptional() @IsString()
  @IsIn(["LECTURE", "STUDY"])
  seatType?: string;

  @ApiPropertyOptional({ description: "永久免会费（名师破格·豁免返还与转席·分享积分照记）", default: false })
  @IsOptional() @IsBoolean()
  feeExempt?: boolean;

  @ApiPropertyOptional({ description: "特邀备注（引入缘由·操作留痕）" })
  @IsOptional() @IsString()
  @MaxLength(500)
  remark?: string;
}

export class AddSharePointDto {
  @ApiPropertyOptional({
    description: "积分类型（缺省 MANUAL）: OFFLINE_STATION/SALON_MONTHLY/QUARTERLY_EVENT/INSTITUTE_SALON/LIVE_COURSE/ARTICLE/MENTORING/QA/MANUAL",
    default: "MANUAL",
  })
  @IsOptional() @IsString()
  @IsIn(["OFFLINE_STATION", "SALON_MONTHLY", "QUARTERLY_EVENT", "INSTITUTE_SALON", "LIVE_COURSE", "ARTICLE", "MENTORING", "QA", "MANUAL"])
  pointType?: string;

  @ApiProperty({ description: "积分（非零整数·可负=人工纠错）", example: 20 })
  @Type(() => Number)
  @IsInt()
  @NotEquals(0)
  @Min(-1000)
  @Max(1000)
  points: number;

  @ApiPropertyOptional({ description: "关联来源ID（如活动ID）" })
  @IsOptional() @IsString()
  refId?: string;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional() @IsString()
  @MaxLength(500)
  remark?: string;
}

export class CreateTaskDto {
  @ApiProperty({ description: "任务类型: SALON/LIVE/ARTICLE" })
  @IsString()
  @MinLength(1)
  taskType: string;

  @ApiProperty({ description: "任务标题" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ description: "任务说明" })
  @IsOptional() @IsString()
  description?: string;
}

export class VerifyTaskDto {
  @ApiPropertyOptional({ description: "验证结果", default: "VERIFIED" })
  @IsOptional() @IsString()
  result?: string;
}

export class CreateEventDto {
  @ApiProperty({ description: "活动标题" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ description: "活动类型: SALON/LIVE/COURSE" })
  @IsString()
  @MinLength(1)
  type: string;

  @ApiPropertyOptional({ description: "讲师用户ID" })
  @IsOptional() @IsString()
  lecturerId?: string;

  @ApiPropertyOptional({ description: "活动描述" })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "活动地点/链接" })
  @IsOptional() @IsString()
  location?: string;

  @ApiProperty({ description: "排期时间" })
  @IsString()
  @MinLength(1)
  scheduleAt: string;

  @ApiPropertyOptional({ description: "最大参与人数", default: 50 })
  @Type(() => Number)
  @IsOptional() @IsInt()
  @Min(1)
  maxAttendees?: number;

  @ApiPropertyOptional({ description: "研究院ID" })
  @IsOptional() @IsString()
  instituteId?: string;
}

export class UpdateLecturerLevelDto {
  @ApiProperty({ description: "讲师等级: NONE/PREPARATORY/JUNIOR/SENIOR/SIGNED" })
  @IsString()
  @MinLength(1)
  lecturerLevel: string;
}

export class CreateTaskTemplateDto {
  @ApiProperty({ description: "任务类型: SALON/LIVE/ARTICLE/OFFLINE_EVENT/CIRCLE_MEMBER_COUNT/CIRCLE_DAYS" })
  @IsString()
  taskType: string;

  @ApiProperty({ description: "任务标题" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ description: "说明" })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "年度要求完成次数", default: 1 })
  @Type(() => Number)
  @IsOptional() @IsInt()
  requiredCount?: number;

  @ApiPropertyOptional({ description: "周期单位: MONTH/QUARTER/YEAR", default: "YEAR" })
  @IsOptional() @IsString()
  periodUnit?: string;

  @ApiPropertyOptional({ description: "排序" })
  @Type(() => Number)
  @IsOptional() @IsInt()
  sortOrder?: number;
}

export class CreateDividendDto {
  @ApiProperty({ description: "分红对象用户ID" })
  @IsString()
  userId: string;

  @ApiProperty({ description: "类型: MGMT_BONUS/TEACHER_AWARD/OPERATION" })
  @IsString()
  type: string;

  @ApiProperty({ description: "金额" })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: "说明" })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "结算周期", example: "2026-Q1" })
  @IsOptional() @IsString()
  period?: string;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ description: "活动状态" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "活动标题" })
  @IsOptional() @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "活动描述" })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "活动地点/链接" })
  @IsOptional() @IsString()
  location?: string;
}

export class ApproveMemberDto {
  @ApiProperty({ description: "审核结果: ACTIVE/REJECTED" })
  @IsString()
  @IsIn(["ACTIVE", "REJECTED"])
  status: string;

  @ApiPropertyOptional({ description: "拒绝原因" })
  @IsOptional() @IsString()
  reason?: string;
}

export class AssignRoleDto {
  @ApiProperty({ description: "角色: PRESIDENT/VICE_PRESIDENT/SECRETARY_GENERAL" })
  @IsString()
  role: string;
}

export class UpdateMemberDto {
  @ApiPropertyOptional({ description: "角色" })
  @IsOptional() @IsString()
  role?: string;

  @ApiPropertyOptional({ description: "状态" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "保证金" })
  @IsOptional() @IsNumber()
  @Type(() => Number)
  deposit?: number;
}

export class RecommendToTalentDto {
  @ApiProperty({ description: "讲师等级" })
  @IsString()
  lecturerLevel: string;
}
