import { IsString, IsOptional, IsIn, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class DedupDecideDto {
  @ApiProperty({ description: "决策: override=覆盖, keepBoth=双保留, keepExisting=保留已有" })
  @IsString() @IsIn(["override", "keepBoth", "keepExisting"])
  decision: string;

  @ApiPropertyOptional({ description: "决策原因" })
  @IsOptional() @IsString()
  reason?: string;
}

export class DedupBatchItemDto {
  @ApiProperty({ description: "候选ID" })
  @IsString()
  candidateId: string;

  @ApiProperty({ description: "决策" })
  @IsString() @IsIn(["override", "keepBoth", "keepExisting"])
  decision: string;

  @ApiPropertyOptional({ description: "原因" })
  @IsOptional() @IsString()
  reason?: string;
}

export class DedupBatchDto {
  @ApiProperty({ description: "批量决策列表" })
  @IsArray() @ValidateNested({ each: true }) @Type(() => DedupBatchItemDto)
  items: DedupBatchItemDto[];
}

export class DedupCandidateQueryDto {
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: "每页条数", default: 20 })
  @IsOptional() @Type(() => Number)
  pageSize?: number;

  @ApiPropertyOptional({ description: "状态筛选: pending/confirmed/rejected" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "圈子ID筛选" })
  @IsOptional() @IsString()
  circleId?: string;

  @ApiPropertyOptional({ description: "最低相似度筛选" })
  @IsOptional() @Type(() => Number)
  minSimilarity?: number;
}
