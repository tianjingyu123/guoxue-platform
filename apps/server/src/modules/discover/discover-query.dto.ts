import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsInt, Min, Max, IsString, IsIn } from "class-validator";
import { Type } from "class-transformer";

export class DiscoverQueryDto {
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页条数", default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: "内容类型筛选", enum: ["content", "course", "product", "classic", "bot"] })
  @IsOptional()
  @IsString()
  @IsIn(["content", "course", "product", "classic", "bot"])
  type?: string;

  @ApiPropertyOptional({ description: "一级品类筛选" })
  @IsOptional()
  @IsString()
  categoryLevel1?: string;

  @ApiPropertyOptional({ description: "二级品类筛选" })
  @IsOptional()
  @IsString()
  categoryLevel2?: string;
}
