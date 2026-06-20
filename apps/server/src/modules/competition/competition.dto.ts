import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsArray, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CompetitionType, CompetitionLevel, PrizeType, ScoringModel, QuestionType } from "@prisma/client";

/** 创建赛事 */
export class CreateCompetitionDto {
  @IsString()
  title!: string;

  @IsEnum(CompetitionType)
  type!: CompetitionType;

  @ApiPropertyOptional({ description: "赛事级别 S/A/B" })
  @IsOptional()
  @IsEnum(CompetitionLevel)
  level?: CompetitionLevel;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsString()
  rules?: string;

  @IsOptional()
  @IsEnum(ScoringModel)
  scoringModel?: ScoringModel;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxParticipants?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  entryFee?: number;

  @IsOptional()
  @IsBoolean()
  isInviteOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  requireIdentity?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  minLevel?: number;

  @IsOptional()
  @IsString()
  organizerId?: string;

  @IsOptional()
  @IsString()
  organizerType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  totalPrize?: number;

  @IsOptional()
  @IsEnum(PrizeType)
  prizeType?: PrizeType;

  @IsOptional()
  @IsArray()
  prizeConfig?: PrizeConfigItem[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  invitationShare?: number;
}

/** 更新赛程（所有字段可选） */
export class UpdateRoundDto {
  @IsOptional() @IsString()
  title?: string;

  @IsOptional() @IsInt()
  sortOrder?: number;

  @IsOptional() @IsString()
  startAt?: string;

  @IsOptional() @IsString()
  endAt?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsInt() @Min(0)
  duration?: number;

  @IsOptional() @IsInt() @Min(0)
  passCount?: number;

  @IsOptional() @IsInt() @Min(0) @Max(1000)
  passPercent?: number;

  @IsOptional()
  scoringConfig?: Record<string, any>;

  @IsOptional()
  liveConfig?: Record<string, any>;
}

/** 创建赛程 */
export class CreateRoundDto {
  @IsString()
  competitionId!: string;

  @IsString()
  title!: string;

  @IsInt()
  sortOrder!: number;

  @IsString()
  startAt!: string;

  @IsString()
  endAt!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  passCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  passPercent?: number;

  @IsOptional()
  scoringConfig?: Record<string, any>;

  @IsOptional()
  liveConfig?: Record<string, any>;
}

/** 更新题目（所有字段可选） */
export class UpdateQuestionDto {
  @IsOptional() @IsString()
  roundId?: string;

  @IsOptional() @IsEnum(QuestionType)
  type?: QuestionType;

  @IsOptional() @IsInt() @Min(1)
  score?: number;

  @IsOptional() @IsInt() @Min(1) @Max(5)
  difficulty?: number;

  @IsOptional() @IsString()
  stem?: string;

  @IsOptional()
  options?: Record<string, any>[];

  @IsOptional()
  answer?: Record<string, any>;

  @IsOptional() @IsString()
  analysis?: string;

  @IsOptional() @IsString()
  source?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];
}

/** 题库 DTO */
export class CreateQuestionDto {
  @IsString()
  competitionId!: string;

  @IsOptional()
  @IsString()
  roundId?: string;

  @IsEnum(QuestionType)
  type!: QuestionType;

  @IsOptional()
  @IsInt()
  @Min(1)
  score?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @IsString()
  stem!: string;

  @IsOptional()
  options?: Record<string, any>[];

  answer!: Record<string, any>;

  @IsOptional()
  @IsString()
  analysis?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/** 批量创建题目 */
export class BatchCreateQuestionDto {
  @IsArray()
  questions!: CreateQuestionDto[];
}

/** 提交答案 */
export class SubmitAnswerDto {
  @IsString()
  registrationId!: string;

  @IsString()
  roundId!: string;

  @IsString()
  questionId!: string;

  answer!: Record<string, any>;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;
}

/** 评分 DTO (评委用·按作品) */
export class SubmitScoreDto {
  @IsInt()
  score!: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsArray()
  dimScores?: number[];
}

/** 评分 DTO (评委用) */
export class GradeAnswerDto {
  @IsInt()
  score!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

/** 奖品分配规则项 */
export class PrizeConfigItem {
  @IsString()
  rank!: string; // "1", "2", "3", "4-10"

  @IsString()
  title!: string; // "第一名", "优秀奖"

  @IsOptional()
  @IsInt()
  @Min(0)
  prize?: number; // 奖金金额（分），现金类使用

  @IsOptional()
  @IsString()
  prizeItem?: string; // 奖品名称（实物/虚拟类）

  @IsOptional()
  @IsString()
  prizeType?: string; // CASH/PHYSICAL/VIRTUAL，覆盖竞赛级设置

  @IsOptional()
  @IsString()
  description?: string; // 奖品描述
}

/** 查询赛事 */
export class QueryCompetitionDto {
  @IsOptional()
  @IsEnum(CompetitionType)
  type?: CompetitionType;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsEnum(CompetitionLevel)
  level?: CompetitionLevel;

  @IsOptional()
  @IsString()
  organizerId?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number = 20;
}

/** 更新赛事 */
export class UpdateCompetitionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(CompetitionType)
  type?: CompetitionType;

  @IsOptional()
  @IsEnum(CompetitionLevel)
  level?: CompetitionLevel;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsString()
  rules?: string;

  @IsOptional()
  @IsEnum(ScoringModel)
  scoringModel?: ScoringModel;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxParticipants?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  entryFee?: number;

  @IsOptional()
  @IsBoolean()
  isInviteOnly?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalPrize?: number;

  @IsOptional()
  @IsEnum(PrizeType)
  prizeType?: PrizeType;

  @IsOptional()
  @IsArray()
  prizeConfig?: PrizeConfigItem[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  status?: string;
}

/** 查询排名 */
export class QueryRankingDto {
  @IsString()
  competitionId!: string;

  @IsOptional()
  @IsString()
  roundId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number = 50;
}

export class UpdateRegistrationDto {
  @IsOptional() @IsString()
  status?: string;
}

export class RegisterCompetitionDto {
  @IsOptional() @IsString()
  inviterId?: string;

  @IsOptional() @IsString()
  inviteCode?: string;
}

export class BatchSubmitAnswerDto {
  @IsString()
  registrationId!: string;

  @IsArray()
  answers!: { questionId: string; answer: Record<string, any>; duration?: number }[];
}
