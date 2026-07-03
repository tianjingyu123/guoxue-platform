import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

/** 创建共读组 */
export class CreateGroupDto {
  @ApiProperty({ description: "古籍书籍ID（ClassicBook.id）" })
  @IsString()
  classicBookId!: string;

  @ApiPropertyOptional({ description: "目标完成章节数（缺省=该书章节数）", minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  targetChapters?: number;

  @ApiPropertyOptional({ description: "最少成团人数", minimum: 2, maximum: 50, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(50)
  minMembers?: number;

  @ApiPropertyOptional({ description: "最多成团人数", minimum: 2, maximum: 50, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(50)
  maxMembers?: number;

  @ApiPropertyOptional({ description: "共读周期（天）", minimum: 1, maximum: 90, default: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  durationDays?: number;
}

/** 通过邀请 token 加入共读组 */
export class JoinGroupDto {
  @ApiProperty({ description: "邀请 token" })
  @IsString()
  token!: string;
}
