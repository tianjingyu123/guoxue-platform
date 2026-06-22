import { IsString, IsOptional, IsArray, IsInt, IsNumber, IsIn, MinLength, Min, Max } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class GenerateContentDto {
  @ApiProperty({ description: "一级品类" })
  @IsString()
  @MinLength(1)
  categoryLevel1: string;

  @ApiPropertyOptional({ description: "二级品类" })
  @IsOptional()
  @IsString()
  categoryLevel2?: string;

  @ApiPropertyOptional({ description: "生成类型", isArray: true, enum: ["knowledge", "classics", "tutorial"] })
  @IsOptional()
  @IsArray()
  @IsIn(["knowledge", "classics", "tutorial"], { each: true })
  types?: ("knowledge" | "classics" | "tutorial")[];
}

export class UpdateContentGenParamsDto {
  @ApiPropertyOptional({ description: "温度参数", minimum: 0.1, maximum: 1.5 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1.5)
  temperature?: number;

  @ApiPropertyOptional({ description: "最大Token数", minimum: 256, maximum: 8192 })
  @IsOptional()
  @IsInt()
  @Min(256)
  @Max(8192)
  maxTokens?: number;

  @ApiPropertyOptional({ description: "延迟毫秒", minimum: 500, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(10000)
  delayMs?: number;

  @ApiPropertyOptional({ description: "每品类知识数量", minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  knowledgeCountPerCat?: number;

  @ApiPropertyOptional({ description: "每品类经典数量", minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  classicsCountPerCat?: number;

  @ApiPropertyOptional({ description: "每品类教程数量", minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  tutorialCountPerCat?: number;
}
