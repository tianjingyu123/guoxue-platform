import { IsString, IsOptional, IsArray } from "class-validator";

export class ScoreDto {
  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsString()
  scene?: string;

  @IsOptional()
  @IsString()
  referenceAnswer?: string;
}

export class ScoreBatchDto {
  @IsArray()
  items!: ScoreDto[];
}
