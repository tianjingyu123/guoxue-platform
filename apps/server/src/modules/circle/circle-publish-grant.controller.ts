import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import {
  ApplyCirclePublishGrantDto,
  CirclePublishScopeValue,
  ReviewCirclePublishGrantDto,
} from "./circle-publish-grant.dto";
import { CirclePublishGrantService } from "./circle-publish-grant.service";
import { CirclePublishGrantStatus } from "@prisma/client";

@ApiTags("圈子全平台发布授权")
@ApiBearerAuth()
@Controller("circle-publish-grants")
@UseGuards(JwtAuthGuard)
export class CirclePublishGrantController {
  constructor(private readonly grants: CirclePublishGrantService) {}

  @Get("status")
  @ApiOperation({ summary: "查询当前圈主的授权状态与真实运营进度" })
  @ApiQuery({ name: "scope", required: false, enum: ["SHORT_VIDEO", "LIVE", "COURSE"] })
  getStatus(@Req() req: Request, @Query("scope") scope?: CirclePublishScopeValue) {
    return this.grants.getStatus(req.user.id, scope);
  }

  @Post("apply")
  @ApiOperation({ summary: "提交圈子全平台内容发布授权申请" })
  apply(@Req() req: Request, @Body() dto: ApplyCirclePublishGrantDto) {
    return this.grants.apply(req.user.id, dto);
  }

  @Get("admin")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理端查询授权申请" })
  listAdmin(
    @Query("status") status?: CirclePublishGrantStatus,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    return this.grants.listAdmin(status, Number(page), Number(pageSize));
  }

  @Post("admin/:id/approve")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "批准圈子全平台发布授权" })
  approve(@Req() req: Request, @Param("id") id: string, @Body() dto: ReviewCirclePublishGrantDto) {
    return this.grants.approve(id, req.user.id, dto);
  }

  @Post("admin/:id/reject")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "驳回圈子全平台发布授权" })
  reject(@Req() req: Request, @Param("id") id: string, @Body() dto: ReviewCirclePublishGrantDto) {
    return this.grants.reject(id, req.user.id, dto);
  }
}
