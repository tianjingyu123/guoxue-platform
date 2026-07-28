import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class TtsRequestDto {
  @IsString()
  @MaxLength(500)
  text: string;

  @IsOptional() @IsString()
  voice?: string;

  @IsOptional() @IsString()
  rate?: string;

  /** 多情感音色的表达风格；不支持情感的音色会由供应商按默认风格处理。 */
  @IsOptional()
  @IsString()
  @IsIn([
    "neutral", "sad", "happy", "angry", "fear", "news", "story", "radio",
    "poetry", "call", "sajiao", "disgusted", "amaze", "peaceful",
    "exciting", "aojiao", "jieshuo",
  ])
  emotion?: string;

  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(200)
  emotionIntensity?: number;

  /** 断句敏感阈值：值越大，越倾向只在明确标点处分段。 */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  segmentRate?: number;
}
