import { IsString, IsOptional, IsInt } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SentenceRecognizeDto {
  @ApiProperty({ description: "语音Base64编码", example: "UklGRiQAAAB..." })
  @IsString()
  audio: string;

  @ApiPropertyOptional({ description: "音频格式", enum: ["wav", "mp3"], default: "wav" })
  @IsOptional() @IsString()
  format?: "wav" | "mp3";
}

export class CreateRecTaskDto {
  @ApiProperty({ description: "音频文件URL", example: "https://cdn.example.com/audio/lecture.mp3" })
  @IsString()
  audioUrl: string;

  @ApiPropertyOptional({ description: "识别完成回调URL" })
  @IsOptional() @IsString()
  callbackUrl?: string;
}

export class ImageOcrDto {
  @ApiProperty({ description: "图片Base64编码" })
  @IsString()
  image: string;
}

export class SentimentAnalyzeDto {
  @ApiProperty({ description: "待分析文本", example: "这本书写得非常好，受益匪浅" })
  @IsString()
  text: string;
}

export class ExtractKeywordsDto {
  @ApiProperty({ description: "待提取文本" })
  @IsString()
  text: string;

  @ApiPropertyOptional({ description: "提取数量", default: 10, minimum: 1, maximum: 50 })
  @IsOptional() @IsInt()
  count?: number;
}

export class TranslateTextDto {
  @ApiProperty({ description: "待翻译文本", example: "天地玄黄，宇宙洪荒" })
  @IsString()
  text: string;

  @ApiPropertyOptional({ description: "源语言", default: "zh", example: "zh" })
  @IsOptional() @IsString()
  sourceLang?: string;

  @ApiPropertyOptional({ description: "目标语言", default: "en", example: "en" })
  @IsOptional() @IsString()
  targetLang?: string;
}
