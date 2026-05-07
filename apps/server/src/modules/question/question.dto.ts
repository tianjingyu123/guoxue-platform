import { IsString, IsInt, IsOptional, IsArray, Min, MaxLength } from "class-validator";

export class AskQuestionDto {
  @IsString()
  circleId: string;

  @IsString()
  answererId: string;

  @IsString()
  @MaxLength(500)
  question: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsInt()
  @Min(10)
  priceCoin: number; // 提问价格

  @IsOptional()
  @IsInt()
  @Min(1)
  peekPriceCoin?: number; // 围观价格，默认0=不可围观
}

export class AnswerQuestionDto {
  @IsString()
  @MaxLength(2000)
  answer: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class QuestionQueryDto {
  @IsOptional()
  @IsString()
  circleId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @IsInt()
  pageSize?: number = 20;
}
