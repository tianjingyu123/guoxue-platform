import { IsString, IsOptional, IsInt, IsArray, Min, MinLength, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateBountyDto {
  @ApiProperty({ description: "标题" })
  @IsString() title: string;

  @ApiProperty({ description: "描述" })
  @IsString() description: string;

  @ApiProperty({ description: "悬赏币数" })
  @IsInt() @Min(1) bountyCoin: number;

  @ApiPropertyOptional({ description: "分类 BAZI/ZIWEI/FENGSHUI/CAREER/LOVE/GENERAL" })
  @IsOptional() @IsString() category?: string;

  @ApiPropertyOptional({ description: "分站ID" })
  @IsOptional() @IsString() stationId?: string;

  @ApiPropertyOptional({ description: "圈子ID" })
  @IsOptional() @IsString() circleId?: string;

  @ApiPropertyOptional({ description: "图片" })
  @IsOptional() @IsArray() images?: string[];
}

export class RejectReviewDto {
  @IsOptional() @IsString()
  reason?: string;
}

export class CloseBountyQuestionDto {
  @ApiProperty({ description: "关闭原因", minLength: 2, maxLength: 500 })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  reason: string;
}

export class AnswerBountyDto {
  @ApiProperty({ description: "回答内容" })
  @IsString() answer: string;

  @ApiPropertyOptional({ description: "图片" })
  @IsOptional() @IsArray() images?: string[];

  @ApiPropertyOptional({ description: "音频URL" })
  @IsOptional() @IsString() audioUrl?: string;
}
