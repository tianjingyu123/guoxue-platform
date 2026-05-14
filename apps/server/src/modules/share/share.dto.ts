import { IsString, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class ShareConfigQueryDto {
  @ApiPropertyOptional({ description: "分享类型 course/article/live/bounty" })
  @IsOptional() @IsString() type?: string;

  @ApiPropertyOptional({ description: "目标ID" })
  @IsOptional() @IsString() id?: string;
}
