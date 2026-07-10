import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

// ───────── 圈规条文 ─────────

export class CreateRuleDto {
  @ApiProperty({ description: "条文内容", example: "友善交流，不进行人身攻击" })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  text: string;
}

export class UpdateRuleDto {
  @ApiProperty({ description: "条文内容" })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  text: string;
}

export class ReorderRulesDto {
  @ApiProperty({ description: "按新顺序排列的条文 id 列表" })
  @IsArray()
  @IsString({ each: true })
  ruleIds: string[];
}

// ───────── 治理配置 ─────────

export class UpdateGovernanceConfigDto {
  @ApiPropertyOptional({ description: "新成员加入须确认圈规" })
  @IsOptional()
  @IsBoolean()
  requireRuleAck?: boolean;

  @ApiPropertyOptional({ description: "满 N 次警告自动禁言", minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  warningThreshold?: number;

  @ApiPropertyOptional({ description: "警告 N 天自动清零", minimum: 7, maximum: 365 })
  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(365)
  warningResetDays?: number;

  @ApiPropertyOptional({ description: "自动/默认禁言天数（1/3/7/30）", enum: [1, 3, 7, 30] })
  @IsOptional()
  @IsIn([1, 3, 7, 30])
  muteDays?: number;

  @ApiPropertyOptional({ description: "移出后禁止重新加入" })
  @IsOptional()
  @IsBoolean()
  removeBanRejoin?: boolean;

  @ApiPropertyOptional({ description: "新成员发帖先审后发" })
  @IsOptional()
  @IsBoolean()
  newMemberReviewEnabled?: boolean;

  @ApiPropertyOptional({ description: "新成员先审天数", minimum: 1, maximum: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  newMemberReviewDays?: number;

  @ApiPropertyOptional({ description: "圈内敏感词开关" })
  @IsOptional()
  @IsBoolean()
  sensitiveWordsEnabled?: boolean;

  @ApiPropertyOptional({ description: "圈内自定义敏感词（最多 200 个）" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sensitiveWords?: string[];

  @ApiPropertyOptional({ description: "刷屏限制·同成员发帖最小间隔秒（0=关）", minimum: 0, maximum: 86400 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86400)
  postIntervalSeconds?: number;

  @ApiPropertyOptional({ description: "被举报自动隐藏开关" })
  @IsOptional()
  @IsBoolean()
  reportAutoHideEnabled?: boolean;

  @ApiPropertyOptional({ description: "举报满 N 人自动隐藏", minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  reportAutoHideThreshold?: number;
}

export class UpdatePermissionMatrixDto {
  @ApiProperty({
    description: "权限矩阵覆盖位 {ADMIN:{key:bool},PARTNER:{...},GUEST:{...}}·锁定项（资金/移出）忽略",
    example: { ADMIN: { "content.pin": true }, GUEST: { "content.pin": false } },
  })
  @IsObject()
  permissions: Record<string, Record<string, boolean>>;
}

// ───────── 违规处理 ─────────

export class SanctionDto {
  @ApiProperty({ description: "被处理成员 userId" })
  @IsString()
  userId: string;

  @ApiProperty({ description: "处理类型", enum: ["WARNING", "MUTE", "REMOVE"] })
  @IsIn(["WARNING", "MUTE", "REMOVE"])
  type: "WARNING" | "MUTE" | "REMOVE";

  @ApiPropertyOptional({ description: "违反的圈规条文 id" })
  @IsOptional()
  @IsString()
  ruleId?: string;

  @ApiPropertyOptional({ description: "处理说明（移出必填）" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ description: "涉及内容摘录（证据·发给被处理者）" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  evidence?: string;

  @ApiPropertyOptional({ description: "涉及内容类型 POST/COMMENT" })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiPropertyOptional({ description: "涉及内容 id" })
  @IsOptional()
  @IsString()
  contentId?: string;

  @ApiPropertyOptional({ description: "禁言天数（仅 MUTE·1/3/7/30·缺省取圈子配置）", enum: [1, 3, 7, 30] })
  @IsOptional()
  @IsIn([1, 3, 7, 30])
  muteDays?: number;
}

// ───────── 申诉 ─────────

export class CreateAppealDto {
  @ApiProperty({ description: "申诉理由" })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  content: string;
}

export class ResolveAppealDto {
  @ApiProperty({ description: "是否成立（成立=撤销处理并清记录）" })
  @IsBoolean()
  uphold: boolean;

  @ApiProperty({ description: "仲裁说明（同步给成员）" })
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  resolution: string;
}
