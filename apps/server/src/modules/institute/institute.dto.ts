import { IsString, IsInt, IsOptional, IsNumber, Min, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class JoinInstituteDto {
  @ApiProperty({ description: "成员角色: INITIATOR/TYPE_A/TYPE_B" })
  @IsString()
  @MinLength(1)
  role: string;

  @ApiProperty({ description: "加入年份", example: 2026 })
  @Type(() => Number)
  @IsInt()
  joinYear: number;

  @ApiPropertyOptional({ description: "保证金金额（元）", default: 10000 })
  @Type(() => Number)
  @IsOptional() @IsNumber()
  deposit?: number;
}

export class CreateTaskDto {
  @ApiProperty({ description: "任务类型: SALON/LIVE/ARTICLE" })
  @IsString()
  @MinLength(1)
  taskType: string;

  @ApiProperty({ description: "任务标题" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ description: "任务说明" })
  @IsOptional() @IsString()
  description?: string;
}

export class VerifyTaskDto {
  @ApiPropertyOptional({ description: "验证结果", default: "VERIFIED" })
  @IsOptional() @IsString()
  result?: string;
}

export class CreateEventDto {
  @ApiProperty({ description: "活动标题" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ description: "活动类型: SALON/LIVE/COURSE" })
  @IsString()
  @MinLength(1)
  type: string;

  @ApiPropertyOptional({ description: "讲师用户ID" })
  @IsOptional() @IsString()
  lecturerId?: string;

  @ApiPropertyOptional({ description: "活动描述" })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "活动地点/链接" })
  @IsOptional() @IsString()
  location?: string;

  @ApiProperty({ description: "排期时间" })
  @IsString()
  @MinLength(1)
  scheduleAt: string;

  @ApiPropertyOptional({ description: "最大参与人数", default: 50 })
  @Type(() => Number)
  @IsOptional() @IsInt()
  @Min(1)
  maxAttendees?: number;
}

export class UpdateLecturerLevelDto {
  @ApiProperty({ description: "讲师等级: NONE/PREPARATORY/JUNIOR/SENIOR/SIGNED" })
  @IsString()
  @MinLength(1)
  lecturerLevel: string;
}
