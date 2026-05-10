import { IsString, IsInt, IsOptional, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCallDto {
  @ApiProperty({ description: "被连麦用户ID（圈主/嘉宾）" })
  @IsString()
  calleeId: string;

  @ApiProperty({ description: "所属圈子ID" })
  @IsString()
  circleId: string;
}

export class CallQueryDto {
  @ApiPropertyOptional({ description: "状态筛选: WAITING/IN_PROGRESS/COMPLETED/CANCELLED" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}
