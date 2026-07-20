import {
  IsString,
  IsInt,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsIn,
  Matches,
  NotEquals,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class JoinInstituteDto {
  @ApiProperty({ description: "成员角色: INITIATOR/TYPE_A/TYPE_B" })
  @IsString()
  @IsIn(["INITIATOR", "TYPE_A", "TYPE_B"])
  role: string;

  @ApiProperty({ description: "加入年份", example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  joinYear: number;

  // 保证金金额由服务端固定（防客户端传任意/负数金额），不从 body 收取

  @ApiPropertyOptional({
    description: "席位类型：LECTURE讲席（分享席·积分考核）/ STUDY研修席（学习席）",
    default: "LECTURE",
  })
  @IsOptional()
  @IsString()
  @IsIn(["LECTURE", "STUDY"])
  seatType?: string;
}

export class InviteMemberDto {
  @ApiProperty({ description: "被特邀用户ID" })
  @IsString()
  @MinLength(1)
  userId: string;

  @ApiPropertyOptional({
    description: "席位类型：LECTURE讲席（默认）/ STUDY研修席",
    default: "LECTURE",
  })
  @IsOptional()
  @IsString()
  @IsIn(["LECTURE", "STUDY"])
  seatType?: string;

  @ApiPropertyOptional({
    description: "永久免会费（名师破格·豁免返还与转席·分享积分照记）",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  feeExempt?: boolean;

  @ApiPropertyOptional({ description: "特邀备注（引入缘由·操作留痕）" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}

export class AddSharePointDto {
  @ApiPropertyOptional({
    description:
      "积分类型（缺省 MANUAL）: OFFLINE_STATION/SALON_MONTHLY/QUARTERLY_EVENT/INSTITUTE_SALON/LIVE_COURSE/ARTICLE/MENTORING/QA/MANUAL",
    default: "MANUAL",
  })
  @IsOptional()
  @IsString()
  @IsIn([
    "OFFLINE_STATION",
    "SALON_MONTHLY",
    "QUARTERLY_EVENT",
    "INSTITUTE_SALON",
    "LIVE_COURSE",
    "ARTICLE",
    "MENTORING",
    "QA",
    "MANUAL",
  ])
  pointType?: string;

  @ApiProperty({ description: "积分（非零整数·可负=人工纠错）", example: 20 })
  @Type(() => Number)
  @IsInt()
  @NotEquals(0)
  @Min(-1000)
  @Max(1000)
  points: number;

  @ApiPropertyOptional({ description: "关联来源ID（如活动ID）" })
  @IsOptional()
  @IsString()
  refId?: string;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}

export class CreateTaskDto {
  @ApiProperty({ description: "任务类型: SALON/LIVE/ARTICLE" })
  @IsString()
  @IsIn(["SALON", "LIVE", "ARTICLE", "OFFLINE_EVENT", "CIRCLE_MEMBER_COUNT", "CIRCLE_DAYS"])
  taskType: string;

  @ApiProperty({ description: "任务标题" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ description: "任务说明" })
  @IsOptional()
  @IsString()
  description?: string;
}

export class VerifyTaskDto {
  @ApiPropertyOptional({ description: "验证结果", default: "VERIFIED" })
  @IsOptional()
  @IsString()
  result?: string;
}

export class CreateEventDto {
  @ApiProperty({ description: "活动标题" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ description: "活动类型: SALON/LIVE/COURSE" })
  @IsString()
  @IsIn(["SALON", "LIVE", "COURSE"])
  type: string;

  @ApiPropertyOptional({ description: "讲师用户ID" })
  @IsOptional()
  @IsString()
  lecturerId?: string;

  @ApiPropertyOptional({ description: "活动描述" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "活动地点/链接" })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: "排期时间" })
  @IsDateString()
  scheduleAt: string;

  @ApiPropertyOptional({ description: "最大参与人数", default: 50 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxAttendees?: number;

  @ApiPropertyOptional({ description: "研究院ID" })
  @IsOptional()
  @IsString()
  instituteId?: string;
}

export class UpdateLecturerLevelDto {
  @ApiProperty({ description: "讲师等级: NONE/PREPARATORY/JUNIOR/SENIOR/SIGNED" })
  @IsString()
  @IsIn(["NONE", "PREPARATORY", "JUNIOR", "SENIOR", "SIGNED"])
  lecturerLevel: string;
}

export class CreateTaskTemplateDto {
  // 字段名 title/requiredCount/periodUnit 为既有前后端契约，保持不改（前端并行对齐）；仅校验消息人话化
  @ApiProperty({
    description: "任务类型: SALON/LIVE/ARTICLE/OFFLINE_EVENT/CIRCLE_MEMBER_COUNT/CIRCLE_DAYS",
  })
  @IsString({ message: "任务类型必填" })
  taskType: string;

  @ApiProperty({ description: "任务标题" })
  @IsString({ message: "任务名称必填" })
  @MinLength(1, { message: "任务名称必填" })
  title: string;

  @ApiPropertyOptional({ description: "说明" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "年度要求完成次数", default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: "要求完成次数需为整数" })
  requiredCount?: number;

  @ApiPropertyOptional({ description: "周期单位: MONTH/QUARTER/YEAR", default: "YEAR" })
  @IsOptional()
  @IsString({ message: "周期单位格式不正确" })
  periodUnit?: string;

  @ApiPropertyOptional({ description: "排序" })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: "排序值需为整数" })
  sortOrder?: number;
}

export class CreateDividendDto {
  @ApiProperty({ description: "分红对象用户ID" })
  @IsString()
  userId: string;

  @ApiProperty({ description: "类型: MGMT_BONUS/TEACHER_AWARD/OPERATION" })
  @IsString()
  @IsIn(["MGMT_BONUS", "TEACHER_AWARD", "OPERATION"])
  type: string;

  @ApiProperty({ description: "金额（元·单笔上限 100 万·仍走 FundApproval 人工审批）" })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(1000000)
  amount: number;

  @ApiPropertyOptional({ description: "说明" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "结算周期", example: "2026-Q1" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}(?:-Q[1-4])?$/)
  period?: string;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ description: "活动状态" })
  @IsOptional()
  @IsString()
  @IsIn(["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"])
  status?: string;

  @ApiPropertyOptional({ description: "活动标题" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "活动描述" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "活动地点/链接" })
  @IsOptional()
  @IsString()
  location?: string;
}

export class ApproveMemberDto {
  @ApiProperty({ description: "审核结果: ACTIVE/REJECTED" })
  @IsString()
  @IsIn(["ACTIVE", "REJECTED"])
  status: string;

  @ApiPropertyOptional({ description: "拒绝原因" })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AssignRoleDto {
  @ApiProperty({ description: "角色: PRESIDENT/VICE_PRESIDENT/SECRETARY_GENERAL" })
  @IsString()
  @IsIn(["PRESIDENT", "VICE_PRESIDENT", "SECRETARY_GENERAL"])
  role: string;
}

export class UpdateMemberDto {
  @ApiPropertyOptional({ description: "角色" })
  @IsOptional()
  @IsString()
  @IsIn(["INITIATOR", "TYPE_A", "TYPE_B", "PRESIDENT", "VICE_PRESIDENT", "SECRETARY_GENERAL"])
  role?: string;

  @ApiPropertyOptional({ description: "状态" })
  @IsOptional()
  @IsString()
  @IsIn(["PENDING", "ACTIVE", "REJECTED", "GRADUATED", "SUSPENDED"])
  status?: string;

  @ApiPropertyOptional({ description: "年度任务要求" })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  tasksRequired?: number;
}
export class RecommendToTalentDto {
  @ApiProperty({ description: "讲师等级" })
  @IsString()
  @IsIn(["PREPARATORY", "JUNIOR", "SENIOR", "SIGNED"])
  lecturerLevel: string;
}

export class CreateBoardGroupDto {
  @ApiProperty({ description: "小组名（≤20 字·圈名为「私董会·{name}」）", example: "破局一组" })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  name: string;

  @ApiPropertyOptional({ description: "当期课题/小组主题（≤100 字）" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  topic?: string;

  @ApiProperty({ description: "组长 userId（即圈主·须为本院 ACTIVE 讲席成员）" })
  @IsString()
  @MinLength(1)
  leaderId: string;

  @ApiPropertyOptional({ description: "满员软约束（6-20 人）", default: 12 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(6)
  @Max(20)
  memberLimit?: number;
}

/** 研-P1 大师讲座归档：选定回放（直接 URL 或直播间回放）→ 沉淀为 Course(courseOrigin=INSTITUTE_LECTURE) */
export class ArchiveLectureDto {
  @ApiPropertyOptional({ description: "回放视频 URL（与 liveRoomId 二选一，同传以本字段为准）" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  videoUrl?: string;

  @ApiPropertyOptional({ description: "直播间 ID（取其 replayUrl 作回放·与 videoUrl 二选一）" })
  @IsOptional()
  @IsString()
  liveRoomId?: string;

  @ApiProperty({ description: "讲师 userId（须为本院 ACTIVE 成员·讲座课程归属该讲师名下）" })
  @IsString()
  @MinLength(1)
  lecturerUserId: string;

  @ApiProperty({ description: "讲座标题", example: "阳明心学与现代经营" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({ description: "讲座简介" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  intro?: string;

  @ApiPropertyOptional({ description: "封面图 URL" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  cover?: string;

  @ApiPropertyOptional({ description: "讲义资料 URL（归档为第二章节）" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  materialUrl?: string;

  @ApiPropertyOptional({ description: "定价（元·0=免费·定价模式待拍板）", default: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9999)
  price?: number;
}
