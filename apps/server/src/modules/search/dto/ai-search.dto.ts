import { IsString, IsArray } from "class-validator";

export class AiSearchDto {
  @IsString()
  query!: string;

  @IsArray()
  results!: Array<{ title: string; content: string }>;
}

export class AiQueryDto {
  @IsString()
  query!: string;
}
