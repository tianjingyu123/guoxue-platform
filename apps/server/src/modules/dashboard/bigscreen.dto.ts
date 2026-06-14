import { IsString, IsInt, IsOptional, Min } from "class-validator";

export class CreateBigScreenTokenDto {
  @IsString() type: string;
  @IsInt() @Min(1) validHours: number;
  @IsOptional() @IsString() ipWhitelist?: string;
}
