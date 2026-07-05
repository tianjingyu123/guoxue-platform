import { Controller, Get, Post, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { UserTagService } from "./user-tag.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

/**
 * 用户标签（D-T2·admin）。
 * 【R2 红线】本模块输出仅可用于推荐/优惠/圈人触达，严禁用于差异化定价。
 */
@ApiTags("用户标签")
@ApiBearerAuth()
@Controller("user-tags")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class UserTagController {
  constructor(private readonly svc: UserTagService) {}

  @Get("distribution")
  @ApiOperation({ summary: "标签分布统计（各标签用户数）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  distribution() {
    return this.svc.distribution();
  }

  @Get("by-tag")
  @ApiOperation({ summary: "某标签下的用户分页（运营圈人）" })
  @ApiQuery({ name: "tag", required: true })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  byTag(@Query("tag") tag: string, @Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    return this.svc.usersByTag(tag, page ? Number(page) : 1, pageSize ? Number(pageSize) : 20);
  }

  @Get("user/:userId")
  @ApiOperation({ summary: "单用户全部标签" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  ofUser(@Param("userId") userId: string) {
    return this.svc.tagsOfUser(userId);
  }

  @Post("recompute")
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "手动全量重算（分批 500·幂等）" })
  @ApiResponse({ status: 201, description: "重算完成" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  recompute() {
    return this.svc.recomputeAll();
  }
}
