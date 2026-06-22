import { IsString, IsOptional, IsInt, IsArray, ArrayNotEmpty, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AuditListQueryDto {
  @ApiPropertyOptional({ description: "用户ID" })
  @IsOptional() @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: "操作类型" })
  @IsOptional() @IsString()
  action?: string;

  @ApiPropertyOptional({ description: "目标类型" })
  @IsOptional() @IsString()
  targetType?: string;

  @ApiPropertyOptional({ description: "目标ID" })
  @IsOptional() @IsString()
  targetId?: string;

  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @Type(() => Number) @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: "每页条数", default: 20 })
  @IsOptional() @Type(() => Number) @IsInt()
  pageSize?: number;

  @ApiPropertyOptional({ description: "开始日期" })
  @IsOptional() @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: "结束日期" })
  @IsOptional() @IsString()
  endDate?: string;
}

export class ModerateImageDto {
  @IsOptional() @IsString()
  imageUrl?: string;

  @IsOptional() @IsString()
  imageBase64?: string;

  @IsOptional() @IsString()
  bizType?: string;
}

export class ModerateTextDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional() @IsString()
  bizType?: string;

  @IsOptional() @IsString()
  dataId?: string;
}

export class AddSensitiveWordDto {
  @ApiProperty({ description: "敏感词" })
  @IsString()
  @MinLength(1)
  word: string;
}

export class AddSensitiveWordsDto {
  @ApiProperty({ description: "敏感词数组", type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  words: string[];
}

export class CheckSensitiveDto {
  @ApiProperty({ description: "待检测文本" })
  @IsString()
  @MinLength(1)
  text: string;
}

export class OperationLogListQueryDto {
  @ApiPropertyOptional({ description: "用户ID" })
  @IsOptional() @IsString() userId?: string;
  @ApiPropertyOptional({ description: "操作类型" })
  @IsOptional() @IsString() action?: string;
  @ApiPropertyOptional({ description: "目标类型" })
  @IsOptional() @IsString() targetType?: string;
  @ApiPropertyOptional({ description: "目标ID" })
  @IsOptional() @IsString() targetId?: string;
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() page?: number;
  @ApiPropertyOptional({ description: "每页条数", default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() pageSize?: number;
  @ApiPropertyOptional({ description: "开始日期" })
  @IsOptional() @IsString() startDate?: string;
  @ApiPropertyOptional({ description: "结束日期" })
  @IsOptional() @IsString() endDate?: string;
}
