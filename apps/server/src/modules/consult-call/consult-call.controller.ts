import { Controller, Get, Post, Body, Param, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { ConsultCallService } from "./consult-call.service";
import { InitiateCallDto, CancelCallDto } from "./consult-call.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("达人通话")
@ApiBearerAuth()
@Controller("consult-calls")
@UseGuards(JwtAuthGuard)
export class ConsultCallController {
  constructor(private svc: ConsultCallService) {}

  @Post("initiate")
  @ApiOperation({ summary: "发起付费通话（预扣金币 + 返回 TRTC 接入配置）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数/余额校验失败" })
  initiate(@Req() req: Request, @Body() dto: InitiateCallDto) {
    return this.svc.initiate(req.user.id, dto);
  }

  @Post(":id/accept")
  @ApiOperation({ summary: "达人接听" })
  @ApiResponse({ status: 201, description: "成功" })
  accept(@Req() req: Request, @Param("id") id: string) {
    return this.svc.accept(req.user.id, id);
  }

  @Post(":id/end")
  @ApiOperation({ summary: "结束通话并结算（按实际时长扣费、达人50%分账、多退预扣）" })
  @ApiResponse({ status: 201, description: "成功" })
  end(@Req() req: Request, @Param("id") id: string) {
    return this.svc.end(req.user.id, id);
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "取消未接通通话（全额退还预扣）" })
  @ApiResponse({ status: 201, description: "成功" })
  cancel(@Req() req: Request, @Param("id") id: string, @Body() dto: CancelCallDto) {
    return this.svc.cancel(req.user.id, id, dto?.reason);
  }

  @Get("my")
  @ApiOperation({ summary: "我的通话记录（作为主叫或达人）" })
  @ApiResponse({ status: 200, description: "成功" })
  myCalls(@Req() req: Request) {
    return this.svc.myCalls(req.user.id);
  }
}
