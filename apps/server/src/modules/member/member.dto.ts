import { IsString, IsOptional, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MemberLevel } from "@prisma/client";

export class PurchaseMemberDto {
  @ApiPropertyOptional({ description: "使用的优惠券ID" })
  @IsOptional()
  @IsString()
  couponId?: string;
}

export class MemberPlanDto {
  @ApiProperty({ description: "套餐等级" })
  @IsEnum(MemberLevel)
  level: MemberLevel;

  @ApiProperty({ description: "显示名称" })
  @IsString()
  name: string;

  @ApiProperty({ description: "价格" })
  price: number;

  @ApiProperty({ description: "每月赠送国学币" })
  coinBonus: number;

  @ApiProperty({ description: "权益列表" })
  benefits: any;

  @ApiProperty({ description: "电子书最大借阅天数" })
  maxBorrowDays: number;
}

export class MemberStatusDto {
  @ApiProperty({ description: "当前会员等级" })
  memberLevel: string;

  @ApiProperty({ description: "会员到期时间" })
  memberExpire?: string;

  @ApiProperty({ description: "是否有效会员" })
  isActive: boolean;

  @ApiProperty({ description: "剩余天数" })
  remainingDays: number;
}
