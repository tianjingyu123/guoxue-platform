import { IsString, IsOptional, IsArray, IsInt, IsNumber, MinLength } from "class-validator";
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

  @ApiPropertyOptional({ description: "生成类型" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  types?: ("knowledge" | "classics" | "tutorial")[];
}

export class UpdateContentGenParamsDto {
  @ApiPropertyOptional({ description: "温度参数" })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ description: "最大Token数" })
  @IsOptional()
  @IsInt()
  maxTokens?: number;

  @ApiPropertyOptional({ description: "延迟毫秒" })
  @IsOptional()
  @IsInt()
  delayMs?: number;

  @ApiPropertyOptional({ description: "每品类知识数量" })
  @IsOptional()
  @IsInt()
  knowledgeCountPerCat?: number;

  @ApiPropertyOptional({ description: "每品类经典数量" })
  @IsOptional()
  @IsInt()
  classicsCountPerCat?: number;

  @ApiPropertyOptional({ description: "每品类教程数量" })
  @IsOptional()
  @IsInt()
  tutorialCountPerCat?: number;
}
