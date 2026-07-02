import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { UserGrowthService } from "./user-growth.service";

@ApiTags("成长体系")
@Controller("users/me/growth")
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
}
