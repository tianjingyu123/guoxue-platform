import { IsString, IsOptional, IsArray, IsIn, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTeacherDto {
  @ApiProperty({ description: "讲师姓名" })
  @IsString() @MinLength(1)
  name: string;

  @ApiProperty({ description: "所属驿站ID" })
  @IsString() @MinLength(1)
  stationId: string;

  @ApiPropertyOptional({ description: "头像URL" })
  @IsOptional() @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: "专长标签" })
  @IsOptional() @IsArray() @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({ description: "简介" })
  @IsOptional() @IsString()
  bio?: string;
}

export class UpdateTeacherDto {
  @ApiPropertyOptional({ description: "姓名" })
  @IsOptional() @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "头像" })
  @IsOptional() @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: "专长标签" })
  @IsOptional() @IsArray() @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({ description: "简介" })
  @IsOptional() @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: "状态 ACTIVE/INACTIVE" })
  @IsOptional() @IsString() @IsIn(["ACTIVE", "INACTIVE"])
  status?: string;
}

export class SetAvailabilityDto {
  @ApiProperty({ description: "可预约时段列表（ISO日期时间）" })
  @IsArray() @IsString({ each: true })
  slots: string[];
}
