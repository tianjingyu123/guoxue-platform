import { IsString, IsInt, IsOptional, Min, Max, IsIn } from "class-validator";

export class BaziInputDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  @IsIn(["男", "女"])
  gender: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(1)
  @Max(31)
  day: number;

  @IsInt()
  @Min(0)
  @Max(23)
  hour: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(59)
  minute?: number;

  @IsOptional()
  @IsString()
  city?: string;
}

export class BaziRecordQueryDto {
  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  pageSize?: number;
}
