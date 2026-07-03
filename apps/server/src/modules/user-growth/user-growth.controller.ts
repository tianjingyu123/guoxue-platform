import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { UserGrowthService } from "./user-growth.service";

class EquipTitleDto {
  @IsString()
  @MaxLength(64)
  code!: string;
}

@ApiTags("成长体系")
// 注意：/users/me/growth 已被旧成长值系统占用（points.controller @Get("growth")），此处用 growth-profile 避免路由冲突
@Controller("users/me/growth-profile")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserGrowthController {
  constructor(private readonly svc: UserGrowthService) {}

  @Get()
  @ApiOperation({ summary: "我的成长档案：学分/功名等级/连续学习/成就墙（含全部等级阶梯定义）" })
  @ApiResponse({ status: 200, description: "成功" })
  async me(@Req() req: Request) {
    return this.svc.getMyGrowth(req.user.id);
  }

  @Get("titles")
  @ApiOperation({ summary: "我的称号：全目录+已获/佩戴状态" })
  @ApiResponse({ status: 200, description: "成功" })
  async myTitles(@Req() req: Request) {
    return this.svc.getMyTitles(req.user.id);
  }

  @Post("titles/equip")
  @ApiOperation({ summary: "佩戴称号（每用户至多一枚·须已获得）" })
  @ApiResponse({ status: 201, description: "成功" })
  @ApiResponse({ status: 400, description: "称号不存在或未获得" })
  async equipTitle(@Req() req: Request, @Body() dto: EquipTitleDto) {
    return this.svc.equipTitle(req.user.id, dto.code);
  }

  @Post("titles/unequip")
  @ApiOperation({ summary: "卸下当前佩戴的称号" })
  @ApiResponse({ status: 201, description: "成功" })
  async unequipTitle(@Req() req: Request) {
    return this.svc.unequipTitle(req.user.id);
  }
}
