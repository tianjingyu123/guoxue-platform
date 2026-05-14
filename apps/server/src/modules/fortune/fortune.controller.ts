import { Controller, Get, Post, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { FortuneService } from "./fortune.service";
import { CreateFortuneSubscriptionDto } from "./fortune.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("个性化运势")
@Controller("fortune")
export class FortuneController {
  constructor(private svc: FortuneService) {}

  @Post("subscribe")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "订阅运势推送" })
  subscribe(@Req() req: Request, @Body() dto: CreateFortuneSubscriptionDto) {
    return this.svc.subscribe(req.user.id, dto);
  }

  @Get("subscriptions")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "我的订阅列表" })
  listSubscriptions(@Req() req: Request) {
    return this.svc.listSubscriptions(req.user.id);
  }

  @Delete("subscribe/:type/:channel")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "取消订阅" })
  unsubscribe(@Req() req: Request, @Param("type") type: string, @Param("channel") channel: string) {
    return this.svc.unsubscribe(req.user.id, type, channel);
  }

  @Get("today")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "今日运势" })
  getToday(@Req() req: Request) { return this.svc.getTodayFortune(req.user.id); }

  @Get(":type/:period")
  @ApiOperation({ summary: "按周期查询运势" })
  getByPeriod(@Param("type") type: string, @Param("period") period: string) {
    return this.svc.getFortuneByPeriod("system", type, period);
  }

  // ───────── 管理 ─────────

  @Post("admin/push-all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "推送全部运势" })
  pushAll(@Body("fortuneType") fortuneType: string) { return this.svc.pushAll(fortuneType); }

  @Get("admin/records")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "运势记录列表" })
  listRecords(@Query("page") page?: string, @Query("pageSize") pageSize?: string, @Query("fortuneType") fortuneType?: string) {
    return this.svc.adminListRecords(page ? +page : 1, pageSize ? +pageSize : 20, fortuneType);
  }
}
