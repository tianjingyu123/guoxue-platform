import { IsString, IsOptional, IsNumber, IsIn, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateInstituteContentDto {
  @ApiProperty({ description: "标题" })
  @IsString() @MinLength(1)
  title: string;

  @ApiProperty({ description: "所属研究院ID" })
  @IsString() @MinLength(1)
  instituteId: string;

  @ApiProperty({ description: "内容正文" })
  @IsString() @MinLength(1)
  content: string;

  @ApiPropertyOptional({ description: "内容类型", default: "ARTICLE" })
  @IsOptional() @IsString() @IsIn(["ARTICLE", "VIDEO", "DOCUMENT"])
  contentType?: string;

  @ApiPropertyOptional({ description: "摘要" })
  @IsOptional() @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: "价格", default: 0 })
  @IsOptional() @Type(() => Number) @IsNumber()
  price?: number;
}

export class UpdateInstituteContentDto {
  @ApiPropertyOptional({ description: "标题" })
  @IsOptional() @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "内容正文" })
  @IsOptional() @IsString()
  content?: string;

  @ApiPropertyOptional({ description: "摘要" })
  @IsOptional() @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: "价格" })
  @IsOptional() @Type(() => Number) @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: "状态 DRAFT/PUBLISHED/ARCHIVED" })
  @IsOptional() @IsString() @IsIn(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status?: string;
}
