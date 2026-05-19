import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class PolishTextDto {
  @ApiProperty({ description: "待润色的原始文本" })
  @IsString() @MinLength(1)
  text: string;
}

export class OptimizeTitleDto {
  @ApiProperty({ description: "文章/课程/商品内容，用于生成标题" })
  @IsString() @MinLength(1)
  content: string;
}

export class SuggestTagsDto {
  @ApiProperty({ description: "内容正文，用于提取标签" })
  @IsString() @MinLength(1)
  content: string;
}

export class GenerateCoverDto {
  @ApiProperty({ description: "封面图生成提示词" })
  @IsString() @MinLength(1)
  prompt: string;
}
