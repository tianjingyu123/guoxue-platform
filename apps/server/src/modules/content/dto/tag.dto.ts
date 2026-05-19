import { IsString, IsOptional, IsIn, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTagDto {
  @ApiProperty({ description: "标签名称" })
  @IsString() @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: "标签分类" })
  @IsOptional() @IsString()
  category?: string;
}

export class UpdateTagDto {
  @ApiPropertyOptional({ description: "标签名称" })
  @IsOptional() @IsString() @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ description: "标签分类" })
  @IsOptional() @IsString()
  category?: string;

  @ApiPropertyOptional({ description: "状态 ACTIVE/INACTIVE" })
  @IsOptional() @IsString() @IsIn(["ACTIVE", "INACTIVE"])
  status?: string;
}
