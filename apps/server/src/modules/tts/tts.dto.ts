import { IsString, IsOptional, MaxLength } from "class-validator";

export class TtsRequestDto {
  @IsString()
  @MaxLength(500)
  text: string;

  @IsOptional() @IsString()
  voice?: string;

  @IsOptional() @IsString()
  rate?: string;
}
