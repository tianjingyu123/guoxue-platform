import { Request } from "express";
import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CallService } from "./call.service";
import { CreateCallDto, CallQueryDto } from "./call.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("连麦通话")
@ApiBearerAuth()
@Controller("call")
export class CallController {
  constructor(private svc: CallService) {}

  @Post("create")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "发起连麦请求", description: "向圈主/嘉宾发起付费连麦通话请求" })
  create(@Req() req: Request, @Body() dto: CreateCallDto) {
    return this.svc.create(req.user.id, dto);
  }

  @Post(":id/accept")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "接听连麦", description: "被呼叫者接听连麦，生成TRTC房间Token" })
  accept(@Req() req: Request, @Param("id") id: string) {
    return this.svc.accept(req.user.id, id);
  }

  @Post(":id/hangup")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "挂断连麦", description: "任一方挂断通话，结算费用" })
  hangup(@Req() req: Request, @Param("id") id: string) {
    return this.svc.hangup(req.user.id, id);
  }

  @Get(":id/status")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "查询通话状态", description: "查询当前通话时长、消费金额、剩余余额" })
  getStatus(@Req() req: Request, @Param("id") id: string) {
    return this.svc.getStatus(id, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的通话记录", description: "查询当前用户的连麦通话记录" })
  listCalls(@Req() req: Request, @Query() q: CallQueryDto) {
    return this.svc.listCalls(req.user.id, q);
  }
}
