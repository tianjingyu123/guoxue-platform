import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { GrowthService } from "./growth.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

/**
 * 圈子成长体系（签到 / 成长等级 / 徽章 / 入圈审批）。
 * 路由挂在 circles/:id 下，与既有 CircleController 路径不冲突（checkin/growth/badges/join-requests 均为新路径）。
 */
@ApiTags("圈子成长体系")
@Controller("circles")
export class GrowthController {
  constructor(private readonly svc: GrowthService) {}

  @Post(":id/checkin")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "今日签到（幂等，返回连续天数+获得经验）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "签到成功" })
  checkin(@Param("id") circleId: string, @Req() req: Request) {
    return this.svc.checkin(circleId, req.user.id);
  }

  @Get(":id/checkin/calendar")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我本月签到日历（month=YYYY-MM，默认本月）" })
  @ApiBearerAuth()
  calendar(@Param("id") circleId: string, @Query("month") month: string, @Req() req: Request) {
    return this.svc.getCheckinCalendar(circleId, req.user.id, month);
  }

  @Get(":id/growth")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的成长（等级/总经验/进度/连续签到）+ 等级排行榜" })
  @ApiBearerAuth()
  growth(@Param("id") circleId: string, @Req() req: Request) {
    return this.svc.getGrowth(circleId, req.user.id);
  }

  @Get(":id/badges")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "徽章列表（全部定义+我的获得状态+获得时间）" })
  @ApiBearerAuth()
  badges(@Param("id") circleId: string, @Req() req: Request) {
    return this.svc.getBadges(circleId, req.user.id);
  }

  @Get(":id/join-requests")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "入圈申请列表（圈主权限，待审批+已处理）" })
  @ApiBearerAuth()
  joinRequests(@Param("id") circleId: string, @Req() req: Request) {
    return this.svc.getJoinRequests(circleId, req.user.id);
  }

  @Post(":id/join-requests/:reqId/review")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "审批入圈申请（圈主权限，action=approve|reject，幂等防重复审）" })
  @ApiBearerAuth()
  reviewJoinRequest(
    @Param("id") circleId: string,
    @Param("reqId") reqId: string,
    @Req() req: Request,
    @Body() body: { action: "approve" | "reject"; rejectReason?: string },
  ) {
    return this.svc.reviewJoinRequest(circleId, reqId, req.user.id, body?.action, body?.rejectReason);
  }
}
