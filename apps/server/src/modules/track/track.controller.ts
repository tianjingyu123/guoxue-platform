import { Request } from "express";
import { Controller, Get, Post, Body, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { TrackService } from "./track.service";
import { TrackBatchDto } from "./track.dto";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("行为埋点")
@Controller("track")
export class TrackController {
  constructor(private svc: TrackService) {}

  /** 批量上报行为埋点（可匿名：有 JWT 则关联 userId，无则记为匿名） */
  @Post("batch")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "批量上报行为埋点" })
  @ApiResponse({ status: 201, description: "上报成功" })
  recordBatch(@Req() req: Request, @Body() dto: TrackBatchDto) {
    return this.svc.recordBatch(req.user?.id, dto.events);
  }

  /** 站长推广转化漏斗：点击→注册→下单（主体=当前登录站长，服务端解析） */
  @Get("funnel")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "站长推广转化漏斗（近N天，默认30，最大90）" })
  @ApiQuery({ name: "days", required: false })
  @ApiResponse({ status: 200, description: "成功" })
  funnel(@Req() req: Request, @Query("days") days?: string) {
    const n = Math.min(90, Math.max(1, Number(days) || 30));
    return this.svc.getStationFunnel(req.user.id, n);
  }
}
