import { IsString, IsOptional, IsNumber, Min, Max } from "class-validator";

export class ImageAuditDto {
  @IsString()
  imageUrl!: string;

  @IsOptional()
  @IsString()
  context?: string;
}

export class TtsDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  voice?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2.0)
  speed?: number;
}

export class TranscribeDto {
  @IsString()
  audioUrl!: string;

  @IsOptional()
  @IsString()
  language?: string;
}
