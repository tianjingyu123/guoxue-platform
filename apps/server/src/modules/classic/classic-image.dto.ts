import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsInt, IsUrl, Min } from "class-validator";
import { Type } from "class-transformer";

export class ImageListQueryDto {
  @ApiPropertyOptional({ description: "图像来源过滤" })
  @IsOptional()
  @IsString()
  source?: string;
}

export class CreateImageDto {
  @ApiProperty({ description: "页码" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNumber: number;

  @ApiPropertyOptional({ description: "页面标签" })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: "IIIF 图像 URL" })
  @IsOptional()
  @IsUrl()
  iiifUrl?: string;

  @ApiPropertyOptional({ description: "IIIF Manifest URL" })
  @IsOptional()
  @IsUrl()
  manifestUrl?: string;

  @ApiPropertyOptional({ description: "图像宽度" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  width?: number;

  @ApiPropertyOptional({ description: "图像高度" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  height?: number;

  @ApiPropertyOptional({ description: "来源" })
  @IsOptional()
  @IsString()
  source?: string;
}
