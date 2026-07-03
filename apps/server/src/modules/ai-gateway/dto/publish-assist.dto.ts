import { IsString, MinLength, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

// 长度上限 5000 字符：防止超长输入烧 token / 拖慢 AI 网关
const MAX_LEN = 5000;

export class PolishTextDto {
  @ApiProperty({ description: "待润色的原始文本", maxLength: MAX_LEN })
  @IsString() @MinLength(1) @MaxLength(MAX_LEN)
  text: string;
}

export class OptimizeTitleDto {
  @ApiProperty({ description: "文章/课程/商品内容，用于生成标题", maxLength: MAX_LEN })
  @IsString() @MinLength(1) @MaxLength(MAX_LEN)
  content: string;
}

export class SuggestTagsDto {
  @ApiProperty({ description: "内容正文，用于提取标签", maxLength: MAX_LEN })
  @IsString() @MinLength(1) @MaxLength(MAX_LEN)
  content: string;
}

export class GenerateCoverDto {
  @ApiProperty({ description: "封面图生成提示词", maxLength: MAX_LEN })
  @IsString() @MinLength(1) @MaxLength(MAX_LEN)
  prompt: string;
}
