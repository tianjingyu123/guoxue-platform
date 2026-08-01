import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { Request } from "express";
import { ConsultCallService } from "./consult-call.service";
import { InitiateCallDto, CancelCallDto, RateCallDto, DisputeCallDto, ResolveDisputeDto } from "./consult-call.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

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

  // ───────── 评价与账单申诉（待办 #31） ─────────

  @Post(":id/rate")
  @ApiOperation({ summary: "评价通话（仅发起方·仅 ENDED·仅一次·结束后 24h 内·星级+标签+文字≤200字）" })
  @ApiResponse({ status: 201, description: "评价成功" })
  @ApiResponse({ status: 400, description: "已评价/超窗/校验失败" })
  rate(@Req() req: Request, @Param("id") id: string, @Body() dto: RateCallDto) {
    return this.svc.rate(req.user.id, id, dto);
  }

  @Post(":id/dispute")
  @ApiOperation({ summary: "24 小时账单申诉（通话双方·仅 ENDED·仅一次·只落 PENDING 记录，资金零触碰）" })
  @ApiResponse({ status: 201, description: "申诉已提交" })
  @ApiResponse({ status: 400, description: "已申诉/超窗/校验失败" })
  dispute(@Req() req: Request, @Param("id") id: string, @Body() dto: DisputeCallDto) {
    return this.svc.dispute(req.user.id, id, dto);
  }

  @Get("expert-stats")
  @ApiOperation({ summary: "达人好评率聚合（好评率=rating≥4 占比·无评价的达人不返回）" })
  @ApiQuery({ name: "expertIds", description: "达人 userId 逗号串（最多 50 个）" })
  @ApiResponse({ status: 200, description: "成功，{ [expertId]: { ratingCount, goodRate } }" })
  expertStats(@Query("expertIds") expertIds = "") {
    return this.svc.expertRatingStats(String(expertIds).split(","));
  }

  // ───────── 管理端：申诉队列与处理（只记结论·资金零触碰） ─────────

  @Get("admin/disputes")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "账单申诉队列（默认 PENDING）" })
  @ApiQuery({ name: "status", required: false, description: "PENDING/RESOLVED/REJECTED·默认 PENDING" })
  listDisputes(@Query("status") status = "PENDING", @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listDisputes(status, +page, +pageSize);
  }

  @Post("admin/disputes/:id/resolve")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "处理账单申诉（改状态+备注·不动资金·退款走人工金币退款审批流）" })
  @ApiResponse({ status: 201, description: "处理完成" })
  resolveDispute(@Req() req: Request, @Param("id") id: string, @Body() dto: ResolveDisputeDto) {
    return this.svc.resolveDispute(req.user.id, id, dto);
  }
}
