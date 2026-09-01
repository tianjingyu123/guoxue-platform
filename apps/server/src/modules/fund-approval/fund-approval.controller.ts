import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { FundApprovalService } from "./fund-approval.service";
import { FundApprovalExecutor } from "./fund-approval.executor";
import { ReviewFundApprovalDto } from "./fund-approval.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { Auditable } from "../../common/audit.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";

@ApiTags("资金审批")
@ApiBearerAuth()
@Controller("fund-approval")
export class FundApprovalController {
  constructor(
    private approvals: FundApprovalService,
    private executor: FundApprovalExecutor,
  ) {}

  @Get("admin/pending")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "资金审批列表（默认待审）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, description: "PENDING/APPROVED/REJECTED/ALL（全部）·缺省 PENDING" })
  listPending(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("status") status = "PENDING",
  ) {
    return this.approvals.list(+page, +pageSize, status);
  }

  @Post("admin/:id/review")
  @RedLineGate(RedLine.MONEY)
  @Auditable({ action: "资金审批", targetType: "FUND_APPROVAL" })
  @UseGuards(JwtAuthGuard, RolesGuard, StrictRedisThrottleGuard)
  @Roles("SUPER_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "审批资金操作（通过则执行，拒绝则标记）" })
  @ApiResponse({ status: 201, description: "审批完成" })
  @ApiResponse({ status: 400, description: "审批单已处理或执行失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "审批单不存在" })
  review(@Param("id") id: string, @Body() dto: ReviewFundApprovalDto, @Req() req: Request) {
    return this.executor.review(id, dto.approve, dto.note, req.user.id);
  }
}
