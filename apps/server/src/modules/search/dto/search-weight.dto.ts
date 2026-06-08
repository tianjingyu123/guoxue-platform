import { IsString, IsNumber, IsOptional, IsBoolean, Min } from "class-validator";

export class UpsertSearchWeightDto {
  @IsString() entityType: string;
  @IsString() fieldName: string;
  @IsNumber() @Min(0) weight: number;
  @IsOptional() @IsBoolean() enabled?: boolean;
}
