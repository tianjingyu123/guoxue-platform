import { IsString, IsOptional, IsArray, IsIn, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateMaterialDto {
  @ApiProperty({ description: "所属分站ID" })
  @IsString() @MinLength(1)
  stationId: string;

  @ApiProperty({ description: "素材类型: poster/qrcode/copy" })
  @IsString() @IsIn(["poster", "qrcode", "copy"])
  type: string;

  @ApiProperty({ description: "素材标题" })
  @IsString() @MinLength(1)
  title: string;

  @ApiPropertyOptional({ description: "文案内容（copy类型）" })
  @IsOptional() @IsString()
  content?: string;

  @ApiPropertyOptional({ description: "图片URL（poster/qrcode类型）" })
  @IsOptional() @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: "标签" })
  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];
}
