import { IsString, IsArray, IsNotEmpty, MaxLength, Matches } from "class-validator";

export class AiSearchDto {
  @IsString()
  query!: string;

  @IsArray()
  results!: Array<{ title: string; content: string }>;
}

export class AiQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/\S/u)
  query!: string;
}
