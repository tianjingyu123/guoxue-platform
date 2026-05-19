import { IsString, IsInt, Min, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class SpendPointsDto {
  @ApiProperty({ description: "兑换消耗积分数" })
  @Type(() => Number) @IsInt() @Min(1)
  amount: number;

  @ApiProperty({ description: "兑换目标类型（如 COURSE/PRODUCT/COUPON）" })
  @IsString() @MinLength(1)
  targetType: string;

  @ApiProperty({ description: "兑换目标ID" })
  @IsString() @MinLength(1)
  targetId: string;
}
