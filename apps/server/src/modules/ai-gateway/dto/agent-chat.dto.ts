import { IsString, IsArray, IsBoolean } from "class-validator";

export class AgentChatDto {
  @IsArray()
  messages!: Array<{ role: "user" | "assistant"; content: string }>;

  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}
