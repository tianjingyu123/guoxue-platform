import { IsString, IsOptional, IsIn, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateLegalDto {
  @ApiProperty({ description: "类型: agreement/privacy/community" })
  @IsString() @IsIn(["agreement", "privacy", "community"])
  type: string;

  @ApiProperty({ description: "版本号 如 v1.0" })
  @IsString() @MinLength(1)
  version: string;

  @ApiProperty({ description: "标题" })
  @IsString() @MinLength(1)
  title: string;

  @ApiProperty({ description: "正文内容（Markdown）" })
  @IsString() @MinLength(1)
  content: string;

  @ApiPropertyOptional({ description: "状态 DRAFT/PUBLISHED", default: "PUBLISHED" })
  @IsOptional() @IsString() @IsIn(["DRAFT", "PUBLISHED"])
  status?: string;
}

export class UpdateLegalDto {
  @ApiPropertyOptional({ description: "标题" })
  @IsOptional() @IsString() @MinLength(1)
  title?: string;

  @ApiPropertyOptional({ description: "正文内容（Markdown）" })
  @IsOptional() @IsString()
  content?: string;

  @ApiPropertyOptional({ description: "状态 DRAFT/PUBLISHED" })
  @IsOptional() @IsString() @IsIn(["DRAFT", "PUBLISHED"])
  status?: string;
}
