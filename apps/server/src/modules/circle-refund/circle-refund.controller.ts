import { Controller, Get, Post, Body, Param, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { CircleRefundService } from "./circle-refund.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Auditable } from "../../common/audit.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";

@ApiTags("圈子退款")
@Controller("circle-refund")
export class CircleRefundController {
  constructor(private readonly svc: CircleRefundService) {}

  @Get("preview/:circleId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "退款金额预览（申诉申请页）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功" })
  preview(@Param("circleId") circleId: string, @Req() req: Request) {
    return this.svc.previewRefund(circleId, req.user.id);
  }

  @Post("apply/:circleId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "提交退款申请" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "提交成功" })
  apply(
    @Param("circleId") circleId: string,
    @Req() req: Request,
    @Body() body: { reason?: string; refundType?: "normal" | "full" },
  ) {
    return this.svc.applyRefund(circleId, req.user.id, body.reason, body.refundType);
  }

  @Get("my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的退款申请列表" })
  @ApiBearerAuth()
  myRefunds(@Req() req: Request) {
    return this.svc.getMyRefunds(req.user.id);
  }

  @Get("wallet")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的余额钱包（余额+流水，退款到账可见）" })
  @ApiBearerAuth()
  wallet(@Req() req: Request) {
    return this.svc.getWallet(req.user.id);
  }

  @Get("owner-pending")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "圈主待审退款列表" })
  @ApiBearerAuth()
  ownerPending(@Req() req: Request) {
    return this.svc.getOwnerPending(req.user.id);
  }

  @Post(":id/owner-review")
  @RedLineGate(RedLine.MONEY)
  @Auditable({ action: "圈子退款圈主审核", targetType: "CIRCLE_REFUND" })
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "圈主审核退款（同意/驳回）" })
  @ApiBearerAuth()
  ownerReview(
    @Param("id") id: string,
    @Req() req: Request,
    @Body() body: { approve: boolean; rejectReason?: string },
  ) {
    return this.svc.ownerReview(id, req.user.id, body.approve, body.rejectReason);
  }

  @Get("admin-pending")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "平台待审退款列表（管理员）" })
  @ApiBearerAuth()
  adminPending() {
    return this.svc.getAdminPending();
  }

  @Post(":id/admin-review")
  @RedLineGate(RedLine.MONEY)
  @Auditable({ action: "圈子退款平台审核", targetType: "CIRCLE_REFUND" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "平台审核退款（管理员，同意/驳回）" })
  @ApiBearerAuth()
  adminReview(
    @Param("id") id: string,
    @Req() req: Request,
    @Body() body: { approve: boolean; rejectReason?: string },
  ) {
    return this.svc.adminReview(id, req.user.id, body.approve, body.rejectReason);
  }
}
