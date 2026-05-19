import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsArray, Min, Max } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CompetitionType, CompetitionLevel, ScoringModel, QuestionType } from "@prisma/client";

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
  @IsInt()
  @Min(0)
  @Max(1000)
  invitationShare?: number;
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

/** 评分 DTO (评委用) */
export class GradeAnswerDto {
  @IsInt()
  score!: number;

  @IsOptional()
  @IsString()
  comment?: string;
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
  @IsInt()
  page?: number = 1;

  @IsOptional()
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
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @IsInt()
  pageSize?: number = 50;
}
