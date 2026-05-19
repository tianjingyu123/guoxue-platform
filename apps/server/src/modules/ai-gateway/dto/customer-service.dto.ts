import { IsString, IsArray, IsOptional } from "class-validator";

export class AskDto {
  @IsString()
  question!: string;

  @IsOptional()
  @IsArray()
  history?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}
