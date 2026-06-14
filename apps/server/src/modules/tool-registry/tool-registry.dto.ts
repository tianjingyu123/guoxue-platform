import { IsString, IsObject, IsOptional } from "class-validator";

export class ToolCalculateDto {
  @IsObject() input: Record<string, unknown>;
}

export class ToolAnalyzeDto {
  @IsObject() input: Record<string, unknown>;
  @IsObject() result: Record<string, unknown>;
  @IsOptional() @IsString() paipanRecordId?: string;
}
