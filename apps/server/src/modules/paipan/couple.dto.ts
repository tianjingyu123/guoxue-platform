import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

/** 发起双人合盘邀请 */
export class CoupleInviteDto {
  @ApiProperty({ description: "我的八字排盘记录 id（必须归属本人）" })
  @IsString()
  @IsNotEmpty()
  myRecordId: string;
}

/** 接受双人合盘邀请（被邀请方提供自己的盘） */
export class CoupleAcceptDto {
  @ApiProperty({ description: "我的八字排盘记录 id（必须归属本人）" })
  @IsString()
  @IsNotEmpty()
  myRecordId: string;
}
