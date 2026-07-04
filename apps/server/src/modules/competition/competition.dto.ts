import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsArray, IsIn, IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CompetitionType, CompetitionLevel, PrizeType, ScoringModel, QuestionType } from "@prisma/client";

/** 阶段配置项（stagesConfig 数组元素·深度校验在 CompetitionAdminService） */
export interface StageConfigItem {
  seq?: number; // 可省略，按数组顺序 1 起补齐
  name: string;
  format?: string; // QUIZ | LIVE_PK，默认 QUIZ
  startAt: string;
  endAt: string;
  advanceRule?: { type: "count" | "percent"; value: number }; // 最后阶段可空
}

/** 评审团成员（judgePanel 数组元素） */
export interface JudgePanelItem {
  userId: string;
  title?: string; // 头衔
  weight?: number; // 权重（默认均分）
}

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

  // ── 二期·赛事创建系统增量 ──

  @ApiPropertyOptional({ description: "赛制 QUIZ|LIVE_PK|HYBRID" })
  @IsOptional()
  @IsIn(["QUIZ", "LIVE_PK", "HYBRID"])
  format?: string;

  @ApiPropertyOptional({ description: "阶段配置数组（时间不重叠递增·晋级规则合法）" })
  @IsOptional()
  @IsArray()
  stagesConfig?: StageConfigItem[];

  @ApiPropertyOptional({ description: "评审团 [{userId,title,weight}]" })
  @IsOptional()
  @IsArray()
  judgePanel?: JudgePanelItem[];

  @ApiPropertyOptional({ description: "观众票权重 0-0.3" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.3)
  voteWeight?: number;

  @ApiPropertyOptional({ description: "奖品配置 [{rank,title,prize,description}]" })
  @IsOptional()
  @IsArray()
  prizes?: Record<string, any>[];

  @ApiPropertyOptional({ description: "报名是否必须勾选《赛后分享承诺》" })
  @IsOptional()
  @IsBoolean()
  shareCommitmentRequired?: boolean;
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

  // ── 二期·赛事创建系统增量 ──

  @IsOptional()
  @IsIn(["QUIZ", "LIVE_PK", "HYBRID"])
  format?: string;

  @IsOptional()
  @IsArray()
  stagesConfig?: StageConfigItem[];

  @IsOptional()
  @IsArray()
  judgePanel?: JudgePanelItem[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.3)
  voteWeight?: number;

  @IsOptional()
  @IsArray()
  prizes?: Record<string, any>[];

  @IsOptional()
  @IsBoolean()
  shareCommitmentRequired?: boolean;
}

/** 难度分布（AI组卷） */
export class DifficultyMixDto {
  @IsOptional() @IsNumber() @Min(0)
  easy?: number; // 难度1-2占比权重

  @IsOptional() @IsNumber() @Min(0)
  medium?: number; // 难度3占比权重

  @IsOptional() @IsNumber() @Min(0)
  hard?: number; // 难度4-5占比权重
}

/** AI组卷（纯规则：按难度/分类分布从题库随机抽题） */
export class GeneratePaperDto {
  @IsInt()
  @Min(1)
  @Max(200)
  count!: number;

  @IsOptional()
  @Type(() => DifficultyMixDto)
  difficultyMix?: DifficultyMixDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[]; // 匹配题目 tags（知识点标签）
}

/** 查询排名 */
export class QueryRankingDto {
  // competitionId 实际由 controller 从 path param 注入，@Query 校验时不应必填
  @IsOptional()
  @IsString()
  competitionId?: string;

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
