import { IsInt, Min, Max } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CheckInCalendarQueryDto {
  @ApiProperty({ description: "年", example: 2026 })
  @IsInt() @Min(2020) @Max(2100)
  year: number;

  @ApiProperty({ description: "月（1-12）", example: 5 })
  @IsInt() @Min(1) @Max(12)
  month: number;
}
