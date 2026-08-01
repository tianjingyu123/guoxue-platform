import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { BountyService } from "./bounty.service";
import { RejectReviewDto } from "./bounty.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("悬赏管理-管理端")
@Controller("admin/bounty")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
@ApiBearerAuth()
export class BountyAdminController {
  constructor(private svc: BountyService) {}

  @Get("questions")
  @ApiOperation({ summary: "悬赏问题列表（管理端）" })
  @ApiResponse({ status: 200, description: "成功" })
  listQuestions(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("category") category?: string,
    @Query("status") status?: string,
  ) {
    return this.svc.list(page ? +page : 1, pageSize ? +pageSize : 20, category, status);
  }

  @Post("questions/:id/close")
  @ApiOperation({ summary: "管理员关闭悬赏" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  closeQuestion(@Param("id") id: string) {
    return this.svc.closeQuestion(id);
  }

  @Get("reviews")
  @ApiOperation({ summary: "悬赏审核列表（管理端·可按状态过滤）" })
  @ApiResponse({ status: 200, description: "成功" })
  listReviews(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("status") status?: string,
  ) {
    return this.svc.listReviews(page ? +page : 1, pageSize ? +pageSize : 20, status);
  }

  @Put("reviews/:id/approve")
  @ApiOperation({ summary: "通过审核" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  approveReview(@Param("id") id: string) {
    return this.svc.approveReview(id);
  }

  @Put("reviews/:id/reject")
  @ApiOperation({ summary: "拒绝审核" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  rejectReview(@Param("id") id: string, @Body() body: RejectReviewDto) {
    return this.svc.rejectReview(id, body?.reason || "");
  }
}
