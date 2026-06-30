import { Request } from "express";
import { Controller, Post, Body, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { TrackService } from "./track.service";
import { TrackBatchDto } from "./track.dto";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";

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
}
