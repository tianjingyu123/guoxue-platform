import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsIn, IsOptional } from "class-validator";

/** 发起双人合盘邀请 */
export class CoupleInviteDto {
  @ApiProperty({ description: "我的八字排盘记录 id（必须归属本人）" })
  @IsString()
  @IsNotEmpty()
  myRecordId: string;

  /**
   * 合盘场景（决策人 2026-09-18：合盘不光是合婚，还有合作等）。
   * 在发起时定下：报告按它决定问什么、怎么称呼两边——
   * 把合作伙伴讲成「感情和睦」是笑话，所以不能事后猜。
   * 缺省 marriage，与已有数据一致。
   */
  @ApiProperty({
    description: "合盘场景：marriage 婚恋 / partnership 合作 / family 亲子家人 / colleague 同事上下级 / friend 朋友",
    required: false,
    default: "marriage",
  })
  @IsOptional()
  @IsIn(["marriage", "partnership", "family", "colleague", "friend"])
  scene?: "marriage" | "partnership" | "family" | "colleague" | "friend";
}

/** 接受双人合盘邀请（被邀请方提供自己的盘） */
export class CoupleAcceptDto {
  @ApiProperty({ description: "我的八字排盘记录 id（必须归属本人）" })
  @IsString()
  @IsNotEmpty()
  myRecordId: string;
}
