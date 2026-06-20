import { IsString, IsOptional, IsArray } from "class-validator";

export class SubmitFeedbackDto {
  @IsString()
  type: string;

  @IsString()
  content: string;

  @IsOptional() @IsString()
  contact?: string;

  @IsOptional() @IsArray()
  @IsString({ each: true })
  images?: string[];
}
