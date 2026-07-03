import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/** 拜师请求 */
export class AcceptMentorshipDto {
  @ApiProperty({ description: "拜师邀请 token（师父分享链接携带）" })
  @IsString()
  @MinLength(1)
  token!: string;

  @ApiPropertyOptional({ description: "拜师寄语", maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  pledge?: string;
}
